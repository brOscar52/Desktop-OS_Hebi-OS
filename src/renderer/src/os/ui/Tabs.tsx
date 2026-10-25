import React from 'react'

export interface TabItem {
  key: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  tabs: TabItem[]
  activeKey: string
  onChange: (key: string) => void
  style?: React.CSSProperties
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeKey,
  onChange,
  style,
  className
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid var(--border-subtle)',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: 'var(--font-size-sm)',
              fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
              color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--accent-color)' : 'transparent'}`,
              marginBottom: '-1px',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              transition: 'all var(--duration-fast) var(--ease-fluent)',
              outline: 'none'
            }}
          >
            {tab.icon && <span style={{ display: 'inline-flex' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
