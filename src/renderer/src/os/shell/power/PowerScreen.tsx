import React from 'react'
import { DotLoader } from '../common/DotLoader'

export interface PowerScreenProps {
  mode: 'restarting' | 'shutting_down'
}

export const PowerScreen: React.FC<PowerScreenProps> = ({ mode }) => {
  const text = mode === 'restarting' ? 'Reiniciando...' : 'Apagando el equipo...'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        color: '#FFFFFF',
        zIndex: 9999,
        userSelect: 'none'
      }}
    >
      <DotLoader size={48} color="#2DD4BF" />
      <div style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '0.5px' }}>
        {text}
      </div>
    </div>
  )
}
