import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { setupSecurity } from './security'
import { registerIpcHandlers } from './ipc'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null

function getStartFullscreen(): boolean {
  try {
    const configPath = join(__dirname, '../../src/renderer/src/system/os.config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return !!config.startFullscreen
    }
  } catch {
    // fallback
  }
  return false
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: true,
    autoHideMenuBar: true,
    fullscreen: getStartFullscreen(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  Menu.setApplicationMenu(null)
  setupSecurity(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Forward console errors and warnings to the terminal
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.log(`[Renderer ${level === 3 ? 'ERROR' : 'WARN'}] ${message} (${sourceId}:${line})`)
    }
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers(() => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
