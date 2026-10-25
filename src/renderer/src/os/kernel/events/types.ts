export type FsChangeKind = 'create' | 'update' | 'delete' | 'move' | 'trash' | 'restore'

export interface EventMap {
  'fs:changed': {
    kind: FsChangeKind
    nodeId: string
    parentId: string
    oldParentId?: string
  }
  'settings:changed': {
    key: string
    value: unknown
  }
  'session:locked': Record<string, never>
  'session:unlocked': Record<string, never>
  'session:logout': Record<string, never>
  'power:restart': Record<string, never>
  'power:shutdown': Record<string, never>
  'app:launched': { appId: string; instanceId: string }
  'app:terminated': { appId: string; instanceId: string }
  'window:opened': { windowId: string; appId: string }
  'window:closed': { windowId: string; appId: string }
  'window:focused': { windowId: string; appId: string }
  'notification:posted': { id: string; appId: string }
  'media:active': { camera: boolean; microphone: boolean }
  'scheduler:fired': { jobId: string; appId: string }
}

export type EventName = keyof EventMap
export type EventData<E extends EventName> = EventMap[E]
export type EventHandler<E extends EventName> = (data: EventData<E>) => void
