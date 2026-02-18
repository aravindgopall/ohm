# Ohm (One-Hotkey Manager)

Ohm is a clipboard history manager build in Rust + Tauri v2 + React.




https://github.com/user-attachments/assets/0a547712-44ed-47e6-b7b5-28135f998297


## Features
- Clipboard history managed through sqlite
- Global hotkey (`Ctrl + Shift + v`) to opens the paste picker
- Auto Paste
- Dark/Light theme support


## Permissions
Make sure to give the necessary permissions (Accessability etc) for smooth experience.

## Setup

Local Dev setup:
```bash
npm install
cargo tauri dev
```

Build Image:
```bash
npm install
cargo tauri build  # this generates the image for the corresponding os.
```

## Flow
- Once you open the application, you can feel free to minimize it.
- Anywhere you can press `Ctrl + Shift + v` that opens the paste picker.
- Select the corresponding message through arrow or search and press enter. This would copy the message and also auto paste to last focus window.

## TODO
- [ ] Test Auto paste in Windows/Linux 
