import React from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  style,
  disabled,
  className,
  ...props
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            color: error ? '#c42b1c' : 'var(--text-secondary)'
          }}
        >
          {label}
        </label>
      )}
      <select
        disabled={disabled}
        style={{
          padding: '6px 10px',
          backgroundColor: 'var(--bg-card)',
          border: `1px solid ${error ? '#c42b1c' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          outline: 'none',
          color: disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
          fontFamily: 'var(--font-family-base)',
          fontSize: 'var(--font-size-sm)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...style
        }}
        className={className}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: 'var(--font-size-xs)', color: '#c42b1c', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  )
}
