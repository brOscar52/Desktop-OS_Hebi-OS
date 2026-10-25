import osConfig from '@system'

export type ThemeOption = 'light' | 'dark' | 'auto'
export type IconSizeOption = 'small' | 'medium' | 'large'
export type TaskbarAlignment = 'center' | 'left'

export type WallpaperSetting =
  | { type: 'builtin'; id: string }
  | { type: 'file'; nodeId: string }

export type DesktopItem = {
  id: string
  kind: 'app' | 'node' | 'system'
  ref: string
  x: number
  y: number
}

export type DesktopWidget = {
  id: string
  widgetId: string
  size: 'small' | 'medium' | 'large'
  x: number
  y: number
}

export type KnownNetwork = {
  ssid: string
  password?: string
}

export interface SettingsSchema {
  'appearance.theme': ThemeOption
  'appearance.accent': string
  'appearance.transparency': boolean
  'appearance.wallpaper': WallpaperSetting
  'desktop.items': DesktopItem[]
  'desktop.iconSize': IconSizeOption
  'desktop.widgets': DesktopWidget[]
  'taskbar.pinned': string[]
  'taskbar.alignment': TaskbarAlignment
  'start.pinned': string[]
  'sound.volume': number
  'sound.muted': boolean
  'sound.systemSounds': boolean
  'network.wifiEnabled': boolean
  'network.connectedSsid': string | null
  'network.knownNetworks': KnownNetwork[]
  'datetime.timezone': string
  'datetime.hour24': boolean
  'fileAssociations.defaults': Record<string, string>
}

export type SettingKey = keyof SettingsSchema
export type SettingValue<K extends SettingKey> = SettingsSchema[K]

export function getDefaultSettings(): SettingsSchema {
  return {
    'appearance.theme': (osConfig.defaults.theme as ThemeOption) || 'light',
    'appearance.accent': osConfig.defaults.accent || '#0D9488',
    'appearance.transparency': true,
    'appearance.wallpaper': {
      type: 'builtin',
      id: osConfig.defaults.wallpaper || 'aurora'
    },
    'desktop.items': [
      {
        id: 'item-recycle-bin',
        kind: 'system',
        ref: 'recycle-bin',
        x: 20,
        y: 20
      }
    ],
    'desktop.iconSize': 'medium',
    'desktop.widgets': [],
    'taskbar.pinned': ['files', 'text-editor', 'terminal', 'settings'],
    'taskbar.alignment': (osConfig.defaults.taskbarAlignment as TaskbarAlignment) || 'center',
    'start.pinned': ['files', 'text-editor', 'terminal', 'settings', 'notes', 'calendar', 'image-viewer', 'calculator'],
    'sound.volume': 80,
    'sound.muted': false,
    'sound.systemSounds': true,
    'network.wifiEnabled': true,
    'network.connectedSsid': 'Casa_5G',
    'network.knownNetworks': [
      { ssid: 'Casa_5G', password: '12345678' }
    ],
    'datetime.timezone': osConfig.defaults.timezone || 'America/Caracas',
    'datetime.hour24': osConfig.defaults.hour24 ?? false,
    'fileAssociations.defaults': {}
  }
}
