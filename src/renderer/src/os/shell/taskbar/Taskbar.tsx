import React from 'react'
import { useWindowsStore } from '../../kernel/windows'
import { settings } from '../../kernel/settings'
import { TaskbarItem } from './TaskbarItem'
import { Tray } from '../tray/Tray'
import startLogo from '../../../system/boot/logo.svg'

export interface TaskbarProps {
  isStartOpen: boolean
  onToggleStart: () => void
}

export const Taskbar: React.FC<TaskbarProps> = ({ isStartOpen, onToggleStart }) => {
  const windows = useWindowsStore((s) => s.windows)
  const pinnedAppIds = settings.get('taskbar.pinned') || []
  const alignment = settings.get('taskbar.alignment') || 'center'

  // Open apps not in pinned list
  const runningAppIds = Array.from(new Set(windows.map((w) => w.appId)))
  const unpinnedRunningAppIds = runningAppIds.filter((id) => !pinnedAppIds.includes(id))

  // Complete list of taskbar apps to show
  const displayAppIds = [...pinnedAppIds, ...unpinnedRunningAppIds]

  const handleTogglePin = async (appId: string) => {
    let next: string[]
    if (pinnedAppIds.includes(appId)) {
      next = pinnedAppIds.filter((id) => id !== appId)
    } else {
      next = [...pinnedAppIds, appId]
    }
    await settings.set('taskbar.pinned', next)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--taskbar-height)',
        backgroundColor: 'var(--material-mica)',
        backdropFilter: 'var(--backdrop-filter-mica)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        zIndex: 900000,
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
    >
      {/* If alignment is center, we place a left spacer */}
      <div style={{ flex: alignment === 'center' ? '1 1 0%' : 'none', minWidth: '40px' }} />

      {/* Main Apps Bar (Start Button + Apps) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          justifyContent: alignment === 'center' ? 'center' : 'flex-start'
        }}
      >
        {/* Start Button with Custom OS Logo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleStart()
          }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: isStartOpen ? 'var(--bg-active)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color var(--duration-fast) var(--ease-fluent)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!isStartOpen) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            if (!isStartOpen) e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="Inicio"
        >
          <img
            src={startLogo}
            alt="Inicio"
            width={24}
            height={24}
            style={{ width: '24px', height: '24px', objectFit: 'contain', pointerEvents: 'none' }}
          />
        </button>

        {/* Taskbar Apps */}
        {displayAppIds.map((appId) => {
          const isPinned = pinnedAppIds.includes(appId)
          const appWins = windows.filter((w) => w.appId === appId)
          return (
            <TaskbarItem
              key={appId}
              appId={appId}
              isPinned={isPinned}
              appWindows={appWins}
              onTogglePin={handleTogglePin}
            />
          )
        })}
      </div>

      {/* System Tray on Right */}
      <div
        style={{
          flex: alignment === 'center' ? '1 1 0%' : 'none',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}
      >
        <Tray />
      </div>
    </div>
  )
}
