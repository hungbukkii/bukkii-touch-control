const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  dialog,
} = require("electron");
const path = require("path");
const robot = require("robotjs");

let mainWindow;

const { autoUpdater } = require("electron-updater");

// Configure logging
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.bounds;

  const iconPath = path.join(__dirname, "icon.png");
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 60,
    height: 60,
    x: x + width - 150,
    y: y + Math.floor(height / 2) - 350,
    icon: appIcon,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, "screen-saver");
    }
  }, 2000);
}

function createTray() {
  const iconPath = path.join(__dirname, "icon.png");
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide', click: () => {
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Bukkii Touch Control');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/* New Update Events */
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('checking-for-update');
});
autoUpdater.on('update-available', (info) => {
  console.log('Update available.', info);
  if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-available', info);
});
autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.', info);
  if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-not-available', info);
});
autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err);
  if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-error', err ? (err.stack || err.message || String(err)) : 'Unknown error');
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
  if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('download-progress', progressObj);
});
autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-downloaded', info);

  // Prompt the user to install now
  try {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      buttons: ['Install and Restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: 'A new version has been downloaded. Install and restart now?'
    });

    if (choice === 0) {
      // Install now
      autoUpdater.quitAndInstall();
    }
  } catch (err) {
    console.error('Failed to show update dialog', err);
  }
});

// Allow renderer to request immediate install (e.g., user clicked a button)
ipcMain.on('install-update', () => {
  try {
    autoUpdater.quitAndInstall();
  } catch (err) {
    console.error('install-update failed', err);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ipcMain.on("resize-window", (event, { width, height }) => {
//   if (mainWindow && !mainWindow.isDestroyed()) {
//     mainWindow.setSize(width, height, true);
//   }
// });

// Drag handling
let dragStartCursor = null;
let dragStartWinPos = null;

ipcMain.on("drag-start", (event, { cursorX, cursorY }) => {
  dragStartCursor = { x: cursorX, y: cursorY };
  const pos = mainWindow.getPosition();
  dragStartWinPos = { x: pos[0], y: pos[1] };
});

ipcMain.on("dragging", (event, { cursorX, cursorY }) => {
  if (dragStartCursor && dragStartWinPos && mainWindow) {
    const deltaX = cursorX - dragStartCursor.x;
    const deltaY = cursorY - dragStartCursor.y;
    mainWindow.setPosition(dragStartWinPos.x + deltaX, dragStartWinPos.y + deltaY);
  }
});

ipcMain.on("drag-end", () => {
  dragStartCursor = null;
  dragStartWinPos = null;
});

let isAltHeld = false;

ipcMain.on("simulate-switch", () => {
  if (!isAltHeld) {
    console.log("Holding Alt+Tab");
    robot.keyToggle("alt", "down");
    robot.keyTap("tab");
    isAltHeld = true;
  } else {
    console.log("Releasing Alt");
    robot.keyToggle("alt", "up");
    isAltHeld = false;
  }
});

// Helper to ensure Alt is released (e.g. when dragging/closing)
ipcMain.on("switch-hold-end", () => {
  if (isAltHeld) {
    console.log("Force Releasing Alt");
    robot.keyToggle("alt", "up");
    isAltHeld = false;
  }
});