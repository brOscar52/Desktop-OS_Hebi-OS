import React, { useEffect, useState } from 'react'
import { useSession } from '../kernel/session'
import { useWindowsStore } from '../kernel/windows'
import { BootScreen } from './boot/BootScreen'
import { SetupWizard } from './setup/SetupWizard'
import { LockAndLoginScreen } from './login/LockAndLoginScreen'
import { PowerScreen } from './power/PowerScreen'
import { Desktop } from './desktop/Desktop'
import { WindowFrame } from './window-frame/WindowFrame'
import { Taskbar } from './taskbar/Taskbar'
import { StartMenu } from './start-menu/StartMenu'
import { ToastHost } from './toasts/ToastHost'
import { SystemDialogHost } from './dialogs/SystemDialogHost'

export const Shell: React.FC = () => {
  const { state, initSession } = useSession()
  const windows = useWindowsStore((s) => s.windows)
  const [isStartOpen, setIsStartOpen] = useState<boolean>(false)

  useEffect(() => {
    initSession()
  }, [initSession])

  if (state === 'booting') {
    return <BootScreen />
  }

  if (state === 'setup') {
    return <SetupWizard />
  }

  if (state === 'locked' || state === 'login') {
    return <LockAndLoginScreen />
  }

  if (state === 'restarting') {
    return <PowerScreen mode="restarting" />
  }

  if (state === 'shutting_down') {
    return <PowerScreen mode="shutting_down" />
  }

  // State === 'authenticated': Complete interactive Desktop shell
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'var(--bg-desktop)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)'
      }}
      onClick={() => {
        if (isStartOpen) setIsStartOpen(false)
      }}
    >
      {/* 1. Desktop Background, Icons, and Widgets */}
      <Desktop />

      {/* 2. Interactive Windows */}
      {windows.map((win) => (
        <WindowFrame key={win.id} window={win} />
      ))}

      {/* 3. Taskbar */}
      <Taskbar
        isStartOpen={isStartOpen}
        onToggleStart={() => setIsStartOpen((prev) => !prev)}
      />

      {/* 4. Start Menu */}
      <StartMenu
        isOpen={isStartOpen}
        onClose={() => setIsStartOpen(false)}
      />

      {/* 5. Toast Notifications in bottom right */}
      <ToastHost />

      {/* 6. System-wide Dialogs (Modals) */}
      <SystemDialogHost />
    </div>
  )
}
