import React, { useEffect, useRef, useState } from 'react'

export type ContextMenuEntry = ContextMenuItem | 'separator'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  disabled?: boolean
  destructive?: boolean
  action?: () => void
  children?: ContextMenuEntry[]
}

export interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuEntry[]
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x, y })

  // Adjust position so it doesn't overflow screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const winW = window.innerWidth
      const winH = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      if (x + rect.width > winW) {
        adjustedX = Math.max(8, winW - rect.width - 8)
      }
      if (y + rect.height > winH) {
        adjustedY = Math.max(8, winH - rect.height - 8)
      }

      setCoords({ x: adjustedX, y: adjustedY })
    }
  }, [x, y])

  // Click outside and Escape handler
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: coords.x,
        top: coords.y,
        zIndex: 999999,
        minWidth: '190px',
        maxWidth: '280px',
        backgroundColor: 'var(--material-acrylic)',
        backdropFilter: 'var(--backdrop-filter-acrylic)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-flyout)',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        fontFamily: 'var(--font-family-base)',
        pointerEvents: 'auto'
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((entry, idx) => {
        if (entry === 'separator') {
          return (
            <div
              key={`sep-${idx}`}
              style={{
                height: '1px',
                backgroundColor: 'var(--border-subtle)',
                margin: '4px 6px'
              }}
            />
          )
        }

        const hasSubmenu = entry.children && entry.children.length > 0
        const isSubmenuOpen = activeSubmenu === entry.key

        return (
          <div
            key={entry.key}
            onMouseEnter={() => {
              if (hasSubmenu) setActiveSubmenu(entry.key)
              else setActiveSubmenu(null)
            }}
            style={{ position: 'relative' }}
          >
            <div
              onClick={() => {
                if (entry.disabled) return
                if (entry.action) {
                  entry.action()
                  onClose()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
                color: entry.disabled
                  ? 'var(--text-disabled)'
                  : entry.destructive
                    ? '#c42b1c'
                    : 'var(--text-primary)',
                cursor: entry.disabled ? 'not-allowed' : 'pointer',
                backgroundColor: isSubmenuOpen ? 'var(--bg-active)' : 'transparent',
                transition: 'background-color var(--duration-fast) var(--ease-fluent)'
              }}
              onMouseEnter={(e) => {
                if (!entry.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-active)'
                }
              }}
              onMouseLeave={(e) => {
                if (!entry.disabled && !isSubmenuOpen) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {entry.icon && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    width: '16px',
                    flexShrink: 0
                  }}
                >
                  {entry.icon}
                </span>
              )}
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{entry.label}</span>
              {entry.shortcut && (
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    marginLeft: '12px'
                  }}
                >
                  {entry.shortcut}
                </span>
              )}
              {hasSubmenu && (
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '6px' }}>
                  ▶
                </span>
              )}
            </div>

            {hasSubmenu && isSubmenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '-4px',
                  minWidth: '180px',
                  backgroundColor: 'var(--material-acrylic)',
                  backdropFilter: 'var(--backdrop-filter-acrylic)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-flyout)',
                  padding: '4px',
                  zIndex: 1000000
                }}
              >
                {entry.children?.map((sub, sIdx) => {
                  if (sub === 'separator') {
                    return (
                      <div
                        key={`sub-sep-${sIdx}`}
                        style={{
                          height: '1px',
                          backgroundColor: 'var(--border-subtle)',
                          margin: '4px 6px'
                        }}
                      />
                    )
                  }
                  return (
                    <div
                      key={sub.key}
                      onClick={() => {
                        if (sub.disabled) return
                        if (sub.action) {
                          sub.action()
                          onClose()
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-sm)',
                        color: sub.disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
                        cursor: sub.disabled ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!sub.disabled) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-active)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!sub.disabled) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {sub.icon && (
                        <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                          {sub.icon}
                        </span>
                      )}
                      <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{sub.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
