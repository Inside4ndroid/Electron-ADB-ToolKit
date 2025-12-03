import React, { useState, useEffect, useRef } from 'react';

function ToolsTab({ devices, selectedDevice, sdkStatus, detailedDeviceInfo, installedApps, downloadProgress, onLoadDeviceInfo, onReboot, onScreenshot, onLoadApps, onInstallApp, onUninstallApp, onClearAppData, onForceStopApp, onDownloadSDK }) {
  const [activeToolSection, setActiveToolSection] = useState('home');
  const [shellCommand, setShellCommand] = useState('');
  const [shellHistory, setShellHistory] = useState([]);
  const [logcatOutput, setLogcatOutput] = useState([]);
  const [logcatFilter, setLogcatFilter] = useState({ priority: 'V', tag: '', search: '' });
  const [isLogcatRunning, setIsLogcatRunning] = useState(false);
  const [remotePath, setRemotePath] = useState('/sdcard/');
  const [pullPath, setPullPath] = useState('/sdcard/');
  const [recording, setRecording] = useState(false);
  const [recordingPath, setRecordingPath] = useState('');
  const [inputText, setInputText] = useState('');
  const [tapX, setTapX] = useState('');
  const [tapY, setTapY] = useState('');
  const [wirelessPort, setWirelessPort] = useState('5555');
  const [wirelessIP, setWirelessIP] = useState('');
  const [backupOptions, setBackupOptions] = useState({ apk: true, shared: false, all: true, system: false });
  const [systemService, setSystemService] = useState('battery');
  const [systemOutput, setSystemOutput] = useState('');
  const [processes, setProcesses] = useState('');
  const [currentPath, setCurrentPath] = useState('/sdcard/');
  const [fileItems, setFileItems] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [pathHistory, setPathHistory] = useState(['/sdcard/']);
  const [searchPattern, setSearchPattern] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [pairIP, setPairIP] = useState('');
  const [pairPort, setPairPort] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [connectIP, setConnectIP] = useState('');
  const [connectPort, setConnectPort] = useState('5555');
  const [connectionHistory, setConnectionHistory] = useState([]);
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [showSystemApps, setShowSystemApps] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  
  const shellOutputRef = useRef(null);
  const logcatOutputRef = useRef(null);
  const fileDropRef = useRef(null);

  useEffect(() => {
    if (shellOutputRef.current) {
      shellOutputRef.current.scrollTop = shellOutputRef.current.scrollHeight;
    }
  }, [shellHistory]);

  useEffect(() => {
    if (logcatOutputRef.current) {
      logcatOutputRef.current.scrollTop = logcatOutputRef.current.scrollHeight;
    }
  }, [logcatOutput]);

  useEffect(() => {
    if (selectedDevice && activeToolSection === 'filemanager') {
      loadDirectory(currentPath);
    }
  }, [selectedDevice, activeToolSection]);

  useEffect(() => {
    if (selectedDevice) {
      if (activeToolSection === 'deviceinfo' && !detailedDeviceInfo) {
        onLoadDeviceInfo(selectedDevice);
      }
      if (activeToolSection === 'appmanagement' && installedApps.length === 0) {
        onLoadApps(showSystemApps);
      }
    }
  }, [selectedDevice, activeToolSection]);

  useEffect(() => {
    const loadHistory = localStorage.getItem('connectionHistory');
    if (loadHistory) {
      setConnectionHistory(JSON.parse(loadHistory));
    }

    // Listen for logcat output
    window.electronAPI.onLogcatOutput((data) => {
      setLogcatOutput(prev => [...prev, data]);
    });
  }, []);

  useEffect(() => {
    if (autoReconnect && devices.length === 0) {
      // Auto-reconnect logic could be implemented here
    }
  }, [autoReconnect, devices]);

  // Home section can be shown even without SDK or device
  // Other sections require SDK and device

  const handleShellCommand = async () => {
    if (!shellCommand.trim()) return;
    
    const cmd = shellCommand.trim();
    setShellHistory(prev => [...prev, { type: 'command', text: `$ ${cmd}` }]);
    setShellCommand('');
    
    try {
      const result = await window.electronAPI.executeShellCommand(selectedDevice.id, cmd);
      if (result.stdout) {
        setShellHistory(prev => [...prev, { type: 'output', text: result.stdout }]);
      }
      if (result.stderr) {
        setShellHistory(prev => [...prev, { type: 'error', text: result.stderr }]);
      }
    } catch (error) {
      setShellHistory(prev => [...prev, { type: 'error', text: error.message }]);
    }
  };

  const clearShellHistory = () => {
    setShellHistory([]);
  };

  const handleLogcatToggle = async () => {
    if (isLogcatRunning) {
      setIsLogcatRunning(false);
      try {
        await window.electronAPI.stopLogcat();
      } catch (error) {
        console.error('Error stopping logcat:', error);
      }
    } else {
      setIsLogcatRunning(true);
      setLogcatOutput([{ 
        priority: 'I', 
        tag: 'System', 
        message: 'Starting logcat...', 
        time: new Date().toLocaleTimeString() 
      }]);
      
      try {
        const result = await window.electronAPI.startLogcat(selectedDevice.id, {
          priority: logcatFilter.priority,
          tag: logcatFilter.tag,
          search: logcatFilter.search
        });
        
        if (!result.success) {
          setLogcatOutput(prev => [...prev, { 
            priority: 'E', 
            tag: 'System', 
            message: `Failed to start logcat: ${result.error}`, 
            time: new Date().toLocaleTimeString() 
          }]);
          setIsLogcatRunning(false);
        }
      } catch (error) {
        setLogcatOutput(prev => [...prev, { 
          priority: 'E', 
          tag: 'System', 
          message: `Error: ${error.message}`, 
          time: new Date().toLocaleTimeString() 
        }]);
        setIsLogcatRunning(false);
      }
    }
  };

  const handleClearLogcat = async () => {
    try {
      await window.electronAPI.clearLogcat(selectedDevice.id);
      setLogcatOutput([]);
    } catch (error) {
      alert('Error clearing logcat: ' + error.message);
    }
  };

  const handlePushFile = async () => {
    try {
      const result = await window.electronAPI.pushFile(selectedDevice.id, remotePath);
      if (result.success) {
        alert(result.message);
      } else if (!result.cancelled) {
        alert('Failed to push file: ' + result.error);
      }
    } catch (error) {
      alert('Error pushing file: ' + error.message);
    }
  };

  const handlePullFile = async () => {
    try {
      const result = await window.electronAPI.pullFile(selectedDevice.id, pullPath);
      if (result.success) {
        alert(result.message);
      } else if (!result.cancelled) {
        alert('Failed to pull file: ' + result.error);
      }
    } catch (error) {
      alert('Error pulling file: ' + error.message);
    }
  };

  const handleStartRecording = async () => {
    try {
      const options = { timeLimit: 180 };
      const result = await window.electronAPI.startScreenRecording(selectedDevice.id, options);
      if (result.success) {
        setRecording(true);
        setRecordingPath(result.remotePath);
        alert('Recording started! Maximum duration: 3 minutes');
      }
    } catch (error) {
      alert('Error starting recording: ' + error.message);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await window.electronAPI.stopScreenRecording(selectedDevice.id, recordingPath);
      if (result.success) {
        setRecording(false);
        setRecordingPath('');
        alert('Recording saved to: ' + result.path);
      } else if (!result.cancelled) {
        alert('Failed to stop recording: ' + result.error);
      }
    } catch (error) {
      alert('Error stopping recording: ' + error.message);
    }
  };

  const handleKeyEvent = async (keyCode) => {
    try {
      await window.electronAPI.sendKeyEvent(selectedDevice.id, keyCode);
    } catch (error) {
      alert('Error sending key event: ' + error.message);
    }
  };

  const handleSendText = async () => {
    if (!inputText) return;
    try {
      await window.electronAPI.sendText(selectedDevice.id, inputText);
      setInputText('');
    } catch (error) {
      alert('Error sending text: ' + error.message);
    }
  };

  const handleTap = async () => {
    if (!tapX || !tapY) return;
    try {
      await window.electronAPI.sendTap(selectedDevice.id, parseInt(tapX), parseInt(tapY));
    } catch (error) {
      alert('Error sending tap: ' + error.message);
    }
  };

  const handleWirelessConnect = async () => {
    try {
      const result = await window.electronAPI.connectWireless(selectedDevice.id, parseInt(wirelessPort));
      if (result.success) {
        setWirelessIP(result.ip);
        alert(result.message);
      }
    } catch (error) {
      alert('Error connecting wireless: ' + error.message);
    }
  };

  const handleWirelessDisconnect = async () => {
    if (!wirelessIP) return;
    try {
      await window.electronAPI.disconnectWireless(`${wirelessIP}:${wirelessPort}`);
      setWirelessIP('');
      alert('Disconnected');
    } catch (error) {
      alert('Error disconnecting: ' + error.message);
    }
  };

  const handleBackup = async () => {
    try {
      const result = await window.electronAPI.createBackup(selectedDevice.id, backupOptions);
      if (!result.cancelled) {
        alert('Backup process started. Check device for confirmation prompt.');
      }
    } catch (error) {
      alert('Error creating backup: ' + error.message);
    }
  };

  const handleRestore = async () => {
    try {
      const result = await window.electronAPI.restoreBackup(selectedDevice.id);
      if (!result.cancelled) {
        alert('Restore process started. Check device for confirmation prompt.');
      }
    } catch (error) {
      alert('Error restoring backup: ' + error.message);
    }
  };

  const handleSystemInfo = async () => {
    try {
      const result = await window.electronAPI.getSystemInfo(selectedDevice.id, systemService);
      setSystemOutput(result.output || 'No output');
    } catch (error) {
      setSystemOutput('Error: ' + error.message);
    }
  };

  const handleListProcesses = async () => {
    try {
      const result = await window.electronAPI.listProcesses(selectedDevice.id);
      setProcesses(result.output || 'No processes found');
    } catch (error) {
      setProcesses('Error: ' + error.message);
    }
  };

  // File Manager Functions
  const loadDirectory = async (path) => {
    if (!selectedDevice) return;
    
    setLoadingFiles(true);
    try {
      const result = await window.electronAPI.listDirectory(selectedDevice.id, path);
      if (result.success) {
        setFileItems(result.items);
        setCurrentPath(result.path);
      }
    } catch (error) {
      alert('Error loading directory: ' + error.message);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleNavigate = (item) => {
    if (item.isDirectory) {
      const newPath = item.path;
      setPathHistory([...pathHistory, currentPath]);
      loadDirectory(newPath);
    }
  };

  const handleBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      loadDirectory(previousPath);
    }
  };

  const handleGoToPath = (path) => {
    setPathHistory([...pathHistory, currentPath]);
    loadDirectory(path);
  };

  const handleDeleteFile = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    
    try {
      const result = await window.electronAPI.deleteFile(selectedDevice.id, item.path);
      if (result.success) {
        alert(result.message);
        loadDirectory(currentPath);
      }
    } catch (error) {
      alert('Error deleting file: ' + error.message);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    
    const newPath = currentPath.endsWith('/') 
      ? currentPath + newFolderName 
      : currentPath + '/' + newFolderName;
    
    try {
      const result = await window.electronAPI.createDirectory(selectedDevice.id, newPath);
      if (result.success) {
        alert(result.message);
        setNewFolderName('');
        loadDirectory(currentPath);
      }
    } catch (error) {
      alert('Error creating folder: ' + error.message);
    }
  };

  const handleRenameFile = async (item) => {
    const newName = prompt('Enter new name:', item.name);
    if (!newName || newName === item.name) return;
    
    const newPath = item.path.substring(0, item.path.lastIndexOf('/') + 1) + newName;
    
    try {
      const result = await window.electronAPI.renameFile(selectedDevice.id, item.path, newPath);
      if (result.success) {
        alert(result.message);
        loadDirectory(currentPath);
      }
    } catch (error) {
      alert('Error renaming file: ' + error.message);
    }
  };

  const handleSearchFiles = async () => {
    if (!searchPattern) return;
    
    try {
      const result = await window.electronAPI.searchFiles(selectedDevice.id, currentPath, searchPattern);
      if (result.success) {
        setSearchResults(result.files);
      }
    } catch (error) {
      alert('Error searching files: ' + error.message);
    }
  };

  const handlePullFileFromManager = async (item) => {
    try {
      const result = await window.electronAPI.pullFile(selectedDevice.id, item.path);
      if (result.success && !result.cancelled) {
        setShellOutput(prev => prev + `\n✅ Downloaded: ${item.name}`);
      } else if (!result.cancelled) {
        setShellOutput(prev => prev + `\n❌ Download failed: ${result.error}`);
      }
    } catch (error) {
      setShellOutput(prev => prev + `\n❌ Download error: ${error.message}`);
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const remotePath = currentPath.endsWith('/') 
        ? currentPath + file.name 
        : currentPath + '/' + file.name;
      
      try {
        const result = await window.electronAPI.pushFilePath(selectedDevice.id, file.path, remotePath);
        if (result.success) {
          console.log('File uploaded:', file.name);
        }
      } catch (error) {
        alert('Error uploading file: ' + error.message);
      }
    }
    
    loadDirectory(currentPath);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Connection Management Functions
  const handlePairDevice = async () => {
    if (!pairIP || !pairPort || !pairCode) {
      alert('Please fill in all pairing fields');
      return;
    }
    
    try {
      const result = await window.electronAPI.pairWirelessDevice(pairIP, pairPort, pairCode);
      if (result.success) {
        alert(result.message);
        saveConnectionHistory(pairIP, pairPort);
      }
    } catch (error) {
      alert('Error pairing device: ' + error.message);
    }
  };

  const handleConnectIP = async () => {
    if (!connectIP || !connectPort) {
      alert('Please fill in IP and port');
      return;
    }
    
    try {
      const result = await window.electronAPI.connectWirelessIP(connectIP, parseInt(connectPort));
      if (result.success) {
        alert(result.message);
        saveConnectionHistory(connectIP, connectPort);
      }
    } catch (error) {
      alert('Error connecting: ' + error.message);
    }
  };

  const handleDisconnectDevice = async (device) => {
    try {
      const result = await window.electronAPI.disconnectDevice(device.id);
      if (result.success) {
        alert(result.message);
      }
    } catch (error) {
      alert('Error disconnecting: ' + error.message);
    }
  };

  const handleRestartADB = async () => {
    if (!confirm('Restart ADB server? All connections will be lost.')) return;
    
    try {
      const result = await window.electronAPI.restartAdbServer();
      if (result.success) {
        alert(result.message);
      }
    } catch (error) {
      alert('Error restarting ADB: ' + error.message);
    }
  };

  const saveConnectionHistory = (ip, port) => {
    const newConnection = { ip, port, timestamp: Date.now() };
    const updated = [newConnection, ...connectionHistory.filter(c => c.ip !== ip)].slice(0, 10);
    setConnectionHistory(updated);
    localStorage.setItem('connectionHistory', JSON.stringify(updated));
  };

  const connectFromHistory = (connection) => {
    setConnectIP(connection.ip);
    setConnectPort(connection.port);
  };

  const renderToolSection = () => {
    // Home section can be viewed without SDK/device
    if (activeToolSection === 'home') {
      return renderHome();
    }

    // Check SDK requirement for all other sections
    if (!sdkStatus.exists || !sdkStatus.upToDate) {
      return (
        <div className="status-card">
          <h2>⚠️ Android SDK Required</h2>
          <p className="status-info">Please download the Android SDK from the Home section first.</p>
        </div>
      );
    }

    // Connection Manager doesn't require a device (used for wireless pairing)
    if (activeToolSection === 'connectionmanager') {
      return renderConnectionManager();
    }

    // All other sections require a device
    if (!selectedDevice) {
      return (
        <div className="status-card">
          <h2>No Device Selected</h2>
          <p className="status-info">Select a device from the Home section to use this tool.</p>
        </div>
      );
    }

    switch (activeToolSection) {
      case 'deviceinfo':
        return renderDeviceInfo();
      case 'deviceactions':
        return renderDeviceActions();
      case 'appmanagement':
        return renderAppManagement();
      case 'shell':
        return renderShell();
      case 'logcat':
        return renderLogcat();
      case 'filemanager':
        return renderFileManager();
      case 'screen':
        return renderScreenTools();
      case 'input':
        return renderInputSimulation();
      case 'system':
        return renderSystemCommands();
      case 'backup':
        return renderBackup();
      default:
        return null;
    }
  };

  const renderHome = () => (
    <div className="status-card">
      <h2>🏠 Home</h2>
      
      {/* SDK Status */}
      <div className="info-section">
        <h3>Android SDK Status</h3>
        {sdkStatus.exists && sdkStatus.upToDate ? (
          <div className="sdk-status-success">
            <span className="status-icon">✅</span>
            <div>
              <p className="status-title">SDK Ready</p>
              <p className="status-detail">Android Platform Tools are installed and up to date</p>
              {sdkStatus.version && (
                <p className="status-version">Version: {sdkStatus.version}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="sdk-status-warning">
            <span className="status-icon">⚠️</span>
            <div className="sdk-status-content">
              <p className="status-title">SDK Not Found</p>
              <p className="status-detail">
                Android SDK Platform Tools are required to use this application.
              </p>
              {downloadProgress ? (
                downloadProgress.status === 'error' ? (
                  <span className="download-error">❌ {downloadProgress.message}</span>
                ) : downloadProgress.status === 'complete' ? (
                  <span className="download-complete">✅ Download complete! Verifying...</span>
                ) : (
                  <div className="download-progress">
                    <div className="progress-info">
                      <span className="progress-message">{downloadProgress.message}</span>
                      <span className="progress-percent">{downloadProgress.percent}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${downloadProgress.percent}%` }}
                      ></div>
                    </div>
                  </div>
                )
              ) : (
                <button 
                  className="download-sdk-btn" 
                  onClick={onDownloadSDK}
                >
                  📥 Download Android SDK
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connected Devices */}
      <div className="info-section">
        <h3>Connected Devices ({devices.length})</h3>
        {devices.length === 0 ? (
          <div className="no-devices-home">
            <p>No devices connected</p>
            <p className="status-detail">Connect an Android device via USB or wireless ADB</p>
          </div>
        ) : (
          <div className="devices-grid">
            {devices.map((device) => (
              <div 
                key={device.id} 
                className={`device-card-home ${selectedDevice?.id === device.id ? 'selected' : ''}`}
                onClick={() => onLoadDeviceInfo(device)}
              >
                <div className="device-icon">📱</div>
                <div className="device-details">
                  <div className="device-model">{device.model}</div>
                  <div className="device-id">{device.id}</div>
                  <div className={`device-state ${device.state}`}>{device.state}</div>
                </div>
                {selectedDevice?.id === device.id && (
                  <div className="device-selected-badge">Selected</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {selectedDevice && (
        <div className="info-section">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <button 
              className="quick-action-btn"
              onClick={() => setActiveToolSection('deviceinfo')}
            >
              <span className="action-icon">📱</span>
              <span>Device Info</span>
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => setActiveToolSection('appmanagement')}
            >
              <span className="action-icon">📦</span>
              <span>Apps</span>
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => setActiveToolSection('filemanager')}
            >
              <span className="action-icon">📂</span>
              <span>Files</span>
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => setActiveToolSection('shell')}
            >
              <span className="action-icon">🐚</span>
              <span>Shell</span>
            </button>
            <button 
              className="quick-action-btn"
              onClick={onScreenshot}
            >
              <span className="action-icon">📸</span>
              <span>Screenshot</span>
            </button>
            <button 
              className="quick-action-btn"
              onClick={() => onReboot('normal')}
            >
              <span className="action-icon">🔄</span>
              <span>Reboot</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderDeviceInfo = () => (
    <div className="status-card">
      <h2>📱 Device Information</h2>
      {!detailedDeviceInfo ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading device information...</span>
        </div>
      ) : (
        <>
          <div className="info-section">
            <h3>Hardware</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Model:</span>
                <span className="info-value">{detailedDeviceInfo.model || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Manufacturer:</span>
                <span className="info-value">{detailedDeviceInfo.manufacturer || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Serial:</span>
                <span className="info-value">{detailedDeviceInfo.serialNo || selectedDevice.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Screen Resolution:</span>
                <span className="info-value">{detailedDeviceInfo.screenResolution || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Software</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Android Version:</span>
                <span className="info-value">{detailedDeviceInfo.version || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">SDK/API Level:</span>
                <span className="info-value">{detailedDeviceInfo.sdk || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Build ID:</span>
                <span className="info-value">{detailedDeviceInfo.buildId || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Android ID:</span>
                <span className="info-value">{detailedDeviceInfo.androidId || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Battery</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Level:</span>
                <span className="info-value">
                  {detailedDeviceInfo.batteryLevel ? `${detailedDeviceInfo.batteryLevel}%` : 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">{detailedDeviceInfo.batteryStatus || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Health:</span>
                <span className="info-value">{detailedDeviceInfo.batteryHealth || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Temperature:</span>
                <span className="info-value">
                  {detailedDeviceInfo.batteryTemp ? `${detailedDeviceInfo.batteryTemp}°C` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Storage</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Total:</span>
                <span className="info-value">{detailedDeviceInfo.storageTotal || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Used:</span>
                <span className="info-value">
                  {detailedDeviceInfo.storageUsed 
                    ? `${detailedDeviceInfo.storageUsed} (${detailedDeviceInfo.storagePercent}%)`
                    : 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Free:</span>
                <span className="info-value">{detailedDeviceInfo.storageFree || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Network</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">IP Address:</span>
                <span className="info-value">{detailedDeviceInfo.ipAddress || 'N/A'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderDeviceActions = () => (
    <div className="status-card">
      <h2>🔧 Device Actions</h2>
      <div className="device-actions-grid">
        <div className="action-section">
          <h3>Reboot Options</h3>
          <button className="action-button" onClick={() => onReboot('normal')}>
            🔄 Reboot Device
          </button>
          <button className="action-button warning" onClick={() => onReboot('recovery')}>
            🛠️ Reboot to Recovery
          </button>
          <button className="action-button warning" onClick={() => onReboot('bootloader')}>
            ⚙️ Reboot to Bootloader
          </button>
        </div>
      </div>
    </div>
  );

  const renderAppManagement = () => {
    const filteredApps = installedApps.filter(app => 
      app.toLowerCase().includes(appSearch.toLowerCase())
    );

    return (
      <div className="status-card">
        <h2>📦 App Management</h2>
        
        <div className="app-controls">
          <button className="button" onClick={onInstallApp}>
            ➕ Install APK
          </button>
          <button className="button" onClick={() => onLoadApps(showSystemApps)}>
            🔄 Refresh Apps
          </button>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showSystemApps}
              onChange={(e) => {
                setShowSystemApps(e.target.checked);
                onLoadApps(e.target.checked);
              }}
            />
            Show System Apps
          </label>
        </div>

        <div className="app-search">
          <input
            type="text"
            placeholder="Search apps..."
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
          />
        </div>

        <div className="apps-list">
          {filteredApps.length === 0 ? (
            <div className="no-apps">No apps found</div>
          ) : (
            filteredApps.map((app, index) => (
              <div key={index} className="app-item">
                <div className="app-info">
                  <span className="app-name">📱 {app}</span>
                </div>
                <div className="app-actions">
                  <button 
                    className="app-action-btn"
                    onClick={() => onUninstallApp(app)}
                    title="Uninstall"
                  >
                    🗑️
                  </button>
                  <button 
                    className="app-action-btn"
                    onClick={() => onClearAppData(app)}
                    title="Clear Data"
                  >
                    🧹
                  </button>
                  <button 
                    className="app-action-btn"
                    onClick={() => onForceStopApp(app)}
                    title="Force Stop"
                  >
                    ⏹️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderShell = () => (
    <div className="status-card">
      <h2>🐚 ADB Shell Terminal</h2>
      <div className="shell-output" ref={shellOutputRef}>
        {shellHistory.length === 0 ? (
          <div className="shell-welcome">Enter a command to start...</div>
        ) : (
          shellHistory.map((entry, index) => (
            <div key={index} className={`shell-entry ${entry.type}`}>
              {entry.text}
            </div>
          ))
        )}
      </div>
      <div className="shell-input-container">
        <input
          type="text"
          className="shell-input"
          placeholder="Enter shell command..."
          value={shellCommand}
          onChange={(e) => setShellCommand(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleShellCommand()}
        />
        <button className="button" onClick={handleShellCommand}>Execute</button>
        <button className="button" onClick={clearShellHistory}>Clear</button>
      </div>
      <div className="common-commands">
        <span className="label">Quick Commands:</span>
        <button onClick={() => setShellCommand('ls -la')}>ls -la</button>
        <button onClick={() => setShellCommand('df -h')}>df -h</button>
        <button onClick={() => setShellCommand('pm list packages')}>list packages</button>
        <button onClick={() => setShellCommand('getprop')}>getprop</button>
      </div>
    </div>
  );

  const renderLogcat = () => (
    <div className="status-card">
      <h2>📋 Logcat Viewer</h2>
      <div className="logcat-controls">
        <button className="button" onClick={handleLogcatToggle}>
          {isLogcatRunning ? '⏹️ Stop' : '▶️ Start'}
        </button>
        <button className="button" onClick={handleClearLogcat}>🗑️ Clear</button>
        <div className="logcat-filters">
          <label>
            Priority:
            <select 
              value={logcatFilter.priority}
              onChange={(e) => setLogcatFilter({...logcatFilter, priority: e.target.value})}
              disabled={isLogcatRunning}
              title={isLogcatRunning ? "Stop logcat to change priority filter" : ""}
            >
              <option value="V">Verbose</option>
              <option value="D">Debug</option>
              <option value="I">Info</option>
              <option value="W">Warning</option>
              <option value="E">Error</option>
              <option value="F">Fatal</option>
            </select>
          </label>
          <input
            type="text"
            placeholder="Filter by tag..."
            value={logcatFilter.tag}
            onChange={(e) => setLogcatFilter({...logcatFilter, tag: e.target.value})}
          />
          <input
            type="text"
            placeholder="Search in messages..."
            value={logcatFilter.search}
            onChange={(e) => setLogcatFilter({...logcatFilter, search: e.target.value})}
          />
        </div>
      </div>
      <div className="logcat-output" ref={logcatOutputRef}>
        {logcatOutput.length === 0 ? (
          <div className="logcat-empty">No logs yet. Click Start to begin logging.</div>
        ) : (
          logcatOutput
            .filter(log => {
              // Filter by tag (case insensitive)
              if (logcatFilter.tag && !log.tag.toLowerCase().includes(logcatFilter.tag.toLowerCase())) {
                return false;
              }
              // Filter by search in message (case insensitive)
              if (logcatFilter.search && !log.message.toLowerCase().includes(logcatFilter.search.toLowerCase())) {
                return false;
              }
              return true;
            })
            .map((log, index) => (
              <div key={index} className={`logcat-entry priority-${log.priority}`}>
                <span className="log-time">{log.time}</span>
                <span className="log-priority">{log.priority}</span>
                <span className="log-tag">{log.tag}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );

  const renderFileTransfer = () => (
    <div className="status-card">
      <h2>📁 File Transfer</h2>
      <div className="file-transfer-section">
        <h3>Push File to Device</h3>
        <div className="file-transfer-row">
          <input
            type="text"
            placeholder="Remote path (e.g., /sdcard/)"
            value={remotePath}
            onChange={(e) => setRemotePath(e.target.value)}
          />
          <button className="button" onClick={handlePushFile}>📤 Push File</button>
        </div>
        <div className="common-paths">
          <span className="label">Common paths:</span>
          <button onClick={() => setRemotePath('/sdcard/')}>/sdcard/</button>
          <button onClick={() => setRemotePath('/data/local/tmp/')}>/data/local/tmp/</button>
          <button onClick={() => setRemotePath('/sdcard/Download/')}>/sdcard/Download/</button>
        </div>
      </div>
      <div className="file-transfer-section">
        <h3>Pull File from Device</h3>
        <div className="file-transfer-row">
          <input
            type="text"
            placeholder="Remote file path (e.g., /sdcard/file.txt)"
            value={pullPath}
            onChange={(e) => setPullPath(e.target.value)}
          />
          <button className="button" onClick={handlePullFile}>📥 Pull File</button>
        </div>
      </div>
    </div>
  );

  const renderScreenTools = () => (
    <div className="status-card">
      <h2>📸 Screen Tools</h2>
      <div className="screen-tools-grid">
        <div className="tool-section">
          <h3>Screenshot</h3>
          <button 
            className="action-button" 
            onClick={() => window.electronAPI.takeScreenshot(selectedDevice.id)}
          >
            📸 Take Screenshot
          </button>
        </div>
        <div className="tool-section">
          <h3>Screen Recording</h3>
          {recording ? (
            <button className="action-button warning" onClick={handleStopRecording}>
              ⏹️ Stop Recording
            </button>
          ) : (
            <button className="action-button" onClick={handleStartRecording}>
              🎥 Start Recording
            </button>
          )}
          <p className="tool-note">Maximum duration: 3 minutes</p>
        </div>
      </div>
    </div>
  );

  const renderInputSimulation = () => (
    <div className="status-card">
      <h2>📱 Input Simulation</h2>
      <div className="input-sim-grid">
        <div className="tool-section">
          <h3>Send Text</h3>
          <div className="input-row">
            <input
              type="text"
              placeholder="Text to send..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
            />
            <button className="button" onClick={handleSendText}>Send</button>
          </div>
        </div>
        <div className="tool-section">
          <h3>Key Events</h3>
          <div className="key-buttons">
            <button onClick={() => handleKeyEvent('3')}>🏠 Home</button>
            <button onClick={() => handleKeyEvent('4')}>⬅️ Back</button>
            <button onClick={() => handleKeyEvent('187')}>📋 Recent</button>
            <button onClick={() => handleKeyEvent('26')}>🔒 Power</button>
            <button onClick={() => handleKeyEvent('24')}>🔊 Vol+</button>
            <button onClick={() => handleKeyEvent('25')}>🔉 Vol-</button>
          </div>
        </div>
        <div className="tool-section">
          <h3>Tap Coordinates</h3>
          <div className="input-row">
            <input
              type="number"
              placeholder="X"
              value={tapX}
              onChange={(e) => setTapX(e.target.value)}
            />
            <input
              type="number"
              placeholder="Y"
              value={tapY}
              onChange={(e) => setTapY(e.target.value)}
            />
            <button className="button" onClick={handleTap}>👆 Tap</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemCommands = () => (
    <div className="status-card">
      <h2>🔧 System Commands</h2>
      <div className="system-commands-grid">
        <div className="tool-section">
          <h3>System Info (dumpsys)</h3>
          <div className="input-row">
            <select value={systemService} onChange={(e) => setSystemService(e.target.value)}>
              <option value="battery">Battery</option>
              <option value="meminfo">Memory</option>
              <option value="cpuinfo">CPU</option>
              <option value="wifi">WiFi</option>
              <option value="activity">Activity</option>
              <option value="package">Package</option>
            </select>
            <button className="button" onClick={handleSystemInfo}>Get Info</button>
          </div>
          {systemOutput && (
            <pre className="system-output">{systemOutput}</pre>
          )}
        </div>
        <div className="tool-section">
          <h3>Process List</h3>
          <button className="button" onClick={handleListProcesses}>List Processes</button>
          {processes && (
            <pre className="system-output">{processes}</pre>
          )}
        </div>
      </div>
    </div>
  );

  const renderWireless = () => (
    <div className="status-card">
      <h2>🔌 Wireless ADB</h2>
      <div className="wireless-section">
        <h3>Enable Wireless Connection</h3>
        <p className="tool-note">Device must be connected via USB first</p>
        <div className="input-row">
          <input
            type="number"
            placeholder="Port (default: 5555)"
            value={wirelessPort}
            onChange={(e) => setWirelessPort(e.target.value)}
          />
          <button className="button" onClick={handleWirelessConnect}>🔗 Connect</button>
        </div>
        {wirelessIP && (
          <div className="wireless-status">
            <p>Connected to: {wirelessIP}:{wirelessPort}</p>
            <button className="button warning" onClick={handleWirelessDisconnect}>Disconnect</button>
            <p className="tool-note">You can now disconnect the USB cable</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBackup = () => (
    <div className="status-card">
      <h2>🔐 Backup & Restore</h2>
      <div className="backup-section">
        <h3>Create Backup</h3>
        <div className="backup-options">
          <label>
            <input
              type="checkbox"
              checked={backupOptions.apk}
              onChange={(e) => setBackupOptions({...backupOptions, apk: e.target.checked})}
            />
            Include APK files
          </label>
          <label>
            <input
              type="checkbox"
              checked={backupOptions.shared}
              onChange={(e) => setBackupOptions({...backupOptions, shared: e.target.checked})}
            />
            Include shared storage
          </label>
          <label>
            <input
              type="checkbox"
              checked={backupOptions.all}
              onChange={(e) => setBackupOptions({...backupOptions, all: e.target.checked})}
            />
            All applications
          </label>
          <label>
            <input
              type="checkbox"
              checked={backupOptions.system}
              onChange={(e) => setBackupOptions({...backupOptions, system: e.target.checked})}
            />
            System apps
          </label>
        </div>
        <button className="button" onClick={handleBackup}>💾 Create Backup</button>
      </div>
      <div className="backup-section">
        <h3>Restore Backup</h3>
        <button className="button" onClick={handleRestore}>📦 Restore from File</button>
        <p className="tool-note">Select an Android backup (.ab) file to restore</p>
      </div>
    </div>
  );

  const renderFileManager = () => (
    <div className="status-card">
      <h2>📁 File Manager</h2>
      
      {/* Navigation Bar */}
      <div className="file-nav-bar">
        <button className="button" onClick={handleBack} disabled={pathHistory.length === 0}>
          ⬅️ Back
        </button>
        <button className="button" onClick={() => loadDirectory(currentPath)}>
          🔄 Refresh
        </button>
        <input
          type="text"
          className="path-input"
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleGoToPath(currentPath)}
        />
        <button className="button" onClick={() => handleGoToPath(currentPath)}>Go</button>
      </div>

      {/* Quick Access */}
      <div className="quick-access">
        <span className="label">Quick Access:</span>
        <button onClick={() => handleGoToPath('/sdcard/')}>📱 Internal Storage</button>
        <button onClick={() => handleGoToPath('/sdcard/Download/')}>⬇️ Downloads</button>
        <button onClick={() => handleGoToPath('/sdcard/DCIM/')}>📷 Camera</button>
        <button onClick={() => handleGoToPath('/sdcard/Pictures/')}>🖼️ Pictures</button>
        <button onClick={() => handleGoToPath('/sdcard/Music/')}>🎵 Music</button>
        <button onClick={() => handleGoToPath('/data/local/tmp/')}>📂 Temp</button>
      </div>

      {/* Search */}
      <div className="file-search">
        <input
          type="text"
          placeholder="Search files..."
          value={searchPattern}
          onChange={(e) => setSearchPattern(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearchFiles()}
        />
        <button className="button" onClick={handleSearchFiles}>🔍 Search</button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Search Results ({searchResults.length})</h4>
          {searchResults.map((file, index) => (
            <div key={index} className="search-result-item">
              {file}
            </div>
          ))}
          <button className="button" onClick={() => setSearchResults([])}>Clear Results</button>
        </div>
      )}

      {/* Create Folder */}
      <div className="create-folder">
        <input
          type="text"
          placeholder="New folder name..."
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
        />
        <button className="button" onClick={handleCreateFolder}>➕ Create Folder</button>
      </div>

      {/* File Drop Zone */}
      <div
        ref={fileDropRef}
        className="file-drop-zone"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <p>📤 Drag & drop files here to upload to device</p>
        <p className="tool-note">Current directory: {currentPath}</p>
      </div>

      {/* File List */}
      {loadingFiles ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading files...</span>
        </div>
      ) : (
        <div className="file-list">
          <table className="file-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fileItems.map((item, index) => (
                <tr key={index} className={item.isDirectory ? 'directory' : 'file'}>
                  <td onClick={() => handleNavigate(item)} className="file-name">
                    {item.isDirectory ? '📁' : '📄'} {item.name}
                  </td>
                  <td>{item.size}</td>
                  <td className="permissions">{item.permissions}</td>
                  <td className="file-actions">
                    {!item.isDirectory && (
                      <button onClick={() => handlePullFileFromManager(item)} title="Download">
                        ⬇️
                      </button>
                    )}
                    <button onClick={() => handleRenameFile(item)} title="Rename">
                      ✏️
                    </button>
                    <button onClick={() => handleDeleteFile(item)} title="Delete" className="danger">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fileItems.length === 0 && (
            <div className="no-files">No files in this directory</div>
          )}
        </div>
      )}
    </div>
  );

  const renderConnectionManager = () => (
    <div className="status-card">
      <h2>🔌 Connection Management</h2>

      {/* Connected Devices */}
      <div className="connection-section">
        <h3>Connected Devices ({devices.length})</h3>
        <div className="device-connections">
          {devices.map((device) => (
            <div key={device.id} className="connection-item">
              <div className="connection-info">
                <span className="connection-name">{device.model}</span>
                <span className="connection-id">{device.id}</span>
                <span className={`connection-status ${device.state}`}>{device.state}</span>
              </div>
              <button 
                className="button warning" 
                onClick={() => handleDisconnectDevice(device)}
              >
                Disconnect
              </button>
            </div>
          ))}
          {devices.length === 0 && (
            <p className="no-devices">No devices connected</p>
          )}
        </div>
      </div>

      {/* Wireless Pairing (Android 11+) */}
      <div className="connection-section">
        <h3>Wireless Pairing (Android 11+)</h3>
        <p className="tool-note">Go to Developer Options &gt; Wireless Debugging &gt; Pair device with pairing code</p>
        <div className="connection-form">
          <input
            type="text"
            placeholder="IP Address (e.g., 192.168.1.100)"
            value={pairIP}
            onChange={(e) => setPairIP(e.target.value)}
          />
          <input
            type="text"
            placeholder="Port (e.g., 37891)"
            value={pairPort}
            onChange={(e) => setPairPort(e.target.value)}
          />
          <input
            type="text"
            placeholder="Pairing Code (6 digits)"
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value)}
          />
          <button className="button" onClick={handlePairDevice}>🔗 Pair Device</button>
        </div>
      </div>

      {/* Wireless Connect */}
      <div className="connection-section">
        <h3>Connect via IP</h3>
        <p className="tool-note">For devices already paired or using USB TCP/IP mode</p>
        <div className="connection-form">
          <input
            type="text"
            placeholder="IP Address"
            value={connectIP}
            onChange={(e) => setConnectIP(e.target.value)}
          />
          <input
            type="text"
            placeholder="Port (default: 5555)"
            value={connectPort}
            onChange={(e) => setConnectPort(e.target.value)}
          />
          <button className="button" onClick={handleConnectIP}>🔗 Connect</button>
        </div>
      </div>

      {/* Connection History */}
      {connectionHistory.length > 0 && (
        <div className="connection-section">
          <h3>Connection History</h3>
          <div className="connection-history">
            {connectionHistory.map((conn, index) => (
              <div key={index} className="history-item" onClick={() => connectFromHistory(conn)}>
                <span>{conn.ip}:{conn.port}</span>
                <span className="history-time">
                  {new Date(conn.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="connection-section">
        <h3>ADB Settings</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={autoReconnect}
            onChange={(e) => setAutoReconnect(e.target.checked)}
          />
          Auto-reconnect on disconnect
        </label>
        <button className="button warning" onClick={handleRestartADB}>
          🔄 Restart ADB Server
        </button>
      </div>
    </div>
  );

  return (
    <div className="tools-tab-layout">
      <div className="tools-sidebar">
        <h3>Tools</h3>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'home' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('home')}
        >
          🏠 Home
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'deviceinfo' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('deviceinfo')}
        >
          📱 Device Information
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'deviceactions' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('deviceactions')}
        >
          🔧 Device Actions
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'appmanagement' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('appmanagement')}
        >
          📦 App Management
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'shell' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('shell')}
        >
          🐚 Shell Terminal
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'logcat' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('logcat')}
        >
          📋 Logcat Viewer
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'filemanager' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('filemanager')}
        >
          📂 File Manager
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'screen' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('screen')}
        >
          📸 Screen Tools
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'input' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('input')}
        >
          📱 Input Simulation
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'system' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('system')}
        >
          🔧 System Commands
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'connectionmanager' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('connectionmanager')}
        >
          🔌 Connection Manager
        </button>
        <button 
          className={`tool-nav-btn ${activeToolSection === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveToolSection('backup')}
        >
          🔐 Backup & Restore
        </button>
      </div>
      <div className="tools-content">
        {renderToolSection()}
      </div>
    </div>
  );
}

export default ToolsTab;
