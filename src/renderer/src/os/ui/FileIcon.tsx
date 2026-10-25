import React from 'react'
import folderSvg from '../../system/icons/folder.svg'
import folderSystemSvg from '../../system/icons/folder-system.svg'
import fileGenericSvg from '../../system/icons/file-generic.svg'
import fileTextSvg from '../../system/icons/file-text.svg'
import fileImageSvg from '../../system/icons/file-image.svg'
import fileAudioSvg from '../../system/icons/file-audio.svg'
import fileVideoSvg from '../../system/icons/file-video.svg'
import driveSvg from '../../system/icons/drive.svg'
import recycleEmptySvg from '../../system/icons/recycle-bin-empty.svg'
import recycleFullSvg from '../../system/icons/recycle-bin-full.svg'

export interface FileIconProps {
  type: 'folder' | 'file' | 'system'
  mime?: string
  extension?: string
  systemKind?: 'drive' | 'system-folder' | 'recycle-bin-empty' | 'recycle-bin-full'
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const FileIcon: React.FC<FileIconProps> = ({
  type,
  mime,
  extension,
  systemKind,
  size = 32,
  className,
  style
}) => {
  let iconSrc = fileGenericSvg

  if (type === 'system') {
    switch (systemKind) {
      case 'drive':
        iconSrc = driveSvg
        break
      case 'system-folder':
        iconSrc = folderSystemSvg
        break
      case 'recycle-bin-full':
        iconSrc = recycleFullSvg
        break
      case 'recycle-bin-empty':
      default:
        iconSrc = recycleEmptySvg
        break
    }
  } else if (type === 'folder') {
    iconSrc = folderSvg
  } else {
    // Determine by mime or extension
    const ext = extension?.toLowerCase() || ''
    const m = mime?.toLowerCase() || ''

    if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp'].includes(ext)) {
      iconSrc = fileImageSvg
    } else if (m.startsWith('audio/') || ['mp3', 'ogg', 'wav', 'aac', 'flac', 'm4a'].includes(ext)) {
      iconSrc = fileAudioSvg
    } else if (m.startsWith('video/') || ['mp4', 'webm', 'mkv', 'avi', 'mov'].includes(ext)) {
      iconSrc = fileVideoSvg
    } else if (
      m.startsWith('text/') ||
      m.includes('json') ||
      m.includes('xml') ||
      ['txt', 'md', 'json', 'log', 'csv', 'ts', 'js', 'html', 'css'].includes(ext)
    ) {
      iconSrc = fileTextSvg
    }
  }

  return (
    <img
      src={iconSrc}
      alt={type}
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
