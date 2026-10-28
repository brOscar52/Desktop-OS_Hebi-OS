import React from 'react'

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Sin contenido',
  description = 'No hay elementos disponibles para mostrar.',
  icon,
  action
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        height: '100%',
        minHeight: '200px',
        color: 'var(--text-secondary)'
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: '16px',
            fontSize: '48px',
            color: 'var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-primary)'
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: 'var(--font-size-base)',
          maxWidth: '380px',
          lineHeight: 'var(--line-height-normal)'
        }}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}
