const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const sdkManager = require('./sdk-manager');
const adbManager = require('./adb-manager');

let mainWindow;
let logcatProcess = null;
let deviceMonitorInterval = null;
let lastDeviceList = [];

function createWindow() {
  const iconPath = path.join(__dirname, '../images/adb_logo.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    icon: icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the app
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Stop device monitoring when window closes
    if (deviceMonitorInterval) {
      clearInterval(deviceMonitorInterval);
      deviceMonitorInterval = null;
    }
  });

  // Start device monitoring
  startDeviceMonitoring();
}

function startDeviceMonitoring() {
  // Check for device changes every 2 seconds
  deviceMonitorInterval = setInterval(async () => {
    if (!mainWindow) return;

    try {
      const sdkPath = path.join(app.getAppPath(), 'android-sdk');
      
      // Check if SDK exists first
      const sdkStatus = await sdkManager.checkSDK(sdkPath);
      if (!sdkStatus.exists || !sdkStatus.upToDate) {
        return;
      }

      const result = await adbManager.getDevices(sdkPath);
      const currentDevices = result.devices || [];
      
      // Compare with last known device list
      const currentIds = currentDevices.map(d => d.id).sort();
      const lastIds = lastDeviceList.map(d => d.id).sort();
      
      // Check if device list changed
      const hasChanged = JSON.stringify(currentIds) !== JSON.stringify(lastIds);
      
      if (hasChanged) {
        // Find newly connected devices
        const newDevices = currentDevices.filter(d => !lastIds.includes(d.id));
        // Find disconnected devices
        const removedDevices = lastDeviceList.filter(d => !currentIds.includes(d.id));
        
        // Update last device list
        lastDeviceList = currentDevices;
        
        // Notify renderer process
        mainWindow.webContents.send('devices-changed', {
          devices: currentDevices,
          newDevices,
          removedDevices
        });
      }
    } catch (error) {
      console.error('Error monitoring devices:', error);
    }
  }, 2000);
}

app.whenReady().then(async () => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('check-sdk', async () => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const status = await sdkManager.checkSDK(sdkPath);
    return status;
  } catch (error) {
    console.error('Error checking SDK:', error);
    return { exists: false, upToDate: false, error: error.message };
  }
});

ipcMain.handle('download-sdk', async (event) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    // Send progress updates
    const onProgress = (progress) => {
      mainWindow.webContents.send('sdk-download-progress', progress);
    };
    
    await sdkManager.downloadSDK(sdkPath, onProgress);
    return { success: true };
  } catch (error) {
    console.error('Error downloading SDK:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-devices', async () => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const devices = await adbManager.getDevices(sdkPath);
    return devices;
  } catch (error) {
    console.error('Error getting devices:', error);
    return { error: error.message, devices: [] };
  }
});

ipcMain.handle('get-device-info', async (event, deviceId) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const info = await adbManager.getDeviceInfo(sdkPath, deviceId);
    return info;
  } catch (error) {
    console.error('Error getting device info:', error);
    return { error: error.message };
  }
});

ipcMain.handle('reboot-device', async (event, deviceId, mode) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.rebootDevice(sdkPath, deviceId, mode);
    return result;
  } catch (error) {
    console.error('Error rebooting device:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('take-screenshot', async (event, deviceId) => {
  try {
    const { dialog } = require('electron');
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    // Show save dialog
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Screenshot',
      defaultPath: `screenshot-${Date.now()}.png`,
      filters: [{ name: 'PNG Images', extensions: ['png'] }]
    });
    
    if (!filePath) {
      return { success: false, cancelled: true };
    }
    
    const result = await adbManager.takeScreenshot(sdkPath, deviceId, filePath);
    return result;
  } catch (error) {
    console.error('Error taking screenshot:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-installed-apps', async (event, deviceId, includeSystem) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.getInstalledApps(sdkPath, deviceId, includeSystem);
    return result;
  } catch (error) {
    console.error('Error getting installed apps:', error);
    return { error: error.message, apps: [] };
  }
});

ipcMain.handle('install-app', async (event, deviceId) => {
  try {
    const { dialog } = require('electron');
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    // Show open dialog for APK file
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select APK File',
      filters: [{ name: 'APK Files', extensions: ['apk'] }],
      properties: ['openFile']
    });
    
    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    
    const result = await adbManager.installApp(sdkPath, deviceId, filePaths[0]);
    return result;
  } catch (error) {
    console.error('Error installing app:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('uninstall-app', async (event, deviceId, packageName) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.uninstallApp(sdkPath, deviceId, packageName);
    return result;
  } catch (error) {
    console.error('Error uninstalling app:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-app-data', async (event, deviceId, packageName) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.clearAppData(sdkPath, deviceId, packageName);
    return result;
  } catch (error) {
    console.error('Error clearing app data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('force-stop-app', async (event, deviceId, packageName) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.forceStopApp(sdkPath, deviceId, packageName);
    return result;
  } catch (error) {
    console.error('Error force stopping app:', error);
    return { success: false, error: error.message };
  }
});

// Tools Tab Handlers
ipcMain.handle('execute-shell-command', async (event, deviceId, command) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.executeShellCommand(sdkPath, deviceId, command);
    return result;
  } catch (error) {
    console.error('Error executing shell command:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-logcat', async (event, deviceId, filters) => {
  try {
    // Stop existing logcat if running
    if (logcatProcess) {
      logcatProcess.kill();
      logcatProcess = null;
    }

    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.startLogcat(sdkPath, deviceId, filters);
    
    if (!result.success) {
      return result;
    }

    // Start logcat process
    logcatProcess = spawn(result.adbPath, result.args);
    
    logcatProcess.stdout.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        // Parse logcat line format: MM-DD HH:MM:SS.mmm PRIORITY/TAG(PID): message
        const match = line.match(/^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([VDIWEF])\/(.+?)\(\s*\d+\):\s*(.+)$/);
        
        if (match) {
          const [, time, priority, tag, message] = match;
          
          // Apply search filter if provided
          if (filters.search && !message.toLowerCase().includes(filters.search.toLowerCase())) {
            return;
          }
          
          event.sender.send('logcat-output', {
            time,
            priority,
            tag: tag.trim(),
            message: message.trim()
          });
        } else if (line.trim()) {
          // Send unparsed lines as info
          event.sender.send('logcat-output', {
            time: new Date().toLocaleTimeString(),
            priority: 'I',
            tag: 'System',
            message: line.trim()
          });
        }
      });
    });

    logcatProcess.stderr.on('data', (data) => {
      console.error('Logcat stderr:', data.toString());
    });

    logcatProcess.on('close', (code) => {
      console.log('Logcat process exited with code:', code);
      logcatProcess = null;
    });

    return { success: true, message: 'Logcat started' };
  } catch (error) {
    console.error('Error starting logcat:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-logcat', async () => {
  try {
    if (logcatProcess) {
      logcatProcess.kill();
      logcatProcess = null;
      return { success: true, message: 'Logcat stopped' };
    }
    return { success: true, message: 'Logcat was not running' };
  } catch (error) {
    console.error('Error stopping logcat:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-logcat', async (event, deviceId) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.clearLogcat(sdkPath, deviceId);
    return result;
  } catch (error) {
    console.error('Error clearing logcat:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('push-file', async (event, deviceId, remotePath) => {
  try {
    const { dialog } = require('electron');
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select File to Push',
      properties: ['openFile']
    });
    
    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    
    const result = await adbManager.pushFile(sdkPath, deviceId, filePaths[0], remotePath);
    return result;
  } catch (error) {
    console.error('Error pushing file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pull-file', async (event, deviceId, remotePath) => {
  try {
    const { dialog } = require('electron');
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save File As',
      defaultPath: path.basename(remotePath)
    });
    
    if (!filePath) {
      return { success: false, cancelled: true };
    }
    
    const result = await adbManager.pullFile(sdkPath, deviceId, remotePath, filePath);
    return result;
  } catch (error) {
    console.error('Error pulling file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-screen-recording', async (event, deviceId, options) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.startScreenRecording(sdkPath, deviceId, options);
    return result;
  } catch (error) {
    console.error('Error starting screen recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-screen-recording', async (event, deviceId, remotePath) => {
  try {
    const { dialog } = require('electron');
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Recording As',
      defaultPath: `recording-${Date.now()}.mp4`,
      filters: [{ name: 'Video Files', extensions: ['mp4'] }]
    });
    
    if (!filePath) {
      return { success: false, cancelled: true };
    }
    
    const result = await adbManager.stopScreenRecording(sdkPath, deviceId, remotePath, filePath);
    return result;
  } catch (error) {
    console.error('Error stopping screen recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-key-event', async (event, deviceId, keyCode) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.sendKeyEvent(sdkPath, deviceId, keyCode);
    return result;
  } catch (error) {
    console.error('Error sending key event:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-text', async (event, deviceId, text) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.sendText(sdkPath, deviceId, text);
    return result;
  } catch (error) {
    console.error('Error sending text:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-tap', async (event, deviceId, x, y) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.sendTap(sdkPath, deviceId, x, y);
    return result;
  } catch (error) {
    console.error('Error sending tap:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-swipe', async (event, deviceId, x1, y1, x2, y2, duration) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.sendSwipe(sdkPath, deviceId, x1, y1, x2, y2, duration);
    return result;
  } catch (error) {
    console.error('Error sending swipe:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('connect-wireless', async (event, deviceId, port) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.connectWireless(sdkPath, deviceId, port);
    return result;
  } catch (error) {
    console.error('Error connecting wireless:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-wireless', async (event, ipAddress) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.disconnectWireless(sdkPath, ipAddress);
    return result;
  } catch (error) {
    console.error('Error disconnecting wireless:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-backup', async (event, deviceId, options) => {
  try {
    const { dialog } = require('electron');
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Backup As',
      defaultPath: `backup-${Date.now()}.ab`,
      filters: [{ name: 'Android Backup', extensions: ['ab'] }]
    });
    
    if (!filePath) {
      return { success: false, cancelled: true };
    }
    
    const result = await adbManager.createBackup(sdkPath, deviceId, filePath, options);
    return result;
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('restore-backup', async (event, deviceId) => {
  try {
    const { dialog } = require('electron');
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup File',
      filters: [{ name: 'Android Backup', extensions: ['ab'] }],
      properties: ['openFile']
    });
    
    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    
    const result = await adbManager.restoreBackup(sdkPath, deviceId, filePaths[0]);
    return result;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-system-info', async (event, deviceId, service) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.getSystemInfo(sdkPath, deviceId, service);
    return result;
  } catch (error) {
    console.error('Error getting system info:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-processes', async (event, deviceId) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.listProcesses(sdkPath, deviceId);
    return result;
  } catch (error) {
    console.error('Error listing processes:', error);
    return { success: false, error: error.message };
  }
});

// File Manager Handlers
ipcMain.handle('list-directory', async (event, deviceId, dirPath) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.listDirectory(sdkPath, deviceId, dirPath);
    return result;
  } catch (error) {
    console.error('Error listing directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, deviceId, filePath) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.deleteFile(sdkPath, deviceId, filePath);
    return result;
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-directory', async (event, deviceId, dirPath) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.createDirectory(sdkPath, deviceId, dirPath);
    return result;
  } catch (error) {
    console.error('Error creating directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-file', async (event, deviceId, oldPath, newPath) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.renameFile(sdkPath, deviceId, oldPath, newPath);
    return result;
  } catch (error) {
    console.error('Error renaming file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-files', async (event, deviceId, searchPath, pattern) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.searchFiles(sdkPath, deviceId, searchPath, pattern);
    return result;
  } catch (error) {
    console.error('Error searching files:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('push-file-path', async (event, deviceId, localPath, remotePath) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.pushFile(sdkPath, deviceId, localPath, remotePath);
    return result;
  } catch (error) {
    console.error('Error pushing file:', error);
    return { success: false, error: error.message };
  }
});

// Connection Management Handlers
ipcMain.handle('pair-wireless-device', async (event, ip, port, pairingCode) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.pairWirelessDevice(sdkPath, ip, port, pairingCode);
    return result;
  } catch (error) {
    console.error('Error pairing wireless device:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('connect-wireless-ip', async (event, ip, port) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.connectWirelessIP(sdkPath, ip, port);
    return result;
  } catch (error) {
    console.error('Error connecting to wireless device:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-device', async (event, deviceId) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.disconnectDevice(sdkPath, deviceId);
    return result;
  } catch (error) {
    console.error('Error disconnecting device:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('restart-adb-server', async (event) => {
  try {
    const sdkPath = path.join(app.getAppPath(), 'android-sdk');
    const result = await adbManager.restartAdbServer(sdkPath);
    return result;
  } catch (error) {
    console.error('Error restarting ADB server:', error);
    return { success: false, error: error.message };
  }
});
