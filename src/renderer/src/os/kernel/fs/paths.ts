const INVALID_CHARS_REGEX = /[\\/:*?"<>|]/

export function isValidNodeName(name: string): boolean {
  if (!name || name.trim() === '') return false
  if (name === '.' || name === '..') return false
  if (INVALID_CHARS_REGEX.test(name)) return false
  return true
}

export function validateNodeName(name: string): void {
  if (!isValidNodeName(name)) {
    throw new Error(
      `El nombre "${name}" contiene caracteres no permitidos (\\ / : * ? " < > |) o no es válido.`
    )
  }
}

export function normalizeInternalPath(rawPath: string, homeDir = '/Usuarios/Usuario'): string {
  if (!rawPath) return '/'

  let p = rawPath.trim()

  // Expand ~
  if (p === '~' || p.startsWith('~/')) {
    p = p.replace(/^~/, homeDir)
  }

  // Replace backslashes
  p = p.replace(/\\/g, '/')

  // Remove Windows drive letter if present
  p = p.replace(/^[a-zA-Z]:/, '')

  // Split and resolve . and ..
  const parts = p.split('/').filter(Boolean)
  const stack: string[] = []

  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      stack.pop()
    } else {
      stack.push(part)
    }
  }

  return '/' + stack.join('/')
}

export function toDisplayPath(internalPath: string): string {
  const norm = normalizeInternalPath(internalPath)
  if (norm === '/') {
    return 'Disco local (C:)'
  }
  if (norm === '/.Papelera' || norm.startsWith('/.Papelera/')) {
    const sub = norm.slice('/.Papelera'.length)
    return 'Papelera de reciclaje' + (sub ? sub.replace(/\//g, '\\') : '')
  }

  return 'C:' + norm.replace(/\//g, '\\')
}

export function fromDisplayPath(displayText: string, homeDir = '/Usuarios/Usuario'): string {
  if (!displayText || displayText.trim() === '') return '/'

  const text = displayText.trim()

  if (text.toLowerCase() === 'disco local (c:)' || text.toLowerCase() === 'c:' || text.toLowerCase() === 'c:\\') {
    return '/'
  }

  if (text.toLowerCase() === 'papelera de reciclaje' || text.toLowerCase() === 'papelera') {
    return '/.Papelera'
  }

  if (text === '~' || text.startsWith('~\\') || text.startsWith('~/')) {
    const sub = text.slice(1).replace(/\\/g, '/')
    return normalizeInternalPath(homeDir + sub, homeDir)
  }

  let clean = text.replace(/^[a-zA-Z]:/, '').replace(/\\/g, '/')
  if (!clean.startsWith('/')) {
    clean = '/' + clean
  }

  return normalizeInternalPath(clean, homeDir)
}

export function generateDuplicateName(existingNames: Set<string>, baseName: string): string {
  if (!existingNames.has(baseName)) return baseName

  const lastDot = baseName.lastIndexOf('.')
  let nameWithoutExt = baseName
  let ext = ''

  if (lastDot > 0) {
    nameWithoutExt = baseName.slice(0, lastDot)
    ext = baseName.slice(lastDot)
  }

  for (let counter = 2; counter < 10000; counter++) {
    const candidate = `${nameWithoutExt} (${counter})${ext}`
    if (!existingNames.has(candidate)) {
      return candidate
    }
  }
  return `${nameWithoutExt} (${Date.now()})${ext}`
}
