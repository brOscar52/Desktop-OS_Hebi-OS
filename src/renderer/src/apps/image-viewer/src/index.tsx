import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useOS, useLaunchArgs, useOpenFileHandler, type FsNode } from '@os/sdk'
import { EmptyState, Button, IconButton } from '@os/ui'

const SUPPORTED_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp']

export default function ImageViewerApp(): JSX.Element {
  const os = useOS()
  const launchArgs = useLaunchArgs()

  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [currentNode, setCurrentNode] = useState<FsNode | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null)
  const [folderImages, setFolderImages] = useState<FsNode[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(-1)

  // View state: zoom, pan, rotation
  const [scale, setScale] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Properties modal
  const [showProperties, setShowProperties] = useState<boolean>(false)

  // Current object URL revoker ref
  const revokeRef = useRef<(() => void) | null>(null)

  const cleanupObjectUrl = useCallback(() => {
    if (revokeRef.current) {
      revokeRef.current()
      revokeRef.current = null
    }
  }, [])

  // Load a specific image path
  const loadImage = useCallback(
    async (filePath: string) => {
      try {
        const resolved = os.fs.fromDisplayPath(filePath)
        const node = await os.fs.stat(resolved)
        if (node.kind !== 'file') return

        const ext = node.name.split('.').pop()?.toLowerCase() || ''
        if (!SUPPORTED_EXTS.includes(ext)) return

        cleanupObjectUrl()
        const obj = await os.fs.getObjectUrl(resolved)
        revokeRef.current = obj.revoke

        setCurrentPath(resolved)
        setCurrentNode(node)
        setImageUrl(obj.url)
        setScale(1)
        setRotation(0)
        setPan({ x: 0, y: 0 })

        os.window.setTitle(`${node.name} - Fotos`)

        // Load folder peers
        const parentDir = resolved.substring(0, resolved.lastIndexOf('/')) || '/'
        try {
          const list = await os.fs.list(parentDir)
          const imgList = list.filter((n) => {
            const e = n.name.split('.').pop()?.toLowerCase() || ''
            return n.kind === 'file' && SUPPORTED_EXTS.includes(e)
          })
          setFolderImages(imgList)
          const idx = imgList.findIndex((n) => n.id === node.id || n.name === node.name)
          setCurrentIndex(idx)
        } catch {
          setFolderImages([])
          setCurrentIndex(-1)
        }
      } catch (err) {
        console.error('[Fotos] Error loading image:', err)
      }
    },
    [cleanupObjectUrl, os.fs, os.window]
  )

  // Initial load via launchArgs
  useEffect(() => {
    if (launchArgs.filePath && typeof launchArgs.filePath === 'string') {
      loadImage(launchArgs.filePath)
    }
  }, [launchArgs.filePath, loadImage])

  // Handle open file when singleInstance or drag
  useOpenFileHandler((path: string) => {
    loadImage(path)
  })

  // Cleanup object url on unmount
  useEffect(() => {
    return () => {
      cleanupObjectUrl()
    }
  }, [cleanupObjectUrl])

  // Navigate folder images
  const handlePrev = useCallback(() => {
    if (folderImages.length <= 1 || currentIndex <= 0) return
    const prevNode = folderImages[currentIndex - 1]
    const parentDir = currentPath ? currentPath.substring(0, currentPath.lastIndexOf('/')) : ''
    loadImage(`${parentDir}/${prevNode.name}`)
  }, [currentIndex, currentPath, folderImages, loadImage])

  const handleNext = useCallback(() => {
    if (folderImages.length <= 1 || currentIndex >= folderImages.length - 1) return
    const nextNode = folderImages[currentIndex + 1]
    const parentDir = currentPath ? currentPath.substring(0, currentPath.lastIndexOf('/')) : ''
    loadImage(`${parentDir}/${nextNode.name}`)
  }, [currentIndex, currentPath, folderImages, loadImage])

  // Open file dialog
  const handleOpenFile = async () => {
    const selected = await os.dialogs.openFile({
      extensions: SUPPORTED_EXTS
    })
    if (selected && selected[0]) {
      await loadImage(selected[0])
    }
  }

  // Set as wallpaper
  const handleSetWallpaper = () => {
    if (!currentNode) return
    os.apps.launch('settings', {
      section: 'personalization',
      setWallpaper: currentNode.id
    })
  }

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(5, Number((s + 0.25).toFixed(2))))
  const zoomOut = () => setScale((s) => Math.max(0.1, Number((s - 0.25).toFixed(2))))
  const zoomReset = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }
  const rotateClockwise = () => setRotation((r) => (r + 90) % 360)
  const rotateCounterClockwise = () => setRotation((r) => (r - 90 + 360) % 360)

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale((s) => Math.min(5, Number((s + 0.15).toFixed(2))))
    } else {
      setScale((s) => Math.max(0.1, Number((s - 0.15).toFixed(2))))
    }
  }

  // Drag pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    panStartRef.current = { ...pan }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    })
  }

  const handlePointerUp = () => {
    setIsPanning(false)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showProperties) {
        if (e.key === 'Escape') setShowProperties(false)
        return
      }
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === '+' || e.key === '=') {
        zoomIn()
      } else if (e.key === '-') {
        zoomOut()
      } else if (e.key === '0') {
        zoomReset()
      } else if (e.key.toLowerCase() === 'r') {
        rotateClockwise()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, showProperties])

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp)
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!imageUrl || !currentNode) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        <EmptyState
          title="Ninguna foto abierta"
          description="Abre una foto o imagen para verla, rotarla o establecerla como fondo de pantalla."
          action={
            <Button variant="primary" onClick={handleOpenFile}>
              Abrir foto…
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0d12',
        color: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none'
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Top Floating Controls Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'var(--shadow-flyout)'
        }}
      >
        <IconButton
          icon="◀"
          aria-label="Foto anterior"
          disabled={folderImages.length <= 1 || currentIndex <= 0}
          onClick={handlePrev}
        />
        <IconButton
          icon="▶"
          aria-label="Foto siguiente"
          disabled={folderImages.length <= 1 || currentIndex >= folderImages.length - 1}
          onClick={handleNext}
        />

        {folderImages.length > 0 && (
          <span style={{ fontSize: '11px', color: '#94a3b8', margin: '0 6px' }}>
            {currentIndex + 1} / {folderImages.length}
          </span>
        )}

        <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

        <IconButton icon="➕" aria-label="Acercar (+)" onClick={zoomIn} />
        <IconButton icon="➖" aria-label="Alejar (-)" onClick={zoomOut} />
        <IconButton icon="🔍" aria-label="Restaurar tamaño (100%)" onClick={zoomReset} />

        <span style={{ fontSize: '11px', minWidth: '40px', textAlign: 'center', color: '#cbd5e1' }}>
          {Math.round(scale * 100)}%
        </span>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

        <IconButton icon="↺" aria-label="Girar a la izquierda" onClick={rotateCounterClockwise} />
        <IconButton icon="↻" aria-label="Girar a la derecha" onClick={rotateClockwise} />

        <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

        <Button
          variant="subtle"
          onClick={handleSetWallpaper}
          title="Establecer como fondo de pantalla"
          style={{ fontSize: '12px', padding: '4px 8px', color: '#f8fafc' }}
        >
          🖼️ Fondo
        </Button>

        <IconButton
          icon="ℹ️"
          aria-label="Propiedades"
          title="Propiedades de la imagen"
          onClick={() => setShowProperties(true)}
        />

        <Button
          variant="subtle"
          onClick={handleOpenFile}
          title="Abrir otra foto"
          style={{ fontSize: '12px', padding: '4px 8px', color: '#f8fafc' }}
        >
          Abrir…
        </Button>
      </div>

      {/* Main Image Viewport */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
        }}
      >
        <img
          src={imageUrl}
          alt={currentNode.name}
          onLoad={(e) => {
            const target = e.currentTarget
            setImageDims({ width: target.naturalWidth, height: target.naturalHeight })
          }}
          style={{
            maxWidth: scale <= 1 ? '90%' : 'none',
            maxHeight: scale <= 1 ? '85%' : 'none',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 120ms ease-out',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            borderRadius: '2px',
            pointerEvents: 'none'
          }}
          draggable={false}
        />
      </div>

      {/* Bottom subtle filename bar */}
      <div
        style={{
          height: '28px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
          color: '#94a3b8',
          zIndex: 20
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0' }}>
          {currentNode.name}
        </span>
        <div style={{ display: 'flex', gap: '16px' }}>
          {imageDims && (
            <span>
              {imageDims.width} × {imageDims.height} px
            </span>
          )}
          <span>{formatSize(currentNode.size)}</span>
        </div>
      </div>

      {/* Properties Modal */}
      {showProperties && (
        <div
          onClick={() => setShowProperties(false)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '380px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-dialog)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
                Propiedades de la imagen
              </h3>
              <IconButton icon="✕" aria-label="Cerrar" onClick={() => setShowProperties(false)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: 'var(--font-size-xs)' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                  Nombre
                </span>
                <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{currentNode.name}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                  Ruta
                </span>
                <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {os.fs.toDisplayPath(currentPath || '')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                    Dimensiones
                  </span>
                  <span>
                    {imageDims ? `${imageDims.width} × ${imageDims.height} px` : 'Cargando…'}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                    Tamaño
                  </span>
                  <span>{formatSize(currentNode.size)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                    Tipo MIME
                  </span>
                  <span>{currentNode.mime || 'image/*'}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                    Modificado
                  </span>
                  <span>{formatDate(currentNode.modifiedAt)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="primary" onClick={() => setShowProperties(false)}>
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
