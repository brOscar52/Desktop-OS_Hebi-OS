import React from 'react'

export interface ListItem<T = unknown> {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  trailing?: React.ReactNode
  data?: T
  disabled?: boolean
}

export interface ListProps<T = unknown> {
  items: ListItem<T>[]
  selectedId?: string
  onSelect?: (item: ListItem<T>) => void
  onDoubleClick?: (item: ListItem<T>) => void
  emptyText?: string
  style?: React.CSSProperties
  className?: string
}

export function List<T = unknown>({
  items,
  selectedId,
  onSelect,
  onDoubleClick,
  emptyText = 'No hay elementos',
  style,
  className
}: ListProps<T>) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--font-size-sm)',
          ...style
        }}
        className={className}
      >
        {emptyText}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        width: '100%',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      {items.map((item) => {
        const isSelected = item.id === selectedId
        return (
          <div
            key={item.id}
            onClick={() => !item.disabled && onSelect?.(item)}
            onDoubleClick={() => !item.disabled && onDoubleClick?.(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
              border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.6 : 1,
              transition: 'background-color var(--duration-fast) var(--ease-fluent)'
            }}
          >
            {item.icon && (
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: '18px' }}>
                {item.icon}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.title}
              </span>
              {item.subtitle && (
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.subtitle}
                </span>
              )}
            </div>
            {item.trailing && <div style={{ flexShrink: 0 }}>{item.trailing}</div>}
          </div>
        )
      })}
    </div>
  )
}
