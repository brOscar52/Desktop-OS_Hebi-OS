import React, { useEffect, useState } from 'react'
import { useSession } from '../kernel/session'
import { BootScreen } from './boot/BootScreen'
import { SetupWizard } from './setup/SetupWizard'
import { LockAndLoginScreen } from './login/LockAndLoginScreen'
import { PowerScreen } from './power/PowerScreen'
import osConfig from '@system'
import { getAllApps, getAllWidgets, RegisteredApp } from '../kernel/apps/registry'
import logoSvg from '../../system/boot/logo.svg'
import avatarDefault from '../../system/icons/avatar-default.svg'

export const Shell: React.FC = () => {
  const { state, user, initSession, lock, logout, restart, shutdown } = useSession()
  const [selectedApp, setSelectedApp] = useState<RegisteredApp | null>(null)
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false)

  const apps = getAllApps()
  const widgets = getAllWidgets()

  useEffect(() => {
    initSession()
  }, [initSession])

  if (state === 'booting') {
    return <BootScreen />
  }

  if (state === 'setup') {
    return <SetupWizard />
  }

  if (state === 'locked' || state === 'login') {
    return <LockAndLoginScreen />
  }

  if (state === 'restarting') {
    return <PowerScreen mode="restarting" />
  }

  if (state === 'shutting_down') {
    return <PowerScreen mode="shutting_down" />
  }

  // State === 'authenticated': Show Phase 0 App Listing Screen with Session Controls
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-desktop)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Bar with Session and Power Controls */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 32px',
          backgroundColor: 'var(--material-mica)',
          backdropFilter: 'var(--backdrop-filter-mica)',
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={logoSvg} alt="Logo" style={{ width: '36px', height: '36px' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                {osConfig.name}
              </h1>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent-subtle)',
                  color: 'var(--accent-color)',
                  fontWeight: 'var(--font-weight-semibold)'
                }}
              >
                v{osConfig.version}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Fase 1 — Núcleo y sesión activa
            </p>
          </div>
        </div>

        {/* User Account & Power Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          {/* User Button */}
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img src={avatarDefault} alt="Avatar" style={{ width: '22px', height: '22px' }} />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
              {user?.name || 'Usuario'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>▼</span>
          </div>

          {/* User Session Flyout */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                backgroundColor: 'var(--material-acrylic)',
                backdropFilter: 'var(--backdrop-filter-acrylic)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-flyout)',
                minWidth: '200px',
                zIndex: 100,
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  lock()
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>🔒</span> Bloquear
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  logout()
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>🚪</span> Cerrar sesión
              </button>
              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  restart()
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>🔄</span> Reiniciar
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  shutdown()
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>⏻</span> Apagar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '32px', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Apps Section */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
              Aplicaciones Registradas ({apps.length})
            </h2>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Sesión activa de <strong>{user?.name}</strong>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}
          >
            {apps.map((app) => (
              <div
                key={app.id}
                onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: selectedApp?.id === app.id ? '2px solid var(--accent-color)' : '1px solid var(--border-subtle)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'transform var(--duration-fast) var(--ease-fluent), box-shadow var(--duration-fast) var(--ease-fluent)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {app.iconUrl && (
                    <img
                      src={app.iconUrl}
                      alt={app.manifest.name}
                      style={{ width: '40px', height: '40px', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 'var(--font-weight-semibold)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {app.manifest.name}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                      id: <code>{app.id}</code>
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    lineHeight: 'var(--line-height-normal)',
                    minHeight: '40px'
                  }}
                >
                  {app.manifest.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
                  <span
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {app.manifest.category}
                  </span>
                  {app.manifest.permissions.length > 0 && (
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444'
                      }}
                    >
                      {app.manifest.permissions.length} perm
                    </span>
                  )}
                  {app.manifest.window.singleInstance && (
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(2, 132, 199, 0.1)',
                        color: '#0284C7'
                      }}
                    >
                      single-instance
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Selected App Preview (EmptyState test) */}
        {selectedApp && (
          <section
            style={{
              marginBottom: '40px',
              padding: '24px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                Vista previa de app: {selectedApp.manifest.name}
              </h3>
              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                Cerrar vista previa
              </button>
            </div>
            <div
              style={{
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)'
              }}
            >
              <React.Suspense fallback={<div style={{ padding: '24px', textAlign: 'center' }}>Cargando...</div>}>
                <selectedApp.component />
              </React.Suspense>
            </div>
          </section>
        )}

        {/* Widgets Section */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
              Widgets Registrados ({widgets.length})
            </h2>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Componentes para el escritorio
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px'
            }}
          >
            {widgets.map((widget) => (
              <div
                key={widget.id}
                style={{
                  backgroundColor: 'var(--material-acrylic)',
                  backdropFilter: 'var(--backdrop-filter-acrylic)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {widget.iconUrl ? (
                  <img src={widget.iconUrl} alt={widget.manifest.name} style={{ width: '36px', height: '36px' }} />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)'
                    }}
                  />
                )}
                <div>
                  <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {widget.manifest.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {widget.manifest.description}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                    Tamaños: {widget.manifest.sizes.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
