import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  useOS,
  useLaunchArgs,
  useOpenFileHandler,
  useAppMenus,
  useUnsavedChanges,
  type AppMenu
} from '@os/sdk'

export default function TextEditorApp(): JSX.Element {
  const os = useOS()
  const launchArgs = useLaunchArgs()

  const [filePath, setFilePath] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [savedContent, setSavedContent] = useState<string>('')
  const [wordWrap, setWordWrap] = useState<boolean>(true)
  const [zoomLevel, setZoomLevel] = useState<number>(100) // Percentage

  // Cursor position
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 })

  // Search Bar
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchMatches, setSearchMatches] = useState<number[]>([])
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(-1)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isDirty = content !== savedContent

  const documentName = useMemo(() => {
    if (!filePath) return 'Sin título'
    const parts = filePath.split('/')
    return parts[parts.length - 1] || 'Sin título'
  }, [filePath])

  // Update window title
  useEffect(() => {
    const prefix = isDirty ? '*' : ''
    os.window.setTitle(`${prefix}${documentName} - Bloc de notas`)
  }, [isDirty, documentName, os.window])

  // Load file on launch or open
  const loadFile = useCallback(
    async (path: string) => {
      try {
        const text = await os.fs.readText(path)
        setFilePath(path)
        setContent(text)
        setSavedContent(text)
        setIsSearchOpen(false)
      } catch (err: unknown) {
        await os.dialogs.alert({
          title: 'Error al abrir el archivo',
          message: (err as Error).message || 'No se pudo leer el archivo especificado.'
        })
      }
    },
    [os.fs, os.dialogs]
  )

  useEffect(() => {
    if (launchArgs.filePath) {
      loadFile(launchArgs.filePath)
    }
  }, [launchArgs.filePath, loadFile])

  useOpenFileHandler((path: string) => {
    loadFile(path)
  })

  const handleSaveAs = useCallback(async (): Promise<boolean> => {
    const selected = await os.dialogs.saveFile({
      defaultName: documentName === 'Sin título' ? 'Documento.txt' : documentName,
      extensions: ['txt', 'md']
    })

    if (!selected) return false

    try {
      await os.fs.writeFile(selected, content, { overwrite: true })
      setFilePath(selected)
      setSavedContent(content)
      return true
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error al guardar',
        message: (err as Error).message || 'No se pudo guardar el archivo.'
      })
      return false
    }
  }, [content, documentName, os.dialogs, os.fs])

  // Save logic
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (filePath) {
      try {
        await os.fs.writeFile(filePath, content, { overwrite: true })
        setSavedContent(content)
        return true
      } catch (err: unknown) {
        await os.dialogs.alert({
          title: 'Error al guardar',
          message: (err as Error).message || 'No se pudo guardar el archivo.'
        })
        return false
      }
    } else {
      return handleSaveAs()
    }
  }, [filePath, content, os.fs, os.dialogs, handleSaveAs])

  const handleNew = useCallback(async () => {
    if (isDirty) {
      const confirm = await os.dialogs.confirm({
        title: 'Bloc de notas',
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
    setContent('')
    setSavedContent('')
    setIsSearchOpen(false)
  }, [isDirty, documentName, handleSave, os.dialogs])

  const handleOpen = useCallback(async () => {
    const selected = await os.dialogs.openFile({
      extensions: ['txt', 'md']
    })
    if (selected && selected[0]) {
      await loadFile(selected[0])
    }
  }, [os.dialogs, loadFile])

  // Hook unsaved changes dialog to window manager
  useUnsavedChanges({
    isDirty,
    documentName,
    save: handleSave
  })

  // Search logic
  useEffect(() => {
    if (!searchQuery) {
      setSearchMatches([])
      setCurrentMatchIdx(-1)
      return
    }

    const indices: number[] = []
    const lowerContent = content.toLowerCase()
    const lowerQuery = searchQuery.toLowerCase()
    let pos = lowerContent.indexOf(lowerQuery)

    while (pos !== -1) {
      indices.push(pos)
      pos = lowerContent.indexOf(lowerQuery, pos + 1)
    }

    setSearchMatches(indices)
    setCurrentMatchIdx(indices.length > 0 ? 0 : -1)
  }, [searchQuery, content])

  const selectMatch = (idx: number) => {
    if (idx < 0 || idx >= searchMatches.length) return
    const matchPos = searchMatches[idx]
    const textarea = textareaRef.current
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(matchPos, matchPos + searchQuery.length)
    }
  }

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length
    setCurrentMatchIdx(nextIdx)
    selectMatch(nextIdx)
  }

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return
    const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length
    setCurrentMatchIdx(prevIdx)
    selectMatch(prevIdx)
  }

  // Update cursor line & column
  const handleTextareaSelect = () => {
    const ta = textareaRef.current
    if (!ta) return
    const selStart = ta.selectionStart
    const textBefore = ta.value.substring(0, selStart)
    const lines = textBefore.split('\n')
    const line = lines.length
    const col = lines[lines.length - 1].length + 1
    setCursorPos({ line, col })
  }

  // App Menu Bar definitions
  const menus: AppMenu[] = useMemo(
    () => [
      {
        label: 'Archivo',
        items: [
          { label: 'Nuevo', shortcut: 'Ctrl+N', action: handleNew },
          { label: 'Abrir…', shortcut: 'Ctrl+O', action: handleOpen },
          { label: 'Guardar', shortcut: 'Ctrl+S', action: () => { handleSave() } },
          { label: 'Guardar como…', shortcut: 'Ctrl+Mayús+S', action: () => { handleSaveAs() } },
          { label: 'Cerrar', action: () => { os.window.close() } }
        ]
      },
      {
        label: 'Editar',
        items: [
          {
            label: 'Buscar…',
            shortcut: 'Ctrl+F',
            action: () => {
              setIsSearchOpen(true)
              setTimeout(() => searchInputRef.current?.select(), 50)
            }
          }
        ]
      },
      {
        label: 'Ver',
        items: [
          {
            label: 'Acercar',
            shortcut: 'Ctrl++',
            action: () => setZoomLevel((z) => Math.min(300, z + 10))
          },
          {
            label: 'Alejar',
            shortcut: 'Ctrl+-',
            action: () => setZoomLevel((z) => Math.max(50, z - 10))
          },
          {
            label: 'Restaurar zoom',
            shortcut: 'Ctrl+0',
            action: () => setZoomLevel(100)
          },
          {
            label: `Ajuste de línea ${wordWrap ? '✓' : ''}`,
            action: () => setWordWrap((w) => !w)
          }
        ]
      }
    ],
    [handleNew, handleOpen, handleSave, handleSaveAs, os.window, wordWrap]
  )

  useAppMenus(menus)

  // Keyboard shortcuts active inside window
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (e.shiftKey) {
          handleSaveAs()
        } else {
          handleSave()
        }
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        handleNew()
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault()
        handleOpen()
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
        setTimeout(() => searchInputRef.current?.select(), 50)
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoomLevel((z) => Math.min(300, z + 10))
      } else if (e.key === '-') {
        e.preventDefault()
        setZoomLevel((z) => Math.max(50, z - 10))
      } else if (e.key === '0') {
        e.preventDefault()
        setZoomLevel(100)
      }
    } else if (e.key === 'Escape' && isSearchOpen) {
      setIsSearchOpen(false)
      textareaRef.current?.focus()
    }
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        outline: 'none'
      }}
      tabIndex={0}
    >
      {/* Search Bar Drawer */}
      {isSearchOpen && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 'var(--font-size-xs)'
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar en el documento…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) handlePrevMatch()
                else handleNextMatch()
              }
            }}
            style={{
              flex: 1,
              maxWidth: '300px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: 'inherit',
              outline: 'none'
            }}
          />

          <span style={{ color: 'var(--text-secondary)' }}>
            {searchMatches.length > 0
              ? `${currentMatchIdx + 1} de ${searchMatches.length}`
              : searchQuery
                ? 'Sin coincidencias'
                : ''}
          </span>

          <button
            type="button"
            onClick={handlePrevMatch}
            disabled={searchMatches.length === 0}
            title="Anterior (Mayús+Enter)"
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: searchMatches.length === 0 ? 'not-allowed' : 'pointer',
              opacity: searchMatches.length === 0 ? 0.4 : 1
            }}
          >
            ↑
          </button>

          <button
            type="button"
            onClick={handleNextMatch}
            disabled={searchMatches.length === 0}
            title="Siguiente (Enter)"
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: searchMatches.length === 0 ? 'not-allowed' : 'pointer',
              opacity: searchMatches.length === 0 ? 0.4 : 1
            }}
          >
            ↓
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false)
              textareaRef.current?.focus()
            }}
            title="Cerrar búsqueda (Esc)"
            style={{
              padding: '3px 8px',
              marginLeft: 'auto',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor Textarea */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={handleTextareaSelect}
          onClick={handleTextareaSelect}
          onKeyUp={handleTextareaSelect}
          spellCheck={false}
          wrap={wordWrap ? 'soft' : 'off'}
          style={{
            width: '100%',
            height: '100%',
            padding: '12px 16px',
            boxSizing: 'border-box',
            border: 'none',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
            fontSize: `${14 * (zoomLevel / 100)}px`,
            lineHeight: 1.6,
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            overflow: 'auto'
          }}
          placeholder="Escribe aquí tu texto..."
        />
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 14px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>
            Lín. {cursorPos.line}, Col. {cursorPos.col}
          </span>
          <span>{content.length} caracteres</span>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <span>{zoomLevel}%</span>
          <span>Ajuste de línea: {wordWrap ? 'Activado' : 'Desactivado'}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}
