import React, { useState, Suspense } from 'react'
import { settings, DesktopWidget } from '../../kernel/settings'
import { getWidget } from '../../kernel/apps/registry'
import { ContextMenu, ContextMenuEntry } from '../../ui/ContextMenu'
import { DotLoader } from '../common/DotLoader'

export const WidgetsHost: React.FC = () => {
  const [widgets, setWidgets] = useState<DesktopWidget[]>(settings.get('desktop.widgets') || [])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; widgetId: string; instanceId: string } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Dragging state
  const handleStartDrag = (instance: DesktopWidget, e: React.PointerEvent) => {
    // If clicking the "..." button, do not start drag
    if ((e.target as HTMLElement).closest('.widget-action-btn')) return

    const startX = e.clientX
    const startY = e.clientY
    const origX = instance.x
    const origY = instance.y

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      const newX = Math.max(10, Math.min(window.innerWidth - 180, origX + deltaX))
      const newY = Math.max(10, Math.min(window.innerHeight - 200, origY + deltaY))

      setWidgets((prev) =>
        prev.map((w) => (w.id === instance.id ? { ...w, x: newX, y: newY } : w))
      )
    }

    const onPointerUp = async (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)

      const deltaX = upEvent.clientX - startX
      const deltaY = upEvent.clientY - startY
      const finalX = Math.max(10, Math.min(window.innerWidth - 180, origX + deltaX))
      const finalY = Math.max(10, Math.min(window.innerHeight - 200, origY + deltaY))

      const current = settings.get('desktop.widgets') || []
      const next = current.map((w) => (w.id === instance.id ? { ...w, x: finalX, y: finalY } : w))
      await settings.set('desktop.widgets', next)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  const handleResize = async (instanceId: string, newSize: 'small' | 'medium' | 'large') => {
    const current = settings.get('desktop.widgets') || []
    const next = current.map((w) => (w.id === instanceId ? { ...w, size: newSize } : w))
    setWidgets(next)
    await settings.set('desktop.widgets', next)
  }

  const handleRemove = async (instanceId: string) => {
    const current = settings.get('desktop.widgets') || []
    const next = current.filter((w) => w.id !== instanceId)
    setWidgets(next)
    await settings.set('desktop.widgets', next)
  }

  const getDimensions = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'medium':
        return { width: '340px', height: '160px' }
      case 'large':
        return { width: '340px', height: '340px' }
      case 'small':
      default:
        return { width: '160px', height: '160px' }
    }
  }

  const getContextMenuEntries = (instance: DesktopWidget): ContextMenuEntry[] => {
    const reg = getWidget(instance.widgetId)
    const allowedSizes = reg?.manifest.sizes || ['small', 'medium', 'large']

    const sizeSubmenu: ContextMenuEntry[] = allowedSizes.map((s) => ({
      key: `size-${s}`,
      label: s === 'small' ? 'Pequeño (160x160)' : s === 'medium' ? 'Mediano (340x160)' : 'Grande (340x340)',
      disabled: instance.size === s,
      action: () => handleResize(instance.id, s)
    }))

    return [
      {
        key: 'resize',
        label: 'Cambiar tamaño',
        children: sizeSubmenu
      },
      'separator',
      {
        key: 'remove',
        label: 'Quitar widget',
        destructive: true,
        action: () => handleRemove(instance.id)
      }
    ]
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 'var(--taskbar-height)',
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      {widgets.map((widgetInstance) => {
        const reg = getWidget(widgetInstance.widgetId)
        if (!reg) return null

        const { width, height } = getDimensions(widgetInstance.size)
        const isHovered = hoveredId === widgetInstance.id
        const WidgetComponent = reg.component

        return (
          <div
            key={widgetInstance.id}
            onPointerDown={(e) => handleStartDrag(widgetInstance, e)}
            onMouseEnter={() => setHoveredId(widgetInstance.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: 'absolute',
              left: `${widgetInstance.x}px`,
              top: `${widgetInstance.y}px`,
              width,
              height,
              backgroundColor: 'var(--material-acrylic)',
              backdropFilter: 'var(--backdrop-filter-acrylic)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'auto',
              cursor: 'grab',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              transition: 'box-shadow var(--duration-fast) var(--ease-fluent)'
            }}
          >
            {/* Widget "..." action button on hover */}
            {isHovered && (
              <button
                type="button"
                className="widget-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  setContextMenu({
                    x: rect.right,
                    y: rect.bottom,
                    widgetId: widgetInstance.widgetId,
                    instanceId: widgetInstance.id
                  })
                }}
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  backgroundColor: 'var(--bg-card)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  zIndex: 10
                }}
                title="Opciones de widget"
              >
                •••
              </button>
            )}

            {/* Render Widget */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Suspense
                fallback={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <DotLoader size={4} color="var(--accent-color)" />
                  </div>
                }
              >
                <WidgetComponent />
              </Suspense>
            </div>
          </div>
        )
      })}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuEntries(
            widgets.find((w) => w.id === contextMenu.instanceId) || ({} as DesktopWidget)
          )}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
