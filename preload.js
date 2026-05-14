// preload.js — Secure bridge between renderer (index.html) and main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Save JSON backup to user-chosen file
  saveToFile: (data) => ipcRenderer.invoke('save-to-file', data),

  // Send a desktop notification
  sendNotification: (title, body) => ipcRenderer.send('send-notification', { title, body }),

  // Listen for menu-triggered events
  onMenuSave:       (cb) => ipcRenderer.on('menu-save',       () => cb()),
  onTriggerExport:  (cb) => ipcRenderer.on('trigger-export',  () => cb()),
  onImportData:     (cb) => ipcRenderer.on('import-data',     (_, data) => cb(data)),
  onExportBackup:   (cb) => ipcRenderer.on('export-backup',   () => cb()),
});
