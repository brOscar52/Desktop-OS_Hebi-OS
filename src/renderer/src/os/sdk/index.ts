import { useState, useEffect, useMemo } from 'react'
import type { AppManifest } from '../kernel/apps/manifest.schema'
import { getApp, getAllApps } from '../kernel/apps/registry'
import { fs as kernelFs, FsNode } from '../kernel/fs'
import { sound as kernelSound, SystemSound } from '../kernel/sound'
import { settings as kernelSettings, SettingKey, SettingValue } from '../kernel/settings'
import { events as kernelEvents, EventName, EventData } from '../kernel/events'
import { storage as kernelStorage, ScheduledRecord } from '../kernel/storage'
import { scheduler as kernelScheduler } from '../kernel/scheduler'
import { media as kernelMedia } from '../kernel/media'
import { notifications as kernelNotifications } from '../kernel/notifications'
import { windowManager } from '../kernel/windows'
import { dialogs } from '../kernel/dialogs'
import { openFileWithApp, getAppsForFile } from '../kernel/apps/launcher'
import { processes, ProcessesService } from '../kernel/processes'
import { useWindowContext } from './context'
import type { AppMenu } from '../kernel/windows/types'
import type { DialogsApi } from '../kernel/dialogs/types'

export type LaunchArgs = { filePath?: string; [key: string]: unknown }
export type { AppMenu } from '../kernel/windows/types'
export type { DialogsApi } from '../kernel/dialogs/types'

export function useOS() {
  const { windowId, appId, instanceId } = useWindowContext()

  const osApi = useMemo(() => {
    const registeredApp = getApp(appId)
    const manifest = registeredApp?.manifest || ({} as AppManifest)

    return {
      app: { id: appId, manifest, instanceId },
      fs: kernelFs,
      window: {
        setTitle: (title: string) => windowManager.setTitle(windowId, title),
        close: async () => {
          await windowManager.close(windowId)
        },
        focus: () => windowManager.focus(windowId)
      },
      dialogs: dialogs.createWindowDialogs(windowId) as DialogsApi,
      notify: (n: { title: string; body?: string; sound?: boolean; launchArgs?: LaunchArgs }) => {
        kernelNotifications.post({
          appId,
          title: n.title,
          body: n.body,
          sound: n.sound,
          launchArgs: n.launchArgs
        })
      },
      storage: {
        get: async <T>(key: string): Promise<T | undefined> =>
          kernelStorage.getAppData(appId, key),
        set: async <T>(key: string, value: T): Promise<void> =>
          kernelStorage.setAppData(appId, key, value),
        delete: async (key: string): Promise<void> =>
          kernelStorage.deleteAppData(appId, key),
        list: async <T>(prefix?: string): Promise<{ key: string; value: T }[]> =>
          kernelStorage.listAppData(appId, prefix)
      },
      settings: {
        get: <K extends SettingKey>(key: K): SettingValue<K> => kernelSettings.get(key),
        set: async <K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> => {
          if (appId !== 'system' && !manifest.permissions?.includes('settings:write')) {
            throw new Error("Permiso 'settings:write' no declarado en el manifiesto")
          }
          await kernelSettings.set(key, value)
        }
      },
      sound: {
        playSystem: (name: SystemSound) => kernelSound.playSystem(name)
      },
      apps: {
        launch: (targetAppId: string, args?: LaunchArgs) => {
          windowManager.open(targetAppId, args)
        },
        openFile: (path: string, targetAppId?: string) => {
          openFileWithApp(path, targetAppId)
        },
        getAppsForFile: (path: string): AppManifest[] => getAppsForFile(path),
        list: (): AppManifest[] => getAllApps().map((a) => a.manifest)
      },
      scheduler: {
        schedule: async (job: Omit<ScheduledRecord, 'id' | 'appId'>): Promise<string> =>
          kernelScheduler.schedule({ ...job, appId }),
        cancel: async (id: string): Promise<void> => kernelScheduler.cancel(id),
        list: async (): Promise<ScheduledRecord[]> => kernelScheduler.list(appId)
      },
      media: {
        getCamera: async (constraints?: MediaTrackConstraints) => {
          if (!manifest.permissions?.includes('camera')) {
            throw new Error("Permiso 'camera' no declarado en el manifiesto")
          }
          return kernelMedia.getCamera(constraints, instanceId)
        },
        getMicrophone: async (constraints?: MediaTrackConstraints) => {
          if (!manifest.permissions?.includes('microphone')) {
            throw new Error("Permiso 'microphone' no declarado en el manifiesto")
          }
          return kernelMedia.getMicrophone(constraints, instanceId)
        },
        listCameras: async () => kernelMedia.listCameras()
      },
      events: {
        on: <E extends EventName>(e: E, h: (d: EventData<E>) => void) => kernelEvents.on(e, h)
      }
    }
  }, [appId, instanceId, windowId])

  return osApi
}

export function useLaunchArgs(): LaunchArgs {
  const { launchArgs } = useWindowContext()
  return launchArgs || {}
}

export function useOpenFileHandler(handler: (path: string) => void): void {
  const { windowId } = useWindowContext()
  useEffect(() => {
    windowManager.setOpenFileHandler(windowId, handler)
  }, [windowId, handler])
}

export function useSetting<K extends SettingKey>(key: K): SettingValue<K> {
  const [val, setVal] = useState<SettingValue<K>>(() => kernelSettings.get(key))

  useEffect(() => {
    const unsub = kernelSettings.subscribe(key, (newVal) => {
      setVal(newVal)
    })
    return () => unsub()
  }, [key])

  return val
}

export function useSystemVolume(): number {
  const [vol, setVol] = useState<number>(() => kernelSound.getEffectiveVolume())

  useEffect(() => {
    const update = () => setVol(kernelSound.getEffectiveVolume())
    const unsubs = [
      kernelSettings.subscribe('sound.volume', update),
      kernelSettings.subscribe('sound.muted', update)
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  return vol
}

export function useFsWatch(path: string): FsNode[] {
  const [nodes, setNodes] = useState<FsNode[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const list = await kernelFs.list(path)
        if (isMounted) setNodes(list)
      } catch {
        if (isMounted) setNodes([])
      }
    }

    load()
    const unsub = kernelEvents.on('fs:changed', () => {
      load()
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [path])

  return nodes
}

export function useAppMenus(menus: AppMenu[]): void {
  const { windowId } = useWindowContext()
  useEffect(() => {
    windowManager.setAppMenus(windowId, menus)
  }, [windowId, menus])
}

export function useUnsavedChanges(opts: {
  isDirty: boolean
  documentName: string
  save: () => Promise<boolean>
}): void {
  const { windowId } = useWindowContext()
  useEffect(() => {
    windowManager.setDirty(windowId, opts.isDirty, opts.documentName, opts.save)
  }, [windowId, opts.isDirty, opts.documentName, opts.save])
}

export function useProcesses(): ProcessesService {
  const { appId } = useWindowContext()
  const registeredApp = getApp(appId)
  if (!registeredApp?.manifest.permissions?.includes('system:processes')) {
    throw new Error("Permiso 'system:processes' no declarado en el manifiesto")
  }
  return processes
}

export function useAccount() {
  const { appId } = useWindowContext()
  const registeredApp = getApp(appId)
  if (!registeredApp?.manifest.permissions?.includes('system:account')) {
    throw new Error("Permiso 'system:account' no declarado en el manifiesto")
  }
  return {
    getUser: async () => kernelStorage.getUser(),
    setUser: async (user: Parameters<typeof kernelStorage.setUser>[0]) => kernelStorage.setUser(user)
  }
}

export * from '../kernel/apps/manifest.schema'
export { WindowContext } from './context'
