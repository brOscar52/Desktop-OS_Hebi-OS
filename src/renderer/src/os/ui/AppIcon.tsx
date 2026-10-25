import React from 'react'
import { getApp } from '../kernel/apps/registry'
import defaultAppIcon from '../../system/icons/start.svg'

export interface AppIconProps {
  appId: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const AppIcon: React.FC<AppIconProps> = ({
  appId,
  size = 32,
  className,
  style
}) => {
  const app = getApp(appId)
  const iconUrl = app?.iconUrl || defaultAppIcon

  return (
    <img
      src={iconUrl}
      alt={app?.manifest.name || appId}
      width={size}
      height={size}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        flexShrink: 0,
        userSelect: 'none',
        pointerEvents: 'none',
        ...style
      }}
      className={className}
      draggable={false}
    />
  )
}
