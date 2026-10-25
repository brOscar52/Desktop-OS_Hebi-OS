import React, { useState, useEffect } from 'react'
import { sound } from '../../kernel/sound'
import { Slider } from '../../ui/Slider'
import { IconButton } from '../../ui/IconButton'

export interface VolumeFlyoutProps {
  isOpen: boolean
  onClose: () => void
}

export const VolumeFlyout: React.FC<VolumeFlyoutProps> = ({ isOpen }) => {
  const [vol, setVol] = useState<number>(sound.getVolume())
  const [muted, setMuted] = useState<boolean>(sound.isMuted())

  useEffect(() => {
    if (!isOpen) return
    setVol(sound.getVolume())
    setMuted(sound.isMuted())
  }, [isOpen])

  if (!isOpen) return null

  const handleVolumeChange = async (newVal: number) => {
    setVol(newVal)
    if (muted && newVal > 0) {
      setMuted(false)
      await sound.setMuted(false)
    }
    await sound.setVolume(newVal)
  }

  const handleToggleMute = async () => {
    const nextMuted = !muted
    setMuted(nextMuted)
    await sound.setMuted(nextMuted)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '56px',
        right: '16px',
        width: '300px',
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
          Sonido
        </h3>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          {muted ? 'Silenciado' : `${vol}%`}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <IconButton
          icon={<span style={{ fontSize: '16px' }}>{muted || vol === 0 ? '🔇' : vol < 40 ? '🔉' : '🔊'}</span>}
          onClick={handleToggleMute}
          title={muted ? 'Activar sonido' : 'Silenciar'}
          variant="subtle"
        />

        <div style={{ flex: 1 }}>
          <Slider
            min={0}
            max={100}
            value={muted ? 0 : vol}
            onChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  )
}
