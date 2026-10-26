import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { settings, DesktopItem, DesktopWidget } from '../../kernel/settings'
import { fs as kernelFs, FsNode } from '../../kernel/fs'
import { events } from '../../kernel/events'
import { windowManager } from '../../kernel/windows'
import { getApp, getAllApps, getAllWidgets } from '../../kernel/apps/registry'
import { openFileWithApp, getAppsForFile, setDefaultAppForExtension } from '../../kernel/apps/launcher'
import { dialogs } from '../../kernel/dialogs'
import { notifications } from '../../kernel/notifications'
import { FileIcon } from '../../ui/FileIcon'
import { AppIcon } from '../../ui/AppIcon'
import { ContextMenu, ContextMenuEntry } from '../../ui/ContextMenu'
import { WidgetsHost } from '../widgets-host/WidgetsHost'

// Wallpapers
import auroraSvg from '../../../system/wallpapers/aurora.svg'
import duskSvg from '../../../system/wallpapers/dusk.svg'
import emeraldSvg from '../../../system/wallpapers/emerald.svg'
import lagoonSvg from '../../../system/wallpapers/lagoon.svg'

const wallpaperMap: Record<string, string> = {
  aurora: auroraSvg,
  dusk: duskSvg,
  emerald: emeraldSvg,
  lagoon: lagoonSvg
}

interface SelectionBox {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export const Desktop: React.FC = () => {
  const [wallpaperSetting, setWallpaperSetting] = useState(settings.get('appearance.wallpaper'))
  const [iconSize, setIconSize] = useState(settings.get('desktop.iconSize') || 'medium')
  const [desktopItems, setDesktopItems] = useState<DesktopItem[]>(() => {
    const raw = settings.get('desktop.items') || []
    // Ensure recycle bin exists at (20, 20) by default
    if (!raw.some((i) => i.kind === 'system' && i.ref === 'recycle-bin')) {
      return [{ id: 'item-recycle-bin', kind: 'system', ref: 'recycle-bin', x: 20, y: 20 }, ...raw]
    }
    return raw
  })
  const [desktopFiles, setDesktopFiles] = useState<FsNode[]>([])
  const [trashCount, setTrashCount] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [marquee, setMarquee] = useState<SelectionBox | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entries: ContextMenuEntry[] } | null>(null)
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null)

  const desktopRef = useRef<HTMLDivElement>(null)

  // Dimensions based on icon size
  const iconDimensions = useMemo(() => {
    switch (iconSize) {
      case 'small':
        return { icon: 32, box: 74, colWidth: 84, rowHeight: 90 }
      case 'large':
        return { icon: 54, box: 96, colWidth: 108, rowHeight: 118 }
      case 'medium':
      default:
        return { icon: 42, box: 84, colWidth: 94, rowHeight: 102 }
    }
  }, [iconSize])

  // Helper to find first free grid cell
  const findFirstFreeCell = useCallback(
    (occupied: { x: number; y: number }[]): { x: number; y: number } => {
      const { colWidth, rowHeight } = iconDimensions
      const maxRows = Math.max(1, Math.floor(((window.innerHeight || 800) - 48 - 30) / rowHeight))
      let col = 0
      let row = 0

      while (col < 50) {
        const cx = 20 + col * colWidth
        const cy = 20 + row * rowHeight
        const isOcc = occupied.some(
          (p) => Math.abs(p.x - cx) < colWidth / 2 && Math.abs(p.y - cy) < rowHeight / 2
        )
        if (!isOcc) {
          return { x: cx, y: cy }
        }
        row++
        if (row >= maxRows) {
          row = 0
          col++
        }
      }
      return { x: 20, y: 20 }
    },
    [iconDimensions]
  )

  // Synchronize desktop.items with ~/Escritorio nodes
  const syncDesktopItemsWithFiles = useCallback(
    async (files: FsNode[], currentItems: DesktopItem[]) => {
      let items = [...currentItems]

      // 1. Ensure recycle bin exists
      if (!items.some((i) => i.kind === 'system' && i.ref === 'recycle-bin')) {
        items.unshift({ id: 'item-recycle-bin', kind: 'system', ref: 'recycle-bin', x: 20, y: 20 })
      }

      // 2. Remove node items that no longer exist in files
      const existingFileIds = new Set(files.map((f) => f.id))
      const beforeCount = items.length
      items = items.filter((it) => it.kind !== 'node' || existingFileIds.has(it.ref))

      // 3. For each file in ~/Escritorio not yet in items, assign the first free cell
      let modified = items.length !== beforeCount
      for (const file of files) {
        if (!items.some((it) => it.kind === 'node' && it.ref === file.id)) {
          const occupied = items.map((it) => ({ x: it.x, y: it.y }))
          const free = findFirstFreeCell(occupied)
          items.push({
            id: `item-node-${file.id}`,
            kind: 'node',
            ref: file.id,
            x: free.x,
            y: free.y
          })
          modified = true
        }
      }

      if (modified) {
        setDesktopItems(items)
        await settings.set('desktop.items', items)
      }
    },
    [findFirstFreeCell]
  )

  const loadDesktopFiles = useCallback(async () => {
    try {
      const desktopDir = `${kernelFs.getHomeDir()}/Escritorio`
      const list = await kernelFs.list(desktopDir)
      setDesktopFiles(list)
      const current = settings.get('desktop.items') || []
      await syncDesktopItemsWithFiles(list, current)
    } catch {
      setDesktopFiles([])
    }
  }, [syncDesktopItemsWithFiles])

  const checkTrashCount = useCallback(async () => {
    try {
      const list = await kernelFs.listTrash()
      setTrashCount(list.length)
    } catch {
      setTrashCount(0)
    }
  }, [])

  // Subscribe to settings and events
  useEffect(() => {
    const unsubs = [
      settings.subscribe('appearance.wallpaper', (wp) => setWallpaperSetting(wp)),
      settings.subscribe('desktop.iconSize', (size) => setIconSize(size)),
      settings.subscribe('desktop.items', (items) => {
        setDesktopItems(items || [])
      }),
      events.on('fs:changed', () => {
        loadDesktopFiles()
        checkTrashCount()
      })
    ]

    loadDesktopFiles()
    checkTrashCount()

    return () => {
      unsubs.forEach((u) => u())
    }
  }, [loadDesktopFiles, checkTrashCount])

  // Wallpaper subscription
  useEffect(() => {
    let active = true
    let revokeFn: (() => void) | null = null

    if (wallpaperSetting.type === 'file' && wallpaperSetting.nodeId) {
      kernelFs
        .pathOf(wallpaperSetting.nodeId)
        .then((path) => kernelFs.getObjectUrl(path))
        .then((res) => {
          if (active) {
            revokeFn = res.revoke
            setCustomWallpaperUrl(res.url)
          } else {
            res.revoke()
          }
        })
        .catch(() => {
          if (active) setCustomWallpaperUrl(null)
        })
    } else {
      setCustomWallpaperUrl(null)
    }

    return () => {
      active = false
      if (revokeFn) revokeFn()
    }
  }, [wallpaperSetting])

  // Marquee selection handling on empty background
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (
      (e.target as HTMLElement).closest('.desktop-item') ||
      (e.target as HTMLElement).closest('.widget-card') ||
      (e.target as HTMLElement).closest('.widget-action-btn')
    ) {
      return
    }

    setSelectedIds(new Set())
    const startX = e.clientX
    const startY = e.clientY

    setMarquee({ startX, startY, currentX: startX, currentY: startY })

    const onPointerMove = (moveEvent: PointerEvent) => {
      setMarquee((prev) =>
        prev ? { ...prev, currentX: moveEvent.clientX, currentY: moveEvent.clientY } : null
      )
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      setMarquee(null)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  // Snapping item to nearest grid cell without collision
  const snapToNearestCell = (
    itemId: string,
    targetX: number,
    targetY: number,
    items: DesktopItem[]
  ): { x: number; y: number } => {
    const { colWidth, rowHeight } = iconDimensions
    const maxRows = Math.max(1, Math.floor(((window.innerHeight || 800) - 48 - 30) / rowHeight))

    const col = Math.max(0, Math.round((targetX - 20) / colWidth))
    const row = Math.max(0, Math.min(maxRows - 1, Math.round((targetY - 20) / rowHeight)))
    const snappedX = 20 + col * colWidth
    const snappedY = 20 + row * rowHeight

    const otherItems = items.filter((it) => it.id !== itemId)
    const isOccupied = otherItems.some(
      (it) => Math.abs(it.x - snappedX) < colWidth / 2 && Math.abs(it.y - snappedY) < rowHeight / 2
    )

    if (!isOccupied) {
      return { x: snappedX, y: snappedY }
    }

    // Fallback to closest available cell
    return findFirstFreeCell(otherItems)
  }

  // Drag item position
  const handleItemStartDrag = (
    itemId: string,
    origX: number,
    origY: number,
    e: React.PointerEvent
  ) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const newX = origX + deltaX
      const newY = origY + deltaY

      setDesktopItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, x: newX, y: newY } : it))
      )
    }

    const onPointerUp = async (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)

      const deltaX = upEvent.clientX - startX
      const deltaY = upEvent.clientY - startY

      const current = settings.get('desktop.items') || []
      const { x, y } = snapToNearestCell(itemId, origX + deltaX, origY + deltaY, current)

      const next = current.map((it) => (it.id === itemId ? { ...it, x, y } : it))
      setDesktopItems(next)
      await settings.set('desktop.items', next)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  // Background context menu
  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()

    const clickX = e.clientX
    const clickY = e.clientY

    const getWidgetDims = (size: 'small' | 'medium' | 'large') => ({
      w: size === 'small' ? 160 : 340,
      h: size === 'large' ? 340 : 160
    })

    const isPositionFree = (
      posX: number,
      posY: number,
      w: number,
      h: number,
      existing: DesktopWidget[]
    ): boolean => {
      const margin = 20
      const maxW = window.innerWidth
      const maxH = window.innerHeight - 48
      if (posX < 16 || posY < 16 || posX + w > maxW - 16 || posY + h > maxH - 16) {
        return false
      }

      for (const ew of existing) {
        const { w: ewW, h: ewH } = getWidgetDims(ew.size)
        const overlapX = posX < ew.x + ewW + margin && posX + w + margin > ew.x
        const overlapY = posY < ew.y + ewH + margin && posY + h + margin > ew.y
        if (overlapX && overlapY) {
          return false
        }
      }
      return true
    }

    const findFreeWidgetPosition = (size: 'small' | 'medium' | 'large', existing: DesktopWidget[]) => {
      const { w, h } = getWidgetDims(size)
      if (isPositionFree(clickX, clickY, w, h, existing)) {
        return { x: clickX, y: clickY }
      }

      const maxW = window.innerWidth
      const maxH = window.innerHeight - 48

      for (let x = maxW - w - 28; x >= 24; x -= w + 24) {
        for (let y = 24; y <= maxH - h - 24; y += h + 24) {
          if (isPositionFree(x, y, w, h, existing)) {
            return { x, y }
          }
        }
      }

      const offset = (existing.length * 28) % 120
      return {
        x: Math.max(20, Math.min(maxW - w - 24, maxW - w - 32 - offset)),
        y: Math.max(20, Math.min(maxH - h - 24, 24 + offset))
      }
    }

    const allWidgets = getAllWidgets()
    const widgetOptions: ContextMenuEntry[] = allWidgets.map((w) => ({
      key: `add-widget-${w.id}`,
      label: w.manifest.name,
      action: async () => {
        const current = settings.get('desktop.widgets') || []
        const defaultSize = (w.manifest.defaultSize as 'small' | 'medium' | 'large') || 'small'
        const pos = findFreeWidgetPosition(defaultSize, current)

        const newWidget: DesktopWidget = {
          id: `widget-${w.id}-${Date.now()}`,
          widgetId: w.id,
          size: defaultSize,
          x: pos.x,
          y: pos.y
        }
        await settings.set('desktop.widgets', [...current, newWidget])
      }
    }))

    const entries: ContextMenuEntry[] = [
      {
        key: 'view',
        label: 'Ver',
        children: [
          {
            key: 'size-large',
            label: 'Íconos grandes',
            action: () => settings.set('desktop.iconSize', 'large')
          },
          {
            key: 'size-medium',
            label: 'Íconos medianos',
            action: () => settings.set('desktop.iconSize', 'medium')
          },
          {
            key: 'size-small',
            label: 'Íconos pequeños',
            action: () => settings.set('desktop.iconSize', 'small')
          }
        ]
      },
      {
        key: 'sort',
        label: 'Ordenar íconos',
        action: async () => {
          const colHeight = window.innerHeight - 80
          const { colWidth, rowHeight } = iconDimensions
          const rowsPerCol = Math.max(1, Math.floor(colHeight / rowHeight))

          const next = desktopItems.map((it, idx) => {
            const col = Math.floor(idx / rowsPerCol)
            const row = idx % rowsPerCol
            return {
              ...it,
              x: 20 + col * colWidth,
              y: 20 + row * rowHeight
            }
          })
          setDesktopItems(next)
          await settings.set('desktop.items', next)
        }
      },
      'separator',
      {
        key: 'new',
        label: 'Nuevo',
        children: [
          {
            key: 'new-folder',
            label: 'Carpeta',
            action: async () => {
              const desktopDir = `${kernelFs.getHomeDir()}/Escritorio`
              await kernelFs.mkdir(`${desktopDir}/Nueva carpeta`)
            }
          },
          {
            key: 'new-doc',
            label: 'Documento de texto',
            action: async () => {
              const desktopDir = `${kernelFs.getHomeDir()}/Escritorio`
              await kernelFs.writeFile(`${desktopDir}/Nuevo documento.txt`, '')
            }
          }
        ]
      },
      {
        key: 'add-widget',
        label: 'Añadir widget',
        children: widgetOptions
      },
      'separator',
      {
        key: 'personalize',
        label: 'Personalizar',
        action: () => windowManager.open('settings', { section: 'personalization' })
      }
    ]

    setContextMenu({ x: e.clientX, y: e.clientY, entries })
  }

  // File item context menu
  const openFileContextMenu = (node: FsNode, clientX: number, clientY: number) => {
    const fullPath = `${kernelFs.getHomeDir()}/Escritorio/${node.name}`
    const candidateApps = getAppsForFile(fullPath)
    const displayApps = candidateApps.length > 0 ? candidateApps : getAllApps().map((a) => a.manifest)

    const openWithEntries: ContextMenuEntry[] = displayApps.map((app) => ({
      key: `openwith-${app.id}`,
      label: app.name,
      action: () => windowManager.open(app.id, { filePath: fullPath })
    }))

    openWithEntries.push('separator')
    openWithEntries.push({
      key: 'openwith-set-default',
      label: 'Cambiar aplicación predeterminada…',
      action: async () => {
        const parts = node.name.split('.')
        const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
        if (!ext) return

        const choice = await dialogs.choose({
          title: 'Aplicación predeterminada',
          message: `Selecciona la aplicación con la que deseas abrir siempre los archivos .${ext}:`,
          options: displayApps.map((a) => ({ value: a.id, label: a.name }))
        })

        if (choice) {
          await setDefaultAppForExtension(ext, choice)
          const chosenAppName = displayApps.find((a) => a.id === choice)?.name || choice
          notifications.show({
            appId: 'system',
            title: 'Asociación actualizada',
            body: `Los archivos .${ext} ahora se abrirán con ${chosenAppName}.`
          })
        }
      }
    })

    const entries: ContextMenuEntry[] = [
      {
        key: 'open',
        label: 'Abrir',
        action: async () => {
          if (node.kind === 'folder') {
            windowManager.open('files', { filePath: fullPath })
          } else {
            await openFileWithApp(fullPath)
          }
        }
      },
      {
        key: 'openwith',
        label: 'Abrir con…',
        children: openWithEntries
      },
      'separator',
      {
        key: 'rename',
        label: 'Renombrar',
        action: async () => {
          const newName = await dialogs.prompt({
            title: 'Renombrar',
            defaultValue: node.name,
            validate: (v) => (!v.trim() ? 'El nombre no puede estar vacío' : null)
          })
          if (newName && newName !== node.name) {
            await kernelFs.rename(fullPath, newName)
          }
        }
      },
      {
        key: 'trash',
        label: 'Mover a la papelera',
        destructive: true,
        action: async () => {
          await kernelFs.trash(fullPath)
          const next = desktopItems.filter((i) => !(i.kind === 'node' && i.ref === node.id))
          setDesktopItems(next)
          await settings.set('desktop.items', next)
        }
      },
      'separator',
      {
        key: 'properties',
        label: 'Propiedades',
        action: async () => {
          const sizeKb = Math.round((node.size || 0) / 1024)
          await dialogs.alert({
            title: `Propiedades de ${node.name}`,
            message: `Tipo: ${
              node.kind === 'folder' ? 'Carpeta de archivos' : node.mime || 'Archivo'
            }\nUbicación: ${kernelFs.toDisplayPath(fullPath)}\nTamaño: ${sizeKb} KB\nModificado: ${new Date(
              node.modifiedAt
            ).toLocaleString('es-ES')}`
          })
        }
      }
    ]

    setContextMenu({ x: clientX, y: clientY, entries })
  }

  // App shortcut item context menu
  const openAppShortcutContextMenu = (item: DesktopItem, clientX: number, clientY: number) => {
    const entries: ContextMenuEntry[] = [
      {
        key: 'open',
        label: 'Abrir',
        action: () => windowManager.open(item.ref)
      },
      'separator',
      {
        key: 'remove',
        label: 'Quitar del escritorio',
        destructive: true,
        action: async () => {
          const next = desktopItems.filter((i) => i.id !== item.id)
          setDesktopItems(next)
          await settings.set('desktop.items', next)
        }
      }
    ]
    setContextMenu({ x: clientX, y: clientY, entries })
  }

  // Recycle bin context menu
  const openRecycleBinContextMenu = (clientX: number, clientY: number) => {
    const entries: ContextMenuEntry[] = [
      {
        key: 'open',
        label: 'Abrir',
        action: () => windowManager.open('files', { view: 'trash' })
      },
      'separator',
      {
        key: 'empty',
        label: 'Vaciar papelera de reciclaje',
        disabled: trashCount === 0,
        destructive: true,
        action: async () => {
          const confirmed = await dialogs.confirm({
            title: 'Vaciar papelera de reciclaje',
            message:
              '¿Estás seguro de que quieres eliminar de forma permanente todos los elementos de la Papelera de reciclaje?',
            confirmLabel: 'Vaciar papelera',
            destructive: true
          })
          if (confirmed) {
            await kernelFs.emptyTrash()
          }
        }
      }
    ]
    setContextMenu({ x: clientX, y: clientY, entries })
  }

  // Handle dropping onto recycle bin
  const handleDropOnRecycleBin = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rawData = e.dataTransfer.getData('application/x-simos-node')
    if (rawData) {
      try {
        await kernelFs.trash(rawData)
        // Clean up from desktopItems if it was an item
        const nodeName = rawData.split('/').pop()
        const foundNode = desktopFiles.find((n) => n.name === nodeName)
        if (foundNode) {
          const next = desktopItems.filter((i) => !(i.kind === 'node' && i.ref === foundNode.id))
          setDesktopItems(next)
          await settings.set('desktop.items', next)
        }
      } catch {
        // ignore
      }
    }
  }

  // Determine wallpaper image
  const wallpaperSrc =
    wallpaperSetting.type === 'builtin'
      ? wallpaperMap[wallpaperSetting.id] || auroraSvg
      : customWallpaperUrl || auroraSvg

  // Render marquee selection overlay
  const renderMarquee = () => {
    if (!marquee) return null
    const x = Math.min(marquee.startX, marquee.currentX)
    const y = Math.min(marquee.startY, marquee.currentY)
    const w = Math.abs(marquee.currentX - marquee.startX)
    const h = Math.abs(marquee.currentY - marquee.startY)

    return (
      <div
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${h}px`,
          backgroundColor: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-sm)',
          pointerEvents: 'none',
          zIndex: 8
        }}
      />
    )
  }

  return (
    <div
      ref={desktopRef}
      onPointerDown={handlePointerDown}
      onContextMenu={handleBackgroundContextMenu}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 'var(--taskbar-height)',
        backgroundImage: `url(${wallpaperSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: 'var(--font-family-base)'
      }}
    >
      {/* Capa 1: Selección rectangular (Marquee) */}
      {renderMarquee()}

      {/* Capa 2: Widgets Host (pointer-events: none, widgets have pointer-events: auto, zIndex: 5) */}
      <WidgetsHost />

      {/* Capa 3: Unified Desktop Items (pointer-events: none, items have pointer-events: auto, zIndex: 10) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        {desktopItems.map((item) => {
          const isSelected = selectedIds.has(item.id)

          // 1. Recycle bin icon
          if (item.kind === 'system' && item.ref === 'recycle-bin') {
            return (
              <div
                key={item.id}
                className="desktop-item"
                onPointerDown={(e) => handleItemStartDrag(item.id, item.x, item.y, e)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIds(new Set([item.id]))
                }}
                onDoubleClick={() => windowManager.open('files', { view: 'trash' })}
                onContextMenu={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  openRecycleBinContextMenu(e.clientX, e.clientY)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={handleDropOnRecycleBin}
                style={{
                  position: 'absolute',
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${iconDimensions.box}px`,
                  padding: '6px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  pointerEvents: 'auto'
                }}
              >
                <FileIcon
                  type="system"
                  systemKind={trashCount > 0 ? 'recycle-bin-full' : 'recycle-bin-empty'}
                  size={iconDimensions.icon}
                />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: '#ffffff',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                    lineHeight: '1.2',
                    maxWidth: '100%',
                    wordBreak: 'break-word'
                  }}
                >
                  Papelera de reciclaje
                </span>
              </div>
            )
          }

          // 2. App shortcut icon
          if (item.kind === 'app') {
            const app = getApp(item.ref)
            if (!app) return null

            return (
              <div
                key={item.id}
                className="desktop-item"
                onPointerDown={(e) => handleItemStartDrag(item.id, item.x, item.y, e)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIds(new Set([item.id]))
                }}
                onDoubleClick={() => windowManager.open(item.ref)}
                onContextMenu={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  openAppShortcutContextMenu(item, e.clientX, e.clientY)
                }}
                style={{
                  position: 'absolute',
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${iconDimensions.box}px`,
                  padding: '6px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  pointerEvents: 'auto'
                }}
              >
                <AppIcon appId={item.ref} size={iconDimensions.icon} />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: '#ffffff',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                    lineHeight: '1.2',
                    maxWidth: '100%',
                    wordBreak: 'break-word'
                  }}
                >
                  {app.manifest.name}
                </span>
              </div>
            )
          }

          // 3. Node item (file or folder from ~/Escritorio)
          if (item.kind === 'node') {
            const node = desktopFiles.find((f) => f.id === item.ref)
            if (!node) return null

            const ext = node.name.split('.').pop()
            const fullPath = `${kernelFs.getHomeDir()}/Escritorio/${node.name}`

            return (
              <div
                key={item.id}
                className="desktop-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-simos-node', fullPath)
                }}
                onPointerDown={(e) => handleItemStartDrag(item.id, item.x, item.y, e)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIds(new Set([item.id]))
                }}
                onDoubleClick={async () => {
                  if (node.kind === 'folder') {
                    windowManager.open('files', { filePath: fullPath })
                  } else {
                    await openFileWithApp(fullPath)
                  }
                }}
                onContextMenu={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  openFileContextMenu(node, e.clientX, e.clientY)
                }}
                style={{
                  position: 'absolute',
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${iconDimensions.box}px`,
                  padding: '6px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  pointerEvents: 'auto'
                }}
              >
                <FileIcon
                  type={node.kind}
                  mime={node.mime}
                  extension={ext}
                  size={iconDimensions.icon}
                />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: '#ffffff',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                    lineHeight: '1.2',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                  title={node.name}
                >
                  {node.name}
                </span>
              </div>
            )
          }

          return null
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.entries}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
