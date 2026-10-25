import React, { useState, useEffect } from 'react'
import { notifications, NotificationItem } from '../../kernel/notifications'
import { events } from '../../kernel/events'
import { windowManager } from '../../kernel/windows'
import { getApp } from '../../kernel/apps/registry'
import { AppIcon } from '../../ui/AppIcon'

export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<NotificationItem[]>([])

  useEffect(() => {
    const unsub = events.on('notification:posted', ({ id }) => {
      const item = notifications.get(id)
      if (item) {
        setToasts((prev) => [...prev, item])

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
          notifications.dismiss(id)
        }, 5000)
      }
    })

    return () => unsub()
  }, [])

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setToasts((prev) => prev.filter((t) => t.id !== id))
    notifications.dismiss(id)
  }

  const handleClick = (toast: NotificationItem) => {
    windowManager.open(toast.appId, toast.launchArgs)
    setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    notifications.dismiss(toast.id)
  }

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '60px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 999990,
        pointerEvents: 'none',
        maxWidth: '360px',
        width: '100%',
        userSelect: 'none'
      }}
    >
      {toasts.map((toast) => {
        const app = getApp(toast.appId)
        const appName = app?.manifest.name || toast.appId

        return (
          <div
            key={toast.id}
            onClick={() => handleClick(toast)}
            style={{
              pointerEvents: 'auto',
              backgroundColor: 'var(--material-acrylic)',
              backdropFilter: 'var(--backdrop-filter-acrylic)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-flyout)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all var(--duration-fast) var(--ease-fluent)',
              fontFamily: 'var(--font-family-base)'
            }}
          >
            {/* Header: Icon, App Name, Close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AppIcon appId={toast.appId} size={16} />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {appName}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleDismiss(toast.id, e)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Title & Body */}
            <div>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  marginBottom: '2px'
                }}
              >
                {toast.title}
              </div>
              {toast.body && (
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.3'
                  }}
                >
                  {toast.body}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
