import { getAllApps, getApp } from './registry'
import { AppManifest } from './manifest.schema'
import { settings } from '../settings'
import { windowManager } from '../windows'

export function getFileExtension(path: string): string {
  const clean = path.split('?')[0].split('#')[0]
  const lastSegment = clean.split('/').pop() || ''
  const dotIndex = lastSegment.lastIndexOf('.')
  if (dotIndex <= 0) return ''
  return lastSegment.substring(dotIndex + 1).toLowerCase()
}

export function getAppsForFile(path: string): AppManifest[] {
  const ext = getFileExtension(path)
  if (!ext) return []

  const apps = getAllApps()
  const matched: AppManifest[] = []

  for (const app of apps) {
    const assocs = app.manifest.fileAssociations || []
    const hasExt = assocs.some((a) =>
      a.extensions.map((e) => e.replace('.', '').toLowerCase()).includes(ext)
    )
    if (hasExt) {
      matched.push(app.manifest)
    }
  }

  // Sort by highest priority
  matched.sort((a, b) => {
    const aPrio = Math.max(
      ...(a.fileAssociations?.map((x) => x.priority || 0) || [0])
    )
    const bPrio = Math.max(
      ...(b.fileAssociations?.map((x) => x.priority || 0) || [0])
    )
    return bPrio - aPrio
  })

  return matched
}

export function getDefaultAppForFile(path: string): string | null {
  const ext = getFileExtension(path)
  if (!ext) return null

  // 1. Check user defaults
  const userDefaults = settings.get('fileAssociations.defaults') || {}
  if (userDefaults[ext]) {
    const app = getApp(userDefaults[ext])
    if (app) return app.id
  }

  // 2. Highest priority app
  const candidates = getAppsForFile(path)
  if (candidates.length > 0) {
    return candidates[0].id
  }

  return null
}

export async function openFileWithApp(path: string, appId?: string): Promise<string | null> {
  let targetAppId = appId

  if (!targetAppId) {
    targetAppId = getDefaultAppForFile(path) || undefined
  }

  if (targetAppId) {
    return windowManager.open(targetAppId, { filePath: path })
  }

  // Fallback: If no app matches, fallback to text editor if textual, or open text-editor
  return windowManager.open('text-editor', { filePath: path })
}

export async function setDefaultAppForExtension(ext: string, appId: string): Promise<void> {
  const cleanExt = ext.replace('.', '').toLowerCase()
  const current = settings.get('fileAssociations.defaults') || {}
  await settings.set('fileAssociations.defaults', {
    ...current,
    [cleanExt]: appId
  })
}
