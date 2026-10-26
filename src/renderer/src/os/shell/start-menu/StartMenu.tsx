import React, { useState, useEffect, useRef } from 'react'
import { getAllApps, getApp, RegisteredApp } from '../../kernel/apps/registry'
import { windowManager } from '../../kernel/windows'
import { settings } from '../../kernel/settings'
import { useSession } from '../../kernel/session'
import { AppIcon } from '../../ui/AppIcon'
import { TextField } from '../../ui/TextField'
import { ContextMenu, ContextMenuEntry } from '../../ui/ContextMenu'
import defaultAvatar from '../../../system/icons/avatar-default.svg'

export interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
}

export const StartMenu: React.FC<StartMenuProps> = ({ isOpen, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'pinned' | 'all'>('pinned')
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false)
  const [powerMenuOpen, setPowerMenuOpen] = useState<boolean>(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; appId: string } | null>(null)

  const { user, lock, logout, restart, shutdown } = useSession()
  const pinnedAppIds = settings.get('start.pinned') || []
  const taskbarPinnedAppIds = settings.get('taskbar.pinned') || []
  const alignment = settings.get('taskbar.alignment') || 'center'

  const allApps = getAllApps()

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setViewMode('pinned')
      setUserMenuOpen(false)
      setPowerMenuOpen(false)
      setContextMenu(null)
    }
  }, [isOpen])

  // Click outside and Esc listener
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleLaunch = (appId: string) => {
    windowManager.open(appId)
    onClose()
  }

  // App context menu handlers
  const handleTogglePinStart = async (appId: string) => {
    let next: string[]
    if (pinnedAppIds.includes(appId)) {
      next = pinnedAppIds.filter((id) => id !== appId)
    } else {
      next = [...pinnedAppIds, appId]
    }
    await settings.set('start.pinned', next)
  }

  const handleTogglePinTaskbar = async (appId: string) => {
    let next: string[]
    if (taskbarPinnedAppIds.includes(appId)) {
      next = taskbarPinnedAppIds.filter((id) => id !== appId)
    } else {
      next = [...taskbarPinnedAppIds, appId]
    }
    await settings.set('taskbar.pinned', next)
  }

  const handleAddToDesktop = async (appId: string) => {
    const desktopItems = settings.get('desktop.items') || []
    if (desktopItems.some((i) => i.kind === 'app' && i.ref === appId)) {
      return
    }

    const colWidth = 90
    const rowHeight = 100
    const maxRows = Math.max(1, Math.floor(((window.innerHeight || 800) - 48 - 30) / rowHeight))

    let freeX = 20
    let freeY = 20
    let col = 0
    let row = 0

    while (col < 50) {
      const cx = 20 + col * colWidth
      const cy = 20 + row * rowHeight
      const isOccupied = desktopItems.some(
        (it) => Math.abs(it.x - cx) < colWidth / 2 && Math.abs(it.y - cy) < rowHeight / 2
      )
      if (!isOccupied) {
        freeX = cx
        freeY = cy
        break
      }
      row++
      if (row >= maxRows) {
        row = 0
        col++
      }
    }

    const newItem = {
      id: `desktop-app-${appId}`,
      kind: 'app' as const,
      ref: appId,
      x: freeX,
      y: freeY
    }
    await settings.set('desktop.items', [...desktopItems, newItem])
  }

  // Context menu entries for apps
  const getAppContextMenuEntries = (appId: string): ContextMenuEntry[] => {
    const app = getApp(appId)
    const appName = app?.manifest.name || appId
    const isStartPinned = pinnedAppIds.includes(appId)
    const isTaskbarPinned = taskbarPinnedAppIds.includes(appId)

    return [
      {
        key: 'open',
        label: `Abrir ${appName}`,
        icon: <AppIcon appId={appId} size={16} />,
        action: () => handleLaunch(appId)
      },
      'separator',
      {
        key: 'pin-start',
        label: isStartPinned ? 'Desanclar de Inicio' : 'Anclar a Inicio',
        action: () => handleTogglePinStart(appId)
      },
      {
        key: 'pin-taskbar',
        label: isTaskbarPinned ? 'Desanclar de la barra de tareas' : 'Anclar a la barra de tareas',
        action: () => handleTogglePinTaskbar(appId)
      },
      {
        key: 'add-desktop',
        label: 'Añadir al escritorio',
        action: () => handleAddToDesktop(appId)
      }
    ]
  }

  // Filtered apps based on search query
  const filteredApps = searchQuery.trim()
    ? allApps.filter((a) => {
        const q = searchQuery.toLowerCase()
        return (
          a.manifest.name.toLowerCase().includes(q) ||
          a.manifest.description.toLowerCase().includes(q)
        )
      })
    : []

  // Group all apps alphabetically for "Todas las aplicaciones"
  const alphabeticalGroups: Record<string, RegisteredApp[]> = {}
  if (viewMode === 'all') {
    const visibleApps = allApps
      .filter((a) => a.manifest.startMenu.visible !== false)
      .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name, 'es'))

    for (const app of visibleApps) {
      const letter = app.manifest.name[0]?.toUpperCase() || '#'
      if (!alphabeticalGroups[letter]) {
        alphabeticalGroups[letter] = []
      }
      alphabeticalGroups[letter].push(app)
    }
  }

  // Align start menu popup
  const positionStyles: React.CSSProperties =
    alignment === 'center'
      ? {
          position: 'fixed',
          bottom: '56px',
          left: '50%',
          transform: 'translateX(-50%)'
        }
      : {
          position: 'fixed',
          bottom: '56px',
          left: '12px'
        }

  return (
    <div
      ref={menuRef}
      style={{
        ...positionStyles,
        width: '640px',
        maxWidth: 'calc(100vw - 24px)',
        height: '680px',
        maxHeight: 'calc(100vh - 72px)',
        backgroundColor: 'var(--material-acrylic)',
        backdropFilter: 'var(--backdrop-filter-acrylic)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-flyout)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999000,
        fontFamily: 'var(--font-family-base)',
        color: 'var(--text-primary)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Top Search Bar */}
      <div style={{ padding: '24px 32px 16px 32px' }}>
        <TextField
          placeholder="Escribe aquí para buscar aplicaciones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          clearable
          onClear={() => setSearchQuery('')}
          icon={<span>🔍</span>}
          autoFocus
        />
      </div>

      {/* 2. Middle Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px', minHeight: 0 }}>
        {searchQuery.trim() ? (
          /* Search Results */
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Mejor coincidencia ({filteredApps.length})
            </div>
            {filteredApps.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No se encontraron aplicaciones para &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleLaunch(app.id)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, appId: app.id })
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '12px 6px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <AppIcon appId={app.id} size={40} />
                    <span style={{ fontSize: 'var(--font-size-xs)', wordBreak: 'break-word', lineHeight: '1.2' }}>
                      {app.manifest.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : viewMode === 'pinned' ? (
          /* Pinned Grid View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                Anclado
              </span>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Todas las aplicaciones</span>
                <span>›</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
              {pinnedAppIds.map((appId) => {
                const app = getApp(appId)
                if (!app) return null

                return (
                  <div
                    key={appId}
                    onClick={() => handleLaunch(appId)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, appId })
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '12px 6px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      gap: '8px',
                      transition: 'background-color var(--duration-fast) var(--ease-fluent)'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <AppIcon appId={appId} size={40} />
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        wordBreak: 'break-word',
                        lineHeight: '1.2',
                        maxWidth: '80px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {app.manifest.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* "Todas las aplicaciones" Alphabetical View */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setViewMode('pinned')}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>‹ Atrás</span>
              </button>
              <span style={{ marginLeft: '12px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                Todas las aplicaciones
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
              {Object.entries(alphabeticalGroups).map(([letter, groupApps]) => (
                <div key={letter} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--accent-color)',
                      padding: '4px 8px'
                    }}
                  >
                    {letter}
                  </div>
                  {groupApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => handleLaunch(app.id)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu({ x: e.clientX, y: e.clientY, appId: app.id })
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <AppIcon appId={app.id} size={24} />
                      <span style={{ fontSize: 'var(--font-size-sm)' }}>{app.manifest.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom User Account & Power Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          position: 'relative'
        }}
      >
        {/* User Account Button */}
        <div
          onClick={() => {
            setUserMenuOpen(!userMenuOpen)
            setPowerMenuOpen(false)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'background-color var(--duration-fast) var(--ease-fluent)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <img
            src={defaultAvatar}
            alt="Avatar"
            width={32}
            height={32}
            style={{ borderRadius: 'var(--radius-full)' }}
          />
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
            {user?.name || 'Usuario'}
          </span>
        </div>

        {/* Power Button */}
        <button
          type="button"
          onClick={() => {
            setPowerMenuOpen(!powerMenuOpen)
            setUserMenuOpen(false)
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--text-primary)',
            transition: 'background-color var(--duration-fast) var(--ease-fluent)',
            outline: 'none'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Inicio/Apagado"
        >
          ⏻
        </button>

        {/* User Popup Menu */}
        {userMenuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '64px',
              left: '32px',
              minWidth: '220px',
              backgroundColor: 'var(--material-acrylic)',
              backdropFilter: 'var(--backdrop-filter-acrylic)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-flyout)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              zIndex: 1000
            }}
          >
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false)
                onClose()
                windowManager.open('settings', { page: 'account' })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>⚙️</span>
              <span>Cambiar configuración de la cuenta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false)
                onClose()
                lock()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>🔒</span>
              <span>Bloquear</span>
            </button>
            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
            <button
              type="button"
              onClick={async () => {
                setUserMenuOpen(false)
                onClose()
                const allowed = await windowManager.closeAllWithDirtyCheck()
                if (allowed) {
                  logout()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>🚪</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}

        {/* Power Popup Menu */}
        {powerMenuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '64px',
              right: '32px',
              minWidth: '160px',
              backgroundColor: 'var(--material-acrylic)',
              backdropFilter: 'var(--backdrop-filter-acrylic)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-flyout)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              zIndex: 1000
            }}
          >
            <button
              type="button"
              onClick={async () => {
                setPowerMenuOpen(false)
                onClose()
                const allowed = await windowManager.closeAllWithDirtyCheck()
                if (allowed) {
                  restart()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>🔄</span>
              <span>Reiniciar</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                setPowerMenuOpen(false)
                onClose()
                const allowed = await windowManager.closeAllWithDirtyCheck()
                if (allowed) {
                  shutdown()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>⏻</span>
              <span>Apagar</span>
            </button>
          </div>
        )}
      </div>

      {/* App Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getAppContextMenuEntries(contextMenu.appId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
