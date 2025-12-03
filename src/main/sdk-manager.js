const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { createWriteStream, existsSync } = require('fs');
const extractZip = require('extract-zip');

// Latest platform tools version info
const PLATFORM_TOOLS_INFO = {
  windows: {
    url: 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip',
    folder: 'platform-tools'
  },
  darwin: {
    url: 'https://dl.google.com/android/repository/platform-tools-latest-darwin.zip',
    folder: 'platform-tools'
  },
  linux: {
    url: 'https://dl.google.com/android/repository/platform-tools-latest-linux.zip',
    folder: 'platform-tools'
  }
};

async function checkSDK(sdkPath) {
  try {
    // Check if android-sdk folder exists
    const exists = existsSync(sdkPath);
    if (!exists) {
      return { exists: false, upToDate: false };
    }

    // Check if platform-tools exists
    const platformToolsPath = path.join(sdkPath, 'platform-tools');
    const platformToolsExists = existsSync(platformToolsPath);
    
    if (!platformToolsExists) {
      return { exists: true, upToDate: false };
    }

    // Check for adb executable
    const adbPath = getAdbPath(sdkPath);
    const adbExists = existsSync(adbPath);
    
    if (!adbExists) {
      return { exists: true, upToDate: false };
    }

    // Check version file
    const versionFile = path.join(platformToolsPath, 'source.properties');
    if (existsSync(versionFile)) {
      const content = await fs.readFile(versionFile, 'utf-8');
      const versionMatch = content.match(/Pkg.Revision=([0-9.]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      return { 
        exists: true, 
        upToDate: true, 
        version,
        path: sdkPath 
      };
    }

    return { exists: true, upToDate: true };
  } catch (error) {
    console.error('Error checking SDK:', error);
    return { exists: false, upToDate: false, error: error.message };
  }
}

async function downloadSDK(sdkPath, onProgress) {
  try {
    // Ensure sdk directory exists
    await fs.mkdir(sdkPath, { recursive: true });

    const platform = process.platform === 'win32' ? 'windows' : 
                     process.platform === 'darwin' ? 'darwin' : 'linux';
    
    const platformInfo = PLATFORM_TOOLS_INFO[platform];
    const zipPath = path.join(sdkPath, 'platform-tools.zip');

    // Download the zip file
    await downloadFile(platformInfo.url, zipPath, onProgress);

    // Extract the zip file
    if (onProgress) onProgress({ stage: 'extracting', percent: 0 });
    await extractZip(zipPath, { dir: sdkPath });

    // Clean up zip file
    await fs.unlink(zipPath);

    if (onProgress) onProgress({ stage: 'complete', percent: 100 });

    return { success: true, path: sdkPath };
  } catch (error) {
    console.error('Error downloading SDK:', error);
    throw error;
  }
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        return https.get(response.headers.location, handleResponse);
      }
      
      handleResponse(response);
      
      function handleResponse(res) {
        const totalSize = parseInt(res.headers['content-length'], 10);
        let downloadedSize = 0;

        res.pipe(file);

        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const percent = Math.round((downloadedSize / totalSize) * 100);
          if (onProgress) {
            onProgress({ stage: 'downloading', percent, downloadedSize, totalSize });
          }
        });

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
  });
}

function getAdbPath(sdkPath) {
  const platform = process.platform;
  const adbName = platform === 'win32' ? 'adb.exe' : 'adb';
  return path.join(sdkPath, 'platform-tools', adbName);
}

module.exports = {
  checkSDK,
  downloadSDK,
  getAdbPath
};
