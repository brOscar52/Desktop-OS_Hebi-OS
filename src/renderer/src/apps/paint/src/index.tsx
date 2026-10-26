import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  useOS,
  useLaunchArgs,
  useOpenFileHandler,
  useAppMenus,
  useUnsavedChanges,
  type AppMenu
} from '@os/sdk'
import { Button, IconButton, Select } from '@os/ui'

type ToolType =
  | 'brush'
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'fill'
  | 'picker'
  | 'text'

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#7f7f7f',
  '#c3c3c3',
  '#880015',
  '#ed1c24',
  '#ff7f27',
  '#fff200',
  '#22b14c',
  '#00a2e8',
  '#3f48cc',
  '#a349a4',
  '#0D9488', // HebiOS turquoise accent
  '#14B8A6',
  '#0284C7',
  '#16A34A'
]

const STROKE_WIDTHS = [1, 2, 4, 8, 16]

export default function PaintApp(): JSX.Element {
  const os = useOS()
  const launchArgs = useLaunchArgs()

  // Canvas refs and sizing
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [canvasWidth, setCanvasWidth] = useState<number>(800)
  const [canvasHeight, setCanvasHeight] = useState<number>(540)
  const [zoom, setZoom] = useState<number>(1)

  // File state
  const [filePath, setFilePath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // Tool settings
  const [activeTool, setActiveTool] = useState<ToolType>('brush')
  const [primaryColor, setPrimaryColor] = useState<string>('#000000')
  const [strokeWidth, setStrokeWidth] = useState<number>(4)
  const [fillShape, setFillShape] = useState<boolean>(false)

  // Undo / Redo history
  const undoStackRef = useRef<ImageData[]>([])
  const redoStackRef = useRef<ImageData[]>([])
  const [, setHistoryVersion] = useState<number>(0)

  // Drawing state
  const isDrawingRef = useRef<boolean>(false)
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const documentName = useMemo(() => {
    if (!filePath) return 'Sin título'
    const parts = filePath.split('/')
    return parts[parts.length - 1] || 'Sin título'
  }, [filePath])

  // Update window title
  useEffect(() => {
    const prefix = isDirty ? '*' : ''
    os.window.setTitle(`${prefix}${documentName} - Paint`)
  }, [isDirty, documentName, os.window])

  // Initialize canvas with white background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Save initial state in undo
    const initData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStackRef.current = [initData]
    redoStackRef.current = []
    setHistoryVersion((v) => v + 1)
  }, [canvasWidth, canvasHeight])

  const pushUndoState = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStackRef.current.push(currentData)
    if (undoStackRef.current.length > 35) {
      undoStackRef.current.shift()
    }
    redoStackRef.current = []
    setIsDirty(true)
    setHistoryVersion((v) => v + 1)
  }, [])

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length <= 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const current = undoStackRef.current.pop()!
    redoStackRef.current.push(current)

    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    ctx.putImageData(prev, 0, 0)
    setIsDirty(true)
    setHistoryVersion((v) => v + 1)
  }, [])

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    ctx.putImageData(next, 0, 0)
    setIsDirty(true)
    setHistoryVersion((v) => v + 1)
  }, [])

  // Load an existing image
  const loadImageFromPath = useCallback(
    async (path: string) => {
      try {
        const resolved = os.fs.fromDisplayPath(path)
        const obj = await os.fs.getObjectUrl(resolved)
        const img = new Image()
        img.onload = () => {
          setCanvasWidth(img.width)
          setCanvasHeight(img.height)
          setTimeout(() => {
            const canvas = canvasRef.current
            if (canvas) {
              const ctx = canvas.getContext('2d', { willReadFrequently: true })
              if (ctx) {
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0)
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
                undoStackRef.current = [data]
                redoStackRef.current = []
                setIsDirty(false)
                setHistoryVersion((v) => v + 1)
              }
            }
            obj.revoke()
          }, 50)
        }
        img.src = obj.url
        setFilePath(resolved)
      } catch (err) {
        console.error('[Paint] Error loading image:', err)
        await os.dialogs.alert({
          title: 'Error al abrir imagen',
          message: 'No se pudo cargar el archivo seleccionado.'
        })
      }
    },
    [os.fs, os.dialogs]
  )

  useEffect(() => {
    if (launchArgs.filePath && typeof launchArgs.filePath === 'string') {
      loadImageFromPath(launchArgs.filePath)
    }
  }, [launchArgs.filePath, loadImageFromPath])

  useOpenFileHandler((path: string) => {
    loadImageFromPath(path)
  })

  // File save handlers
  const handleSaveAs = useCallback(async (): Promise<boolean> => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const defaultName = documentName === 'Sin título' ? 'Dibujo.png' : documentName
    const selected = await os.dialogs.saveFile({
      defaultName: defaultName.endsWith('.png') ? defaultName : `${defaultName}.png`,
      extensions: ['png']
    })

    if (!selected) return false

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) return false

      await os.fs.writeFile(selected, blob, { overwrite: true })
      setFilePath(selected)
      setIsDirty(false)
      return true
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error al guardar',
        message: (err as Error).message || 'No se pudo guardar la imagen.'
      })
      return false
    }
  }, [documentName, os.dialogs, os.fs])

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (filePath) {
      const canvas = canvasRef.current
      if (!canvas) return false
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        )
        if (!blob) return false

        await os.fs.writeFile(filePath, blob, { overwrite: true })
        setIsDirty(false)
        return true
      } catch (err: unknown) {
        await os.dialogs.alert({
          title: 'Error al guardar',
          message: (err as Error).message || 'No se pudo guardar la imagen.'
        })
        return false
      }
    } else {
      return handleSaveAs()
    }
  }, [filePath, os.fs, os.dialogs, handleSaveAs])

  const handleNew = useCallback(async () => {
    if (isDirty) {
      const confirm = await os.dialogs.confirm({
        title: 'Paint',
        message: `¿Quieres guardar los cambios en "${documentName}"?`,
        confirmLabel: 'Guardar',
        cancelLabel: 'No guardar'
      })
      if (confirm) {
        const saved = await handleSave()
        if (!saved) return
      }
    }

    setFilePath(null)
    setCanvasWidth(800)
    setCanvasHeight(540)
    setTimeout(() => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          undoStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
          redoStackRef.current = []
          setIsDirty(false)
          setHistoryVersion((v) => v + 1)
        }
      }
    }, 50)
  }, [isDirty, documentName, handleSave, os.dialogs])

  const handleOpen = useCallback(async () => {
    const selected = await os.dialogs.openFile({
      extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
      multiple: false
    })
    if (selected && selected.length > 0) {
      await loadImageFromPath(selected[0])
    }
  }, [os.dialogs, loadImageFromPath])

  const handleResizeCanvas = useCallback(async () => {
    const promptW = await os.dialogs.prompt({
      title: 'Cambiar tamaño del lienzo',
      message: 'Ingresa el ancho en píxeles (100 - 3000):',
      defaultValue: `${canvasWidth}`
    })
    if (!promptW) return
    const w = parseInt(promptW, 10)
    if (isNaN(w) || w < 100 || w > 3000) return

    const promptH = await os.dialogs.prompt({
      title: 'Cambiar tamaño del lienzo',
      message: 'Ingresa el alto en píxeles (100 - 3000):',
      defaultValue: `${canvasHeight}`
    })
    if (!promptH) return
    const h = parseInt(promptH, 10)
    if (isNaN(h) || h < 100 || h > 3000) return

    // Preserve existing content onto new canvas size
    const canvas = canvasRef.current
    if (!canvas) return
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0)

    setCanvasWidth(w)
    setCanvasHeight(h)

    setTimeout(() => {
      const c = canvasRef.current
      if (c) {
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(tempCanvas, 0, 0)
          pushUndoState()
        }
      }
    }, 50)
  }, [canvasWidth, canvasHeight, os.dialogs, pushUndoState])

  useUnsavedChanges({
    isDirty,
    documentName,
    save: handleSave
  })

  // App menus
  const menus: AppMenu[] = useMemo(
    () => [
      {
        label: 'Archivo',
        items: [
          { label: 'Nuevo', shortcut: 'Ctrl+N', action: () => { void handleNew() } },
          { label: 'Abrir…', shortcut: 'Ctrl+O', action: () => { void handleOpen() } },
          { label: 'Guardar', shortcut: 'Ctrl+S', action: () => { void handleSave() } },
          { label: 'Guardar como…', shortcut: 'Ctrl+Mayús+S', action: () => { void handleSaveAs() } }
        ]
      },
      {
        label: 'Editar',
        items: [
          {
            label: 'Deshacer',
            shortcut: 'Ctrl+Z',
            disabled: undoStackRef.current.length <= 1,
            action: handleUndo
          },
          {
            label: 'Rehacer',
            shortcut: 'Ctrl+Y',
            disabled: redoStackRef.current.length === 0,
            action: handleRedo
          },
          {
            label: 'Limpiar lienzo',
            action: () => {
              const canvas = canvasRef.current
              if (!canvas) return
              const ctx = canvas.getContext('2d', { willReadFrequently: true })
              if (!ctx) return
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              pushUndoState()
            }
          }
        ]
      },
      {
        label: 'Imagen',
        items: [
          {
            label: 'Cambiar tamaño del lienzo…',
            action: () => { void handleResizeCanvas() }
          }
        ]
      }
    ],
    [handleNew, handleOpen, handleSave, handleSaveAs, handleUndo, handleRedo, handleResizeCanvas, pushUndoState]
  )

  useAppMenus(menus)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        handleUndo()
      } else if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        handleRedo()
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveAs()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        handleNew()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        handleOpen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleSave, handleSaveAs, handleNew, handleOpen])

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) / zoom)
    const y = Math.round((e.clientY - rect.top) / zoom)
    return { x, y }
  }

  // Flood fill algorithm
  const performFloodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return

    const imgData = ctx.getImageData(0, 0, w, h)
    const data = imgData.data

    const r = parseInt(primaryColor.slice(1, 3), 16)
    const g = parseInt(primaryColor.slice(3, 5), 16)
    const b = parseInt(primaryColor.slice(5, 7), 16)
    const a = 255

    const startIdx = (startY * w + startX) * 4
    const startR = data[startIdx]
    const startG = data[startIdx + 1]
    const startB = data[startIdx + 2]
    const startA = data[startIdx + 3]

    if (startR === r && startG === g && startB === b && startA === a) return

    const matchStart = (idx: number) => {
      return (
        Math.abs(data[idx] - startR) < 18 &&
        Math.abs(data[idx + 1] - startG) < 18 &&
        Math.abs(data[idx + 2] - startB) < 18 &&
        Math.abs(data[idx + 3] - startA) < 18
      )
    }

    const queue: [number, number][] = [[startX, startY]]
    const visited = new Uint8Array(w * h)
    visited[startY * w + startX] = 1

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!
      const idx = (cy * w + cx) * 4

      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = a

      const neighbors: [number, number][] = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ]

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nPos = ny * w + nx
          if (!visited[nPos]) {
            visited[nPos] = 1
            const nIdx = nPos * 4
            if (matchStart(nIdx)) {
              queue.push([nx, ny])
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
    pushUndoState()
  }

  // Eye dropper tool
  const pickColor = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
      .toString(16)
      .slice(1)}`
    setPrimaryColor(hex)
    setActiveTool('brush')
  }

  // Text insertion tool
  const insertText = async (x: number, y: number) => {
    const text = await os.dialogs.prompt({
      title: 'Insertar texto',
      message: 'Escribe el texto que deseas colocar en el lienzo:'
    })
    if (!text) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.fillStyle = primaryColor
    ctx.font = `${Math.max(14, strokeWidth * 6)}px sans-serif`
    ctx.fillText(text, x, y)
    pushUndoState()
  }

  // Mouse drawing handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const coords = getCanvasCoords(e)

    if (activeTool === 'fill') {
      performFloodFill(coords.x, coords.y)
      return
    }

    if (activeTool === 'picker') {
      pickColor(coords.x, coords.y)
      return
    }

    if (activeTool === 'text') {
      void insertText(coords.x, coords.y)
      return
    }

    isDrawingRef.current = true
    startPosRef.current = coords
    lastPosRef.current = coords

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    if (activeTool === 'brush' || activeTool === 'pencil' || activeTool === 'eraser') {
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : primaryColor
      ctx.lineWidth = activeTool === 'pencil' ? 1 : strokeWidth
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const coords = getCanvasCoords(e)
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    if (activeTool === 'brush' || activeTool === 'pencil' || activeTool === 'eraser') {
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : primaryColor
      ctx.lineWidth = activeTool === 'pencil' ? 1 : strokeWidth
      ctx.stroke()
      lastPosRef.current = coords
    } else if (previewCanvas) {
      // Shape tools: draw on overlay preview canvas
      const pCtx = previewCanvas.getContext('2d')
      if (!pCtx) return
      pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)

      pCtx.strokeStyle = primaryColor
      pCtx.fillStyle = primaryColor
      pCtx.lineWidth = strokeWidth
      pCtx.lineCap = 'round'
      pCtx.lineJoin = 'round'

      const sx = startPosRef.current.x
      const sy = startPosRef.current.y
      const ex = coords.x
      const ey = coords.y

      if (activeTool === 'line') {
        pCtx.beginPath()
        pCtx.moveTo(sx, sy)
        pCtx.lineTo(ex, ey)
        pCtx.stroke()
      } else if (activeTool === 'rect') {
        const x = Math.min(sx, ex)
        const y = Math.min(sy, ey)
        const w = Math.abs(ex - sx)
        const h = Math.abs(ey - sy)
        if (fillShape) {
          pCtx.fillRect(x, y, w, h)
        }
        pCtx.strokeRect(x, y, w, h)
      } else if (activeTool === 'ellipse') {
        const cx = (sx + ex) / 2
        const cy = (sy + ey) / 2
        const rx = Math.abs(ex - sx) / 2
        const ry = Math.abs(ey - sy) / 2
        pCtx.beginPath()
        pCtx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 2 * Math.PI)
        if (fillShape) {
          pCtx.fill()
        }
        pCtx.stroke()
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const coords = getCanvasCoords(e)

    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'ellipse') {
      if (previewCanvas) {
        const pCtx = previewCanvas.getContext('2d')
        pCtx?.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
      }

      ctx.strokeStyle = primaryColor
      ctx.fillStyle = primaryColor
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const sx = startPosRef.current.x
      const sy = startPosRef.current.y
      const ex = coords.x
      const ey = coords.y

      if (activeTool === 'line') {
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
      } else if (activeTool === 'rect') {
        const x = Math.min(sx, ex)
        const y = Math.min(sy, ey)
        const w = Math.abs(ex - sx)
        const h = Math.abs(ey - sy)
        if (fillShape) {
          ctx.fillRect(x, y, w, h)
        }
        ctx.strokeRect(x, y, w, h)
      } else if (activeTool === 'ellipse') {
        const cx = (sx + ex) / 2
        const cy = (sy + ey) / 2
        const rx = Math.abs(ex - sx) / 2
        const ry = Math.abs(ey - sy) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 2 * Math.PI)
        if (fillShape) {
          ctx.fill()
        }
        ctx.stroke()
      }
    }

    pushUndoState()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Ribbon Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap'
        }}
      >
        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconButton
            title="Deshacer (Ctrl+Z)"
            icon="↩"
            disabled={undoStackRef.current.length <= 1}
            onClick={handleUndo}
          />
          <IconButton
            title="Rehacer (Ctrl+Y)"
            icon="↪"
            disabled={redoStackRef.current.length === 0}
            onClick={handleRedo}
          />
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <IconButton
            title="Pincel"
            icon="🖌"
            active={activeTool === 'brush'}
            onClick={() => setActiveTool('brush')}
          />
          <IconButton
            title="Lápiz"
            icon="✏"
            active={activeTool === 'pencil'}
            onClick={() => setActiveTool('pencil')}
          />
          <IconButton
            title="Borrador"
            icon="🧹"
            active={activeTool === 'eraser'}
            onClick={() => setActiveTool('eraser')}
          />
          <IconButton
            title="Línea"
            icon="╱"
            active={activeTool === 'line'}
            onClick={() => setActiveTool('line')}
          />
          <IconButton
            title="Rectángulo"
            icon="▭"
            active={activeTool === 'rect'}
            onClick={() => setActiveTool('rect')}
          />
          <IconButton
            title="Elipse"
            icon="⬭"
            active={activeTool === 'ellipse'}
            onClick={() => setActiveTool('ellipse')}
          />
          <IconButton
            title="Bote de pintura (Relleno)"
            icon="🪣"
            active={activeTool === 'fill'}
            onClick={() => setActiveTool('fill')}
          />
          <IconButton
            title="Cuentagotas"
            icon="🔍"
            active={activeTool === 'picker'}
            onClick={() => setActiveTool('picker')}
          />
          <IconButton
            title="Texto"
            icon="T"
            active={activeTool === 'text'}
            onClick={() => setActiveTool('text')}
          />
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Fill mode toggle (for Rect / Ellipse) */}
        {(activeTool === 'rect' || activeTool === 'ellipse') && (
          <Button
            variant={fillShape ? 'primary' : 'subtle'}
            size="small"
            onClick={() => setFillShape(!fillShape)}
          >
            {fillShape ? 'Relleno: Sí' : 'Relleno: No'}
          </Button>
        )}

        {/* Stroke width selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Grosor:</span>
          <div style={{ width: '80px' }}>
            <Select
              options={STROKE_WIDTHS.map((w) => ({ value: `${w}`, label: `${w}px` }))}
              value={`${strokeWidth}`}
              onChange={(v) => setStrokeWidth(Number(v))}
            />
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Palette Swatches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: primaryColor,
              border: '2px solid var(--border-strong)',
              boxShadow: 'var(--shadow-sm)'
            }}
            title={`Color actual: ${primaryColor}`}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 14px)',
              gridTemplateRows: 'repeat(2, 14px)',
              gap: '2px'
            }}
          >
            {PRESET_COLORS.map((c) => (
              <div
                key={c}
                onClick={() => setPrimaryColor(c)}
                style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: c,
                  borderRadius: '2px',
                  cursor: 'pointer',
                  border: c === primaryColor ? '2px solid var(--accent-color)' : '1px solid rgba(0,0,0,0.2)'
                }}
              />
            ))}
          </div>

          {/* Native HTML5 Color Picker */}
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={{
              width: '26px',
              height: '26px',
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent'
            }}
            title="Elegir color personalizado"
          />
        </div>

        {/* Zoom */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="subtle"
            size="small"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            disabled={zoom <= 0.5}
          >
            −
          </Button>
          <span style={{ fontSize: '11px', minWidth: '38px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="subtle"
            size="small"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            disabled={zoom >= 3}
          >
            +
          </Button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div
          style={{
            position: 'relative',
            width: `${canvasWidth * zoom}px`,
            height: `${canvasHeight * zoom}px`,
            boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Main Drawing Canvas */}
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor:
                activeTool === 'fill'
                  ? 'cell'
                  : activeTool === 'picker'
                  ? 'crosshair'
                  : activeTool === 'text'
                  ? 'text'
                  : 'crosshair',
              imageRendering: zoom > 1 ? 'pixelated' : 'auto'
            }}
          />

          {/* Shape Preview Canvas */}
          <canvas
            ref={previewCanvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Lienzo: {canvasWidth} × {canvasHeight} px</span>
          <span>Herramienta: {activeTool}</span>
          <span>Grosor: {strokeWidth}px</span>
        </div>
        <div>
          <span>{documentName}{isDirty ? ' *' : ''}</span>
        </div>
      </div>
    </div>
  )
}
