import { app, BrowserWindow } from 'electron'

export function quit(): void {
  app.quit()
}

export function toggleFullscreen(window: BrowserWindow | null): void {
  if (window) {
    window.setFullScreen(!window.isFullScreen())
  }
}
