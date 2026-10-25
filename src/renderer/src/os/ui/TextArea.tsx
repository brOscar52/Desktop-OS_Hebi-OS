import React, { forwardRef } from 'react'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, style, disabled, className, ...props }, ref) => {
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
        <textarea
          ref={ref}
          disabled={disabled}
          style={{
            padding: '8px 10px',
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${error ? '#c42b1c' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-sm)',
            outline: 'none',
            color: disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
            fontFamily: 'var(--font-family-base)',
            fontSize: 'var(--font-size-sm)',
            resize: 'vertical',
            minHeight: '80px',
            ...style
          }}
          className={className}
          {...props}
        />
        {error && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: '#c42b1c', marginTop: '2px' }}>
            {error}
          </span>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
