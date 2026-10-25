import { contextBridge, ipcRenderer } from 'electron'
import type { NativeApi } from '../shared/native-api'

const nativeApi: NativeApi = {
  files: {
    importFromHost: (options) => ipcRenderer.invoke('files:importFromHost', options)
  },
  auth: {
    hashPassword: (password) => ipcRenderer.invoke('auth:hashPassword', password),
    verifyPassword: (password, hash, salt) =>
      ipcRenderer.invoke('auth:verifyPassword', password, hash, salt)
  },
  power: {
    quit: () => ipcRenderer.send('power:quit'),
    toggleFullscreen: () => ipcRenderer.send('power:toggleFullscreen')
  },
  platform: {
    os: process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux'
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('native', nativeApi)
  } catch (error) {
    console.error('Error exposing native API in contextBridge:', error)
  }
} else {
  window.native = nativeApi
}
