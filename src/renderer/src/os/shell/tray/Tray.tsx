import React, { useState, useEffect } from 'react'
import { media } from '../../kernel/media'
import { sound } from '../../kernel/sound'
import { network } from '../../kernel/network'
import { settings } from '../../kernel/settings'
import { windowManager } from '../../kernel/windows'
import { WifiFlyout } from './WifiFlyout'
import { VolumeFlyout } from './VolumeFlyout'
import { BatteryFlyout } from './BatteryFlyout'
import { CalendarFlyout } from './CalendarFlyout'

export const Tray: React.FC = () => {
  const [activeFlyout, setActiveFlyout] = useState<'wifi' | 'volume' | 'battery' | 'calendar' | null>(null)
  const [now, setNow] = useState<Date>(new Date())

  // Media streams active state
  const [hasCamera, setHasCamera] = useState<boolean>(media.hasActiveCamera())
  const [hasMic, setHasMic] = useState<boolean>(media.hasActiveMicrophone())

  // Network state
  const [isConnected, setIsConnected] = useState<boolean>(network.isConnected())
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(network.isEnabled())

  // Sound state
  const [volume, setVolume] = useState<number>(sound.getVolume())
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted())

  // Clock format
  const hour24 = settings.get('datetime.hour24')

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Listen to network, sound, and media changes
  useEffect(() => {
    const unsubs = [
      settings.subscribe('network.connectedSsid', (ssid) => {
        setIsConnected(ssid !== null)
      }),
      settings.subscribe('network.wifiEnabled', (enabled) => {
        setWifiEnabled(enabled)
      }),
      settings.subscribe('sound.volume', (vol) => {
        setVolume(vol)
      }),
      settings.subscribe('sound.muted', (muted) => {
        setIsMuted(muted)
      })
    ]

    const checkMedia = setInterval(() => {
      setHasCamera(media.hasActiveCamera())
      setHasMic(media.hasActiveMicrophone())
    }, 1000)

    return () => {
      unsubs.forEach((u) => u())
      clearInterval(checkMedia)
    }
  }, [])

  // Outside click to close flyouts
  useEffect(() => {
    if (!activeFlyout) return
    const handleClickOutside = () => setActiveFlyout(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [activeFlyout])

  const toggleFlyout = (flyout: 'wifi' | 'volume' | 'battery' | 'calendar') => {
    setActiveFlyout(activeFlyout === flyout ? null : flyout)
  }

  // Format time & date
  const formatTime = (date: Date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')

    if (hour24) {
      return `${hours.toString().padStart(2, '0')}:${minutes}`
    }
    const h12 = hours % 12 || 12
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.'
    return `${h12}:${minutes} ${ampm}`
  }

  const formatDate = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0')
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const y = date.getFullYear()
    return `${d}/${m}/${y}`
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        userSelect: 'none',
        fontSize: 'var(--font-size-xs)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Active Hardware Indicators (Camera / Microphone) */}
      {(hasCamera || hasMic) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 6px' }}>
          {hasCamera && <span title="La cámara está en uso" style={{ fontSize: '14px' }}>📷</span>}
          {hasMic && <span title="El micrófono está en uso" style={{ fontSize: '14px' }}>🎙️</span>}
        </div>
      )}

      {/* Network, Volume, Battery Cluster Button */}
      <div
        onClick={() => toggleFlyout(activeFlyout === 'wifi' ? 'volume' : 'wifi')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'background-color var(--duration-fast) var(--ease-fluent)',
          backgroundColor: activeFlyout === 'wifi' || activeFlyout === 'volume' || activeFlyout === 'battery' ? 'var(--bg-active)' : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!activeFlyout) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
        }}
        onMouseLeave={(e) => {
          if (!activeFlyout) e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {/* Wifi Icon */}
        <span
          title={wifiEnabled ? (isConnected ? 'Conectado a Internet' : 'No conectado') : 'Wi-Fi desactivado'}
          style={{ fontSize: '14px' }}
        >
          {wifiEnabled ? (isConnected ? '📶' : '🌐') : '🚫'}
        </span>

        {/* Volume Icon */}
        <span
          title={isMuted ? 'Silenciado' : `Volumen: ${volume}%`}
          style={{ fontSize: '14px' }}
        >
          {isMuted || volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
        </span>

        {/* Battery Icon */}
        <span title="Batería" style={{ fontSize: '14px' }}>
          🔋
        </span>
      </div>

      {/* Clock & Date Button */}
      <div
        onClick={() => toggleFlyout('calendar')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '4px 8px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          lineHeight: '1.2',
          transition: 'background-color var(--duration-fast) var(--ease-fluent)',
          backgroundColor: activeFlyout === 'calendar' ? 'var(--bg-active)' : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (activeFlyout !== 'calendar') e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
        }}
        onMouseLeave={(e) => {
          if (activeFlyout !== 'calendar') e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>
          {formatTime(now)}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          {formatDate(now)}
        </span>
      </div>

      {/* "Mostrar escritorio" thin edge bar on far right */}
      <div
        onClick={() => windowManager.minimizeAll()}
        style={{
          width: '8px',
          height: '100%',
          borderLeft: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'background-color var(--duration-fast) var(--ease-fluent)'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        title="Mostrar escritorio"
      />

      {/* Flyouts */}
      <WifiFlyout isOpen={activeFlyout === 'wifi'} onClose={() => setActiveFlyout(null)} />
      <VolumeFlyout isOpen={activeFlyout === 'volume'} onClose={() => setActiveFlyout(null)} />
      <BatteryFlyout isOpen={activeFlyout === 'battery'} onClose={() => setActiveFlyout(null)} />
      <CalendarFlyout isOpen={activeFlyout === 'calendar'} onClose={() => setActiveFlyout(null)} />
    </div>
  )
}
