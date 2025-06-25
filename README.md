# Tensai Music Player

A modern desktop music player built with Tauri, featuring a dark minimalist interface and comprehensive music management capabilities.

## Features

### File Format Support
- Audio: MP3, M4A, WAV, FLAC, OGG
- Video: MP4 (with automatic thumbnail extraction at 5-second mark)

### Music Management
- Direct file access mode
- Watch folder mode with automatic import
- Managed library mode with file organization

### Playback Features
- Standard controls (play, pause, next, previous)
- Volume control with slider
- Progress bar with seek functionality
- Shuffle and repeat modes
- Queue management with drag and drop support
- Gapless playback option

### Library Organization
- Grid view with album artwork
- Recently added and recently played sections
- Context menus for all items
- Inline rename functionality
- Custom artwork editing

### Playlist System
- Create unlimited playlists
- Add/remove songs with checkbox interface
- Custom playlist covers
- Playlist expansion view
- Quick playlist creation

### User Interface
- Pure black background with minimal design
- Aldrich font throughout
- Icon-only sidebar navigation
- Keyboard shortcuts
- Responsive grid layouts

## Building from Source

### Prerequisites
- Node.js (LTS version)
- Rust (stable toolchain)
- Platform-specific dependencies:
  - Windows: WebView2 (usually pre-installed)
  - macOS: Xcode Command Line Tools
  - Linux: webkit2gtk, libappindicator

### Development
```bash
git clone https://github.com/yourusername/tensai-musicplayer
cd tensai-musicplayer
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

The built executables will be in `src-tauri/target/release/bundle/`

## Distribution

### Windows
- Installer: `tensai-musicplayer_x.x.x_x64_en-US.msi`
- Portable: `tensai-musicplayer.exe`

### macOS
- DMG: `tensai-musicplayer_x.x.x_x64.dmg`
- App Bundle: `tensai-musicplayer.app`

### Linux
- AppImage: `tensai-musicplayer_x.x.x_amd64.AppImage`
- Debian: `tensai-musicplayer_x.x.x_amd64.deb`

## Usage

1. Launch the application
2. Click "ADD FILES" to import music
3. Right-click any track for context options
4. Create playlists from the Playlists tab
5. Access settings from the gear icon

## Storage

The application stores data in:
- Windows: `%APPDATA%/tensai-musicplayer`
- macOS: `~/Library/Application Support/tensai-musicplayer`
- Linux: `~/.config/tensai-musicplayer`

## License

MIT License - see LICENSE file for details
