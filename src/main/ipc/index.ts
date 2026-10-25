import { ipcMain, BrowserWindow } from 'electron'
import { importFromHost } from './files'
import { hashPassword, verifyPassword } from './auth'
import { quit, toggleFullscreen } from './power'

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('files:importFromHost', async (_event, options) => {
    return importFromHost(getMainWindow(), options)
  })

  ipcMain.handle('auth:hashPassword', async (_event, password: string) => {
    return hashPassword(password)
  })

  ipcMain.handle('auth:verifyPassword', async (_event, password: string, hash: string, salt: string) => {
    return verifyPassword(password, hash, salt)
  })

  ipcMain.on('power:quit', () => {
    quit()
  })

  ipcMain.on('power:toggleFullscreen', () => {
    toggleFullscreen(getMainWindow())
  })
}
