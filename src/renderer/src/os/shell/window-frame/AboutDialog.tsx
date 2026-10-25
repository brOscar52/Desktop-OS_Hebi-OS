import React from 'react'
import { getApp } from '../../kernel/apps/registry'
import { AppIcon } from '../../ui/AppIcon'
import { Button } from '../../ui/Button'

export interface AboutDialogProps {
  appId: string
  onClose: () => void
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ appId, onClose }) => {
  const app = getApp(appId)
  if (!app) return null

  const { manifest, coverUrl } = app

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        userSelect: 'none'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '380px',
          maxWidth: '90%',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-window)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-family-base)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {coverUrl && (
          <div style={{ width: '100%', height: '120px', overflow: 'hidden', backgroundColor: 'var(--bg-subtle)' }}>
            <img
              src={coverUrl}
              alt="Cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <AppIcon appId={appId} size={56} style={{ marginBottom: '12px' }} />

          <h2 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
            {manifest.name}
          </h2>

          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-subtle)',
              color: 'var(--accent-color)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: '12px'
            }}
          >
            Versión {manifest.version}
          </span>

          <p style={{ margin: '0 0 16px 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            {manifest.description}
          </p>

          {manifest.author && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
              Desarrollado por {manifest.author}
            </span>
          )}

          <Button variant="primary" onClick={onClose} style={{ minWidth: '100px' }}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}
