import type { AppManifest } from '../kernel/apps/manifest.schema'
import { fs as kernelFs } from '../kernel/fs'
import { sound as kernelSound, SystemSound } from '../kernel/sound'
import { settings as kernelSettings, SettingKey, SettingValue } from '../kernel/settings'
import { events as kernelEvents, EventName, EventData } from '../kernel/events'
import { storage as kernelStorage, ScheduledRecord } from '../kernel/storage'
import { scheduler as kernelScheduler } from '../kernel/scheduler'
import { media as kernelMedia } from '../kernel/media'
import { notifications as kernelNotifications } from '../kernel/notifications'

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
    fs: kernelFs,
    window: {
      setTitle: (_title: string) => {},
      close: async () => {},
      focus: () => {}
    },
    dialogs: {} as Record<string, unknown>,
    notify: (n: { title: string; body?: string; sound?: boolean; launchArgs?: LaunchArgs }) => {
      kernelNotifications.post({
        appId: 'system',
        title: n.title,
        body: n.body,
        sound: n.sound,
        launchArgs: n.launchArgs
      })
    },
    storage: {
      get: async <T>(key: string): Promise<T | undefined> => kernelStorage.getAppData('app', key),
      set: async <T>(key: string, value: T): Promise<void> => kernelStorage.setAppData('app', key, value),
      delete: async (key: string): Promise<void> => kernelStorage.deleteAppData('app', key),
      list: async <T>(prefix?: string): Promise<{ key: string; value: T }[]> => kernelStorage.listAppData('app', prefix)
    },
    settings: {
      get: <K extends SettingKey>(key: K): SettingValue<K> => kernelSettings.get(key),
      set: async <K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> => kernelSettings.set(key, value)
    },
    sound: {
      playSystem: (name: SystemSound) => kernelSound.playSystem(name)
    },
    apps: {
      launch: (_appId: string, _args?: LaunchArgs) => {},
      openFile: (_path: string, _appId?: string) => {},
      getAppsForFile: (_path: string): AppManifest[] => [],
      list: (): AppManifest[] => []
    },
    scheduler: {
      schedule: async (job: Omit<ScheduledRecord, 'id' | 'appId'>): Promise<string> =>
        kernelScheduler.schedule({ ...job, appId: 'app' }),
      cancel: async (id: string): Promise<void> => kernelScheduler.cancel(id),
      list: async (): Promise<ScheduledRecord[]> => kernelScheduler.list('app')
    },
    media: {
      getCamera: async (constraints?: MediaTrackConstraints) => kernelMedia.getCamera(constraints),
      getMicrophone: async (constraints?: MediaTrackConstraints) => kernelMedia.getMicrophone(constraints),
      listCameras: async () => kernelMedia.listCameras()
    },
    events: {
      on: <E extends EventName>(e: E, h: (d: EventData<E>) => void) => kernelEvents.on(e, h)
    }
  }
}

export function useLaunchArgs(): LaunchArgs {
  return {}
}

export function useOpenFileHandler(_handler: (path: string) => void): void {}

export function useSetting<K extends SettingKey>(key: K): SettingValue<K> {
  return kernelSettings.get(key)
}

export function useSystemVolume(): number {
  return kernelSound.getEffectiveVolume()
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
