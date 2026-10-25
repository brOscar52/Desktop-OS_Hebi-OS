import { db } from './db'
import type {
  UserRecord,
  FsNodeRecord,
  ScheduledRecord
} from './types'

export class StorageService {
  // Meta
  async getMeta<T>(key: string): Promise<T | undefined> {
    const record = await db.meta.get(key)
    return record?.value as T | undefined
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    await db.meta.put({ key, value })
  }

  // User
  async getUser(): Promise<UserRecord | undefined> {
    return db.user.toCollection().first()
  }

  async saveUser(user: UserRecord): Promise<void> {
    await db.user.put(user)
  }

  async setUser(user: UserRecord): Promise<void> {
    await this.saveUser(user)
  }

  async hasUser(): Promise<boolean> {
    const count = await db.user.count()
    return count > 0
  }

  // Nodes (Virtual File System)
  async getNode(id: string): Promise<FsNodeRecord | undefined> {
    return db.nodes.get(id)
  }

  async getNodeByParentAndName(parentId: string, name: string): Promise<FsNodeRecord | undefined> {
    return db.nodes.where('[parentId+name]').equals([parentId, name]).first()
  }

  async listNodesByParent(parentId: string): Promise<FsNodeRecord[]> {
    return db.nodes.where('parentId').equals(parentId).toArray()
  }

  async listAllNodes(): Promise<FsNodeRecord[]> {
    return db.nodes.toArray()
  }

  async saveNode(node: FsNodeRecord): Promise<void> {
    await db.nodes.put(node)
  }

  async saveNodes(nodes: FsNodeRecord[]): Promise<void> {
    await db.nodes.bulkPut(nodes)
  }

  async deleteNode(id: string): Promise<void> {
    await db.nodes.delete(id)
  }

  async deleteNodes(ids: string[]): Promise<void> {
    await db.nodes.bulkDelete(ids)
  }

  // Blobs
  async getBlob(id: string): Promise<Blob | undefined> {
    const record = await db.blobs.get(id)
    return record?.data
  }

  async saveBlob(id: string, data: Blob): Promise<void> {
    await db.blobs.put({ id, data })
  }

  async deleteBlob(id: string): Promise<void> {
    await db.blobs.delete(id)
  }

  // Settings
  async getSetting<T>(key: string): Promise<T | undefined> {
    const record = await db.settings.get(key)
    return record?.value as T | undefined
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await db.settings.put({ key, value })
  }

  async getAllSettings(): Promise<Record<string, unknown>> {
    const records = await db.settings.toArray()
    const result: Record<string, unknown> = {}
    for (const r of records) {
      result[r.key] = r.value
    }
    return result
  }

  // AppData
  async getAppData<T>(appId: string, key: string): Promise<T | undefined> {
    const record = await db.appData.get([appId, key])
    return record?.value as T | undefined
  }

  async setAppData<T>(appId: string, key: string, value: T): Promise<void> {
    await db.appData.put({ appId, key, value })
  }

  async deleteAppData(appId: string, key: string): Promise<void> {
    await db.appData.delete([appId, key])
  }

  async listAppData<T>(appId: string, prefix?: string): Promise<{ key: string; value: T }[]> {
    const records = await db.appData.where('appId').equals(appId).toArray()
    return records
      .filter((r) => !prefix || r.key.startsWith(prefix))
      .map((r) => ({ key: r.key, value: r.value as T }))
  }

  // Scheduled
  async getScheduled(id: string): Promise<ScheduledRecord | undefined> {
    return db.scheduled.get(id)
  }

  async saveScheduled(record: ScheduledRecord): Promise<void> {
    await db.scheduled.put(record)
  }

  async deleteScheduled(id: string): Promise<void> {
    await db.scheduled.delete(id)
  }

  async listScheduled(): Promise<ScheduledRecord[]> {
    return db.scheduled.toArray()
  }
}

export const storage = new StorageService()
export * from './types'
