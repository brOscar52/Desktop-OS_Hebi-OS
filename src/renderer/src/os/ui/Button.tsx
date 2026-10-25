import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'destructive'
  size?: 'small' | 'medium' | 'large'
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'medium',
  icon,
  iconPosition = 'start',
  children,
  style,
  disabled,
  className,
  ...props
}) => {
  const getPadding = () => {
    switch (size) {
      case 'small':
        return '4px 10px'
      case 'large':
        return '8px 18px'
      case 'medium':
      default:
        return '6px 14px'
    }
  }

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 'var(--font-size-xs)'
      case 'large':
        return 'var(--font-size-base)'
      case 'medium':
      default:
        return 'var(--font-size-sm)'
    }
  }

  const getVariantStyles = (): React.CSSProperties => {
    if (disabled) {
      return {
        backgroundColor: 'var(--bg-subtle)',
        color: 'var(--text-disabled)',
        border: '1px solid var(--border-subtle)',
        cursor: 'not-allowed'
      }
    }

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--accent-color)',
          color: 'var(--accent-text)',
          border: '1px solid transparent',
          fontWeight: 'var(--font-weight-medium)'
        }
      case 'destructive':
        return {
          backgroundColor: '#c42b1c',
          color: '#ffffff',
          border: '1px solid transparent',
          fontWeight: 'var(--font-weight-medium)'
        }
      case 'subtle':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid transparent'
        }
      case 'secondary':
      default:
        return {
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-sm)'
        }
    }
  }

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: getPadding(),
        fontSize: getFontSize(),
        fontFamily: 'var(--font-family-base)',
        borderRadius: 'var(--radius-sm)',
        transition: 'all var(--duration-fast) var(--ease-fluent)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        outline: 'none',
        ...getVariantStyles(),
        ...style
      }}
      className={className}
      {...props}
    >
      {icon && iconPosition === 'start' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'end' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    </button>
  )
}
