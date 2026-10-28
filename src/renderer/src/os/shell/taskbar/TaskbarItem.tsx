import React, { useState } from 'react'
import { WindowState } from '../../kernel/windows/types'
import { windowManager } from '../../kernel/windows'
import { getApp } from '../../kernel/apps/registry'
import { openFileWithApp } from '../../kernel/apps/launcher'
import { AppIcon } from '../../ui/AppIcon'
import { ContextMenu, ContextMenuEntry } from '../../ui/ContextMenu'

export interface TaskbarItemProps {
  appId: string
  isPinned: boolean
  appWindows: WindowState[]
  onTogglePin: (appId: string) => void
}

export const TaskbarItem: React.FC<TaskbarItemProps> = ({
  appId,
  isPinned,
  appWindows,
  onTogglePin
}) => {
  const [contextMenuCoords, setContextMenuCoords] = useState<{ x: number; y: number } | null>(null)
  const app = getApp(appId)
  if (!app) return null

  const isRunning = appWindows.length > 0
  const isFocused = appWindows.some((w) => w.focused && w.state !== 'minimized')
  const appName = app.manifest.name

  const handleClick = () => {
    if (!isRunning) {
      windowManager.open(appId)
      return
    }

    if (isFocused) {
      // Focused window -> minimize it
      const focusedWin = appWindows.find((w) => w.focused)
      if (focusedWin) {
        windowManager.minimize(focusedWin.id)
      }
    } else {
      // Focus the top window of this app
      const topWin = appWindows.reduce((prev, curr) => (curr.zIndex > prev.zIndex ? curr : prev))
      if (topWin.state === 'minimized') {
        windowManager.restore(topWin.id)
      } else {
        windowManager.focus(topWin.id)
      }
    }
  }

  // Drag and drop: accept dropping a file node onto app icon
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const filePath = e.dataTransfer.getData('application/x-simos-node')
    if (filePath) {
      await openFileWithApp(filePath, appId)
    }
  }

  const menuEntries: ContextMenuEntry[] = [
    {
      key: 'launch',
      label: appName,
      icon: <AppIcon appId={appId} size={16} />,
      action: () => windowManager.open(appId)
    },
    'separator',
    {
      key: 'pin',
      label: isPinned ? 'Desanclar de la barra de tareas' : 'Anclar a la barra de tareas',
      action: () => onTogglePin(appId)
    }
  ]

  if (isRunning) {
    menuEntries.push('separator')
    menuEntries.push({
      key: 'close',
      label: appWindows.length > 1 ? 'Cerrar todas las ventanas' : 'Cerrar ventana',
      destructive: true,
      action: async () => {
        for (const w of appWindows) {
          await windowManager.close(w.id)
        }
      }
    })
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault()
        setContextMenuCoords({ x: e.clientX, y: e.clientY - 100 })
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color var(--duration-fast) var(--ease-fluent)',
        backgroundColor: isFocused ? 'var(--bg-active)' : 'transparent'
      }}
      onMouseEnter={(e) => {
        if (!isFocused) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isFocused) e.currentTarget.style.backgroundColor = 'transparent'
      }}
      title={appName}
    >
      <AppIcon appId={appId} size={24} />

      {/* Indicator bar beneath icon */}
      {isRunning && (
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            height: '3px',
            borderRadius: 'var(--radius-full)',
            transition: 'all var(--duration-fast) var(--ease-fluent)',
            width: isFocused ? '18px' : '6px',
            backgroundColor: isFocused ? 'var(--accent-color)' : 'var(--text-tertiary)'
          }}
        />
      )}

      {contextMenuCoords && (
        <ContextMenu
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          items={menuEntries}
          onClose={() => setContextMenuCoords(null)}
        />
      )}
    </div>
  )
}
