import { storage } from '../storage'
import { events } from '../events'
import { sound } from '../sound'
import { FsApi, FsNode } from './types'
import { getMimeType } from './mime'
import {
  normalizeInternalPath,
  validateNodeName,
  toDisplayPath as convertToDisplayPath,
  fromDisplayPath as convertFromDisplayPath,
  generateDuplicateName
} from './paths'

export class VirtualFileSystem implements FsApi {
  private currentHomeDir = '/Usuarios/Usuario'

  setHomeDir(username: string): void {
    this.currentHomeDir = `/Usuarios/${username}`
  }

  getHomeDir(): string {
    return this.currentHomeDir
  }

  toDisplayPath(path: string): string {
    return convertToDisplayPath(normalizeInternalPath(path, this.currentHomeDir))
  }

  fromDisplayPath(text: string): string {
    return convertFromDisplayPath(text, this.currentHomeDir)
  }

  /**
   * Resolves internal path to FsNode. Returns undefined if not found.
   */
  private async resolvePath(path: string): Promise<FsNode | undefined> {
    const norm = normalizeInternalPath(path, this.currentHomeDir)
    if (norm === '/') {
      return storage.getNode('root')
    }

    const segments = norm.split('/').filter(Boolean)
    let current = await storage.getNode('root')
    if (!current) return undefined

    for (const seg of segments) {
      const child = await storage.getNodeByParentAndName(current.id, seg)
      if (!child) return undefined
      current = child
    }

    return current
  }

  async stat(path: string): Promise<FsNode> {
    const node = await this.resolvePath(path)
    if (!node) {
      throw new Error(`El archivo o directorio no existe: "${path}"`)
    }
    return node
  }

  async exists(path: string): Promise<boolean> {
    const node = await this.resolvePath(path)
    return !!node
  }

  async list(path: string): Promise<FsNode[]> {
    const dir = await this.stat(path)
    if (dir.kind !== 'folder') {
      throw new Error(`"${path}" no es un directorio.`)
    }

    const children = await storage.listNodesByParent(dir.id)
    // Filter out trashed nodes and hidden files (starting with '.')
    return children.filter((node) => !node.trash && !node.name.startsWith('.'))
  }

  async readFile(path: string): Promise<Blob> {
    const node = await this.stat(path)
    if (node.kind !== 'file') {
      throw new Error(`"${path}" es un directorio, no un archivo.`)
    }
    if (!node.blobId) {
      return new Blob([], { type: node.mime })
    }

    const blob = await storage.getBlob(node.blobId)
    if (!blob) {
      return new Blob([], { type: node.mime })
    }
    return blob
  }

  async readText(path: string): Promise<string> {
    const blob = await this.readFile(path)
    return blob.text()
  }

  async writeFile(
    path: string,
    data: Blob | string,
    opts?: { overwrite?: boolean; mime?: string }
  ): Promise<FsNode> {
    const norm = normalizeInternalPath(path, this.currentHomeDir)
    const lastSlash = norm.lastIndexOf('/')
    const parentPath = norm.slice(0, lastSlash) || '/'
    const name = norm.slice(lastSlash + 1)

    validateNodeName(name)

    const parent = await this.stat(parentPath)
    if (parent.kind !== 'folder') {
      throw new Error(`El destino "${parentPath}" no es un directorio.`)
    }

    const existing = await storage.getNodeByParentAndName(parent.id, name)
    const mime = opts?.mime || getMimeType(name)
    const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data
    const size = blob.size
    const now = Date.now()

    if (existing) {
      if (!opts?.overwrite) {
        throw new Error(`Ya existe un archivo con el nombre "${name}".`)
      }
      if (existing.system) {
        throw new Error(`No se puede modificar un archivo protegido del sistema: "${name}".`)
      }

      // Update existing
      const blobId = existing.blobId || `blob-${crypto.randomUUID()}`
      await storage.saveBlob(blobId, blob)

      const updated: FsNode = {
        ...existing,
        mime,
        size,
        modifiedAt: now,
        blobId
      }
      await storage.saveNode(updated)

      events.emit('fs:changed', {
        kind: 'update',
        nodeId: updated.id,
        parentId: parent.id
      })

      return updated
    }

    // Create new
    const nodeId = `node-${crypto.randomUUID()}`
    const blobId = `blob-${crypto.randomUUID()}`
    await storage.saveBlob(blobId, blob)

    const newNode: FsNode = {
      id: nodeId,
      parentId: parent.id,
      name,
      kind: 'file',
      mime,
      size,
      createdAt: now,
      modifiedAt: now,
      blobId,
      system: false,
      trash: null
    }

    await storage.saveNode(newNode)

    events.emit('fs:changed', {
      kind: 'create',
      nodeId: newNode.id,
      parentId: parent.id
    })

    return newNode
  }

  async mkdir(path: string, opts?: { recursive?: boolean }): Promise<FsNode> {
    const norm = normalizeInternalPath(path, this.currentHomeDir)
    const segments = norm.split('/').filter(Boolean)

    if (segments.length === 0) {
      return this.stat('/')
    }

    let current = await storage.getNode('root')
    if (!current) {
      throw new Error('El sistema de archivos no ha sido inicializado.')
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      validateNodeName(seg)

      let child = await storage.getNodeByParentAndName(current.id, seg)
      if (!child) {
        if (!opts?.recursive && i < segments.length - 1) {
          throw new Error(`Directorio inexistente en la ruta: "${segments.slice(0, i + 1).join('/')}"`)
        }

        const now = Date.now()
        child = {
          id: `node-${crypto.randomUUID()}`,
          parentId: current.id,
          name: seg,
          kind: 'folder',
          mime: 'inode/directory',
          size: 0,
          createdAt: now,
          modifiedAt: now,
          system: false,
          trash: null
        }
        await storage.saveNode(child)

        events.emit('fs:changed', {
          kind: 'create',
          nodeId: child.id,
          parentId: current.id
        })
      } else if (child.kind !== 'folder') {
        throw new Error(`"${seg}" ya existe y no es un directorio.`)
      }

      current = child
    }

    return current
  }

  async rename(path: string, newName: string): Promise<FsNode> {
    validateNodeName(newName)
    const node = await this.stat(path)

    if (node.system) {
      throw new Error(`El elemento "${node.name}" es del sistema y no se puede renombrar.`)
    }

    const existing = await storage.getNodeByParentAndName(node.parentId, newName)
    if (existing && existing.id !== node.id) {
      throw new Error(`Ya existe un elemento con el nombre "${newName}" en este directorio.`)
    }

    const updated: FsNode = {
      ...node,
      name: newName,
      modifiedAt: Date.now()
    }
    await storage.saveNode(updated)

    events.emit('fs:changed', {
      kind: 'update',
      nodeId: node.id,
      parentId: node.parentId
    })

    return updated
  }

  async move(path: string, destDir: string): Promise<FsNode> {
    const node = await this.stat(path)
    if (node.system) {
      throw new Error(`El elemento "${node.name}" es del sistema y no se puede mover.`)
    }

    const dest = await this.stat(destDir)
    if (dest.kind !== 'folder') {
      throw new Error(`El destino "${destDir}" no es un directorio.`)
    }

    if (node.parentId === dest.id) {
      return node
    }

    // Prevent moving folder into itself or subfolders
    if (node.kind === 'folder') {
      let check: FsNode | undefined = dest
      while (check && check.id !== 'root') {
        if (check.id === node.id) {
          throw new Error('No se puede mover un directorio dentro de sí mismo.')
        }
        check = await storage.getNode(check.parentId)
      }
    }

    // If destination name exists, generate duplicate name (informe (2).txt)
    const siblings = await storage.listNodesByParent(dest.id)
    const existingNames = new Set(siblings.map((s) => s.name))
    const finalName = generateDuplicateName(existingNames, node.name)

    const oldParentId = node.parentId
    const updated: FsNode = {
      ...node,
      parentId: dest.id,
      name: finalName,
      modifiedAt: Date.now()
    }
    await storage.saveNode(updated)

    events.emit('fs:changed', {
      kind: 'move',
      nodeId: node.id,
      parentId: dest.id,
      oldParentId
    })

    return updated
  }

  async copy(path: string, destDir: string): Promise<FsNode> {
    const node = await this.stat(path)
    const dest = await this.stat(destDir)
    if (dest.kind !== 'folder') {
      throw new Error(`El destino "${destDir}" no es un directorio.`)
    }

    const siblings = await storage.listNodesByParent(dest.id)
    const existingNames = new Set(siblings.map((s) => s.name))
    const finalName = generateDuplicateName(existingNames, node.name)

    return this.copyRecursive(node, dest.id, finalName)
  }

  private async copyRecursive(source: FsNode, newParentId: string, name: string): Promise<FsNode> {
    const now = Date.now()
    const newId = `node-${crypto.randomUUID()}`

    let newBlobId: string | undefined
    if (source.blobId) {
      const origBlob = await storage.getBlob(source.blobId)
      if (origBlob) {
        newBlobId = `blob-${crypto.randomUUID()}`
        await storage.saveBlob(newBlobId, origBlob)
      }
    }

    const copiedNode: FsNode = {
      ...source,
      id: newId,
      parentId: newParentId,
      name,
      blobId: newBlobId,
      system: false,
      trash: null,
      createdAt: now,
      modifiedAt: now
    }
    await storage.saveNode(copiedNode)

    if (source.kind === 'folder') {
      const children = await storage.listNodesByParent(source.id)
      for (const child of children) {
        if (!child.trash) {
          await this.copyRecursive(child, newId, child.name)
        }
      }
    }

    events.emit('fs:changed', {
      kind: 'create',
      nodeId: copiedNode.id,
      parentId: newParentId
    })

    return copiedNode
  }

  async duplicate(path: string): Promise<FsNode> {
    const node = await this.stat(path)
    const siblings = await storage.listNodesByParent(node.parentId)
    const existingNames = new Set(siblings.map((s) => s.name))
    const finalName = generateDuplicateName(existingNames, node.name)

    return this.copyRecursive(node, node.parentId, finalName)
  }

  async trash(path: string): Promise<void> {
    const node = await this.stat(path)
    if (node.system) {
      throw new Error(`El elemento "${node.name}" está protegido por el sistema y no se puede borrar.`)
    }

    const trashFolder = await storage.getNodeByParentAndName('root', '.Papelera')
    if (!trashFolder) {
      throw new Error('La Papelera de reciclaje no está inicializada.')
    }

    const oldParentId = node.parentId
    const trashedNode: FsNode = {
      ...node,
      parentId: trashFolder.id,
      trash: {
        originalParentId: oldParentId,
        trashedAt: Date.now()
      }
    }
    await storage.saveNode(trashedNode)

    sound.playSystem('trash')

    events.emit('fs:changed', {
      kind: 'trash',
      nodeId: node.id,
      parentId: trashFolder.id,
      oldParentId
    })
  }

  async listTrash(): Promise<FsNode[]> {
    const trashFolder = await storage.getNodeByParentAndName('root', '.Papelera')
    if (!trashFolder) return []
    return storage.listNodesByParent(trashFolder.id)
  }

  async restore(nodeId: string): Promise<FsNode> {
    const node = await storage.getNode(nodeId)
    if (!node || !node.trash) {
      throw new Error('El elemento no se encuentra en la Papelera de reciclaje.')
    }

    // Check if original parent still exists, otherwise restore in "~"
    let targetParent = await storage.getNode(node.trash.originalParentId)
    if (!targetParent || targetParent.trash) {
      targetParent = await this.stat(this.currentHomeDir)
    }

    // Resolve name collisions
    const siblings = await storage.listNodesByParent(targetParent.id)
    const existingNames = new Set(siblings.map((s) => s.name))
    const finalName = generateDuplicateName(existingNames, node.name)

    const restoredNode: FsNode = {
      ...node,
      parentId: targetParent.id,
      name: finalName,
      trash: null,
      modifiedAt: Date.now()
    }
    await storage.saveNode(restoredNode)

    events.emit('fs:changed', {
      kind: 'restore',
      nodeId: node.id,
      parentId: targetParent.id
    })

    return restoredNode
  }

  async deletePermanently(nodeId: string): Promise<void> {
    const node = await storage.getNode(nodeId)
    if (!node) return

    if (node.system) {
      throw new Error('No se pueden borrar elementos protegidos del sistema.')
    }

    // If folder, delete sub-nodes
    if (node.kind === 'folder') {
      const children = await storage.listNodesByParent(node.id)
      for (const child of children) {
        await this.deletePermanently(child.id)
      }
    }

    if (node.blobId) {
      await storage.deleteBlob(node.blobId)
    }

    await storage.deleteNode(node.id)

    events.emit('fs:changed', {
      kind: 'delete',
      nodeId: node.id,
      parentId: node.parentId
    })
  }

  async emptyTrash(): Promise<void> {
    const trashItems = await this.listTrash()
    for (const item of trashItems) {
      await this.deletePermanently(item.id)
    }
    sound.playSystem('empty-trash')
  }

  async importFromHost(destDir: string, opts?: { multiple?: boolean }): Promise<FsNode[]> {
    const dest = await this.stat(destDir)
    if (dest.kind !== 'folder') {
      throw new Error(`El destino "${destDir}" no es un directorio.`)
    }

    if (!window.native?.files?.importFromHost) {
      throw new Error('El puente nativo no está disponible.')
    }

    const hostFiles = await window.native.files.importFromHost({
      multiple: opts?.multiple ?? true
    })

    const results: FsNode[] = []
    const siblings = await storage.listNodesByParent(dest.id)
    const existingNames = new Set(siblings.map((s) => s.name))

    for (const file of hostFiles) {
      const uniqueName = generateDuplicateName(existingNames, file.name)
      existingNames.add(uniqueName)

      const blob = new Blob([file.data], { type: file.mime })
      const blobId = `blob-${crypto.randomUUID()}`
      await storage.saveBlob(blobId, blob)

      const now = Date.now()
      const newNode: FsNode = {
        id: `node-${crypto.randomUUID()}`,
        parentId: dest.id,
        name: uniqueName,
        kind: 'file',
        mime: file.mime,
        size: blob.size,
        createdAt: file.lastModified || now,
        modifiedAt: file.lastModified || now,
        blobId,
        system: false,
        trash: null
      }
      await storage.saveNode(newNode)

      events.emit('fs:changed', {
        kind: 'create',
        nodeId: newNode.id,
        parentId: dest.id
      })

      results.push(newNode)
    }

    return results
  }

  async getObjectUrl(path: string): Promise<{ url: string; revoke(): void }> {
    const blob = await this.readFile(path)
    const url = URL.createObjectURL(blob)
    return {
      url,
      revoke: () => URL.revokeObjectURL(url)
    }
  }

  async pathOf(nodeId: string): Promise<string> {
    const node = await storage.getNode(nodeId)
    if (!node) throw new Error(`Nodo "${nodeId}" no encontrado.`)
    if (node.id === 'root') return '/'

    const parts: string[] = [node.name]
    let current: FsNode | undefined = node

    while (current && current.parentId !== 'root') {
      current = await storage.getNode(current.parentId)
      if (current && current.id !== 'root') {
        parts.unshift(current.name)
      }
    }

    return '/' + parts.join('/')
  }

  async usage(): Promise<{ bytes: number; files: number }> {
    const all = await storage.listAllNodes()
    let bytes = 0
    let files = 0

    for (const n of all) {
      if (n.kind === 'file' && !n.trash) {
        bytes += n.size
        files++
      }
    }

    return { bytes, files }
  }

  /**
   * Seeds the initial filesystem tree for first setup.
   */
  async seedInitialTree(username: string): Promise<void> {
    const now = Date.now()
    this.setHomeDir(username)

    // 1. Root
    const rootNode: FsNode = {
      id: 'root',
      parentId: '',
      name: '',
      kind: 'folder',
      mime: 'inode/directory',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      system: true,
      trash: null
    }
    await storage.saveNode(rootNode)

    // 2. .Papelera (hidden system folder)
    const trashNode: FsNode = {
      id: 'node-trash',
      parentId: 'root',
      name: '.Papelera',
      kind: 'folder',
      mime: 'inode/directory',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      system: true,
      trash: null
    }
    await storage.saveNode(trashNode)

    // 3. Usuarios/
    const usersNode: FsNode = {
      id: 'node-users',
      parentId: 'root',
      name: 'Usuarios',
      kind: 'folder',
      mime: 'inode/directory',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      system: true,
      trash: null
    }
    await storage.saveNode(usersNode)

    // 4. Usuarios/<username>/
    const homeNode: FsNode = {
      id: 'node-home',
      parentId: usersNode.id,
      name: username,
      kind: 'folder',
      mime: 'inode/directory',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      system: true,
      trash: null
    }
    await storage.saveNode(homeNode)

    // 5. User standard subfolders
    const createSubfolder = async (name: string, parentId: string): Promise<FsNode> => {
      const folder: FsNode = {
        id: `node-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`,
        parentId,
        name,
        kind: 'folder',
        mime: 'inode/directory',
        size: 0,
        createdAt: now,
        modifiedAt: now,
        system: true,
        trash: null
      }
      await storage.saveNode(folder)
      return folder
    }

    await createSubfolder('Escritorio', homeNode.id)
    const docFolder = await createSubfolder('Documentos', homeNode.id)
    await createSubfolder('Descargas', homeNode.id)
    const imgFolder = await createSubfolder('Imágenes', homeNode.id)
    const musicFolder = await createSubfolder('Música', homeNode.id)
    const vidFolder = await createSubfolder('Videos', homeNode.id)

    // Nested folders (Section 4.3):
    // Imágenes/Cámara, Música/Grabaciones, Videos/Cámara
    await createSubfolder('Cámara', imgFolder.id)
    await createSubfolder('Grabaciones', musicFolder.id)
    await createSubfolder('Cámara', vidFolder.id)

    // 6. Bienvenida.txt in Documentos
    const welcomeText = `¡Bienvenido a hebi OS!

Este es un simulador de sistema operativo de escritorio con diseño moderno inspirado en Fluent.
Tu sesión, archivos y personalizaciones se guardan de forma persistente.

Puedes:
- Crear, duplicar y organizar tus documentos.
- Configurar el tema, colores y fondos de pantalla en Configuración.
- Acceder a todas tus aplicaciones desde el menú Inicio o la barra de tareas.

¡Disfruta explorando hebi OS!
`
    const welcomeBlob = new Blob([welcomeText], { type: 'text/plain' })
    const welcomeBlobId = `blob-welcome-${crypto.randomUUID().slice(0, 8)}`
    await storage.saveBlob(welcomeBlobId, welcomeBlob)

    const welcomeNode: FsNode = {
      id: 'node-welcome-txt',
      parentId: docFolder.id,
      name: 'Bienvenida.txt',
      kind: 'file',
      mime: 'text/plain',
      size: welcomeBlob.size,
      createdAt: now,
      modifiedAt: now,
      blobId: welcomeBlobId,
      system: false,
      trash: null
    }
    await storage.saveNode(welcomeNode)
  }
}

export const fs = new VirtualFileSystem()
export * from './types'
export * from './mime'
export * from './paths'
