const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkSDK: () => ipcRenderer.invoke('check-sdk'),
  downloadSDK: () => ipcRenderer.invoke('download-sdk'),
  getDevices: () => ipcRenderer.invoke('get-devices'),
  getDeviceInfo: (deviceId) => ipcRenderer.invoke('get-device-info', deviceId),
  rebootDevice: (deviceId, mode) => ipcRenderer.invoke('reboot-device', deviceId, mode),
  takeScreenshot: (deviceId) => ipcRenderer.invoke('take-screenshot', deviceId),
  getInstalledApps: (deviceId, includeSystem) => ipcRenderer.invoke('get-installed-apps', deviceId, includeSystem),
  installApp: (deviceId) => ipcRenderer.invoke('install-app', deviceId),
  uninstallApp: (deviceId, packageName) => ipcRenderer.invoke('uninstall-app', deviceId, packageName),
  clearAppData: (deviceId, packageName) => ipcRenderer.invoke('clear-app-data', deviceId, packageName),
  forceStopApp: (deviceId, packageName) => ipcRenderer.invoke('force-stop-app', deviceId, packageName),
  // Tools Tab APIs
  executeShellCommand: (deviceId, command) => ipcRenderer.invoke('execute-shell-command', deviceId, command),
  startLogcat: (deviceId, filters) => ipcRenderer.invoke('start-logcat', deviceId, filters),
  stopLogcat: () => ipcRenderer.invoke('stop-logcat'),
  clearLogcat: (deviceId) => ipcRenderer.invoke('clear-logcat', deviceId),
  onLogcatOutput: (callback) => {
    ipcRenderer.on('logcat-output', (event, data) => callback(data));
  },
  pushFile: (deviceId, remotePath) => ipcRenderer.invoke('push-file', deviceId, remotePath),
  pullFile: (deviceId, remotePath) => ipcRenderer.invoke('pull-file', deviceId, remotePath),
  startScreenRecording: (deviceId, options) => ipcRenderer.invoke('start-screen-recording', deviceId, options),
  stopScreenRecording: (deviceId, remotePath) => ipcRenderer.invoke('stop-screen-recording', deviceId, remotePath),
  sendKeyEvent: (deviceId, keyCode) => ipcRenderer.invoke('send-key-event', deviceId, keyCode),
  sendText: (deviceId, text) => ipcRenderer.invoke('send-text', deviceId, text),
  sendTap: (deviceId, x, y) => ipcRenderer.invoke('send-tap', deviceId, x, y),
  sendSwipe: (deviceId, x1, y1, x2, y2, duration) => ipcRenderer.invoke('send-swipe', deviceId, x1, y1, x2, y2, duration),
  connectWireless: (deviceId, port) => ipcRenderer.invoke('connect-wireless', deviceId, port),
  disconnectWireless: (ipAddress) => ipcRenderer.invoke('disconnect-wireless', ipAddress),
  createBackup: (deviceId, options) => ipcRenderer.invoke('create-backup', deviceId, options),
  restoreBackup: (deviceId) => ipcRenderer.invoke('restore-backup', deviceId),
  getSystemInfo: (deviceId, service) => ipcRenderer.invoke('get-system-info', deviceId, service),
  listProcesses: (deviceId) => ipcRenderer.invoke('list-processes', deviceId),
  // File Manager APIs
  listDirectory: (deviceId, dirPath) => ipcRenderer.invoke('list-directory', deviceId, dirPath),
  deleteFile: (deviceId, filePath) => ipcRenderer.invoke('delete-file', deviceId, filePath),
  createDirectory: (deviceId, dirPath) => ipcRenderer.invoke('create-directory', deviceId, dirPath),
  renameFile: (deviceId, oldPath, newPath) => ipcRenderer.invoke('rename-file', deviceId, oldPath, newPath),
  searchFiles: (deviceId, searchPath, pattern) => ipcRenderer.invoke('search-files', deviceId, searchPath, pattern),
  pushFilePath: (deviceId, localPath, remotePath) => ipcRenderer.invoke('push-file-path', deviceId, localPath, remotePath),
  // Connection Management APIs
  pairWirelessDevice: (ip, port, pairingCode) => ipcRenderer.invoke('pair-wireless-device', ip, port, pairingCode),
  connectWirelessIP: (ip, port) => ipcRenderer.invoke('connect-wireless-ip', ip, port),
  disconnectDevice: (deviceId) => ipcRenderer.invoke('disconnect-device', deviceId),
  restartAdbServer: () => ipcRenderer.invoke('restart-adb-server'),
  onSDKDownloadProgress: (callback) => {
    ipcRenderer.on('sdk-download-progress', (event, progress) => callback(progress));
  },
  onDevicesChanged: (callback) => {
    ipcRenderer.on('devices-changed', (event, data) => callback(data));
  }
});
