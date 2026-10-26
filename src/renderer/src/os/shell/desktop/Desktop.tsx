import React, { useState, useEffect, useRef } from 'react'
import { settings, DesktopItem, DesktopWidget } from '../../kernel/settings'
import { fs as kernelFs, FsNode } from '../../kernel/fs'
import { events } from '../../kernel/events'
import { windowManager } from '../../kernel/windows'
import { getApp, getAllWidgets } from '../../kernel/apps/registry'
import { openFileWithApp, getAppsForFile } from '../../kernel/apps/launcher'
import { dialogs } from '../../kernel/dialogs'
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
  const [desktopItems, setDesktopItems] = useState<DesktopItem[]>(settings.get('desktop.items') || [])
  const [desktopFiles, setDesktopFiles] = useState<FsNode[]>([])
  const [trashCount, setTrashCount] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [marquee, setMarquee] = useState<SelectionBox | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entries: ContextMenuEntry[] } | null>(null)
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null)

  const desktopRef = useRef<HTMLDivElement>(null)

  // 1. Subscribe to settings and events
  useEffect(() => {
    const unsubs = [
      settings.subscribe('appearance.wallpaper', (wp) => setWallpaperSetting(wp)),
      settings.subscribe('desktop.iconSize', (size) => setIconSize(size)),
      settings.subscribe('desktop.items', (items) => setDesktopItems(items)),
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
  }, [])

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

  const loadDesktopFiles = async () => {
    try {
      const desktopDir = `${kernelFs.getHomeDir()}/Escritorio`
      const list = await kernelFs.list(desktopDir)
      setDesktopFiles(list)
    } catch {
      setDesktopFiles([])
    }
  }

  const checkTrashCount = async () => {
    try {
      const list = await kernelFs.listTrash()
      setTrashCount(list.length)
    } catch {
      setTrashCount(0)
    }
  }

  // Marquee selection handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.desktop-item') || (e.target as HTMLElement).closest('.widget-action-btn')) {
      return
    }

    setSelectedIds(new Set())
    const startX = e.clientX
    const startY = e.clientY

    setMarquee({ startX, startY, currentX: startX, currentY: startY })

    const onPointerMove = (moveEvent: PointerEvent) => {
      setMarquee((prev) => (prev ? { ...prev, currentX: moveEvent.clientX, currentY: moveEvent.clientY } : null))
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      setMarquee(null)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  // Snap to grid
  const snapToGrid = (x: number, y: number) => {
    const colWidth = iconSize === 'small' ? 74 : iconSize === 'large' ? 96 : 84
    const rowHeight = iconSize === 'small' ? 84 : iconSize === 'large' ? 110 : 96
    const snappedX = Math.round(x / colWidth) * colWidth
    const snappedY = Math.round(y / rowHeight) * rowHeight
    return { x: Math.max(10, snappedX), y: Math.max(10, snappedY) }
  }

  // Drag item position
  const handleItemStartDrag = (itemId: string, origX: number, origY: number, e: React.PointerEvent) => {
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
      const { x, y } = snapToGrid(origX + deltaX, origY + deltaY)

      const current = settings.get('desktop.items') || []
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

    const isPositionFree = (posX: number, posY: number, w: number, h: number, existing: DesktopWidget[]): boolean => {
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

    const findFreePosition = (size: 'small' | 'medium' | 'large', existing: DesktopWidget[]) => {
      const { w, h } = getWidgetDims(size)
      // 1. Try near click position
      if (isPositionFree(clickX, clickY, w, h, existing)) {
        return { x: clickX, y: clickY }
      }

      // 2. Scan grid slots starting from right side (standard widget area)
      const maxW = window.innerWidth
      const maxH = window.innerHeight - 48

      for (let x = maxW - w - 28; x >= 24; x -= (w + 24)) {
        for (let y = 24; y <= maxH - h - 24; y += (h + 24)) {
          if (isPositionFree(x, y, w, h, existing)) {
            return { x, y }
          }
        }
      }

      // 3. Fallback: cascading offset so they never stack exactly
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
        const pos = findFreePosition(defaultSize, current)

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
          // Arrange desktop items in neat columns
          const colHeight = window.innerHeight - 80
          const rowHeight = iconSize === 'small' ? 84 : iconSize === 'large' ? 110 : 96
          const colWidth = iconSize === 'small' ? 74 : iconSize === 'large' ? 96 : 84
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
        action: () => windowManager.open('settings', { page: 'personalization' })
      }
    ]

    setContextMenu({ x: e.clientX, y: e.clientY, entries })
  }

  // File item context menu
  const openFileContextMenu = (node: FsNode, clientX: number, clientY: number) => {
    const fullPath = `${kernelFs.getHomeDir()}/Escritorio/${node.name}`
    const candidateApps = getAppsForFile(fullPath)

    const openWithEntries: ContextMenuEntry[] = candidateApps.map((app) => ({
      key: `openwith-${app.id}`,
      label: app.name,
      action: () => windowManager.open(app.id, { filePath: fullPath })
    }))

    openWithEntries.push({
      key: 'openwith-other',
      label: 'Elegir otra aplicación...',
      action: async () => {
        const apps = getAppsForFile(fullPath)
        if (apps.length > 0) {
          windowManager.open(apps[0].id, { filePath: fullPath })
        } else {
          windowManager.open('text-editor', { filePath: fullPath })
        }
      }
    })

    const entries: ContextMenuEntry[] = [
      {
        key: 'open',
        label: 'Abrir',
        action: async () => {
          if (node.kind === 'folder') {
            windowManager.open('files', { path: fullPath })
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
            message: `Tipo: ${node.kind === 'folder' ? 'Carpeta de archivos' : node.mime || 'Archivo'}\nUbicación: ${kernelFs.toDisplayPath(fullPath)}\nTamaño: ${sizeKb} KB\nModificado: ${new Date(node.modifiedAt).toLocaleString('es-ES')}`
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
            message: '¿Estás seguro de que quieres eliminar de forma permanente todos los elementos de la Papelera de reciclaje?',
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

  // Determine wallpaper image
  const wallpaperSrc =
    wallpaperSetting.type === 'builtin'
      ? wallpaperMap[wallpaperSetting.id] || auroraSvg
      : customWallpaperUrl || auroraSvg

  const iconDimensions = {
    small: { icon: 32, box: 70 },
    medium: { icon: 42, box: 80 },
    large: { icon: 54, box: 92 }
  }[iconSize]

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
      {/* Layer 1: Desktop Widgets Host */}
      <WidgetsHost />

      {/* Layer 2: Desktop Items (Recycle bin, Pinned Apps, Files from ~/Escritorio) */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 10 }}>
        {/* Desktop Items from settings.desktop.items */}
        {desktopItems.map((item) => {
          const isSelected = selectedIds.has(item.id)

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
                onDoubleClick={() => windowManager.open('files', { path: '/Papelera' })}
                onContextMenu={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  openRecycleBinContextMenu(e.clientX, e.clientY)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  const filePath = e.dataTransfer.getData('application/x-simos-node')
                  if (filePath) {
                    await kernelFs.trash(filePath)
                  }
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
                  textAlign: 'center'
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
                  textAlign: 'center'
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

          return null
        })}

        {/* Files from ~/Escritorio */}
        {desktopFiles.map((node, index) => {
          const isSelected = selectedIds.has(node.id)
          const ext = node.name.split('.').pop()
          const fullPath = `/Usuario/Escritorio/${node.name}`

          // Initial placement on desktop grid
          const colWidth = iconDimensions.box + 10
          const rowHeight = iconDimensions.box + 20
          const col = Math.floor((index + 1) / 7)
          const row = (index + 1) % 7
          const defaultX = 20 + col * colWidth
          const defaultY = 20 + row * rowHeight

          return (
            <div
              key={node.id}
              className="desktop-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-simos-node', fullPath)
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIds(new Set([node.id]))
              }}
              onDoubleClick={async () => {
                if (node.kind === 'folder') {
                  windowManager.open('files', { path: fullPath })
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
                left: `${defaultX}px`,
                top: `${defaultY}px`,
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
                textAlign: 'center'
              }}
            >
              <FileIcon type={node.kind} mime={node.mime} extension={ext} size={iconDimensions.icon} />
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
        })}
      </div>

      {/* Marquee selection overlay */}
      {renderMarquee()}

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
