import { BrowserWindow, systemPreferences } from 'electron'

export function setupSecurity(mainWindow: BrowserWindow): void {
  // Bloquear navegación no deseada
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // Bloquear apertura de nuevas ventanas
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  const ses = mainWindow.webContents.session

  // Configurar Content Security Policy
  ses.webRequest.onHeadersReceived((details, callback) => {
    const isDev = process.env.NODE_ENV === 'development' || !mainWindow.isDestroyed()

    const devCsp =
      "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob: mediastream:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: http:;"
    const prodCsp =
      "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob: mediastream:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self';"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDev ? devCsp : prodCsp]
      }
    })
  })

  // Permisos: conceder solo media (cámara y micrófono) y solo al origen propio
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    try {
      const requestOrigin = details.requestingUrl ? new URL(details.requestingUrl).origin : ''
      const currentOrigin = webContents.getURL() ? new URL(webContents.getURL()).origin : ''

      if (permission === 'media' && requestOrigin === currentOrigin) {
        if (process.platform === 'darwin') {
          systemPreferences.askForMediaAccess('camera').catch(() => {})
          systemPreferences.askForMediaAccess('microphone').catch(() => {})
        }
        callback(true)
        return
      }
    } catch {
      callback(false)
      return
    }

    callback(false)
  })

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    try {
      if (!webContents) return false
      const currentOrigin = webContents.getURL() ? new URL(webContents.getURL()).origin : ''
      if (permission === 'media' && requestingOrigin === currentOrigin) {
        return true
      }
    } catch {
      return false
    }
    return false
  })
}
