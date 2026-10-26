import { create } from 'zustand'
import { WindowState, WindowBounds, AppMenu } from './types'
import { getApp } from '../apps/registry'
import { processes } from '../processes'
import { media } from '../media'
import { events } from '../events'
import { dialogs } from '../dialogs'

interface WindowsStoreState {
  windows: WindowState[]
  nextZIndex: number
  cascadeCount: number
}

export const useWindowsStore = create<WindowsStoreState>(() => ({
  windows: [],
  nextZIndex: 100,
  cascadeCount: 0
}))

class WindowService {
  async open(appId: string, args?: Record<string, unknown>): Promise<string | null> {
    const store = useWindowsStore.getState()
    const app = getApp(appId)

    if (!app) {
      console.warn(`[WindowManager] App no encontrada: ${appId}`)
      return null
    }

    const { manifest } = app

    // 1. Check singleInstance
    if (manifest.window?.singleInstance) {
      const existing = store.windows.find((w) => w.appId === appId)
      if (existing) {
        this.focus(existing.id)
        if (existing.state === 'minimized') {
          this.restore(existing.id)
        }
        if (args?.filePath && existing.openFileHandler) {
          existing.openFileHandler(args.filePath as string)
        }
        return existing.id
      }
    }

    // 2. Register process
    const proc = processes.spawnApp(appId, manifest.name)

    // 3. Compute dimensions and cascade placement
    const taskbarHeight = 48
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const usableHeight = screenHeight - taskbarHeight

    const width = Math.min(screenWidth - 40, manifest.window?.width || 760)
    const height = Math.min(usableHeight - 40, manifest.window?.height || 520)
    const minWidth = manifest.window?.minWidth || 380
    const minHeight = manifest.window?.minHeight || 260
    const resizable = manifest.window?.resizable ?? true

    const cascadeStep = (store.cascadeCount % 8) * 30
    const x = Math.min(screenWidth - width - 20, Math.max(20, 60 + cascadeStep))
    const y = Math.min(usableHeight - height - 20, Math.max(20, 40 + cascadeStep))

    const windowId = 'win-' + Math.random().toString(36).substring(2, 9)
    const zIndex = store.nextZIndex + 1

    const newWindow: WindowState = {
      id: windowId,
      appId,
      instanceId: proc.instanceId || `inst-${Date.now()}`,
      title: manifest.name,
      x,
      y,
      width,
      height,
      state: 'normal',
      zIndex,
      focused: true,
      hasModal: false,
      launchArgs: args,
      minWidth,
      minHeight,
      resizable,
      singleInstance: manifest.window?.singleInstance ?? false,
      normalBounds: { x, y, width, height }
    }

    // Unfocus all other windows
    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => ({ ...w, focused: false })).concat(newWindow),
      nextZIndex: zIndex,
      cascadeCount: s.cascadeCount + 1
    }))

    // Emit events
    events.emit('window:opened', { windowId, appId })
    events.emit('app:launched', { appId, instanceId: newWindow.instanceId })
    events.emit('window:focused', { windowId, appId })

    return windowId
  }

  async close(id: string): Promise<boolean> {
    const store = useWindowsStore.getState()
    const target = store.windows.find((w) => w.id === id)
    if (!target) return true

    // Check unsaved changes flow
    if (target.isDirty) {
      const docName = target.documentName || target.title
      const res = await dialogs.askUnsavedChanges(docName, id)

      if (res === 'cancel') {
        return false
      }

      if (res === 'save' && target.saveHandler) {
        const saved = await target.saveHandler()
        if (!saved) {
          return false
        }
      }
      // 'dont-save' or successful save proceeds
    }

    // Terminate processes & media
    processes.terminate(target.instanceId)
    media.stopAllForInstance(target.instanceId)

    // Remove window
    const remaining = store.windows.filter((w) => w.id !== id)

    // Focus next top window
    let nextTop: WindowState | undefined
    const nonMinimized = remaining.filter((w) => w.state !== 'minimized')
    if (nonMinimized.length > 0) {
      nextTop = nonMinimized.reduce((prev, curr) => (curr.zIndex > prev.zIndex ? curr : prev))
    }

    useWindowsStore.setState({
      windows: remaining.map((w) => ({
        ...w,
        focused: nextTop ? w.id === nextTop.id : false
      }))
    })

    events.emit('window:closed', { windowId: id, appId: target.appId })
    events.emit('app:terminated', { appId: target.appId, instanceId: target.instanceId })

    if (nextTop) {
      events.emit('window:focused', { windowId: nextTop.id, appId: nextTop.appId })
    }

    return true
  }

  isInstanceDirty(instanceId: string): { isDirty: boolean; documentName?: string } {
    const store = useWindowsStore.getState()
    const target = store.windows.find((w) => w.instanceId === instanceId)
    return {
      isDirty: target?.isDirty ?? false,
      documentName: target?.documentName || target?.title
    }
  }

  async closeByInstanceId(instanceId: string, force = false): Promise<boolean> {
    const store = useWindowsStore.getState()
    const target = store.windows.find((w) => w.instanceId === instanceId)
    if (!target) {
      processes.terminate(instanceId)
      media.stopAllForInstance(instanceId)
      return true
    }
    if (force) {
      processes.terminate(target.instanceId)
      media.stopAllForInstance(target.instanceId)
      const remaining = store.windows.filter((w) => w.id !== target.id)
      useWindowsStore.setState({ windows: remaining })
      events.emit('window:closed', { windowId: target.id, appId: target.appId })
      events.emit('app:terminated', { appId: target.appId, instanceId: target.instanceId })
      return true
    }
    return this.close(target.id)
  }

  focus(id: string): void {
    const store = useWindowsStore.getState()
    const target = store.windows.find((w) => w.id === id)
    if (!target) return

    const zIndex = store.nextZIndex + 1

    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => {
        if (w.id === id) {
          return {
            ...w,
            state: w.state === 'minimized' ? 'normal' : w.state,
            zIndex,
            focused: true
          }
        }
        return { ...w, focused: false }
      }),
      nextZIndex: zIndex
    }))

    events.emit('window:focused', { windowId: id, appId: target.appId })
  }

  minimize(id: string): void {
    const store = useWindowsStore.getState()
    const target = store.windows.find((w) => w.id === id)
    if (!target) return

    const remaining = store.windows.map((w) => (w.id === id ? { ...w, state: 'minimized' as const, focused: false } : w))

    // Focus next top window that is not minimized
    let nextTop: WindowState | undefined
    const nonMinimized = remaining.filter((w) => w.id !== id && w.state !== 'minimized')
    if (nonMinimized.length > 0) {
      nextTop = nonMinimized.reduce((prev, curr) => (curr.zIndex > prev.zIndex ? curr : prev))
    }

    useWindowsStore.setState({
      windows: remaining.map((w) => ({
        ...w,
        focused: nextTop ? w.id === nextTop.id : false
      }))
    })

    if (nextTop) {
      events.emit('window:focused', { windowId: nextTop.id, appId: nextTop.appId })
    }
  }

  maximize(id: string): void {
    const store = useWindowsStore.getState()
    const target = store.windows.find((w) => w.id === id)
    if (!target) return

    const zIndex = store.nextZIndex + 1

    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => {
        if (w.id === id) {
          return {
            ...w,
            state: 'maximized' as const,
            normalBounds: w.state === 'normal' ? { x: w.x, y: w.y, width: w.width, height: w.height } : w.normalBounds,
            zIndex,
            focused: true
          }
        }
        return { ...w, focused: false }
      }),
      nextZIndex: zIndex
    }))

    events.emit('window:focused', { windowId: id, appId: target.appId })
  }

  restore(id: string): void {
    const store = useWindowsStore.getState()
    const target = store.windows.find((w) => w.id === id)
    if (!target) return

    const zIndex = store.nextZIndex + 1
    const bounds = target.normalBounds || { x: target.x, y: target.y, width: target.width, height: target.height }

    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => {
        if (w.id === id) {
          return {
            ...w,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            state: 'normal' as const,
            zIndex,
            focused: true
          }
        }
        return { ...w, focused: false }
      }),
      nextZIndex: zIndex
    }))

    events.emit('window:focused', { windowId: id, appId: target.appId })
  }

  toggleMaximize(id: string): void {
    const target = useWindowsStore.getState().windows.find((w) => w.id === id)
    if (!target) return
    if (target.state === 'maximized') {
      this.restore(id)
    } else {
      this.maximize(id)
    }
  }

  minimizeAll(): void {
    const store = useWindowsStore.getState()
    const hasVisible = store.windows.some((w) => w.state !== 'minimized')

    if (hasVisible) {
      useWindowsStore.setState({
        windows: store.windows.map((w) => ({
          ...w,
          state: 'minimized' as const,
          focused: false
        }))
      })
    } else {
      // Restore all
      useWindowsStore.setState({
        windows: store.windows.map((w) => ({
          ...w,
          state: 'normal' as const
        }))
      })
      if (store.windows.length > 0) {
        this.focus(store.windows[store.windows.length - 1].id)
      }
    }
  }

  updateBounds(id: string, bounds: Partial<WindowBounds>): void {
    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => {
        if (w.id === id) {
          return {
            ...w,
            x: bounds.x !== undefined ? bounds.x : w.x,
            y: bounds.y !== undefined ? bounds.y : w.y,
            width: bounds.width !== undefined ? Math.max(w.minWidth, bounds.width) : w.width,
            height: bounds.height !== undefined ? Math.max(w.minHeight, bounds.height) : w.height
          }
        }
        return w
      })
    }))
  }

  setTitle(id: string, title: string): void {
    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w))
    }))
  }

  setModal(id: string, hasModal: boolean): void {
    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, hasModal } : w))
    }))
  }

  setDirty(
    id: string,
    dirty: boolean,
    docName?: string,
    save?: () => Promise<boolean>
  ): void {
    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) =>
        w.id === id
          ? {
              ...w,
              isDirty: dirty,
              documentName: docName !== undefined ? docName : w.documentName,
              saveHandler: save !== undefined ? save : w.saveHandler
            }
          : w
      )
    }))
  }

  setOpenFileHandler(id: string, handler: (path: string) => void): void {
    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, openFileHandler: handler } : w))
    }))
  }

  setAppMenus(id: string, menus: AppMenu[]): void {
    useWindowsStore.setState((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, appMenus: menus } : w))
    }))
  }

  async closeAllWithDirtyCheck(): Promise<boolean> {
    const store = useWindowsStore.getState()
    const dirtyWindows = store.windows.filter((w) => w.isDirty)

    for (const win of dirtyWindows) {
      const closed = await this.close(win.id)
      if (!closed) {
        return false // Aborted by user
      }
    }

    // Close remaining clean windows
    const remaining = useWindowsStore.getState().windows
    for (const win of remaining) {
      await this.close(win.id)
    }

    return true
  }
}

export const windowManager = new WindowService()
export * from './types'
