import React from 'react'

export interface InfoBarProps {
  severity?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  action?: React.ReactNode
  onClose?: () => void
  style?: React.CSSProperties
  className?: string
}

export const InfoBar: React.FC<InfoBarProps> = ({
  severity = 'info',
  title,
  message,
  action,
  onClose,
  style,
  className
}) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          icon: '✓',
          color: '#059669'
        }
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: '⚠',
          color: '#d97706'
        }
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
          icon: '✕',
          color: '#dc2626'
        }
      case 'info':
      default:
        return {
          bg: 'var(--accent-subtle)',
          border: 'var(--accent-border)',
          icon: 'ℹ',
          color: 'var(--accent-color)'
        }
    }
  }

  const { bg, border, icon, color } = getSeverityStyles()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-primary)',
        ...style
      }}
      className={className}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: color,
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 'bold',
          flexShrink: 0
        }}
      >
        {icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <span style={{ fontWeight: 'var(--font-weight-semibold)', marginRight: '6px' }}>{title}</span>}
        <span>{message}</span>
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px 6px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
