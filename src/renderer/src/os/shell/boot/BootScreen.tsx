import React from 'react'
import logoSvg from '../../../system/boot/logo.svg'
import osConfig from '../../../system/os.config.json'
import { DotLoader } from '../common/DotLoader'

export const BootScreen: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        userSelect: 'none'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '48px'
        }}
      >
        <img
          src={logoSvg}
          alt={`${osConfig.name} Logo`}
          style={{
            width: '120px',
            height: '120px',
            filter: 'drop-shadow(0 0 24px rgba(13, 148, 136, 0.45))'
          }}
        />
        <DotLoader size={44} color="#2DD4BF" />
      </div>
    </div>
  )
}
