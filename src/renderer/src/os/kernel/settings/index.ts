import { storage } from '../storage'
import { events } from '../events'
import { sound } from '../sound'
import {
  SettingsSchema,
  SettingKey,
  SettingValue,
  getDefaultSettings
} from './schema'

export class SettingsService {
  private cache: SettingsSchema = getDefaultSettings()
  private initialized = false
  private subscribers = new Set<(key: SettingKey, value: unknown) => void>()

  async init(): Promise<void> {
    if (this.initialized) return

    const defaults = getDefaultSettings()
    const stored = await storage.getAllSettings()

    this.cache = { ...defaults }
    for (const [key, val] of Object.entries(stored)) {
      if (key in this.cache) {
        // @ts-expect-error dynamic assign
        this.cache[key as SettingKey] = val
      }
    }

    // Sync sound settings
    sound.setVolume(this.cache['sound.volume'])
    sound.setMuted(this.cache['sound.muted'])
    sound.setSystemSounds(this.cache['sound.systemSounds'])

    this.applyThemeToDOM()
    this.initialized = true
  }

  get<K extends SettingKey>(key: K): SettingValue<K> {
    return this.cache[key]
  }

  async set<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> {
    this.cache[key] = value
    await storage.setSetting(key, value)

    if (key === 'sound.volume') sound.setVolume(value as number)
    if (key === 'sound.muted') sound.setMuted(value as boolean)
    if (key === 'sound.systemSounds') sound.setSystemSounds(value as boolean)

    if (
      key === 'appearance.theme' ||
      key === 'appearance.accent' ||
      key === 'appearance.transparency'
    ) {
      this.applyThemeToDOM()
    }

    events.emit('settings:changed', { key, value })
    for (const sub of Array.from(this.subscribers)) {
      sub(key, value)
    }
  }

  subscribe(callback: (key: SettingKey, value: unknown) => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private applyThemeToDOM(): void {
    const root = document.documentElement
    const theme = this.cache['appearance.theme']
    const accent = this.cache['appearance.accent']
    const transparency = this.cache['appearance.transparency']

    // Resolve system dark mode if auto
    let effectiveTheme = theme
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      effectiveTheme = prefersDark ? 'dark' : 'light'
    }

    root.setAttribute('data-theme', effectiveTheme)
    root.setAttribute('data-transparency', transparency ? 'true' : 'false')

    if (accent) {
      root.style.setProperty('--accent-color', accent)
      root.style.setProperty('--accent-border', `${accent}66`)
      root.style.setProperty('--accent-subtle', `${accent}20`)
    }
  }
}

export const settings = new SettingsService()
export * from './schema'
