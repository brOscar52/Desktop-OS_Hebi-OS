import { dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const mimeMap: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

export async function importFromHost(
  window: BrowserWindow | null,
  options?: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] }
): Promise<{ name: string; mime: string; data: ArrayBuffer; lastModified: number }[]> {
  const properties: ('openFile' | 'multiSelections')[] = ['openFile']
  if (options?.multiple) {
    properties.push('multiSelections')
  }

  const result = window
    ? await dialog.showOpenDialog(window, {
        properties,
        filters: options?.filters
      })
    : await dialog.showOpenDialog({
        properties,
        filters: options?.filters
      })

  if (result.canceled || result.filePaths.length === 0) {
    return []
  }

  const files = await Promise.all(
    result.filePaths.map(async (filePath) => {
      const stats = await fs.promises.stat(filePath)
      const buffer = await fs.promises.readFile(filePath)
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      return {
        name: path.basename(filePath),
        mime: getMimeType(filePath),
        data: arrayBuffer,
        lastModified: Math.floor(stats.mtimeMs)
      }
    })
  )

  return files
}
