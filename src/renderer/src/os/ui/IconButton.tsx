import React from 'react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  size?: 'small' | 'medium' | 'large'
  variant?: 'subtle' | 'standard' | 'primary' | 'destructive'
  active?: boolean
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'medium',
  variant = 'subtle',
  active = false,
  style,
  disabled,
  className,
  ...props
}) => {
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: '26px', height: '26px', fontSize: '14px' }
      case 'large':
        return { width: '36px', height: '36px', fontSize: '20px' }
      case 'medium':
      default:
        return { width: '30px', height: '30px', fontSize: '16px' }
    }
  }

  const { width, height, fontSize } = getDimensions()

  const getVariantStyles = (): React.CSSProperties => {
    if (disabled) {
      return {
        backgroundColor: 'transparent',
        color: 'var(--text-disabled)',
        border: 'none',
        cursor: 'not-allowed'
      }
    }

    if (active) {
      return {
        backgroundColor: 'var(--accent-subtle)',
        color: 'var(--accent-color)',
        border: '1px solid var(--accent-border)'
      }
    }

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--accent-color)',
          color: 'var(--accent-text)',
          border: '1px solid transparent'
        }
      case 'destructive':
        return {
          backgroundColor: 'transparent',
          color: '#c42b1c',
          border: 'none'
        }
      case 'standard':
        return {
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }
      case 'subtle':
      default:
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: 'none'
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
        width,
        height,
        minWidth: width,
        minHeight: height,
        padding: 0,
        fontSize,
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
      {icon}
    </button>
  )
}
