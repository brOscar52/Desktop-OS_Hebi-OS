import React, { useState, useEffect, useRef } from 'react'
import auroraWallpaper from '../../../system/wallpapers/aurora.svg'
import avatarDefault from '../../../system/icons/avatar-default.svg'
import { useSession } from '../../kernel/session'
import { settings } from '../../kernel/settings'

export const LockAndLoginScreen: React.FC = () => {
  const { user, unlockWithPassword, restart, shutdown, state, showLogin, showLock, error, clearError } = useSession()

  const [password, setPassword] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')
  const [showPowerMenu, setShowPowerMenu] = useState<boolean>(false)
  const [batteryLevel, setBatteryLevel] = useState<number>(100)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  const isLoginView = state === 'login'

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hour24 = settings.get('datetime.hour24') ?? false

      const timeStr = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !hour24
      })

      const dateStr = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      setCurrentTime(timeStr)
      setCurrentDate(dateStr.charAt(0).toUpperCase() + dateStr.slice(1))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Battery detection if available
  useEffect(() => {
    if ('getBattery' in navigator) {
      // @ts-expect-error navigator.getBattery is experimental
      navigator.getBattery?.().then((battery: { level: number; addEventListener: (t: string, cb: () => void) => void }) => {
        setBatteryLevel(Math.round(battery.level * 100))
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100))
        })
      }).catch(() => {})
    }
  }, [])

  // Global keydown on Lock Screen to slide up to login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLoginView && state === 'locked') {
        showLogin()
      } else if (isLoginView && e.key === 'Escape' && !error) {
        showLock()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLoginView, state, error, showLogin, showLock])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!password || isVerifying) return

    setIsVerifying(true)
    const success = await unlockWithPassword(password)
    setIsVerifying(false)

    if (success) {
      setPassword('')
    }
  }

  const passwordInputRef = useRef<HTMLInputElement>(null)

  // Focus password input when transitioning to login view
  useEffect(() => {
    if (isLoginView) {
      setTimeout(() => passwordInputRef.current?.focus(), 50)
    }
  }, [isLoginView])

  return (
    <div
      onClick={() => {
        if (!isLoginView && state === 'locked') {
          showLogin()
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `url(${auroraWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* 1. LOCK COVER CURTAIN (Opaque, covers 100%, slides up on click/key) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${auroraWallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '48px 36px',
          color: '#FFFFFF',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
          transform: isLoginView ? 'translateY(-100%)' : 'translateY(0)',
          opacity: isLoginView ? 0 : 1,
          pointerEvents: isLoginView ? 'none' : 'auto',
          transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 550ms ease',
          cursor: isLoginView ? 'default' : 'pointer',
          zIndex: 20
        }}
      >
        {/* Top: Large Clock and Date */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '48px' }}>
          <div style={{ fontSize: '84px', fontWeight: 600, letterSpacing: '-2px' }}>
            {currentTime}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 400, marginTop: '8px', opacity: 0.9 }}>
            {currentDate}
          </div>
        </div>

        {/* Bottom Right: Status Icons (hidden completely when curtain slides up) */}
        <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* WiFi icon */}
          <div title="Conectado a WiFi" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4ZM2.92 9.07C5.51 6.57 9.13 5 12 5C14.87 5 18.49 6.57 21.08 9.07L12 18.25 2.92 9.07Z"/>
            </svg>
          </div>
          {/* Battery */}
          <div title={`Batería: ${batteryLevel}%`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span>{batteryLevel}%</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 5V4C17 2.9 16.1 2 15 2H9C7.9 2 7 2.9 7 4V5H4C2.9 5 2 5.9 2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7C22 5.9 21.1 5 20 5H17ZM9 4H15V5H9V4ZM20 19H4V7H20V19Z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* 2. LOGIN SCREEN (Revealed beneath Lock Screen curtain only when unlocked) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: isLoginView ? 'rgba(15, 23, 42, 0.45)' : 'transparent',
          backdropFilter: isLoginView ? 'blur(24px)' : 'blur(0px)',
          WebkitBackdropFilter: isLoginView ? 'blur(24px)' : 'blur(0px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: isLoginView ? 'auto' : 'none',
          transition: 'backdrop-filter 500ms ease 100ms, -webkit-backdrop-filter 500ms ease 100ms, background-color 500ms ease 100ms',
          zIndex: 5
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            width: '100%',
            maxWidth: '340px',
            opacity: isLoginView ? 1 : 0,
            transform: isLoginView ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 450ms ease 100ms, transform 450ms cubic-bezier(0.22, 1, 0.36, 1) 100ms'
          }}
        >
          {/* User Avatar */}
          <div
            style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              backgroundColor: '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              border: '3px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <img src={avatarDefault} alt="Avatar" style={{ width: '96px', height: '96px' }} />
          </div>

          {/* User Name */}
          <h2
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
            }}
          >
            {user?.name || 'Usuario'}
          </h2>

          {/* Password Input Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              marginTop: '8px'
            }}
          >
            <input
              ref={passwordInputRef}
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 48px 12px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(30, 41, 59, 0.75)',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
              }}
            />
            <button
              type="submit"
              title="Iniciar sesión"
              disabled={isVerifying || !password}
              style={{
                position: 'absolute',
                right: '6px',
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: password ? '#0D9488' : 'transparent',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: password ? 'pointer' : 'default',
                transition: 'background-color 0.15s ease'
              }}
            >
              ➔
            </button>
          </form>
        </div>

        {/* Bottom Right: Power Button and Flyout */}
        <div style={{ position: 'absolute', right: '36px', bottom: '36px' }}>
          {showPowerMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '52px',
                right: 0,
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                minWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                padding: '4px 0'
              }}
            >
              <button
                onClick={() => {
                  setShowPowerMenu(false)
                  restart()
                }}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span>🔄</span> Reiniciar
              </button>
              <button
                onClick={() => {
                  setShowPowerMenu(false)
                  shutdown()
                }}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span>⏻</span> Apagar
              </button>
            </div>
          )}

          <button
            onClick={() => setShowPowerMenu(!showPowerMenu)}
            title="Opciones de energía"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'background-color 0.15s ease'
            }}
          >
            ⏻
          </button>
        </div>
      </div>

      {/* Invalid Password Dialog */}
      {error && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#1E293B',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ fontSize: '15px', lineHeight: 1.5 }}>
              {error}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                autoFocus
                onClick={() => clearError()}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#0D9488',
                  color: '#FFFFFF',
                  borderRadius: '4px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
