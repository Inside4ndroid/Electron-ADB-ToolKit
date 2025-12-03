# ⚡ Electron ADB Toolkit

A comprehensive Electron-powered Android Debug Bridge (ADB) toolkit that brings powerful device management and debugging tools into a beautiful desktop application with dual theme support.

## ✨ Features

### 🏠 Home Dashboard
- **Automatic Device Detection**: Real-time monitoring of connected devices via USB or wireless ADB
- **SDK Status Display**: Visual indicator showing Android SDK installation status
- **Device Grid View**: Quick overview of all connected devices with selection
- **Quick Actions**: Fast access to common operations for selected devices

### 📱 Device Management
- **Device Information**: Comprehensive hardware, software, battery, storage, and network details
- **Device Actions**: Reboot options (normal, recovery, bootloader)
- **Real-time Monitoring**: Automatic updates when devices connect/disconnect

### 📦 App Management
- **View Installed Apps**: List all installed apps (user and system)
- **Install APKs**: Easy APK installation with file picker
- **Uninstall Apps**: Remove unwanted applications
- **App Actions**: Force stop apps and clear app data
- **Search & Filter**: Quickly find apps with search functionality

### 🐚 Shell Terminal
- **Execute Commands**: Run any ADB shell command directly
- **Command History**: Track all executed commands and outputs
- **Error Handling**: Clear display of stdout and stderr

### 📋 Logcat Viewer
- **Real-time Logs**: Stream device logs in real-time
- **Priority Filtering**: Filter by log level (Verbose, Debug, Info, Warning, Error, Fatal)
- **Tag Filtering**: Filter logs by tag name
- **Search**: Search through log messages
- **Start/Stop Control**: Pause and resume log streaming

### 📂 File Manager
- **Browse Device Files**: Navigate device file system
- **Create Folders**: Create new directories on device
- **Delete Files**: Remove files and folders
- **Rename/Move**: Rename and move files
- **Search**: Find files by pattern
- **Drag & Drop**: Drag files from computer to device
- **Navigation History**: Back/forward navigation with breadcrumbs

### 📸 Screen Tools
- **Screenshots**: Capture device screen instantly
- **Screen Recording**: Record device screen with options

### 📱 Input Simulation
- **Send Text**: Type text on device
- **Key Events**: Send hardware key presses (Home, Back, Power, etc.)
- **Tap Simulation**: Simulate screen taps with coordinates
- **Swipe Gestures**: Perform swipe actions

### 🔧 System Commands
- **System Information**: Query device system services
- **Process Management**: View running processes

### 🔌 Connection Manager
- **Wireless Pairing**: Pair devices via wireless ADB with pairing code
- **Connect/Disconnect**: Manage wireless connections
- **Connection History**: Track and quickly reconnect to previous devices
- **Auto-reconnect**: Optional automatic reconnection
- **ADB Server Control**: Restart ADB server when needed

### 💾 Backup & Restore
- **Create Backups**: Backup device data and apps
- **Restore**: Restore from backup files
- **Backup Options**: Configure what to include in backups

### 🎨 User Interface
- **Dual Theme Support**: Toggle between dark and lighter dark themes
- **Built-in Help**: Comprehensive help dialog with getting started guide
- **Responsive Design**: Adapts to different screen sizes
- **Modern UI**: Clean, intuitive interface with smooth animations

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Inside4ndroid/Electron-ADB-ToolKit.git
cd Electron-ADB-ToolKit
```

2. Install dependencies:
```bash
npm install
```

3. Run the application in development mode:
```bash
npm start
```

## 🚀 Quick Start

### First Time Setup

1. **Launch the Application**: Run `npm start` to launch the toolkit

2. **Android SDK Check**: The app automatically checks for Android SDK platform tools
   - If missing, it will prompt you to download
   - The SDK downloads and installs automatically
   - No manual configuration needed!

3. **Enable USB Debugging** on your Android device:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times to enable Developer Options
   - Go to **Settings** → **Developer Options**
   - Enable **USB Debugging**

4. **Connect Your Device**: 
   - Connect via USB cable
   - Accept the debugging authorization on your device
   - Your device will appear in the Home section automatically

### Using the Toolkit

1. **Select a Device**: Click on a device card in the Home section to select it

2. **Access Tools**: Use the sidebar to navigate between different tools:
   - 📱 **Device Information** - View detailed device specs
   - 🔧 **Device Actions** - Reboot options
   - 📦 **App Management** - Manage installed apps
   - 🐚 **Shell Terminal** - Execute ADB commands
   - 📋 **Logcat Viewer** - View real-time logs
   - 📂 **File Manager** - Browse device files
   - 📸 **Screen Tools** - Screenshots and recording
   - And more!

3. **Theme Toggle**: Click the sun/moon icon in the header to switch themes

4. **Get Help**: Click the question mark icon for detailed help

## Development

### Project Structure
```
Electron-ADB-Toolkit/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.js        # Main app, IPC handlers, device monitoring
│   │   ├── preload.js     # Secure IPC bridge
│   │   ├── sdk-manager.js # SDK download & management
│   │   └── adb-manager.js # All ADB operations (40+ functions)
│   └── renderer/          # React UI
│       ├── App.jsx        # Main app component with device monitoring
│       ├── ToolsTab.jsx   # Unified tools interface with 12 sections
│       ├── index.css      # Complete styling with dual themes
│       └── main.jsx       # React entry point
├── android-sdk/           # Android SDK platform tools (auto-managed)
├── index.html             # HTML entry point
├── vite.config.js         # Vite build configuration
├── package.json           # Dependencies and scripts
└── README.md              # Complete documentation (this file)
```

### Scripts

- `npm start` - Run the application in development mode
- `npm run dev` - Run with Vite dev server and Electron
- `npm run build` - Build the renderer for production
- `npm run build:win` - Build Windows installer
- `npm run build:mac` - Build macOS installer
- `npm run build:linux` - Build Linux installer

## Building for Production

To build the application for your platform:

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

## 🔧 Technologies Used

- **Electron 28.0.0**: Cross-platform desktop framework
- **React 18.2.0**: UI library with hooks
- **Vite 5.0.8**: Lightning-fast build tool and dev server
- **Node.js**: Backend runtime for ADB operations
- **Android SDK Platform Tools**: Official ADB command-line tools
- **IPC Communication**: Secure main-renderer communication via contextBridge

## 📱 Supported Platforms

- **Windows**: Windows 10/11 (x64)
- **macOS**: macOS 10.13+ (Intel & Apple Silicon)
- **Linux**: Ubuntu 18.04+, Debian, Fedora, Arch

## 🔐 Android SDK Management

The toolkit provides fully automatic SDK management:
- ✅ Automatic version checking on startup
- ✅ One-click download and installation
- ✅ Progress tracking with real-time updates
- ✅ Platform-specific downloads (Windows, macOS, Linux)
- ✅ Automatic extraction and configuration
- ✅ Stored locally in `android-sdk/` folder
- ✅ No manual PATH configuration needed

## 🌐 Wireless ADB Support

Connect to devices wirelessly:
- **Pairing Method**: Use pairing code from device settings
- **Direct Connect**: Connect to known IP:PORT
- **Connection History**: Save and reuse connections
- **Auto-reconnect**: Optionally reconnect on app start

## 🎯 Key Features Highlight

### Real-time Device Monitoring
- Automatically detects when devices connect or disconnect
- Updates UI every 2 seconds without manual refresh
- Clears selection if device disconnects
- Works with both USB and wireless connections

### Comprehensive File Manager
- Full directory navigation with breadcrumbs
- Drag & drop support for file uploads
- Search files by pattern
- Create, delete, rename operations
- Back/forward navigation history

### Live Logcat Streaming
- Real-time log streaming from device
- Client-side filtering (tag, search)
- Server-side priority filtering
- Automatic log parsing with color coding
- Start/stop control

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Google** - For Android Debug Bridge and Platform Tools
- **Electron Team** - For the amazing cross-platform framework
- **React Team** - For the powerful UI library
- **Open Source Community** - For continuous inspiration and support

## 📚 Additional Resources

- [Android Debug Bridge Documentation](https://developer.android.com/studio/command-line/adb)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)

## 🐛 Known Issues

- Logcat priority filter requires restart of logcat to take effect
- Some devices may require additional drivers on Windows

## 🗺️ Roadmap

Future enhancements planned:
- [ ] APK analyzer and signer
- [ ] Batch operations for multiple devices
- [ ] Custom ADB command presets
- [ ] Export logs and device info
- [ ] Screenshot comparison tool
- [ ] Performance monitoring dashboard

## 💬 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the built-in help dialog (? icon)

---

**Current Version**: 1.0.0 - Full-featured ADB toolkit with comprehensive device management capabilities
