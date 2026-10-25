import React from 'react'

export interface CommandBarItem {
  key: string
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  primary?: boolean
}

export interface CommandBarProps {
  primaryItems?: CommandBarItem[]
  secondaryItems?: CommandBarItem[]
  farItems?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export const CommandBar: React.FC<CommandBarProps> = ({
  primaryItems = [],
  secondaryItems = [],
  farItems,
  style,
  className
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '8px',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {primaryItems.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: item.primary ? '1px solid transparent' : '1px solid transparent',
              backgroundColor: item.primary ? 'var(--accent-color)' : 'transparent',
              color: item.primary ? 'var(--accent-text)' : 'var(--text-primary)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
              transition: 'all var(--duration-fast) var(--ease-fluent)',
              outline: 'none'
            }}
          >
            {item.icon && <span style={{ display: 'inline-flex', fontSize: '14px' }}>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}

        {secondaryItems.length > 0 && primaryItems.length > 0 && (
          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'var(--border-subtle)',
              margin: '0 4px'
            }}
          />
        )}

        {secondaryItems.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-xs)',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
              transition: 'all var(--duration-fast) var(--ease-fluent)',
              outline: 'none'
            }}
          >
            {item.icon && <span style={{ display: 'inline-flex', fontSize: '14px' }}>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {farItems && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{farItems}</div>}
    </div>
  )
}
