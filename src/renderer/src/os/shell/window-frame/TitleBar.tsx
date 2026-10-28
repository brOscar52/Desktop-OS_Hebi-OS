import React, { useState } from 'react'
import { WindowState } from '../../kernel/windows/types'
import { windowManager } from '../../kernel/windows'
import { getApp } from '../../kernel/apps/registry'
import { AppIcon } from '../../ui/AppIcon'
import { ContextMenu, ContextMenuEntry } from '../../ui/ContextMenu'

export interface TitleBarProps {
  window: WindowState
  onStartDrag: (e: React.PointerEvent) => void
  onOpenAbout: () => void
}

export const TitleBar: React.FC<TitleBarProps> = ({ window: win, onStartDrag, onOpenAbout }) => {
  const [contextMenuCoords, setContextMenuCoords] = useState<{ x: number; y: number } | null>(null)
  const app = getApp(win.appId)
  const appName = app?.manifest.name || win.title

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left button initiates drag
    if (e.button === 0) {
      windowManager.focus(win.id)
      onStartDrag(e)
    }
  }

  const handleDoubleClick = () => {
    if (win.resizable) {
      windowManager.toggleMaximize(win.id)
    }
  }

  const openContextMenu = (clientX: number, clientY: number) => {
    setContextMenuCoords({ x: clientX, y: clientY })
  }

  const menuEntries: ContextMenuEntry[] = [
    {
      key: 'restore',
      label: 'Restaurar',
      disabled: win.state === 'normal',
      action: () => windowManager.restore(win.id)
    },
    {
      key: 'minimize',
      label: 'Minimizar',
      action: () => windowManager.minimize(win.id)
    },
    {
      key: 'maximize',
      label: 'Maximizar',
      disabled: win.state === 'maximized' || !win.resizable,
      action: () => windowManager.maximize(win.id)
    },
    'separator',
    {
      key: 'about',
      label: `Acerca de ${appName}`,
      action: onOpenAbout
    },
    'separator',
    {
      key: 'close',
      label: 'Cerrar',
      shortcut: 'Alt+F4',
      destructive: true,
      action: () => windowManager.close(win.id)
    }
  ]

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault()
        openContextMenu(e.clientX, e.clientY)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'var(--titlebar-height)',
        minHeight: 'var(--titlebar-height)',
        paddingLeft: '10px',
        backgroundColor: win.focused ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
        userSelect: 'none',
        cursor: 'default',
        boxSizing: 'border-box'
      }}
    >
      {/* Icon & Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflow: 'hidden',
          flex: 1,
          marginRight: '12px'
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation()
            const rect = e.currentTarget.getBoundingClientRect()
            openContextMenu(rect.left, rect.bottom + 2)
          }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title={appName}
        >
          <AppIcon appId={win.appId} size={16} />
        </div>

        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            color: win.focused ? 'var(--text-primary)' : 'var(--text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'color var(--duration-fast) var(--ease-fluent)'
          }}
        >
          {win.title}
        </span>
      </div>

      {/* Control Buttons (Min, Max, Close) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: '100%',
          flexShrink: 0
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Minimize */}
        <button
          type="button"
          onClick={() => windowManager.minimize(win.id)}
          style={{
            width: '46px',
            border: 'none',
            background: 'transparent',
            color: win.focused ? 'var(--text-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            transition: 'background-color var(--duration-fast) var(--ease-fluent)',
            outline: 'none'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Minimizar"
        >
          —
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          disabled={!win.resizable}
          onClick={() => windowManager.toggleMaximize(win.id)}
          style={{
            width: '46px',
            border: 'none',
            background: 'transparent',
            color: !win.resizable
              ? 'var(--text-disabled)'
              : win.focused
                ? 'var(--text-primary)'
                : 'var(--text-tertiary)',
            cursor: win.resizable ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            transition: 'background-color var(--duration-fast) var(--ease-fluent)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (win.resizable) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            if (win.resizable) e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title={win.state === 'maximized' ? 'Restaurar' : 'Maximizar'}
        >
          {win.state === 'maximized' ? '❐' : '□'}
        </button>

        {/* Close Button: turns red (#c42b1c) on hover */}
        <button
          type="button"
          onClick={() => windowManager.close(win.id)}
          style={{
            width: '46px',
            border: 'none',
            background: 'transparent',
            color: win.focused ? 'var(--text-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            transition: 'all var(--duration-fast) var(--ease-fluent)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c42b1c'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = win.focused ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          title="Cerrar"
        >
          ✕
        </button>
      </div>

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
