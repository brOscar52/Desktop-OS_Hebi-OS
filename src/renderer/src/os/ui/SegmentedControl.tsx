import React from 'react'

export interface SegmentedControlOption<T extends string = string> {
  value: T
  label: React.ReactNode
  icon?: React.ReactNode
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  style,
  className
}: SegmentedControlProps<T>) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: '2px',
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        gap: '2px',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: isSelected ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
              borderRadius: 'calc(var(--radius-sm) - 1px)',
              backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent',
              boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all var(--duration-fast) var(--ease-fluent)',
              outline: 'none'
            }}
          >
            {opt.icon && <span style={{ display: 'inline-flex' }}>{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
