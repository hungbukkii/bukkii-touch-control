const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
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
});
autoUpdater.on('update-available', (info) => {
  console.log('Update available.', info);
});
autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.', info);
});
autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  // Auto install on quit is default, so no extra code strictly needed unless we want to prompt immediately
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