import React from 'react'

export interface NavigationPaneItem {
  key: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
}

export interface NavigationPaneProps {
  items: NavigationPaneItem[]
  selectedKey: string
  onSelect: (key: string) => void
  header?: React.ReactNode
  footer?: React.ReactNode
  width?: number | string
  style?: React.CSSProperties
  className?: string
}

export const NavigationPane: React.FC<NavigationPaneProps> = ({
  items,
  selectedKey,
  onSelect,
  header,
  footer,
  width = '220px',
  style,
  className
}) => {
  return (
    <nav
      style={{
        width,
        minWidth: width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-subtle)',
        borderRight: '1px solid var(--border-subtle)',
        userSelect: 'none',
        padding: '8px 6px',
        boxSizing: 'border-box',
        ...style
      }}
      className={className}
    >
      {header && <div style={{ padding: '4px 8px 12px 8px' }}>{header}</div>}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {items.map((item) => {
          const isSelected = item.key === selectedKey
          return (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => onSelect(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                fontWeight: isSelected ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                fontSize: 'var(--font-size-sm)',
                border: 'none',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'background-color var(--duration-fast) var(--ease-fluent)',
                outline: 'none'
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    left: '2px',
                    top: '20%',
                    bottom: '20%',
                    width: '3px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--accent-color)'
                  }}
                />
              )}
              {item.icon && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '16px',
                    color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)'
                  }}
                >
                  {item.icon}
                </span>
              )}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {footer && <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>}
    </nav>
  )
}
