const MIME_MAP: Record<string, string> = {
  // Text
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  html: 'text/html',
  xml: 'application/xml',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'application/typescript',

  // Images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',

  // Audio
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  m4a: 'audio/mp4',

  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',

  // Binary/Doc
  pdf: 'application/pdf',
  zip: 'application/zip'
}

export function getMimeType(filename: string): string {
  const parts = filename.split('.')
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase()
    return MIME_MAP[ext] || 'application/octet-stream'
  }
  return 'application/octet-stream'
}
