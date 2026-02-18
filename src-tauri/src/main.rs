mod db;
mod paste;
mod watcher;

use crate::{db as db_mod, paste as paste_mod};
use serde::Serialize;
use std::path::PathBuf;
use tauri::{Manager, State};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use std::sync::Mutex;
use active_win_pos_rs::{ActiveWindow, get_active_window};

// #[derive(Clone)]
struct AppState {
  db_path: std::path::PathBuf,
  last_active: Mutex<Option<ActiveWindow>>,
}


#[derive(Debug, Serialize)]
struct SelectResult {
  pasted: bool,
}

fn restore_previous_focus_macos(pid: u64) {
  // Bring the previous app frontmost.
  // This is best-effort; if it fails, fallback paste UX still works.
  let _ = std::process::Command::new("osascript")
    .arg("-e")
    .arg(format!(
      "tell application \"System Events\" to set frontmost of the first process whose unix id is {} to true",
      pid
    ))
    .status();
}

fn restore_previous_focus(state: &AppState) {
  let w = state.last_active.lock().unwrap().clone();
  if w.is_none() { return; }
  let w = w.unwrap();

  #[cfg(target_os = "windows")]
  {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::WindowsAndMessaging::SetForegroundWindow;

    // active-win-pos-rs gives window_id as String
    if let Ok(hwnd_i64) = w.window_id.parse::<i64>() {
      unsafe { SetForegroundWindow(HWND(hwnd_i64 as isize)); }
    }
  }

  #[cfg(target_os = "macos")]
  {
    restore_previous_focus_macos(w.process_id);
  }

  #[cfg(all(unix, not(target_os = "macos")))]
  {
    // X11 only; on Wayland this generally won't work.
    if std::env::var_os("DISPLAY").is_some() {
      if let Ok((conn, screen_num)) = x11rb::connect(None) {
        let screen = &conn.setup().roots[screen_num];

        // window_id may be decimal or hex; try both
        let wid = w.window_id
          .trim_start_matches("0x");
        let parsed = u32::from_str_radix(wid, 16).or_else(|_| wid.parse::<u32>());

        if let Ok(win) = parsed {
          use x11rb::protocol::xproto::*;
          let _ = conn.set_input_focus(InputFocus::PARENT, win, x11rb::CURRENT_TIME);
          let _ = conn.configure_window(win, &ConfigureWindowAux::new().stack_mode(StackMode::ABOVE));
          let _ = conn.flush();
          let _ = screen; // keep used if warnings
        }
      }
    }
  }
}

#[tauri::command]
fn hide_picker(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(picker) = app.get_webview_window("picker") {
    let _ = picker.hide();
  }
  Ok(())
}

#[tauri::command]
fn list_clips(state: State<AppState>, limit: i64, query: Option<String>) -> Result<Vec<db_mod::Clip>, String> {
  db_mod::list_clips(&state.db_path, limit, query).map_err(|e| e.to_string())
}

#[tauri::command]
fn select_clip(app: tauri::AppHandle, state: tauri::State<AppState>, id: i64) -> Result<SelectResult, String> {
  let content = db_mod::get_clip_content(&state.db_path, id).map_err(|e| e.to_string())?;

  // Set clipboard
  let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
  clipboard.set_text(content).map_err(|e| e.to_string())?;

  // Hide picker
  if let Some(picker) = app.get_webview_window("picker") {
    let _ = picker.set_always_on_top(false);
    let _ = picker.hide();
  }

  // Explicitly re-activate the previous app/window
  restore_previous_focus(&state);

  // Give the OS a moment to apply focus change
  std::thread::sleep(std::time::Duration::from_millis(120));

  // Paste attempt
  let pasted = paste_mod::try_paste();

  Ok(SelectResult { pasted })
}

fn show_picker(app: &tauri::AppHandle) {
  if let Some(win) = app.get_webview_window("picker") {
    let _ = win.show();
    let _ = win.unminimize();
    let _ = win.set_focus();
  }
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // DB path
      let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
      std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
      let db_path = app_data_dir.join("clips.sqlite3");

      db_mod::init_db(&db_path).map_err(|e| e.to_string())?;

      // Manage state
      app.manage(AppState {
        db_path: db_path.clone(),
        last_active: Mutex::new(None),
      });

      // Start watcher
      watcher::start_clipboard_watcher(app.handle().clone(), db_path);

      // Global shortcut plugin registration (Tauri v2)
      #[cfg(desktop)]
      {
        use tauri::Manager;
        use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

        let handle = app.handle().clone();

        handle
          .plugin(
            tauri_plugin_global_shortcut::Builder::new()
              .with_shortcuts(["Ctrl+Shift+V"])
              .map_err(|e| e.to_string())?
              .with_handler(move |app, shortcut, event| {
                if event.state != ShortcutState::Pressed {
                  return;
                }
                if let Ok(w) = get_active_window() {
                  if let Some(state) = app.try_state::<AppState>() {
                    *state.last_active.lock().unwrap() = Some(w);
                  }
                }
                // if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyV) {
                  show_picker(app);
                // }
              })
              .build(),
          )
          .map_err(|e| e.to_string())?;
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![list_clips, select_clip, hide_picker])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
