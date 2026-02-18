use enigo::{Enigo, Key, Settings, Direction::{ Click, Press, Release}};
use enigo::Keyboard;

pub fn try_paste() -> bool {
  // NOTE:
  // - On macOS, this typically requires Accessibility permission.
  // - On Wayland, this may fail or do nothing depending on compositor/security policies.
  //
  // We treat any panic/error-ish situation as "not pasted", and fall back.
  let result = std::panic::catch_unwind(|| {
  let mut enigo = Enigo::new(&Settings::default()).unwrap();

    #[cfg(target_os = "macos")]
    {
      enigo.key(Key::Meta, Press);
      enigo.key(Key::Unicode('v'), Click);
      enigo.key(Key::Meta, Release);
    }

    #[cfg(not(target_os = "macos"))]
    {
      enigo.key(Key::Control, Press);
      enigo.key(Key::Unicode('v'), Click);
      enigo.key(Key::Control, Release);
    }
  });

  result.is_ok()
}