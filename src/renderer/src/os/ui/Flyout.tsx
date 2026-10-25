import React, { useEffect, useRef } from 'react'

export interface FlyoutProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  anchorRect?: DOMRect | null
  style?: React.CSSProperties
  className?: string
  width?: string | number
  maxHeight?: string | number
}

export const Flyout: React.FC<FlyoutProps> = ({
  isOpen,
  onClose,
  children,
  anchorRect,
  style,
  className,
  width,
  maxHeight = '480px'
}) => {
  const flyoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Calculate positioning if anchorRect is provided
  let positionStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: '56px',
    right: '16px'
  }

  if (anchorRect) {
    const bottomDist = window.innerHeight - anchorRect.top + 8
    let leftPos = anchorRect.left
    if (leftPos + 320 > window.innerWidth) {
      leftPos = Math.max(16, window.innerWidth - 336)
    }

    positionStyles = {
      position: 'fixed',
      bottom: `${bottomDist}px`,
      left: `${leftPos}px`
    }
  }

  return (
    <div
      ref={flyoutRef}
      style={{
        zIndex: 999900,
        backgroundColor: 'var(--material-acrylic)',
        backdropFilter: 'var(--backdrop-filter-acrylic)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-flyout)',
        padding: '12px',
        width,
        maxHeight,
        overflowY: 'auto',
        fontFamily: 'var(--font-family-base)',
        color: 'var(--text-primary)',
        boxSizing: 'border-box',
        ...positionStyles,
        ...style
      }}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}
