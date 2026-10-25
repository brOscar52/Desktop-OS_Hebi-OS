import { useState, useEffect } from 'react'
import { useSetting } from '@os/sdk'

export default function SystemStatusWidget(): JSX.Element {
  const connectedSsid = useSetting('network.connectedSsid')
  const wifiEnabled = useSetting('network.wifiEnabled')

  const [batteryLevel, setBatteryLevel] = useState<number>(100)
  const [charging, setCharging] = useState<boolean>(true)

  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number
        charging: boolean
      }>
    }

    if (nav.getBattery) {
      nav.getBattery().then((batt) => {
        setBatteryLevel(Math.round(batt.level * 100))
        setCharging(batt.charging)
      }).catch(() => {})
    }
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '12px',
        boxSizing: 'border-box',
        gap: '10px',
        color: 'var(--text-primary)',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-secondary)'
        }}
      >
        Estado del sistema
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
        {/* Battery */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{charging ? '⚡' : '🔋'}</span>
            <span>Batería</span>
          </div>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--accent-color)' }}>
            {batteryLevel}%
          </span>
        </div>

        {/* Network */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📶</span>
            <span>Red</span>
          </div>
          <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
            {wifiEnabled && connectedSsid ? connectedSsid : 'Desconectado'}
          </span>
        </div>

        {/* Disk Storage (simulated ~48GB used of 256GB) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Disco local (C:)</span>
            <span>48,2 GB de 256 GB</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: '19%',
                height: '100%',
                backgroundColor: 'var(--accent-color)',
                borderRadius: 'var(--radius-full)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
