const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'build/index.html'));
  }
}

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('folder:readFiles', async (event, folderPath) => {
  try {
    const files = fs.readdirSync(folderPath);
    let combinedContent = '';
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      if (fs.statSync(filePath).isFile() && /\.(txt|js|jsx|ts|tsx|py|html|css|md|json)$/i.test(file)) {
        combinedContent += `--- FILE: ${file} ---\n${fs.readFileSync(filePath, 'utf8')}\n\n`;
      }
    }
    return combinedContent;
  } catch (error) {
    throw error;
  }
});

// SAFE GOD-MODE TOOLS
ipcMain.handle('system:createFile', async (event, { path: filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, message: `File created at ${filePath}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('system:createFolder', async (event, folderPath) => {
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true, message: `Folder created at ${folderPath}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('system:getInfo', async () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0].model,
    totalMem: (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB',
    freeMem: (os.freemem() / (1024 ** 3)).toFixed(2) + ' GB',
  };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
