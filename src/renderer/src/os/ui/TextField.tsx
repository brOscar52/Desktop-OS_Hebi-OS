import React, { forwardRef } from 'react'

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  clearable?: boolean
  onClear?: () => void
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, icon, clearable, onClear, style, disabled, value, className, ...props }, ref) => {
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${error ? '#c42b1c' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color var(--duration-fast) var(--ease-fluent)',
            overflow: 'hidden'
          }}
        >
          {icon && (
            <span
              style={{
                paddingLeft: '10px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-tertiary)'
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            value={value}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
              fontFamily: 'var(--font-family-base)',
              fontSize: 'var(--font-size-sm)',
              width: '100%',
              ...style
            }}
            className={className}
            {...props}
          />
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '4px 8px',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              ✕
            </button>
          )}
        </div>
        {error && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: '#c42b1c', marginTop: '2px' }}>
            {error}
          </span>
        )}
      </div>
    )
  }
)

TextField.displayName = 'TextField'
