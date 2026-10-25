import React from 'react'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
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
          width: '18px',
          height: '18px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: checked ? 'var(--accent-color)' : 'var(--bg-card)',
          border: `1px solid ${checked ? 'var(--accent-color)' : 'var(--border-strong)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--duration-fast) var(--ease-fluent)',
          flexShrink: 0,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="var(--accent-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && <span>{label}</span>}
    </label>
  )
}
