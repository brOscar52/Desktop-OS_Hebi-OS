import React, { useState, useEffect, useRef } from 'react'
import { AppMenu } from '../../kernel/windows/types'
import { getApp } from '../../kernel/apps/registry'

export interface AppMenuBarProps {
  appId: string
  menus?: AppMenu[]
  onOpenAbout: () => void
}

export const AppMenuBar: React.FC<AppMenuBarProps> = ({ appId, menus = [], onOpenAbout }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const app = getApp(appId)
  const appName = app?.manifest.name || appId

  // Complete menu list including automatic "Ayuda" -> "Acerca de <App>"
  const fullMenus: AppMenu[] = [
    ...menus,
    {
      label: 'Ayuda',
      items: [
        {
          label: `Acerca de ${appName}`,
          action: onOpenAbout
        }
      ]
    }
  ]

  useEffect(() => {
    if (openIndex === null) return
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenIndex(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openIndex])

  return (
    <div
      ref={barRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        height: '28px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: 'var(--font-size-xs)',
        userSelect: 'none',
        position: 'relative',
        zIndex: 100
      }}
    >
      {fullMenus.map((menu, idx) => {
        const isOpen = openIndex === idx
        return (
          <div key={menu.label} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              onMouseEnter={() => {
                if (openIndex !== null) setOpenIndex(idx)
              }}
              style={{
                background: isOpen ? 'var(--bg-active)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background-color var(--duration-fast) var(--ease-fluent)'
              }}
            >
              {menu.label}
            </button>

            {isOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '2px',
                  minWidth: '180px',
                  backgroundColor: 'var(--material-acrylic)',
                  backdropFilter: 'var(--backdrop-filter-acrylic)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-flyout)',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 200
                }}
              >
                {menu.items.map((item, itemIdx) => (
                  <button
                    key={`${item.label}-${itemIdx}`}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.disabled) return
                      setOpenIndex(null)
                      item.action?.()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: item.disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
                      fontSize: 'var(--font-size-xs)',
                      textAlign: 'left',
                      cursor: item.disabled ? 'not-allowed' : 'pointer',
                      outline: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (!item.disabled) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-active)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!item.disabled) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginLeft: '12px' }}>
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
