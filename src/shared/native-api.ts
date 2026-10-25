export interface NativeApi {
  files: {
    /** Abre el diálogo nativo del equipo real y devuelve los archivos elegidos. */
    importFromHost(options?: {
      multiple?: boolean
      filters?: { name: string; extensions: string[] }[]
    }): Promise<{
      name: string
      mime: string
      data: ArrayBuffer
      lastModified: number
    }[]>
  }
  auth: {
    hashPassword(password: string): Promise<{ hash: string; salt: string }>
    verifyPassword(password: string, hash: string, salt: string): Promise<boolean>
  }
  power: {
    quit(): void
    toggleFullscreen(): void
  }
  platform: { os: 'linux' | 'darwin' | 'win32' }
}

declare global {
  interface Window {
    native: NativeApi
  }
}
