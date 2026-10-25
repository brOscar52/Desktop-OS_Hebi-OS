import React, { useState, useRef, Suspense } from 'react'
import { WindowState } from '../../kernel/windows/types'
import { windowManager } from '../../kernel/windows'
import { getApp } from '../../kernel/apps/registry'
import { TitleBar } from './TitleBar'
import { AppMenuBar } from './AppMenuBar'
import { AboutDialog } from './AboutDialog'
import { WindowModalHost } from './WindowModalHost'
import { DotLoader } from '../common/DotLoader'
import { WindowContext } from '../../sdk/context'

export interface WindowFrameProps {
  window: WindowState
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ window: win }) => {
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false)
  const app = getApp(win.appId)
  const frameRef = useRef<HTMLDivElement>(null)

  // Dragging logic
  const handleStartDrag = (e: React.PointerEvent) => {
    if (win.state === 'maximized') return

    const startX = e.clientX
    const startY = e.clientY
    const origX = win.x
    const origY = win.y

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      const taskbarHeight = 48
      const maxUsableY = window.innerHeight - taskbarHeight - 32
      const newX = Math.max(-win.width + 100, Math.min(window.innerWidth - 100, origX + deltaX))
      const newY = Math.max(0, Math.min(maxUsableY, origY + deltaY))

      windowManager.updateBounds(win.id, { x: newX, y: newY })
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  // Resizing logic
  const handleStartResize = (direction: string, e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    windowManager.focus(win.id)

    const startX = e.clientX
    const startY = e.clientY
    const origX = win.x
    const origY = win.y
    const origW = win.width
    const origH = win.height

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      let nextX = origX
      let nextY = origY
      let nextW = origW
      let nextH = origH

      if (direction.includes('e')) {
        nextW = Math.max(win.minWidth, origW + deltaX)
      }
      if (direction.includes('s')) {
        nextH = Math.max(win.minHeight, origH + deltaY)
      }
      if (direction.includes('w')) {
        const potentialW = origW - deltaX
        if (potentialW >= win.minWidth) {
          nextW = potentialW
          nextX = origX + deltaX
        }
      }
      if (direction.includes('n')) {
        const potentialH = origH - deltaY
        if (potentialH >= win.minHeight) {
          nextH = potentialH
          nextY = origY + deltaY
        }
      }

      windowManager.updateBounds(win.id, {
        x: nextX,
        y: nextY,
        width: nextW,
        height: nextH
      })
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  if (win.state === 'minimized') {
    return null
  }

  const isMaximized = win.state === 'maximized'
  const AppComponent = app?.component

  const frameStyles: React.CSSProperties = isMaximized
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: 'calc(100vh - var(--taskbar-height))',
        zIndex: win.zIndex,
        borderRadius: 0,
        boxShadow: 'none',
        border: 'none',
        backgroundColor: 'var(--material-mica)',
        backdropFilter: 'var(--backdrop-filter-mica)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }
    : {
        position: 'fixed',
        left: `${win.x}px`,
        top: `${win.y}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
        borderRadius: 'var(--radius-lg)',
        boxShadow: win.focused ? 'var(--shadow-window)' : 'var(--shadow-md)',
        border: `1px solid ${win.focused ? 'var(--border-window)' : 'var(--border-subtle)'}`,
        backgroundColor: 'var(--material-mica)',
        backdropFilter: 'var(--backdrop-filter-mica)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'box-shadow var(--duration-fast) var(--ease-fluent)'
      }

  const resizeHandleSize = 6

  return (
    <div
      ref={frameRef}
      style={frameStyles}
      onPointerDown={() => {
        if (!win.focused) windowManager.focus(win.id)
      }}
      data-app-id={win.appId}
    >
      {/* TitleBar */}
      <TitleBar
        window={win}
        onStartDrag={handleStartDrag}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* In-window Menubar if app defined menus */}
      {win.appMenus && win.appMenus.length > 0 && (
        <AppMenuBar
          appId={win.appId}
          menus={win.appMenus}
          onOpenAbout={() => setIsAboutOpen(true)}
        />
      )}

      {/* Main App Content Area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          backgroundColor: 'var(--bg-window)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {AppComponent ? (
          <WindowContext.Provider
            value={{
              windowId: win.id,
              appId: win.appId,
              instanceId: win.instanceId,
              launchArgs: win.launchArgs
            }}
          >
            <Suspense
              fallback={
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--bg-window)'
                  }}
                >
                  <DotLoader size={6} color="var(--accent-color)" />
                </div>
              }
            >
              <AppComponent />
            </Suspense>
          </WindowContext.Provider>
        ) : (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
            App no disponible
          </div>
        )}

        {/* Modal Host (Centered over and blocking this window only) */}
        <WindowModalHost windowId={win.id} />

        {/* About Dialog */}
        {isAboutOpen && (
          <AboutDialog appId={win.appId} onClose={() => setIsAboutOpen(false)} />
        )}
      </div>

      {/* 8 Resize Handles (only when resizable and normal) */}
      {!isMaximized && win.resizable && (
        <>
          <div
            onPointerDown={(e) => handleStartResize('n', e)}
            style={{ position: 'absolute', top: 0, left: 8, right: 8, height: resizeHandleSize, cursor: 'ns-resize' }}
          />
          <div
            onPointerDown={(e) => handleStartResize('s', e)}
            style={{ position: 'absolute', bottom: 0, left: 8, right: 8, height: resizeHandleSize, cursor: 'ns-resize' }}
          />
          <div
            onPointerDown={(e) => handleStartResize('w', e)}
            style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: resizeHandleSize, cursor: 'ew-resize' }}
          />
          <div
            onPointerDown={(e) => handleStartResize('e', e)}
            style={{ position: 'absolute', right: 0, top: 8, bottom: 8, width: resizeHandleSize, cursor: 'ew-resize' }}
          />
          <div
            onPointerDown={(e) => handleStartResize('nw', e)}
            style={{ position: 'absolute', left: 0, top: 0, width: 10, height: 10, cursor: 'nwse-resize' }}
          />
          <div
            onPointerDown={(e) => handleStartResize('ne', e)}
            style={{ position: 'absolute', right: 0, top: 0, width: 10, height: 10, cursor: 'nesw-resize' }}
          />
          <div
            onPointerDown={(e) => handleStartResize('sw', e)}
            style={{ position: 'absolute', left: 0, bottom: 0, width: 10, height: 10, cursor: 'nesw-resize' }}
          />
          <div
            onPointerDown={(e) => handleStartResize('se', e)}
            style={{ position: 'absolute', right: 0, bottom: 0, width: 10, height: 10, cursor: 'nwse-resize' }}
          />
        </>
      )}
    </div>
  )
}
