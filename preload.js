const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readFolderFiles: (folderPath) => ipcRenderer.invoke('read-folder-files', folderPath),
  indexFolderRag: (folderPath) => ipcRenderer.invoke('index-folder-rag', folderPath),
  queryRag: (query) => ipcRenderer.invoke('query-rag', query),
  createFile: (path, content) => ipcRenderer.invoke('system-action', { action: 'write-file', payload: { path, content } }),
  createFolder: (path) => ipcRenderer.invoke('system-action', { action: 'create-folder', payload: { path } }),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  systemAction: (action, payload) => ipcRenderer.invoke('system-action', { action, payload }),
});
