export interface FsTrashInfo {
  originalParentId: string
  trashedAt: number
}

export interface FsNode {
  id: string
  parentId: string
  name: string
  kind: 'file' | 'folder'
  mime: string
  size: number
  createdAt: number
  modifiedAt: number
  blobId?: string
  system: boolean
  trash: FsTrashInfo | null
}

export interface FsApi {
  stat(path: string): Promise<FsNode>
  list(path: string): Promise<FsNode[]>
  exists(path: string): Promise<boolean>
  readFile(path: string): Promise<Blob>
  readText(path: string): Promise<string>
  writeFile(path: string, data: Blob | string, opts?: { overwrite?: boolean; mime?: string }): Promise<FsNode>
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<FsNode>
  rename(path: string, newName: string): Promise<FsNode>
  move(path: string, destDir: string): Promise<FsNode>
  copy(path: string, destDir: string): Promise<FsNode>
  duplicate(path: string): Promise<FsNode>
  trash(path: string): Promise<void>
  listTrash(): Promise<FsNode[]>
  restore(nodeId: string): Promise<FsNode>
  deletePermanently(nodeId: string): Promise<void>
  emptyTrash(): Promise<void>
  importFromHost(destDir: string, opts?: { multiple?: boolean }): Promise<FsNode[]>
  getObjectUrl(path: string): Promise<{ url: string; revoke(): void }>
  pathOf(nodeId: string): Promise<string>
  usage(): Promise<{ bytes: number; files: number }>
  toDisplayPath(path: string): string
  fromDisplayPath(text: string): string
}
