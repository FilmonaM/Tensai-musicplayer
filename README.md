# Tensai Music Player

A modern desktop music player built with Tauri. Simple, fast, and completely offline.

## Download

### Windows
- Download the `.exe` file from the latest release
- No installation required - just run the executable

### macOS
- Download the `.dmg` file from the latest release
- Drag to Applications folder to install

### Linux
- Download the `.AppImage` file from the latest release
- Make executable: `chmod +x tensai-musicplayer.AppImage`
- Run: `./tensai-musicplayer.AppImage`

## Features

- **Dark minimalist interface** - Pure black background with clean design
- **Local music library** - Scan and organize your music files
- **Playlist support** - Create and manage playlists
- **Metadata extraction** - Automatically reads artist and album info
- **Offline only** - No internet required, everything stored locally
- **Cross-platform** - Works on Windows, macOS, and Linux

## Supported Formats

- **Audio**: MP3, M4A, WAV, FLAC, OGG
- **Video**: MP4 (audio extraction)

## Usage

1. **Launch the app**
2. **Add music** - Click "ADD FILES" to import music from your computer
3. **Create playlists** - Organize your music into playlists
4. **Play music** - Use the player controls at the bottom

## Data Storage

The app stores all data locally in CSV files:
- Music library information
- Playlists and song lists
- Play counts and recently played

No internet connection required - everything works offline.

## Building from Source

If you want to build from source:

```bash
# Prerequisites
# - Node.js (LTS)
# - Rust (stable)

# Clone and build
git clone https://github.com/yourusername/tensai-musicplayer
cd tensai-musicplayer
npm install
npm run build
```

## License

MIT License
