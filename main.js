const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  nativeImage,
} = require("electron");
const path = require("path");
const robot = require("robotjs");

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.bounds;

  const iconPath = path.join(__dirname, "icon-transparent.png");
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 60,
    height: 60,
    x: x + width - 100,
    y: y + Math.floor(height / 2) - 30,
    icon: appIcon,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
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
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("resize-window", (event, { width, height }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSize(width, height, true);
  }
});

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

ipcMain.on("simulate-switch", () => {
  console.log("Simulating Alt+Tab");
  robot.keyTap("tab", "alt");
});