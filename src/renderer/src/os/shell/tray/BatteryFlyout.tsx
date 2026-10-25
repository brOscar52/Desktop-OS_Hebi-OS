import React, { useState, useEffect } from 'react'

export interface BatteryFlyoutProps {
  isOpen: boolean
  onClose: () => void
}

interface BatteryState {
  level: number
  charging: boolean
}

export const BatteryFlyout: React.FC<BatteryFlyoutProps> = ({ isOpen }) => {
  const [battery, setBattery] = useState<BatteryState>({ level: 100, charging: true })

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    // Check navigator.getBattery
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number
        charging: boolean
        addEventListener: (event: string, handler: () => void) => void
        removeEventListener: (event: string, handler: () => void) => void
      }>
    }

    if (nav.getBattery) {
      nav.getBattery().then((batt) => {
        if (!isMounted) return
        setBattery({
          level: Math.round(batt.level * 100),
          charging: batt.charging
        })

        const updateBattery = () => {
          if (!isMounted) return
          setBattery({
            level: Math.round(batt.level * 100),
            charging: batt.charging
          })
        }

        batt.addEventListener('levelchange', updateBattery)
        batt.addEventListener('chargingchange', updateBattery)
      }).catch(() => {
        // Fallback default
        if (isMounted) setBattery({ level: 100, charging: true })
      })
    }

    return () => {
      isMounted = false
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '56px',
        right: '16px',
        width: '280px',
        backgroundColor: 'var(--material-acrylic)',
        backdropFilter: 'var(--backdrop-filter-acrylic)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-flyout)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 999900,
        fontFamily: 'var(--font-family-base)',
        color: 'var(--text-primary)',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
          Batería
        </h3>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)' }}>
          {battery.level}%
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>
          {battery.charging ? '⚡' : battery.level > 20 ? '🔋' : '🪫'}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
            {battery.charging ? 'Cargando' : 'En uso de batería'}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            {battery.charging ? 'Conectado a la corriente' : `${battery.level}% restante`}
          </span>
        </div>
      </div>
    </div>
  )
}
