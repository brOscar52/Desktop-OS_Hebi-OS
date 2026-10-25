export interface MetaRecord {
  key: string
  value: unknown
}

export type UserAvatar =
  | { type: 'builtin'; id: string }
  | { type: 'file'; nodeId: string }

export interface UserRecord {
  id: string
  name: string
  avatar: UserAvatar
  passwordHash: string
  salt: string
  createdAt: number
}

export type FsNodeKind = 'file' | 'folder'

export interface FsTrashInfo {
  originalParentId: string
  trashedAt: number
}

export interface FsNodeRecord {
  id: string
  parentId: string
  name: string
  kind: FsNodeKind
  mime: string
  size: number
  createdAt: number
  modifiedAt: number
  blobId?: string
  system: boolean
  trash: FsTrashInfo | null
}

export interface BlobRecord {
  id: string
  data: Blob
}

export interface SettingRecord {
  key: string
  value: unknown
}

export interface AppDataRecord {
  appId: string
  key: string
  value: unknown
}

export type ScheduleRepeat = 'none' | 'daily' | 'weekdays'

export interface ScheduledRecord {
  id: string
  appId: string
  fireAt: number
  title: string
  body?: string
  sound?: boolean
  repeat: ScheduleRepeat
  payload?: unknown
}
