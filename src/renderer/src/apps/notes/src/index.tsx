import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useOS } from '@os/sdk'
import { EmptyState } from '@os/ui'

interface NoteItem {
  id: string
  content: string
  pinned: boolean
  createdAt: number
  modifiedAt: number
}

export default function NotesApp(): JSX.Element {
  const os = useOS()

  const [notes, setNotes] = useState<NoteItem[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Title
  useEffect(() => {
    os.window.setTitle('Notas')
  }, [os.window])

  // Load notes from storage
  const loadNotes = useCallback(async () => {
    const saved = await os.storage.get<NoteItem[]>('notes_list')
    if (saved && Array.isArray(saved)) {
      setNotes(saved)
      if (saved.length > 0 && !selectedNoteId) {
        setSelectedNoteId(saved[0].id)
      }
    } else {
      // Initial sample note
      const initial: NoteItem = {
        id: `note-${Date.now()}`,
        content: 'Bienvenido a Notas\n\nEsta aplicación guarda tus notas automáticamente.\nPuedes fijar notas importantes y buscarlas rápidamente.',
        pinned: false,
        createdAt: Date.now(),
        modifiedAt: Date.now()
      }
      setNotes([initial])
      setSelectedNoteId(initial.id)
      await os.storage.set('notes_list', [initial])
    }
  }, [os.storage, selectedNoteId])

  useEffect(() => {
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist notes helper
  const saveNotes = async (next: NoteItem[]) => {
    setNotes(next)
    await os.storage.set('notes_list', next)
  }

  // Create new note
  const handleCreateNote = async () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: '',
      pinned: false,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    }
    const next = [newNote, ...notes]
    setSelectedNoteId(newNote.id)
    await saveNotes(next)
  }

  // Toggle pin
  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    await saveNotes(next)
  }

  // Delete note with destructive confirm
  const handleDeleteNote = async (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const title = extractTitle(note.content)
    const confirmed = await os.dialogs.confirm({
      title: 'Eliminar nota',
      message: `¿Estás seguro de que deseas eliminar la nota "${title}"?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    })

    if (!confirmed) return

    const next = notes.filter((n) => n.id !== note.id)
    await saveNotes(next)

    if (selectedNoteId === note.id) {
      setSelectedNoteId(next.length > 0 ? next[0].id : null)
    }
  }

  // Content edit with auto-save (never isDirty)
  const handleContentChange = (newContent: string) => {
    if (!selectedNoteId) return
    const now = Date.now()
    const next = notes.map((n) =>
      n.id === selectedNoteId ? { ...n, content: newContent, modifiedAt: now } : n
    )
    saveNotes(next)
  }

  // Helpers
  const extractTitle = (text: string): string => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    return lines.length > 0 ? lines[0] : 'Nota sin título'
  }

  const extractSnippet = (text: string): string => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    return lines.length > 1 ? lines.slice(1).join(' ') : 'Sin contenido adicional'
  }

  // Filter and sort notes: pinned first, then by modifiedAt desc
  const filteredNotes = useMemo(() => {
    let list = notes
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((n) => n.content.toLowerCase().includes(q))
    }

    const pinned = list
      .filter((n) => n.pinned)
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
    const unpinned = list
      .filter((n) => !n.pinned)
      .sort((a, b) => b.modifiedAt - a.modifiedAt)

    return { pinned, unpinned }
  }, [notes, searchQuery])

  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null
  }, [notes, selectedNoteId])

  const formatDate = (ts: number): string => {
    const d = new Date(ts)
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Left Sidebar: Notes list */}
      <div
        style={{
          width: '260px',
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header & Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Mis notas</span>
            <button
              type="button"
              onClick={handleCreateNote}
              title="Nueva nota"
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-color)',
                color: 'var(--accent-text)',
                border: 'none',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Nueva
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar notas…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Notes Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {filteredNotes.pinned.length === 0 && filteredNotes.unpinned.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {searchQuery ? 'No se encontraron notas' : 'No hay notas aún'}
            </div>
          ) : (
            <>
              {/* Pinned section */}
              {filteredNotes.pinned.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '4px 8px', textTransform: 'uppercase' }}>
                    Fijadas
                  </div>
                  {filteredNotes.pinned.map((note) => {
                    const isSelected = note.id === selectedNoteId
                    return (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                          border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                          cursor: 'pointer',
                          marginBottom: '4px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '180px'
                            }}
                          >
                            {extractTitle(note.content)}
                          </span>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={(e) => handleTogglePin(note.id, e)}
                              title="Desfijar"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: 'var(--accent-color)',
                                padding: 0
                              }}
                            >
                              📌
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNote(note, e)}
                              title="Eliminar"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: 'var(--text-tertiary)',
                                padding: 0
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '2px'
                          }}
                        >
                          {extractSnippet(note.content)}
                        </span>

                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          {formatDate(note.modifiedAt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Unpinned section */}
              {filteredNotes.unpinned.length > 0 && (
                <div>
                  {filteredNotes.pinned.length > 0 && (
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '4px 8px', textTransform: 'uppercase' }}>
                      Otras
                    </div>
                  )}
                  {filteredNotes.unpinned.map((note) => {
                    const isSelected = note.id === selectedNoteId
                    return (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                          border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                          cursor: 'pointer',
                          marginBottom: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '180px'
                            }}
                          >
                            {extractTitle(note.content)}
                          </span>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={(e) => handleTogglePin(note.id, e)}
                              title="Fijar nota"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: 'var(--text-tertiary)',
                                padding: 0
                              }}
                            >
                              📌
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNote(note, e)}
                              title="Eliminar"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: 'var(--text-tertiary)',
                                padding: 0
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '2px'
                          }}
                        >
                          {extractSnippet(note.content)}
                        </span>

                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          {formatDate(note.modifiedAt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Pane: Note Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)' }}>
        {selectedNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Modificado: {formatDate(selectedNote.modifiedAt)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--accent-color)' }}>
                Autoguardado
              </span>
            </div>

            <textarea
              value={selectedNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Escribe el título en la primera línea y tus notas aquí..."
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: 1.6,
                boxSizing: 'border-box'
              }}
            />
          </div>
        ) : (
          <EmptyState
            title="Ninguna nota seleccionada"
            description="Selecciona una nota de la lista izquierda o crea una nueva para comenzar."
          />
        )}
      </div>
    </div>
  )
}
