const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fsExtra = require('fs-extra');
const shell = require('shelljs');
const ragService = require('../src/services/rag/ragService');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    // Use path.join to ensure the path is absolute and correct for the OS
    const indexPath = path.join(__dirname, '..', 'build', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  // RAG & System Tools Handlers
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('read-folder-files', async (event, folderPath) => {
    const files = fs.readdirSync(folderPath);
    let combinedContent = '';
    files.forEach(file => {
      const fullPath = path.join(folderPath, file);
      if (fs.statSync(fullPath).isFile()) {
        combinedContent += `\\n--- File: ${file} ---\\n` + fs.readFileSync(fullPath, 'utf8') + '\\n';
      }
    });
    return combinedContent;
  });

  ipcMain.handle('index-folder-rag', async (event, folderPath) => {
    try {
      const count = await ragService.indexFolder(folderPath);
      return { success: true, chunks: count };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('query-rag', async (event, query) => {
    try {
      const context = await ragService.query(query);
      return { success: true, context };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-system-info', async () => {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpu: os.cpus()[0].model,
      totalMem: (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB'
    };
  });

  // --- GOD-MODE SYSTEM TOOLS ---
  ipcMain.handle('system-action', async (event, { action, payload }) => {
    try {
      switch (action) {
        case 'write-file':
          await fsExtra.outputFile(payload.path, payload.content);
          return { success: true, message: `File created at ${payload.path}` };

        case 'create-folder':
          await fsExtra.ensureDir(payload.path);
          return { success: true, message: `Folder created at ${payload.path}` };

        case 'read-file':
          const content = await fsExtra.readFile(payload.path, 'utf8');
          return { success: true, content };

        case 'list-dir':
          const files = await fsExtra.readdir(payload.path);
          return { success: true, files };

        case 'delete-file':
          await fsExtra.remove(payload.path);
          return { success: true, message: `Deleted ${payload.path}` };

        case 'run-command':
          // WARNING: Highly dangerous. We only allow specific "safe" commands or
          // require a confirmation from the user. For now, we'll return a
          // simulated result or only allow 'dir' / 'ls'.
          if (payload.command === 'dir' || payload.command === 'ls') {
            const result = shell.exec(payload.command, { silent: true });
            return { success: true, output: result.stdout };
          }
          return { success: false, error: "Command not permitted for security reasons." };

        default:
          return { success: false, error: "Unknown action" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
