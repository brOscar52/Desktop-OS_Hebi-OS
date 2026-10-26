import React, { useState, useEffect, useRef, Suspense, Component, ReactNode, ErrorInfo } from 'react'
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

export function getWidgetDims(size: 'small' | 'medium' | 'large'): { width: number; height: number } {
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

interface DragState {
  id: string
  startPointerX: number
  startPointerY: number
  startWidgetX: number
  startWidgetY: number
  currentX: number
  currentY: number
}

export const WidgetsHost: React.FC = () => {
  const [widgets, setWidgets] = useState<DesktopWidget[]>(() => {
    return settings.get('desktop.widgets') || []
  })

  const [draggingWidget, setDraggingWidget] = useState<DragState | null>(null)
  const draggingRef = useRef<DragState | null>(null)
  draggingRef.current = draggingWidget

  const widgetsRef = useRef<DesktopWidget[]>(widgets)
  widgetsRef.current = widgets

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    instanceId: string
  } | null>(null)

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // One-time initialization: resolve collisions only once if initial set had duplicate coordinates
  useEffect(() => {
    const initial = settings.get('desktop.widgets') || []
    let hasOverlaps = false
    const seen = new Set<string>()

    for (const w of initial) {
      const key = `${w.x},${w.y}`
      if (seen.has(key)) {
        hasOverlaps = true
        break
      }
      seen.add(key)
    }

    if (hasOverlaps && initial.length > 1) {
      const margin = 16
      const screenW = window.innerWidth || 1280
      const screenH = (window.innerHeight || 800) - 48
      const resolved: DesktopWidget[] = []

      for (const w of initial) {
        const { width, height } = getWidgetDims(w.size)
        const maxX = Math.max(16, screenW - width - 16)
        const maxY = Math.max(16, screenH - height - 16)
        let curX = Math.max(16, Math.min(maxX, w.x))
        let curY = Math.max(16, Math.min(maxY, w.y))

        const overlaps = (cx: number, cy: number) => {
          return resolved.some((other) => {
            const { width: ow, height: oh } = getWidgetDims(other.size)
            return cx < other.x + ow + margin && cx + width + margin > other.x &&
                   cy < other.y + oh + margin && cy + height + margin > other.y
          })
        }

        if (overlaps(curX, curY)) {
          let placed = false
          for (let x = maxX; x >= 24; x -= width + 24) {
            for (let y = 24; y <= maxY; y += height + 24) {
              if (!overlaps(x, y)) {
                curX = x
                curY = y
                placed = true
                break
              }
            }
            if (placed) break
          }
          if (!placed) {
            const offset = (resolved.length * 36) % 180
            curX = Math.max(20, maxX - offset)
            curY = Math.max(20, 24 + offset)
          }
        }

        resolved.push({ ...w, x: curX, y: curY })
      }

      setWidgets(resolved)
      settings.set('desktop.widgets', resolved).catch(() => {})
    }
  }, [])

  // Sync from settings changes (e.g. widget added from desktop menu)
  useEffect(() => {
    const unsub = settings.subscribe('desktop.widgets', (incoming) => {
      // Do not overwrite local list if currently dragging
      if (!draggingRef.current) {
        setWidgets(incoming || [])
      }
    })
    return () => unsub()
  }, [])

  // Global window listeners for smooth drag without Dexie calls during movement
  useEffect(() => {
    const handleWindowPointerMove = (ev: PointerEvent) => {
      const drag = draggingRef.current
      if (!drag) return

      const widget = widgetsRef.current.find((w) => w.id === drag.id)
      const size = widget?.size || 'small'
      const { width, height } = getWidgetDims(size)

      const screenW = window.innerWidth
      const screenH = window.innerHeight - 48 // Taskbar height is 48px
      const maxX = Math.max(16, screenW - width - 16)
      const maxY = Math.max(16, screenH - height - 16)

      const deltaX = ev.clientX - drag.startPointerX
      const deltaY = ev.clientY - drag.startPointerY

      const newX = Math.max(16, Math.min(maxX, drag.startWidgetX + deltaX))
      const newY = Math.max(16, Math.min(maxY, drag.startWidgetY + deltaY))

      const updatedDrag: DragState = {
        ...drag,
        currentX: newX,
        currentY: newY
      }

      draggingRef.current = updatedDrag
      setDraggingWidget(updatedDrag)
    }

    const handleWindowPointerUp = async () => {
      const drag = draggingRef.current
      if (!drag) return

      const finalX = drag.currentX
      const finalY = drag.currentY
      const widgetId = drag.id

      draggingRef.current = null
      setDraggingWidget(null)

      // Persist ONLY upon drag release
      const current = settings.get('desktop.widgets') || []
      const next = current.map((w) => (w.id === widgetId ? { ...w, x: finalX, y: finalY } : w))
      setWidgets(next)
      await settings.set('desktop.widgets', next)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [])

  // Pointer down on widget card
  const handlePointerDown = (widget: DesktopWidget, e: React.PointerEvent) => {
    // Only primary button
    if (e.button !== 0) return

    // Ignore clicks on menu or interactive elements
    const target = e.target as HTMLElement
    if (target.closest('.widget-action-btn, [data-widget-menu], textarea, input, button, select, a, [data-no-drag]')) {
      return
    }

    e.stopPropagation()

    const startPointerX = e.clientX
    const startPointerY = e.clientY
    const startWidgetX = widget.x
    const startWidgetY = widget.y

    const dragData: DragState = {
      id: widget.id,
      startPointerX,
      startPointerY,
      startWidgetX,
      startWidgetY,
      currentX: widget.x,
      currentY: widget.y
    }

    draggingRef.current = dragData
    setDraggingWidget(dragData)
  }

  // Instant Resize
  const handleResize = async (instanceId: string, newSize: 'small' | 'medium' | 'large') => {
    setContextMenu(null)
    const current = settings.get('desktop.widgets') || []
    const next = current.map((w) => (w.id === instanceId ? { ...w, size: newSize } : w))
    setWidgets(next)
    await settings.set('desktop.widgets', next)
  }

  // Instant Remove
  const handleRemove = async (instanceId: string) => {
    setContextMenu(null)
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
          ? 'Pequeño (160×160)'
          : s === 'medium'
          ? 'Mediano (340×160)'
          : 'Grande (340×340)',
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
        label: 'Quitar',
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

        const isDragging = draggingWidget?.id === widgetInstance.id
        const currentPosX = isDragging ? draggingWidget.currentX : widgetInstance.x
        const currentPosY = isDragging ? draggingWidget.currentY : widgetInstance.y
        const { width, height } = getWidgetDims(widgetInstance.size)
        const isHovered = hoveredId === widgetInstance.id
        const isMenuOpen = contextMenu?.instanceId === widgetInstance.id
        const WidgetComponent = reg.component

        return (
          <div
            key={widgetInstance.id}
            className="widget-card"
            onPointerDown={(e) => handlePointerDown(widgetInstance, e)}
            onMouseEnter={() => setHoveredId(widgetInstance.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: 'absolute',
              left: `${currentPosX}px`,
              top: `${currentPosY}px`,
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: 'var(--material-acrylic)',
              backdropFilter: 'var(--backdrop-filter-acrylic)',
              WebkitBackdropFilter: 'var(--backdrop-filter-acrylic)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: isDragging ? 'var(--shadow-xl)' : 'var(--shadow-md)',
              pointerEvents: 'auto',
              cursor: isDragging ? 'grabbing' : 'grab',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              zIndex: isDragging ? 100 : isMenuOpen ? 50 : 5,
              transition: isDragging ? 'none' : 'box-shadow var(--duration-fast) var(--ease-fluent)',
              userSelect: 'none'
            }}
          >
            {/* Widget "..." action button on hover or when its menu is open */}
            {(isHovered || isMenuOpen) && (
              <button
                type="button"
                className="widget-action-btn"
                data-widget-menu="true"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  setContextMenu({
                    x: rect.right,
                    y: rect.bottom,
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
                  color: 'var(--text-primary)',
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

            {/* Render Widget Component */}
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
        <div data-widget-menu="true" style={{ pointerEvents: 'auto' }}>
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={getContextMenuEntries(
              widgets.find((w) => w.id === contextMenu.instanceId) || ({} as DesktopWidget)
            )}
            onClose={() => setContextMenu(null)}
          />
        </div>
      )}
    </div>
  )
}
