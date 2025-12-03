const { exec } = require('child_process');
const { promisify } = require('util');
const sdkManager = require('./sdk-manager');

const execAsync = promisify(exec);

async function getDevices(sdkPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    
    // Start ADB server if not running
    await execAsync(`"${adbPath}" start-server`);
    
    // Get list of devices
    const { stdout } = await execAsync(`"${adbPath}" devices -l`);
    
    const devices = parseDeviceList(stdout);
    return { devices, count: devices.length };
  } catch (error) {
    console.error('Error getting devices:', error);
    throw error;
  }
}

function parseDeviceList(output) {
  const lines = output.split('\n');
  const devices = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    
    const deviceId = parts[0];
    const state = parts[1];
    
    if (state !== 'device' && state !== 'offline' && state !== 'unauthorized') {
      continue;
    }
    
    // Parse additional info
    const info = {};
    for (let j = 2; j < parts.length; j++) {
      const part = parts[j];
      if (part.includes(':')) {
        const [key, value] = part.split(':');
        info[key] = value;
      }
    }
    
    devices.push({
      id: deviceId,
      state: state,
      product: info.product || 'Unknown',
      model: info.model || 'Unknown',
      device: info.device || 'Unknown',
      transport_id: info.transport_id || null
    });
  }
  
  return devices;
}

async function getDeviceInfo(sdkPath, deviceId) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    
    // Get various device properties
    const commands = {
      manufacturer: `"${adbPath}" -s ${deviceId} shell getprop ro.product.manufacturer`,
      model: `"${adbPath}" -s ${deviceId} shell getprop ro.product.model`,
      version: `"${adbPath}" -s ${deviceId} shell getprop ro.build.version.release`,
      sdk: `"${adbPath}" -s ${deviceId} shell getprop ro.build.version.sdk`,
      buildId: `"${adbPath}" -s ${deviceId} shell getprop ro.build.id`,
      serialNo: `"${adbPath}" -s ${deviceId} shell getprop ro.serialno`,
      androidId: `"${adbPath}" -s ${deviceId} shell settings get secure android_id`,
      battery: `"${adbPath}" -s ${deviceId} shell dumpsys battery`,
      screenResolution: `"${adbPath}" -s ${deviceId} shell wm size`,
      ipAddress: `"${adbPath}" -s ${deviceId} shell ip addr show wlan0`,
      storage: `"${adbPath}" -s ${deviceId} shell df /data`
    };
    
    const results = {};
    
    for (const [key, command] of Object.entries(commands)) {
      try {
        const { stdout } = await execAsync(command);
        results[key] = stdout.trim();
        
        // Parse battery info
        if (key === 'battery') {
          const levelMatch = stdout.match(/level: (\d+)/);
          const tempMatch = stdout.match(/temperature: (\d+)/);
          const healthMatch = stdout.match(/health: (\d+)/);
          const statusMatch = stdout.match(/status: (\d+)/);
          
          results.batteryLevel = levelMatch ? parseInt(levelMatch[1]) : 0;
          results.batteryTemp = tempMatch ? (parseInt(tempMatch[1]) / 10).toFixed(1) : 'Unknown';
          results.batteryHealth = healthMatch ? getHealthStatus(parseInt(healthMatch[1])) : 'Unknown';
          results.batteryStatus = statusMatch ? getChargingStatus(parseInt(statusMatch[1])) : 'Unknown';
        }
        
        // Parse screen resolution
        if (key === 'screenResolution') {
          const match = stdout.match(/Physical size: (\d+)x(\d+)/);
          results[key] = match ? `${match[1]}x${match[2]}` : 'Unknown';
        }
        
        // Parse IP address
        if (key === 'ipAddress') {
          const match = stdout.match(/inet (\d+\.\d+\.\d+\.\d+)/);
          results[key] = match ? match[1] : 'Not connected';
        }
        
        // Parse storage
        if (key === 'storage') {
          const lines = stdout.split('\n');
          if (lines.length > 1) {
            const parts = lines[1].split(/\s+/);
            if (parts.length >= 4) {
              const total = parseInt(parts[1]);
              const used = parseInt(parts[2]);
              results.storageTotal = formatBytes(total * 1024);
              results.storageUsed = formatBytes(used * 1024);
              results.storageFree = formatBytes((total - used) * 1024);
              results.storagePercent = Math.round((used / total) * 100);
            }
          }
        }
      } catch (err) {
        results[key] = 'Unknown';
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error getting device info:', error);
    throw error;
  }
}

function getHealthStatus(health) {
  const healthMap = {
    1: 'Unknown',
    2: 'Good',
    3: 'Overheat',
    4: 'Dead',
    5: 'Over voltage',
    6: 'Unspecified failure',
    7: 'Cold'
  };
  return healthMap[health] || 'Unknown';
}

function getChargingStatus(status) {
  const statusMap = {
    1: 'Unknown',
    2: 'Charging',
    3: 'Discharging',
    4: 'Not charging',
    5: 'Full'
  };
  return statusMap[status] || 'Unknown';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function rebootDevice(sdkPath, deviceId, mode = 'normal') {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    let command;
    
    switch (mode) {
      case 'recovery':
        command = `"${adbPath}" -s ${deviceId} reboot recovery`;
        break;
      case 'bootloader':
        command = `"${adbPath}" -s ${deviceId} reboot bootloader`;
        break;
      default:
        command = `"${adbPath}" -s ${deviceId} reboot`;
    }
    
    await execAsync(command);
    return { success: true, message: `Device rebooting to ${mode}` };
  } catch (error) {
    console.error('Error rebooting device:', error);
    throw error;
  }
}

async function takeScreenshot(sdkPath, deviceId, savePath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const devicePath = '/sdcard/screenshot.png';
    
    // Take screenshot on device
    await execAsync(`"${adbPath}" -s ${deviceId} shell screencap -p ${devicePath}`);
    
    // Pull screenshot to computer
    await execAsync(`"${adbPath}" -s ${deviceId} pull ${devicePath} "${savePath}"`);
    
    // Remove screenshot from device
    await execAsync(`"${adbPath}" -s ${deviceId} shell rm ${devicePath}`);
    
    return { success: true, path: savePath };
  } catch (error) {
    console.error('Error taking screenshot:', error);
    throw error;
  }
}

async function getInstalledApps(sdkPath, deviceId, includeSystem = false) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const flag = includeSystem ? '' : '-3';
    const { stdout } = await execAsync(`"${adbPath}" -s ${deviceId} shell pm list packages ${flag}`);
    
    const packages = stdout
      .split('\n')
      .filter(line => line.startsWith('package:'))
      .map(line => line.replace('package:', '').trim())
      .sort();
    
    // Get app labels for each package
    const appsWithLabels = [];
    for (const pkg of packages) {
      try {
        const { stdout: label } = await execAsync(
          `"${adbPath}" -s ${deviceId} shell pm dump ${pkg} | grep -A 1 "labelRes"`
        );
        appsWithLabels.push({ package: pkg, label: label.trim() || pkg });
      } catch {
        appsWithLabels.push({ package: pkg, label: pkg });
      }
    }
    
    return { apps: packages, count: packages.length };
  } catch (error) {
    console.error('Error getting installed apps:', error);
    throw error;
  }
}

async function installApp(sdkPath, deviceId, apkPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout, stderr } = await execAsync(`"${adbPath}" -s ${deviceId} install "${apkPath}"`);
    
    if (stdout.includes('Success') || stderr.includes('Success')) {
      return { success: true, message: 'App installed successfully' };
    } else {
      throw new Error(stderr || stdout);
    }
  } catch (error) {
    console.error('Error installing app:', error);
    throw error;
  }
}

async function uninstallApp(sdkPath, deviceId, packageName) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout } = await execAsync(`"${adbPath}" -s ${deviceId} uninstall ${packageName}`);
    
    if (stdout.includes('Success')) {
      return { success: true, message: 'App uninstalled successfully' };
    } else {
      throw new Error(stdout);
    }
  } catch (error) {
    console.error('Error uninstalling app:', error);
    throw error;
  }
}

async function clearAppData(sdkPath, deviceId, packageName) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell pm clear ${packageName}`);
    return { success: true, message: 'App data cleared successfully' };
  } catch (error) {
    console.error('Error clearing app data:', error);
    throw error;
  }
}

async function forceStopApp(sdkPath, deviceId, packageName) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell am force-stop ${packageName}`);
    return { success: true, message: 'App force stopped' };
  } catch (error) {
    console.error('Error force stopping app:', error);
    throw error;
  }
}

async function executeAdbCommand(sdkPath, deviceId, command) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const fullCommand = deviceId 
      ? `"${adbPath}" -s ${deviceId} ${command}`
      : `"${adbPath}" ${command}`;
    
    const { stdout, stderr } = await execAsync(fullCommand);
    return { stdout, stderr, success: true };
  } catch (error) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || error.message, 
      success: false 
    };
  }
}

async function executeShellCommand(sdkPath, deviceId, command) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout, stderr } = await execAsync(`"${adbPath}" -s ${deviceId} shell ${command}`);
    return { stdout: stdout || '', stderr: stderr || '', success: true };
  } catch (error) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || error.message, 
      success: false 
    };
  }
}

async function startLogcat(sdkPath, deviceId, filters = {}) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    let args = ['-s', deviceId, 'logcat', '-v', 'time'];
    
    // Add priority filter
    if (filters.priority && filters.priority !== 'V') {
      args.push(`*:${filters.priority}`);
    }
    
    // Add tag filter
    if (filters.tag) {
      args.push('-s', filters.tag);
    }
    
    return { 
      success: true, 
      adbPath,
      args,
      message: 'Logcat command prepared'
    };
  } catch (error) {
    console.error('Error starting logcat:', error);
    throw error;
  }
}

async function clearLogcat(sdkPath, deviceId) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} logcat -c`);
    return { success: true, message: 'Logs cleared' };
  } catch (error) {
    console.error('Error clearing logcat:', error);
    throw error;
  }
}

async function pushFile(sdkPath, deviceId, localPath, remotePath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} push "${localPath}" "${remotePath}"`);
    return { success: true, message: 'File pushed successfully' };
  } catch (error) {
    console.error('Error pushing file:', error);
    throw error;
  }
}

async function pullFile(sdkPath, deviceId, remotePath, localPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} pull "${remotePath}" "${localPath}"`);
    return { success: true, message: 'File pulled successfully', path: localPath };
  } catch (error) {
    console.error('Error pulling file:', error);
    throw error;
  }
}

async function startScreenRecording(sdkPath, deviceId, options = {}) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const remotePath = '/sdcard/screenrecord.mp4';
    
    let command = `"${adbPath}" -s ${deviceId} shell screenrecord`;
    
    if (options.timeLimit) {
      command += ` --time-limit ${options.timeLimit}`;
    }
    if (options.bitRate) {
      command += ` --bit-rate ${options.bitRate}`;
    }
    if (options.size) {
      command += ` --size ${options.size}`;
    }
    
    command += ` ${remotePath}`;
    
    return { command, remotePath, success: true };
  } catch (error) {
    console.error('Error starting screen recording:', error);
    throw error;
  }
}

async function stopScreenRecording(sdkPath, deviceId, remotePath, localPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    
    // Pull the file
    await execAsync(`"${adbPath}" -s ${deviceId} pull ${remotePath} "${localPath}"`);
    
    // Remove from device
    await execAsync(`"${adbPath}" -s ${deviceId} shell rm ${remotePath}`);
    
    return { success: true, path: localPath };
  } catch (error) {
    console.error('Error stopping screen recording:', error);
    throw error;
  }
}

async function sendKeyEvent(sdkPath, deviceId, keyCode) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell input keyevent ${keyCode}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending key event:', error);
    throw error;
  }
}

async function sendText(sdkPath, deviceId, text) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const escapedText = text.replace(/\s/g, '%s');
    await execAsync(`"${adbPath}" -s ${deviceId} shell input text "${escapedText}"`);
    return { success: true };
  } catch (error) {
    console.error('Error sending text:', error);
    throw error;
  }
}

async function sendTap(sdkPath, deviceId, x, y) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell input tap ${x} ${y}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending tap:', error);
    throw error;
  }
}

async function sendSwipe(sdkPath, deviceId, x1, y1, x2, y2, duration = 300) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending swipe:', error);
    throw error;
  }
}

async function connectWireless(sdkPath, deviceId, port = 5555) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    
    // Enable TCP/IP on device
    await execAsync(`"${adbPath}" -s ${deviceId} tcpip ${port}`);
    
    // Get device IP
    const { stdout } = await execAsync(`"${adbPath}" -s ${deviceId} shell ip addr show wlan0`);
    const match = stdout.match(/inet (\d+\.\d+\.\d+\.\d+)/);
    
    if (!match) {
      throw new Error('Could not determine device IP address');
    }
    
    const ip = match[1];
    
    // Wait a moment for the device to restart in TCP/IP mode
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Connect via TCP/IP
    const { stdout: connectOutput } = await execAsync(`"${adbPath}" connect ${ip}:${port}`);
    
    return { 
      success: true, 
      ip, 
      port, 
      message: `Connected to ${ip}:${port}`,
      output: connectOutput
    };
  } catch (error) {
    console.error('Error connecting wireless:', error);
    throw error;
  }
}

async function disconnectWireless(sdkPath, ipAddress) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" disconnect ${ipAddress}`);
    return { success: true, message: 'Disconnected' };
  } catch (error) {
    console.error('Error disconnecting wireless:', error);
    throw error;
  }
}

async function createBackup(sdkPath, deviceId, backupPath, options = {}) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    let command = `"${adbPath}" -s ${deviceId} backup -f "${backupPath}"`;
    
    if (options.apk) command += ' -apk';
    if (options.shared) command += ' -shared';
    if (options.all) command += ' -all';
    if (options.system) command += ' -system';
    
    return { command, success: true };
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function restoreBackup(sdkPath, deviceId, backupPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const command = `"${adbPath}" -s ${deviceId} restore "${backupPath}"`;
    return { command, success: true };
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}

async function getSystemInfo(sdkPath, deviceId, service) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout } = await execAsync(`"${adbPath}" -s ${deviceId} shell dumpsys ${service}`);
    return { success: true, output: stdout };
  } catch (error) {
    console.error('Error getting system info:', error);
    throw error;
  }
}

async function listProcesses(sdkPath, deviceId) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout } = await execAsync(`"${adbPath}" -s ${deviceId} shell ps`);
    return { success: true, output: stdout };
  } catch (error) {
    console.error('Error listing processes:', error);
    throw error;
  }
}

async function listDirectory(sdkPath, deviceId, dirPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout } = await execAsync(`"${adbPath}" -s ${deviceId} shell ls -la "${dirPath}"`);
    
    const lines = stdout.split('\n').filter(line => line.trim());
    const items = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('total')) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length < 8) continue;
      
      const permissions = parts[0];
      const isDirectory = permissions.startsWith('d');
      const isLink = permissions.startsWith('l');
      const size = parts[4];
      const name = parts.slice(7).join(' ');
      
      if (name === '.' || name === '..') continue;
      
      items.push({
        name,
        isDirectory,
        isLink,
        size: isDirectory ? '-' : size,
        permissions,
        path: dirPath.endsWith('/') ? dirPath + name : dirPath + '/' + name
      });
    }
    
    return { success: true, items, path: dirPath };
  } catch (error) {
    console.error('Error listing directory:', error);
    throw error;
  }
}

async function deleteFile(sdkPath, deviceId, filePath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell rm -rf "${filePath}"`);
    return { success: true, message: 'File/folder deleted successfully' };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

async function createDirectory(sdkPath, deviceId, dirPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell mkdir -p "${dirPath}"`);
    return { success: true, message: 'Directory created successfully' };
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
}

async function renameFile(sdkPath, deviceId, oldPath, newPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" -s ${deviceId} shell mv "${oldPath}" "${newPath}"`);
    return { success: true, message: 'File/folder renamed successfully' };
  } catch (error) {
    console.error('Error renaming file:', error);
    throw error;
  }
}

async function searchFiles(sdkPath, deviceId, searchPath, pattern) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout } = await execAsync(`"${adbPath}" -s ${deviceId} shell find "${searchPath}" -name "*${pattern}*" 2>/dev/null`);
    
    const files = stdout.split('\n').filter(line => line.trim());
    return { success: true, files };
  } catch (error) {
    console.error('Error searching files:', error);
    throw error;
  }
}

async function pairWirelessDevice(sdkPath, ip, port, pairingCode) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout } = await execAsync(`"${adbPath}" pair ${ip}:${port} ${pairingCode}`);
    return { success: true, message: 'Device paired successfully', output: stdout };
  } catch (error) {
    console.error('Error pairing wireless device:', error);
    throw error;
  }
}

async function connectWirelessIP(sdkPath, ip, port = 5555) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    const { stdout } = await execAsync(`"${adbPath}" connect ${ip}:${port}`);
    return { success: true, message: `Connected to ${ip}:${port}`, output: stdout };
  } catch (error) {
    console.error('Error connecting to wireless device:', error);
    throw error;
  }
}

async function disconnectDevice(sdkPath, deviceId) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" disconnect ${deviceId}`);
    return { success: true, message: 'Device disconnected' };
  } catch (error) {
    console.error('Error disconnecting device:', error);
    throw error;
  }
}

async function restartAdbServer(sdkPath) {
  try {
    const adbPath = sdkManager.getAdbPath(sdkPath);
    await execAsync(`"${adbPath}" kill-server`);
    await execAsync(`"${adbPath}" start-server`);
    return { success: true, message: 'ADB server restarted' };
  } catch (error) {
    console.error('Error restarting ADB server:', error);
    throw error;
  }
}

module.exports = {
  getDevices,
  getDeviceInfo,
  executeAdbCommand,
  rebootDevice,
  takeScreenshot,
  getInstalledApps,
  installApp,
  uninstallApp,
  clearAppData,
  forceStopApp,
  executeShellCommand,
  startLogcat,
  clearLogcat,
  pushFile,
  pullFile,
  startScreenRecording,
  stopScreenRecording,
  sendKeyEvent,
  sendText,
  sendTap,
  sendSwipe,
  connectWireless,
  disconnectWireless,
  createBackup,
  restoreBackup,
  getSystemInfo,
  listProcesses,
  listDirectory,
  deleteFile,
  createDirectory,
  renameFile,
  searchFiles,
  pairWirelessDevice,
  connectWirelessIP,
  disconnectDevice,
  restartAdbServer
};
