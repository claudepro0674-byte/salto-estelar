// electron/main.js
// Ventana de Windows para "Salto Estelar", aislada de Node:
// sin nodeIntegration, con contextIsolation y sandbox, y sin navegación externa.
'use strict';

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 400,
    backgroundColor: '#0b0820',
    autoHideMenuBar: true,
    title: 'Salto Estelar',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      // Sin preload: la página no necesita ningún puente hacia Node.
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, '..', 'www', 'index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // Bloquea cualquier navegación fuera del index.html empaquetado.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url);
    const current = new URL(mainWindow.webContents.getURL());
    if (target.protocol !== 'file:' || target.pathname !== current.pathname) {
      event.preventDefault();
    }
  });

  // Bloquea ventanas nuevas / popups y abre enlaces externos (si los hubiera) en el navegador del sistema.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  // Defensa en profundidad: nunca permitir permisos del sistema (cámara, micro, etc.).
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(false);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Evita que la app abra una segunda ventana al hacer doble clic en el instalador/exe mientras ya corre una instancia.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
