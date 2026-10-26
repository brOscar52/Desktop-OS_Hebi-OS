import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  useOS,
  useLaunchArgs,
  useOpenFileHandler,
  useFsWatch,
  type FsNode,
  type AppManifest
} from '@os/sdk'
import {
  CommandBar,
  type CommandBarItem,
  NavigationPane,
  type NavigationPaneItem,
  FileIcon,
  TextField,
  ContextMenu,
  type ContextMenuEntry,
  EmptyState
} from '@os/ui'

type ViewMode = 'icons' | 'list' | 'details'
type SortField = 'name' | 'modifiedAt' | 'kind' | 'size'
type SortOrder = 'asc' | 'desc'

export default function FilesApp(): JSX.Element {
  const os = useOS()
  const launchArgs = useLaunchArgs()

  const homeDir = useMemo(() => os.fs.getHomeDir(), [os.fs])

  // Current navigation state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (launchArgs.filePath) {
      try {
        const resolved = os.fs.fromDisplayPath(launchArgs.filePath)
        const idx = resolved.lastIndexOf('/')
        return idx > 0 ? resolved.slice(0, idx) : '/'
      } catch {
        return homeDir
      }
    }
    return homeDir
  })
  const [isTrashView, setIsTrashView] = useState<boolean>(() => launchArgs.view === 'trash')

  // History for back/forward
  const [history, setHistory] = useState<string[]>([currentPath])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // View & Sort
  const [viewMode, setViewMode] = useState<ViewMode>('icons')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Address bar editing
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false)
  const [addressInputText, setAddressInputText] = useState<string>('')

  // Search filter
  const [filterText, setFilterText] = useState<string>('')

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    items: ContextMenuEntry[]
  } | null>(null)

  // Load directory items (reactively using useFsWatch)
  const watchedFolderNodes = useFsWatch(isTrashView ? '/.Papelera' : currentPath)
  const [trashNodes, setTrashNodes] = useState<FsNode[]>([])

  // Load trash items when in trash view
  const loadTrash = useCallback(async () => {
    try {
      const list = await os.fs.listTrash()
      setTrashNodes(list)
    } catch {
      setTrashNodes([])
    }
  }, [os.fs])

  useEffect(() => {
    if (isTrashView) {
      loadTrash()
    }
  }, [isTrashView, loadTrash, watchedFolderNodes])

  // Handle open file from outside (singleInstance or file opened)
  useOpenFileHandler((path: string) => {
    setIsTrashView(false)
    try {
      const resolved = os.fs.fromDisplayPath(path)
      const idx = resolved.lastIndexOf('/')
      const folder = idx > 0 ? resolved.slice(0, idx) : '/'
      navigateTo(folder)
    } catch {
      navigateTo(homeDir)
    }
  })

  // Initial selection if launchArgs has filePath
  useEffect(() => {
    if (launchArgs.filePath) {
      const fileName = launchArgs.filePath.split('/').pop()
      if (fileName) {
        const found = watchedFolderNodes.find((n) => n.name === fileName)
        if (found) {
          setSelectedIds(new Set([found.id]))
        }
      }
    }
  }, [launchArgs.filePath, watchedFolderNodes])

  // Update window title based on path
  useEffect(() => {
    if (isTrashView) {
      os.window.setTitle('Papelera de reciclaje')
    } else {
      const parts = currentPath.split('/').filter(Boolean)
      const folderName = parts.length === 0 ? 'Disco local (C:)' : parts[parts.length - 1]
      os.window.setTitle(`${folderName} - Explorador de archivos`)
    }
  }, [currentPath, isTrashView, os.window])

  // Navigation helpers
  const navigateTo = (newPath: string) => {
    setIsTrashView(false)
    setCurrentPath(newPath)
    setSelectedIds(new Set())
    setFilterText('')
    setIsEditingAddress(false)

    // Update history
    const nextHistory = history.slice(0, historyIndex + 1).concat(newPath)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  const navigateBack = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      setCurrentPath(prev)
      setIsTrashView(false)
      setSelectedIds(new Set())
    }
  }

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setCurrentPath(next)
      setIsTrashView(false)
      setSelectedIds(new Set())
    }
  }

  const navigateUp = () => {
    if (isTrashView) {
      navigateTo(homeDir)
      return
    }
    if (currentPath === '/' || currentPath === '') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const parentPath = '/' + parts.join('/')
    navigateTo(parentPath === '' ? '/' : parentPath)
  }

  // Active items list
  const rawItems = isTrashView ? trashNodes : watchedFolderNodes
  const filteredItems = useMemo(() => {
    let result = rawItems
    if (filterText.trim()) {
      const q = filterText.toLowerCase()
      result = result.filter((item) => item.name.toLowerCase().includes(q))
    }

    return [...result].sort((a, b) => {
      // Folders always first unless sorting by size/kind explicitly requested
      if (a.kind === 'folder' && b.kind !== 'folder') return -1
      if (a.kind !== 'folder' && b.kind === 'folder') return 1

      let comp = 0
      if (sortField === 'name') {
        comp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
      } else if (sortField === 'modifiedAt') {
        comp = a.modifiedAt - b.modifiedAt
      } else if (sortField === 'size') {
        comp = a.size - b.size
      } else if (sortField === 'kind') {
        comp = (a.mime || a.kind).localeCompare(b.mime || b.kind)
      }

      return sortOrder === 'asc' ? comp : -comp
    })
  }, [rawItems, filterText, sortField, sortOrder])

  // Formatting helpers
  const formatSize = (bytes: number, kind: string): string => {
    if (kind === 'folder') return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileType = (node: FsNode): string => {
    if (node.kind === 'folder') return 'Carpeta de archivos'
    const ext = node.name.split('.').pop()?.toLowerCase() || ''
    switch (ext) {
      case 'txt':
      case 'md':
      case 'log':
        return 'Documento de texto'
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
      case 'svg':
        return 'Archivo de imagen'
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return 'Archivo de audio'
      case 'mp4':
      case 'webm':
      case 'mov':
        return 'Archivo de video'
      case 'json':
        return 'Archivo JSON'
      default:
        return ext ? `Archivo ${ext.toUpperCase()}` : 'Archivo'
    }
  }

  // Selection handlers
  const handleItemClick = (node: FsNode, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedIds)
      if (next.has(node.id)) next.delete(node.id)
      else next.add(node.id)
      setSelectedIds(next)
    } else if (e.shiftKey && selectedIds.size > 0) {
      const ids = filteredItems.map((item) => item.id)
      const lastSelectedId = Array.from(selectedIds)[selectedIds.size - 1]
      const startIndex = ids.indexOf(lastSelectedId)
      const targetIndex = ids.indexOf(node.id)
      if (startIndex !== -1 && targetIndex !== -1) {
        const [low, high] = startIndex < targetIndex ? [startIndex, targetIndex] : [targetIndex, startIndex]
        const rangeIds = new Set(ids.slice(low, high + 1))
        setSelectedIds(rangeIds)
      }
    } else {
      setSelectedIds(new Set([node.id]))
    }
  }

  const handleItemDoubleClick = (node: FsNode) => {
    if (isTrashView) {
      // In trash view, double click doesn't open
      return
    }
    if (node.kind === 'folder') {
      const target = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`
      navigateTo(target)
    } else {
      const target = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`
      os.apps.openFile(target)
    }
  }

  // File Operations Actions
  const handleNewFolder = async () => {
    const name = await os.dialogs.prompt({
      title: 'Nueva carpeta',
      message: 'Introduce el nombre de la nueva carpeta:',
      defaultValue: 'Nueva carpeta'
    })
    if (!name || !name.trim()) return

    try {
      const fullPath = currentPath === '/' ? `/${name.trim()}` : `${currentPath}/${name.trim()}`
      await os.fs.mkdir(fullPath)
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error',
        message: (err as Error).message || 'No se pudo crear la carpeta.'
      })
    }
  }

  const handleNewTextFile = async () => {
    const name = await os.dialogs.prompt({
      title: 'Nuevo documento de texto',
      message: 'Introduce el nombre del archivo:',
      defaultValue: 'Nuevo documento.txt'
    })
    if (!name || !name.trim()) return

    try {
      const fullPath = currentPath === '/' ? `/${name.trim()}` : `${currentPath}/${name.trim()}`
      await os.fs.writeFile(fullPath, '', { overwrite: false })
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error',
        message: (err as Error).message || 'No se pudo crear el archivo.'
      })
    }
  }

  const handleRename = async () => {
    if (selectedIds.size !== 1) return
    const id = Array.from(selectedIds)[0]
    const item = filteredItems.find((n) => n.id === id)
    if (!item) return

    const newName = await os.dialogs.prompt({
      title: 'Cambiar nombre',
      message: `Introduce el nuevo nombre para "${item.name}":`,
      defaultValue: item.name
    })
    if (!newName || !newName.trim() || newName.trim() === item.name) return

    try {
      const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`
      await os.fs.rename(itemPath, newName.trim())
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error',
        message: (err as Error).message || 'No se pudo renombrar el elemento.'
      })
    }
  }

  const handleDuplicate = async () => {
    if (selectedIds.size === 0) return
    for (const id of selectedIds) {
      const item = filteredItems.find((n) => n.id === id)
      if (item) {
        try {
          const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`
          await os.fs.duplicate(itemPath)
        } catch (err: unknown) {
          await os.dialogs.alert({
            title: 'Error',
            message: (err as Error).message || 'No se pudo duplicar el elemento.'
          })
        }
      }
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    const confirm = await os.dialogs.confirm({
      title: 'Mover a la papelera',
      message:
        selectedIds.size === 1
          ? '¿Deseas mover este elemento a la Papelera de reciclaje?'
          : `¿Deseas mover los ${selectedIds.size} elementos a la Papelera de reciclaje?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    })
    if (!confirm) return

    for (const id of selectedIds) {
      const item = filteredItems.find((n) => n.id === id)
      if (item) {
        try {
          const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`
          await os.fs.trash(itemPath)
        } catch (err: unknown) {
          await os.dialogs.alert({
            title: 'Error',
            message: (err as Error).message || 'No se pudo eliminar el elemento.'
          })
        }
      }
    }
    setSelectedIds(new Set())
  }

  const handleImport = async () => {
    try {
      const imported = await os.fs.importFromHost(currentPath, { multiple: true })
      if (imported.length > 0) {
        os.notify({
          title: 'Importación completada',
          body: `Se importaron ${imported.length} archivo(s) correctamente.`
        })
      }
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error al importar',
        message: (err as Error).message || 'No se pudieron importar archivos.'
      })
    }
  }

  const handleShowProperties = async (node?: FsNode) => {
    const target = node || filteredItems.find((n) => selectedIds.has(n.id))
    if (!target) {
      // Show folder properties
      await os.dialogs.alert({
        title: 'Propiedades de la carpeta',
        message: `Ruta: ${os.fs.toDisplayPath(currentPath)}\nElementos: ${filteredItems.length}`
      })
      return
    }

    const path = currentPath === '/' ? `/${target.name}` : `${currentPath}/${target.name}`
    const displayPath = os.fs.toDisplayPath(path)
    const sizeStr = target.kind === 'folder' ? 'Carpeta' : formatSize(target.size, target.kind)

    await os.dialogs.alert({
      title: `Propiedades de ${target.name}`,
      message:
        `Nombre: ${target.name}\n` +
        `Tipo: ${formatFileType(target)}\n` +
        `Ubicación: ${displayPath}\n` +
        `Tamaño: ${sizeStr}\n` +
        `Fecha de creación: ${formatDate(target.createdAt)}\n` +
        `Fecha de modificación: ${formatDate(target.modifiedAt)}`
    })
  }

  // Trash specific actions
  const handleRestoreTrash = async () => {
    if (selectedIds.size === 0) return
    for (const id of selectedIds) {
      try {
        await os.fs.restore(id)
      } catch (err: unknown) {
        await os.dialogs.alert({
          title: 'Error al restaurar',
          message: (err as Error).message || 'No se pudo restaurar el elemento.'
        })
      }
    }
    setSelectedIds(new Set())
    await loadTrash()
  }

  const handleDeletePermanent = async () => {
    if (selectedIds.size === 0) return
    const confirm = await os.dialogs.confirm({
      title: 'Eliminar definitivamente',
      message: '¿Estás seguro de que deseas eliminar permanentemente los elementos seleccionados? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar definitivamente',
      destructive: true
    })
    if (!confirm) return

    for (const id of selectedIds) {
      try {
        await os.fs.deletePermanently(id)
      } catch (err: unknown) {
        await os.dialogs.alert({
          title: 'Error',
          message: (err as Error).message || 'No se pudo eliminar el elemento.'
        })
      }
    }
    setSelectedIds(new Set())
    await loadTrash()
  }

  const handleEmptyTrash = async () => {
    const confirm = await os.dialogs.confirm({
      title: 'Vaciar papelera de reciclaje',
      message: '¿Estás seguro de que deseas eliminar definitivamente todos los elementos de la Papelera de reciclaje?',
      confirmLabel: 'Vaciar papelera',
      destructive: true
    })
    if (!confirm) return

    try {
      await os.fs.emptyTrash()
      setSelectedIds(new Set())
      await loadTrash()
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error',
        message: (err as Error).message || 'No se pudo vaciar la papelera.'
      })
    }
  }

  // Context Menus
  const openItemContextMenu = (node: FsNode, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedIds.has(node.id)) {
      setSelectedIds(new Set([node.id]))
    }

    if (isTrashView) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            key: 'restore',
            label: 'Restaurar',
            action: handleRestoreTrash
          },
          {
            key: 'delete-perm',
            label: 'Eliminar definitivamente',
            destructive: true,
            action: handleDeletePermanent
          },
          'separator',
          {
            key: 'properties',
            label: 'Propiedades',
            action: () => handleShowProperties(node)
          }
        ]
      })
      return
    }

    const nodePath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`
    const appsForFile = node.kind === 'file' ? os.apps.getAppsForFile(nodePath) : []

    const menuItems: ContextMenuEntry[] = [
      {
        key: 'open',
        label: node.kind === 'folder' ? 'Abrir carpeta' : 'Abrir',
        action: () => handleItemDoubleClick(node)
      }
    ]

    if (node.kind === 'file' && appsForFile.length > 0) {
      const openWithChildren: ContextMenuEntry[] = appsForFile.map((app: AppManifest) => ({
        key: `app-${app.id}`,
        label: app.name,
        action: () => os.apps.openFile(nodePath, app.id)
      }))

      menuItems.push({
        key: 'open-with',
        label: 'Abrir con…',
        children: openWithChildren
      })
    }

    menuItems.push(
      'separator',
      {
        key: 'rename',
        label: 'Cambiar nombre',
        action: handleRename
      },
      {
        key: 'duplicate',
        label: 'Duplicar',
        action: handleDuplicate
      },
      {
        key: 'trash',
        label: 'Mover a la papelera',
        destructive: true,
        action: handleDelete
      },
      'separator',
      {
        key: 'properties',
        label: 'Propiedades',
        action: () => handleShowProperties(node)
      }
    )

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems
    })
  }

  const openBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()

    if (isTrashView) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            key: 'empty-trash',
            label: 'Vaciar papelera de reciclaje',
            destructive: true,
            action: handleEmptyTrash
          }
        ]
      })
      return
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          key: 'view',
          label: 'Ver',
          children: [
            {
              key: 'view-icons',
              label: 'Íconos grandes' + (viewMode === 'icons' ? ' ✓' : ''),
              action: () => setViewMode('icons')
            },
            {
              key: 'view-list',
              label: 'Lista' + (viewMode === 'list' ? ' ✓' : ''),
              action: () => setViewMode('list')
            },
            {
              key: 'view-details',
              label: 'Detalles' + (viewMode === 'details' ? ' ✓' : ''),
              action: () => setViewMode('details')
            }
          ]
        },
        {
          key: 'sort',
          label: 'Ordenar por',
          children: [
            {
              key: 'sort-name',
              label: 'Nombre' + (sortField === 'name' ? ' ✓' : ''),
              action: () => {
                setSortField('name')
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
              }
            },
            {
              key: 'sort-date',
              label: 'Fecha de modificación' + (sortField === 'modifiedAt' ? ' ✓' : ''),
              action: () => {
                setSortField('modifiedAt')
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
              }
            },
            {
              key: 'sort-type',
              label: 'Tipo' + (sortField === 'kind' ? ' ✓' : ''),
              action: () => {
                setSortField('kind')
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
              }
            },
            {
              key: 'sort-size',
              label: 'Tamaño' + (sortField === 'size' ? ' ✓' : ''),
              action: () => {
                setSortField('size')
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
              }
            }
          ]
        },
        'separator',
        {
          key: 'new',
          label: 'Nuevo',
          children: [
            {
              key: 'new-folder',
              label: 'Carpeta',
              action: handleNewFolder
            },
            {
              key: 'new-file',
              label: 'Documento de texto',
              action: handleNewTextFile
            }
          ]
        },
        {
          key: 'import',
          label: 'Importar desde el equipo…',
          action: handleImport
        },
        'separator',
        {
          key: 'folder-properties',
          label: 'Propiedades de la carpeta',
          action: () => handleShowProperties()
        }
      ]
    })
  }

  // Address Bar navigation submit
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addressInputText.trim()) {
      setIsEditingAddress(false)
      return
    }

    try {
      const resolved = os.fs.fromDisplayPath(addressInputText.trim())
      navigateTo(resolved)
    } catch {
      setIsEditingAddress(false)
    }
  }

  // Drag and Drop
  const handleDragStart = (node: FsNode, e: React.DragEvent) => {
    const itemPath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`
    e.dataTransfer.setData(
      'application/x-simos-node',
      JSON.stringify({ id: node.id, path: itemPath, name: node.name })
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnFolder = async (targetFolder: FsNode, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const data = e.dataTransfer.getData('application/x-simos-node')
    if (!data) return

    try {
      const parsed = JSON.parse(data)
      if (parsed.id === targetFolder.id) return

      const destPath = currentPath === '/' ? `/${targetFolder.name}` : `${currentPath}/${targetFolder.name}`
      await os.fs.move(parsed.path, destPath)
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error al mover',
        message: (err as Error).message || 'No se pudo mover el elemento.'
      })
    }
  }

  // Navigation Pane Items
  const navItems: NavigationPaneItem[] = [
    { key: homeDir, label: 'Inicio', icon: '🏠' },
    { key: `${homeDir}/Escritorio`, label: 'Escritorio', icon: '🖥️' },
    { key: `${homeDir}/Descargas`, label: 'Descargas', icon: '📥' },
    { key: `${homeDir}/Documentos`, label: 'Documentos', icon: '📄' },
    { key: `${homeDir}/Imágenes`, label: 'Imágenes', icon: '🖼️' },
    { key: `${homeDir}/Música`, label: 'Música', icon: '🎵' },
    { key: `${homeDir}/Videos`, label: 'Videos', icon: '🎬' },
    { key: '/', label: 'Disco local (C:)', icon: '💾' }
  ]

  // Command Bar Items
  const primaryCommands: CommandBarItem[] = isTrashView
    ? [
        {
          key: 'restore',
          label: 'Restaurar',
          icon: '↺',
          disabled: selectedIds.size === 0,
          onClick: handleRestoreTrash
        },
        {
          key: 'delete-perm',
          label: 'Eliminar definitivamente',
          icon: '✕',
          disabled: selectedIds.size === 0,
          onClick: handleDeletePermanent
        },
        {
          key: 'empty-trash',
          label: 'Vaciar papelera de reciclaje',
          icon: '🗑️',
          primary: true,
          onClick: handleEmptyTrash
        }
      ]
    : [
        {
          key: 'new-folder',
          label: 'Nueva carpeta',
          icon: '📁',
          primary: true,
          onClick: handleNewFolder
        },
        {
          key: 'new-file',
          label: 'Nuevo archivo',
          icon: '📄',
          onClick: handleNewTextFile
        },
        {
          key: 'rename',
          label: 'Renombrar',
          icon: '✏️',
          disabled: selectedIds.size !== 1,
          onClick: handleRename
        },
        {
          key: 'duplicate',
          label: 'Duplicar',
          icon: '⧉',
          disabled: selectedIds.size === 0,
          onClick: handleDuplicate
        },
        {
          key: 'delete',
          label: 'Eliminar',
          icon: '🗑️',
          disabled: selectedIds.size === 0,
          onClick: handleDelete
        },
        {
          key: 'import',
          label: 'Importar…',
          icon: '📥',
          onClick: handleImport
        }
      ]

  const secondaryCommands: CommandBarItem[] = [
    {
      key: 'sort',
      label: `Ordenar (${sortField === 'name' ? 'Nombre' : sortField === 'modifiedAt' ? 'Fecha' : sortField === 'kind' ? 'Tipo' : 'Tamaño'} ${sortOrder === 'asc' ? '↑' : '↓'})`,
      icon: '⇅',
      onClick: () => {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
      }
    },
    {
      key: 'view',
      label: viewMode === 'icons' ? 'Íconos grandes' : viewMode === 'list' ? 'Lista' : 'Detalles',
      icon: viewMode === 'icons' ? '▦' : viewMode === 'list' ? '☰' : '▤',
      onClick: () => {
        setViewMode((v) => (v === 'icons' ? 'list' : v === 'list' ? 'details' : 'icons'))
      }
    }
  ]

  // Address Bar Breadcrumbs
  const breadcrumbSegments = useMemo(() => {
    if (isTrashView) {
      return [{ label: 'Papelera de reciclaje', path: '/.Papelera' }]
    }
    const norm = currentPath === '/' ? '' : currentPath
    const parts = norm.split('/').filter(Boolean)
    const list = [{ label: 'Disco local (C:)', path: '/' }]
    let accumulated = ''
    for (const p of parts) {
      accumulated += `/${p}`
      list.push({ label: p, path: accumulated })
    }
    return list
  }, [currentPath, isTrashView])

  const addressInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        overflow: 'hidden',
        userSelect: 'none'
      }}
      onClick={() => {
        if (contextMenu) setContextMenu(null)
      }}
    >
      {/* 1. Command Bar */}
      <CommandBar
        primaryItems={primaryCommands}
        secondaryItems={secondaryCommands}
        farItems={
          <div style={{ width: '180px' }}>
            <TextField
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar en la carpeta…"
            />
          </div>
        }
      />

      {/* 2. Address & History Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)'
        }}
      >
        <button
          type="button"
          onClick={navigateBack}
          disabled={historyIndex <= 0}
          style={{
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            color: 'var(--text-primary)',
            cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
            opacity: historyIndex <= 0 ? 0.4 : 1
          }}
          title="Atrás"
        >
          ←
        </button>
        <button
          type="button"
          onClick={navigateForward}
          disabled={historyIndex >= history.length - 1}
          style={{
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            color: 'var(--text-primary)',
            cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
            opacity: historyIndex >= history.length - 1 ? 0.4 : 1
          }}
          title="Adelante"
        >
          →
        </button>
        <button
          type="button"
          onClick={navigateUp}
          disabled={currentPath === '/' && !isTrashView}
          style={{
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            color: 'var(--text-primary)',
            cursor: currentPath === '/' && !isTrashView ? 'not-allowed' : 'pointer',
            opacity: currentPath === '/' && !isTrashView ? 0.4 : 1
          }}
          title="Subir de nivel"
        >
          ↑
        </button>

        {/* Address Display / Editable field */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            height: '28px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0 8px',
            cursor: 'text',
            overflow: 'hidden'
          }}
          onClick={() => {
            if (!isEditingAddress) {
              setIsEditingAddress(true)
              setAddressInputText(isTrashView ? 'Papelera de reciclaje' : os.fs.toDisplayPath(currentPath))
              setTimeout(() => addressInputRef.current?.select(), 50)
            }
          }}
        >
          {isEditingAddress ? (
            <form onSubmit={handleAddressSubmit} style={{ width: '100%', margin: 0 }}>
              <input
                ref={addressInputRef}
                type="text"
                value={addressInputText}
                onChange={(e) => setAddressInputText(e.target.value)}
                onBlur={() => setIsEditingAddress(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditingAddress(false)
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family-base)'
                }}
              />
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)' }}>
              {breadcrumbSegments.map((seg, idx) => (
                <React.Fragment key={seg.path}>
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      if (seg.path === '/.Papelera') {
                        setIsTrashView(true)
                      } else {
                        navigateTo(seg.path)
                      }
                    }}
                    style={{
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 'var(--radius-xs)'
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.backgroundColor = 'var(--bg-subtle)'
                      el.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.backgroundColor = 'transparent'
                      el.style.color = 'var(--text-secondary)'
                    }}
                  >
                    {seg.label}
                  </span>
                  {idx < breadcrumbSegments.length - 1 && (
                    <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Workspace: Navigation Pane + Content Area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Navigation Pane */}
        <NavigationPane
          items={navItems}
          selectedKey={isTrashView ? 'trash' : currentPath}
          onSelect={(key) => {
            if (key === 'trash') {
              setIsTrashView(true)
            } else {
              navigateTo(key)
            }
          }}
          footer={
            <button
              type="button"
              onClick={() => setIsTrashView(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isTrashView ? 'var(--bg-active)' : 'transparent',
                color: isTrashView ? 'var(--accent-color)' : 'var(--text-primary)',
                fontWeight: isTrashView ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                fontSize: 'var(--font-size-sm)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span>🗑️</span>
              <span>Papelera de reciclaje</span>
            </button>
          }
          width="210px"
        />

        {/* Content View Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '12px',
            backgroundColor: 'var(--bg-card)'
          }}
          onContextMenu={openBackgroundContextMenu}
          onClick={() => setSelectedIds(new Set())}
        >
          {filteredItems.length === 0 ? (
            <EmptyState
              title={isTrashView ? 'La papelera está vacía' : 'Esta carpeta está vacía'}
              description={
                isTrashView
                  ? 'Los archivos que elimines aparecerán aquí.'
                  : 'Crea una carpeta o archivo usando la barra de comandos superior.'
              }
            />
          ) : viewMode === 'icons' ? (
            /* Íconos grandes view */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                gap: '12px',
                alignContent: 'start'
              }}
            >
              {filteredItems.map((node) => {
                const isSelected = selectedIds.has(node.id)
                const ext = node.name.split('.').pop()
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => handleDragStart(node, e)}
                    onDragOver={node.kind === 'folder' ? handleDragOver : undefined}
                    onDrop={node.kind === 'folder' ? (e) => handleDropOnFolder(node, e) : undefined}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleItemClick(node, e)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleItemDoubleClick(node)
                    }}
                    onContextMenu={(e) => openItemContextMenu(node, e)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                      cursor: 'pointer',
                      gap: '8px',
                      textAlign: 'center'
                    }}
                  >
                    <FileIcon
                      type={node.kind}
                      mime={node.mime}
                      extension={ext}
                      size={48}
                    />
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        maxWidth: '88px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={node.name}
                    >
                      {node.name}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : viewMode === 'list' ? (
            /* Lista view */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '4px',
                alignContent: 'start'
              }}
            >
              {filteredItems.map((node) => {
                const isSelected = selectedIds.has(node.id)
                const ext = node.name.split('.').pop()
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => handleDragStart(node, e)}
                    onDragOver={node.kind === 'folder' ? handleDragOver : undefined}
                    onDrop={node.kind === 'folder' ? (e) => handleDropOnFolder(node, e) : undefined}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleItemClick(node, e)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleItemDoubleClick(node)
                    }}
                    onContextMenu={(e) => openItemContextMenu(node, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <FileIcon
                      type={node.kind}
                      mime={node.mime}
                      extension={ext}
                      size={20}
                    />
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={node.name}
                    >
                      {node.name}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Detalles view (Table with sortable headers) */
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr 100px',
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-secondary)'
                }}
              >
                <div
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    setSortField('name')
                    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                  }}
                >
                  Nombre {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    setSortField('modifiedAt')
                    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                  }}
                >
                  Fecha de modificación {sortField === 'modifiedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    setSortField('kind')
                    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                  }}
                >
                  Tipo {sortField === 'kind' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div
                  style={{ cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}
                  onClick={() => {
                    setSortField('size')
                    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                  }}
                >
                  Tamaño {sortField === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {filteredItems.map((node) => {
                  const isSelected = selectedIds.has(node.id)
                  const ext = node.name.split('.').pop()
                  return (
                    <div
                      key={node.id}
                      draggable
                      onDragStart={(e) => handleDragStart(node, e)}
                      onDragOver={node.kind === 'folder' ? handleDragOver : undefined}
                      onDrop={node.kind === 'folder' ? (e) => handleDropOnFolder(node, e) : undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleItemClick(node, e)
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        handleItemDoubleClick(node)
                      }}
                      onContextMenu={(e) => openItemContextMenu(node, e)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1fr 100px',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <FileIcon type={node.kind} mime={node.mime} extension={ext} size={18} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.name}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(node.modifiedAt)}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {formatFileType(node)}
                      </div>
                      <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {formatSize(node.size, node.kind)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}
      >
        <span>
          {filteredItems.length} elemento{filteredItems.length !== 1 ? 's' : ''}
          {selectedIds.size > 0 && ` (${selectedIds.size} seleccionado${selectedIds.size !== 1 ? 's' : ''})`}
        </span>
        <span>Hebi OS Virtual File System</span>
      </div>

      {/* Context Menu Host */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
