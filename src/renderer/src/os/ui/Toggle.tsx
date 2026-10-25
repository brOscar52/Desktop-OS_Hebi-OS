import React from 'react'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  style,
  className
}) => {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: disabled ? 0.6 : 1,
        fontFamily: 'var(--font-family-base)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-primary)',
        ...style
      }}
      className={className}
    >
      <div
        onClick={() => {
          if (!disabled) onChange(!checked)
        }}
        style={{
          width: '40px',
          height: '20px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: checked ? 'var(--accent-color)' : 'var(--bg-subtle)',
          border: `1px solid ${checked ? 'var(--accent-color)' : 'var(--border-strong)'}`,
          position: 'relative',
          transition: 'all var(--duration-fast) var(--ease-fluent)',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: checked ? 'var(--accent-text)' : 'var(--text-secondary)',
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '3px',
            transition: 'all var(--duration-fast) var(--ease-fluent)'
          }}
        />
      </div>
      {label && <span>{label}</span>}
    </label>
  )
}
