import type { AppManifest } from '../kernel/apps/manifest.schema'

export type LaunchArgs = { filePath?: string; [key: string]: unknown }

export interface AppMenu {
  label: string
  items: {
    label: string
    shortcut?: string
    disabled?: boolean
    action?: () => void
  }[]
}

export function useOS() {
  return {
    app: { id: 'app', manifest: {} as AppManifest, instanceId: 'inst-0' },
    fs: {} as Record<string, unknown>,
    window: {
      setTitle: (_title: string) => {},
      close: async () => {},
      focus: () => {}
    },
    dialogs: {} as Record<string, unknown>,
    notify: (_n: { title: string; body?: string; sound?: boolean; launchArgs?: LaunchArgs }) => {},
    storage: {
      get: async <T>(_key: string): Promise<T | undefined> => undefined,
      set: async <T>(_key: string, _value: T): Promise<void> => {},
      delete: async (_key: string): Promise<void> => {},
      list: async <T>(_prefix?: string): Promise<{ key: string; value: T }[]> => []
    },
    settings: {
      get: (_key: string): unknown => undefined,
      set: async (_key: string, _value: unknown): Promise<void> => {}
    },
    sound: {
      playSystem: (_name: string) => {}
    },
    apps: {
      launch: (_appId: string, _args?: LaunchArgs) => {},
      openFile: (_path: string, _appId?: string) => {},
      getAppsForFile: (_path: string): AppManifest[] => [],
      list: (): AppManifest[] => []
    },
    scheduler: {
      schedule: async (_job: Record<string, unknown>): Promise<string> => '',
      cancel: async (_id: string): Promise<void> => {},
      list: async (): Promise<Record<string, unknown>[]> => []
    },
    media: {
      getCamera: async () => ({} as MediaStream),
      getMicrophone: async () => ({} as MediaStream),
      listCameras: async () => []
    },
    events: {
      on: (_e: string, _h: (d: unknown) => void) => () => {}
    }
  }
}

export function useLaunchArgs(): LaunchArgs {
  return {}
}

export function useOpenFileHandler(_handler: (path: string) => void): void {}

export function useSetting<T>(_key: string): T | undefined {
  return undefined
}

export function useSystemVolume(): number {
  return 1
}

export function useFsWatch(_path: string): unknown[] {
  return []
}

export function useAppMenus(_menus: AppMenu[]): void {}

export function useUnsavedChanges(_opts: {
  isDirty: boolean
  documentName: string
  save: () => Promise<boolean>
}): void {}

export function useProcesses(): Record<string, unknown> {
  return {}
}

export function useAccount(): Record<string, unknown> {
  return {}
}

export * from '../kernel/apps/manifest.schema'
