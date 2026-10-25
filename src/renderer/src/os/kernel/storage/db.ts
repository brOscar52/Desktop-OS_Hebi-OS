import Dexie, { type Table } from 'dexie'
import type {
  MetaRecord,
  UserRecord,
  FsNodeRecord,
  BlobRecord,
  SettingRecord,
  AppDataRecord,
  ScheduledRecord
} from './types'

export class SimOsDatabase extends Dexie {
  meta!: Table<MetaRecord, string>
  user!: Table<UserRecord, string>
  nodes!: Table<FsNodeRecord, string>
  blobs!: Table<BlobRecord, string>
  settings!: Table<SettingRecord, string>
  appData!: Table<AppDataRecord, [string, string]>
  scheduled!: Table<ScheduledRecord, string>

  constructor() {
    super('simos')
    this.version(1).stores({
      meta: 'key',
      user: 'id',
      nodes: 'id, parentId, name, [parentId+name], kind, trash',
      blobs: 'id',
      settings: 'key',
      appData: '[appId+key], appId, key',
      scheduled: 'id, appId, fireAt'
    })
  }
}

export const db = new SimOsDatabase()
