export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface AppMenuItem {
  label: string
  shortcut?: string
  disabled?: boolean
  action?: () => void
}

export interface AppMenu {
  label: string
  items: AppMenuItem[]
}

export interface WindowState {
  id: string
  appId: string
  instanceId: string
  title: string
  x: number
  y: number
  width: number
  height: number
  state: 'normal' | 'minimized' | 'maximized'
  zIndex: number
  focused: boolean
  hasModal: boolean

  // Metadata and integration
  launchArgs?: Record<string, unknown>
  minWidth: number
  minHeight: number
  resizable: boolean
  singleInstance: boolean
  normalBounds?: WindowBounds
  isDirty?: boolean
  documentName?: string
  saveHandler?: () => Promise<boolean>
  openFileHandler?: (path: string) => void
  appMenus?: AppMenu[]
}
