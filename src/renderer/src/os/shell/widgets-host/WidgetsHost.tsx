import React, { useState, useEffect, Suspense, Component, ReactNode, ErrorInfo, useCallback } from 'react'
import { settings, DesktopWidget } from '../../kernel/settings'
import { getWidget } from '../../kernel/apps/registry'
import { ContextMenu, ContextMenuEntry } from '../../ui/ContextMenu'
import { DotLoader } from '../common/DotLoader'
import { WindowContext } from '../../sdk/context'

interface WidgetErrorBoundaryProps {
  widgetId: string
  onRemove: () => void
  children: ReactNode
}

interface WidgetErrorBoundaryState {
  hasError: boolean
}

class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[WidgetErrorBoundary] Error en widget ${this.props.widgetId}:`, error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '12px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px'
          }}
        >
          <span>Error en widget</span>
          <button
            type="button"
            onClick={this.props.onRemove}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            Quitar widget
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function getWidgetDims(size: 'small' | 'medium' | 'large'): { width: number; height: number } {
  switch (size) {
    case 'medium':
      return { width: 340, height: 160 }
    case 'large':
      return { width: 340, height: 340 }
    case 'small':
    default:
      return { width: 160, height: 160 }
  }
}

function resolveWidgetCollisions(
  rawWidgets: DesktopWidget[],
  screenWidth: number,
  screenHeight: number
): { resolved: DesktopWidget[]; changed: boolean } {
  const margin = 16
  const resolved: DesktopWidget[] = []
  let changed = false

  for (const w of rawWidgets) {
    const { width, height } = getWidgetDims(w.size)
    const maxX = Math.max(16, screenWidth - width - 16)
    const maxY = Math.max(16, screenHeight - height - 16)

    let currentX = Math.max(16, Math.min(maxX, w.x))
    let currentY = Math.max(16, Math.min(maxY, w.y))

    if (currentX !== w.x || currentY !== w.y) {
      changed = true
    }

    const overlapsWithAny = (checkX: number, checkY: number): boolean => {
      for (const other of resolved) {
        const { width: otherW, height: otherH } = getWidgetDims(other.size)
        const overlapX = checkX < other.x + otherW + margin && checkX + width + margin > other.x
        const overlapY = checkY < other.y + otherH + margin && checkY + height + margin > other.y
        if (overlapX && overlapY) return true
      }
      return false
    }

    if (overlapsWithAny(currentX, currentY)) {
      changed = true
      let placed = false

      // Try scanning grid slots on the right half of the desktop
      for (let x = maxX; x >= 24; x -= width + 24) {
        for (let y = 24; y <= maxY; y += height + 24) {
          if (!overlapsWithAny(x, y)) {
            currentX = x
            currentY = y
            placed = true
            break
          }
        }
        if (placed) break
      }

      if (!placed) {
        // Fallback offset
        const offset = (resolved.length * 40) % 200
        currentX = Math.max(20, maxX - offset)
        currentY = Math.max(20, 24 + offset)
      }
    }

    resolved.push({
      ...w,
      x: currentX,
      y: currentY
    })
  }

  return { resolved, changed }
}

export const WidgetsHost: React.FC = () => {
  const [widgets, setWidgets] = useState<DesktopWidget[]>(() => {
    const initial = settings.get('desktop.widgets') || []
    const { resolved } = resolveWidgetCollisions(
      initial,
      window.innerWidth || 1280,
      (window.innerHeight || 800) - 48
    )
    return resolved
  })

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    widgetId: string
    instanceId: string
  } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Validate and resolve collisions on load / changes
  const applyAndSaveWidgets = useCallback((incoming: DesktopWidget[]) => {
    const screenW = window.innerWidth || 1280
    const screenH = (window.innerHeight || 800) - 48
    const { resolved, changed } = resolveWidgetCollisions(incoming, screenW, screenH)
    setWidgets(resolved)
    if (changed) {
      settings.set('desktop.widgets', resolved).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const unsub = settings.subscribe('desktop.widgets', (newWidgets) => {
      applyAndSaveWidgets(newWidgets || [])
    })
    return () => unsub()
  }, [applyAndSaveWidgets])

  // Dragging handler
  const handleStartDrag = (instance: DesktopWidget, e: React.PointerEvent) => {
    // If clicking action button or interactive controls, don't drag
    if (
      (e.target as HTMLElement).closest(
        '.widget-action-btn, textarea, input, button, select, a, [data-no-drag]'
      )
    ) {
      return
    }

    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const origX = instance.x
    const origY = instance.y
    const { width: wW, height: wH } = getWidgetDims(instance.size)

    const maxX = Math.max(16, window.innerWidth - wW - 16)
    const maxY = Math.max(16, window.innerHeight - 48 - wH - 16)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      const newX = Math.max(16, Math.min(maxX, origX + deltaX))
      const newY = Math.max(16, Math.min(maxY, origY + deltaY))

      setWidgets((prev) =>
        prev.map((w) => (w.id === instance.id ? { ...w, x: newX, y: newY } : w))
      )
    }

    const onPointerUp = async (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)

      const deltaX = upEvent.clientX - startX
      const deltaY = upEvent.clientY - startY
      const finalX = Math.max(16, Math.min(maxX, origX + deltaX))
      const finalY = Math.max(16, Math.min(maxY, origY + deltaY))

      const current = settings.get('desktop.widgets') || []
      const next = current.map((w) => (w.id === instance.id ? { ...w, x: finalX, y: finalY } : w))
      setWidgets(next)
      await settings.set('desktop.widgets', next)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  const handleResize = async (instanceId: string, newSize: 'small' | 'medium' | 'large') => {
    const current = settings.get('desktop.widgets') || []
    const next = current.map((w) => (w.id === instanceId ? { ...w, size: newSize } : w))
    applyAndSaveWidgets(next)
  }

  const handleRemove = async (instanceId: string) => {
    const current = settings.get('desktop.widgets') || []
    const next = current.filter((w) => w.id !== instanceId)
    setWidgets(next)
    await settings.set('desktop.widgets', next)
  }

  const getContextMenuEntries = (instance: DesktopWidget): ContextMenuEntry[] => {
    const reg = getWidget(instance.widgetId)
    const allowedSizes = reg?.manifest.sizes || ['small', 'medium', 'large']

    const sizeSubmenu: ContextMenuEntry[] = allowedSizes.map((s) => ({
      key: `size-${s}`,
      label:
        s === 'small'
          ? 'Pequeño (160x160)'
          : s === 'medium'
          ? 'Mediano (340x160)'
          : 'Grande (340x340)',
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
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      {widgets.map((widgetInstance) => {
        const reg = getWidget(widgetInstance.widgetId)
        if (!reg) return null

        const { width, height } = getWidgetDims(widgetInstance.size)
        const isHovered = hoveredId === widgetInstance.id
        const WidgetComponent = reg.component

        return (
          <div
            key={widgetInstance.id}
            className="widget-card"
            onPointerDown={(e) => handleStartDrag(widgetInstance, e)}
            onMouseEnter={() => setHoveredId(widgetInstance.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: 'absolute',
              left: `${widgetInstance.x}px`,
              top: `${widgetInstance.y}px`,
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: 'var(--material-acrylic)',
              backdropFilter: 'var(--backdrop-filter-acrylic)',
              WebkitBackdropFilter: 'var(--backdrop-filter-acrylic)',
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
                  width: '26px',
                  height: '26px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-card)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  zIndex: 20
                }}
                title="Opciones de widget"
              >
                •••
              </button>
            )}

            {/* Render Widget */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <WidgetErrorBoundary
                widgetId={widgetInstance.widgetId}
                onRemove={() => handleRemove(widgetInstance.id)}
              >
                <Suspense
                  fallback={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                      }}
                    >
                      <DotLoader size={4} color="var(--accent-color)" />
                    </div>
                  }
                >
                  <WindowContext.Provider
                    value={{
                      windowId: widgetInstance.id,
                      appId: widgetInstance.widgetId,
                      instanceId: widgetInstance.id
                    }}
                  >
                    <WidgetComponent />
                  </WindowContext.Provider>
                </Suspense>
              </WidgetErrorBoundary>
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
