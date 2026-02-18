use crate::db;
use arboard::Clipboard;
use sha2::{Digest, Sha256};
use std::{path::PathBuf, time::Duration};
use tauri::{AppHandle, Manager};

fn hash_text(s: &str) -> String {
  let mut hasher = Sha256::new();
  hasher.update(s.as_bytes());
  hex::encode(hasher.finalize())
}

pub fn start_clipboard_watcher(app: AppHandle, db_path: PathBuf) {
  tauri::async_runtime::spawn(async move {
    let mut clipboard = match Clipboard::new() {
      Ok(c) => c,
      Err(_) => return, // clipboard unavailable; you can log here
    };

    let mut last_hash: Option<String> = None;

    loop {
      // Poll
      if let Ok(text) = clipboard.get_text() {
        let text = text.trim_end_matches('\0').to_string();
        let trimmed = text.trim();

        // Ignore empty
        if !trimmed.is_empty() {
          // Guard size (avoid giant pastes)
          if trimmed.len() <= 100_000 {
            let h = hash_text(trimmed);

            // Dedupe consecutive identical copies
            if last_hash.as_deref() != Some(&h) {
              last_hash = Some(h.clone());

              let ts = time::OffsetDateTime::now_utc().unix_timestamp();
              let _ = db::insert_clip(&db_path, trimmed, ts, &h);

              // Optionally notify UI about new clip (handy later)
              // let _ = app.emit("clip:new", ());
              let _ = app; // keep app used if you remove emit
            }
          }
        }
      }

      tokio::time::sleep(Duration::from_millis(500)).await;
    }
  });
}