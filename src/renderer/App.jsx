import React, { useState, useEffect } from 'react';
import ToolsTab from './ToolsTab';

function App() {
  const [sdkStatus, setSdkStatus] = useState({ checking: true });
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [detailedDeviceInfo, setDetailedDeviceInfo] = useState(null);
  const [installedApps, setInstalledApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  useEffect(() => {
    checkSDKStatus();
    
    // Listen for SDK download progress
    window.electronAPI.onSDKDownloadProgress((progress) => {
      setDownloadProgress(progress);
      
      // If download is complete, refresh SDK status
      if (progress.status === 'complete') {
        setTimeout(() => {
          setDownloadProgress(null);
          checkSDKStatus();
        }, 1500);
      } else if (progress.status === 'error') {
        setTimeout(() => {
          setDownloadProgress(null);
        }, 3000);
      }
    });

    // Listen for device connection/disconnection changes
    window.electronAPI.onDevicesChanged((data) => {
      setDevices(data.devices);
      
      // Show notifications for device changes
      if (data.newDevices.length > 0) {
        data.newDevices.forEach(device => {
          console.log(`Device connected: ${device.model} (${device.id})`);
        });
      }
      if (data.removedDevices.length > 0) {
        data.removedDevices.forEach(device => {
          console.log(`Device disconnected: ${device.model} (${device.id})`);
        });
        
        // If selected device was disconnected, clear selection
        if (selectedDevice && data.removedDevices.some(d => d.id === selectedDevice.id)) {
          setSelectedDevice(null);
          setDetailedDeviceInfo(null);
        }
      }
    });
  }, [selectedDevice]);

  const checkSDKStatus = async () => {
    setSdkStatus({ checking: true });
    try {
      const status = await window.electronAPI.checkSDK();
      setSdkStatus(status);
      
      // If SDK is ready, load devices
      if (status.exists && status.upToDate) {
        loadDevices();
      }
    } catch (error) {
      setSdkStatus({ exists: false, upToDate: false, error: error.message });
    }
  };

  const handleDownloadSDK = async () => {
    setDownloadProgress({ status: 'starting', percent: 0, message: 'Initializing download...' });
    try {
      const result = await window.electronAPI.downloadSDK();
      if (!result.success) {
        setDownloadProgress({ status: 'error', percent: 0, message: result.error || 'Download failed' });
      }
    } catch (error) {
      setDownloadProgress({ status: 'error', percent: 0, message: error.message });
    }
  };

  const loadDevices = async () => {
    try {
      const result = await window.electronAPI.getDevices();
      setDevices(result.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const loadDetailedDeviceInfo = async (device) => {
    setSelectedDevice(device);
    try {
      const info = await window.electronAPI.getDeviceInfo(device.id);
      setDetailedDeviceInfo(info);
    } catch (error) {
      console.error('Failed to get detailed device info:', error);
    }
  };

  const handleReboot = async (mode) => {
    if (!selectedDevice) return;
    
    const confirmMsg = mode === 'normal' 
      ? 'Are you sure you want to reboot this device?'
      : `Are you sure you want to reboot to ${mode}?`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
      const result = await window.electronAPI.rebootDevice(selectedDevice.id, mode);
      if (result.success) {
        alert(result.message);
      } else {
        alert('Failed to reboot device: ' + result.error);
      }
    } catch (error) {
      alert('Error rebooting device: ' + error.message);
    }
  };

  const handleScreenshot = async () => {
    if (!selectedDevice) return;
    
    try {
      const result = await window.electronAPI.takeScreenshot(selectedDevice.id);
      if (result.success) {
        alert('Screenshot saved to: ' + result.path);
      } else if (!result.cancelled) {
        alert('Failed to take screenshot: ' + result.error);
      }
    } catch (error) {
      alert('Error taking screenshot: ' + error.message);
    }
  };

  const loadApps = async (showSystemApps = false) => {
    if (!selectedDevice) return;
    
    setLoadingApps(true);
    try {
      const result = await window.electronAPI.getInstalledApps(selectedDevice.id, showSystemApps);
      setInstalledApps(result.apps || []);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleInstallApp = async () => {
    if (!selectedDevice) return;
    
    try {
      const result = await window.electronAPI.installApp(selectedDevice.id);
      if (result.success) {
        alert(result.message);
        loadApps();
      } else if (!result.cancelled) {
        alert('Failed to install app: ' + result.error);
      }
    } catch (error) {
      alert('Error installing app: ' + error.message);
    }
  };

  const handleUninstallApp = async (packageName) => {
    if (!confirm(`Uninstall ${packageName}?`)) return;
    
    try {
      const result = await window.electronAPI.uninstallApp(selectedDevice.id, packageName);
      if (result.success) {
        alert(result.message);
        loadApps();
      } else {
        alert('Failed to uninstall app: ' + result.error);
      }
    } catch (error) {
      alert('Error uninstalling app: ' + error.message);
    }
  };

  const handleClearAppData = async (packageName) => {
    if (!confirm(`Clear data for ${packageName}?`)) return;
    
    try {
      const result = await window.electronAPI.clearAppData(selectedDevice.id, packageName);
      if (result.success) {
        alert(result.message);
      } else {
        alert('Failed to clear app data: ' + result.error);
      }
    } catch (error) {
      alert('Error clearing app data: ' + error.message);
    }
  };

  const handleForceStopApp = async (packageName) => {
    try {
      const result = await window.electronAPI.forceStopApp(selectedDevice.id, packageName);
      if (result.success) {
        alert(result.message);
      } else {
        alert('Failed to force stop app: ' + result.error);
      }
    } catch (error) {
      alert('Error force stopping app: ' + error.message);
    }
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.body.classList.toggle('light-theme');
  };

  const toggleHelpDialog = () => {
    setShowHelpDialog(!showHelpDialog);
  };

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <img src="/adb_logo.png" alt="ADB Toolkit Logo" className="app-logo" />
            <div className="header-text">
              <h1>Electron ADB Toolkit</h1>
              <p>Android Debug Bridge device management and tools</p>
            </div>
          </div>
          <div className="header-buttons">
            <button 
              className="header-icon-btn" 
              onClick={toggleHelpDialog}
              title="Help"
            >
              ❓
            </button>
            <button 
              className="header-icon-btn" 
              onClick={toggleTheme}
              title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDarkTheme ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {showHelpDialog && (
        <div className="dialog-overlay" onClick={toggleHelpDialog}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>📖 Getting Started</h2>
              <button className="dialog-close" onClick={toggleHelpDialog}>✕</button>
            </div>
            <div className="dialog-body">
              <div className="help-section">
                <h3>🔌 Connecting Your Device</h3>
                <ol>
                  <li>Enable <strong>Developer Options</strong> on your Android device (Settings → About Phone → Tap Build Number 7 times)</li>
                  <li>Enable <strong>USB Debugging</strong> in Developer Options</li>
                  <li>Connect your device via USB cable</li>
                  <li>Accept the debugging authorization prompt on your device</li>
                  <li>Your device will appear in the Home section automatically</li>
                </ol>
              </div>
              <div className="help-section">
                <h3>📱 Selecting a Device</h3>
                <ul>
                  <li>Go to the <strong>Home</strong> section in the sidebar</li>
                  <li>Click on a device card to select it</li>
                  <li>The selected device will be highlighted with a "Selected" badge</li>
                  <li>Once selected, you can use all tools in the sidebar</li>
                </ul>
              </div>
              <div className="help-section">
                <h3>🔧 Using Tools</h3>
                <ul>
                  <li><strong>Device Information:</strong> View detailed hardware, software, and battery info</li>
                  <li><strong>App Management:</strong> Install, uninstall, and manage apps</li>
                  <li><strong>Shell Terminal:</strong> Execute ADB shell commands</li>
                  <li><strong>Logcat Viewer:</strong> View real-time device logs</li>
                  <li><strong>File Manager:</strong> Browse and manage device files</li>
                  <li><strong>Screen Tools:</strong> Capture screenshots and record screen</li>
                </ul>
              </div>
              <div className="help-section">
                <h3>📡 Wireless ADB</h3>
                <ol>
                  <li>Connect your device via USB first</li>
                  <li>Go to <strong>Connection Manager</strong></li>
                  <li>Enable wireless debugging on your device</li>
                  <li>Use the pairing code method or direct connect</li>
                  <li>After pairing, you can disconnect USB cable</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-content">
        <ToolsTab 
          devices={devices} 
          selectedDevice={selectedDevice} 
          sdkStatus={sdkStatus}
          detailedDeviceInfo={detailedDeviceInfo}
          installedApps={installedApps}
          downloadProgress={downloadProgress}
          onLoadDeviceInfo={loadDetailedDeviceInfo}
          onReboot={handleReboot}
          onScreenshot={handleScreenshot}
          onLoadApps={loadApps}
          onInstallApp={handleInstallApp}
          onUninstallApp={handleUninstallApp}
          onClearAppData={handleClearAppData}
          onForceStopApp={handleForceStopApp}
          onDownloadSDK={handleDownloadSDK}
        />
      </div>
    </div>
  );
}

export default App;
