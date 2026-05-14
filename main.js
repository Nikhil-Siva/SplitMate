// main.js — Electron entry point for SplitMate
const { app, BrowserWindow, Menu, Tray, Notification, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;

// ── Create Window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SplitMate — Group Expense Splitter',
    backgroundColor: '#0d0d0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadFile('index.html');

  // Show window once DOM is ready (avoids white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimise to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'SplitMate',
          body: 'Running in the background. Click the tray icon to reopen.'
        }).show();
      }
    }
  });
}

// ── Tray ──
function createTray() {
  // Use a simple 16x16 image for tray; replace tray.png with your own icon
  const iconPath = path.join(__dirname, 'tray.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('SplitMate');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open SplitMate',  click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Export Expenses', click: () => mainWindow.webContents.send('trigger-export') },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// ── App Menu ──
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Save Data',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        {
          label: 'Export CSV',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('trigger-export')
        },
        { type: 'separator' },
        {
          label: 'Import Backup',
          click: async () => {
            const { filePaths } = await dialog.showOpenDialog(mainWindow, {
              filters: [{ name: 'JSON', extensions: ['json'] }],
              properties: ['openFile']
            });
            if (filePaths.length) {
              const data = fs.readFileSync(filePaths[0], 'utf8');
              mainWindow.webContents.send('import-data', data);
            }
          }
        },
        {
          label: 'Export Backup',
          click: () => mainWindow.webContents.send('export-backup')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About SplitMate', click: () => {
          dialog.showMessageBox(mainWindow, {
            title: 'About SplitMate',
            message: 'SplitMate v1.0',
            detail: 'Group expense splitter for outings, food & travel.\nBuilt with Electron + HTML/CSS/JS.',
            buttons: ['OK']
          });
        }}
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC Handlers ──

// Save state to a JSON file
ipcMain.handle('save-to-file', async (event, data) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'splitmate_backup.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (filePath) {
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true, filePath };
  }
  return { success: false };
});

// Send reminder notification
ipcMain.on('send-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// ── App Lifecycle ──
app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
