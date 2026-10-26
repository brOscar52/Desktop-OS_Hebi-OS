import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useOS, useLaunchArgs, useOpenFileHandler, useSystemVolume } from '@os/sdk'
import { EmptyState, Button, IconButton, TextField, Slider } from '@os/ui'

const SUPPORTED_AUDIO_EXTS = ['mp3', 'ogg', 'wav', 'flac', 'm4a']

interface TrackItem {
  id: string
  path: string
  title: string
  fileName: string
  size: number
  modifiedAt: number
}

type RepeatMode = 'none' | 'all' | 'one'

export default function MusicApp(): JSX.Element {
  const os = useOS()
  const launchArgs = useLaunchArgs()
  const systemVolume = useSystemVolume()

  const [activeTab, setActiveTab] = useState<'library' | 'queue'>('library')
  const [libraryTracks, setLibraryTracks] = useState<TrackItem[]>([])
  const [queue, setQueue] = useState<TrackItem[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isLoadingLib, setIsLoadingLib] = useState<boolean>(true)

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [localVolume, setLocalVolume] = useState<number>(80) // 0 - 100
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isShuffle, setIsShuffle] = useState<boolean>(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentObjectUrlRef = useRef<string | null>(null)
  const revokeFnRef = useRef<(() => void) | null>(null)

  const currentTrack: TrackItem | null =
    currentTrackIndex >= 0 && currentTrackIndex < queue.length ? queue[currentTrackIndex] : null

  // Calculate effective volume: (localVolume / 100) * systemVolume
  const effectiveVolume = useMemo(() => {
    if (isMuted) return 0
    return Math.max(0, Math.min(1, (localVolume / 100) * systemVolume))
  }, [isMuted, localVolume, systemVolume])

  // Sync effective volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume
    }
  }, [effectiveVolume])

  // Cleanup object url helper
  const cleanupUrl = useCallback(() => {
    if (revokeFnRef.current) {
      revokeFnRef.current()
      revokeFnRef.current = null
    }
    currentObjectUrlRef.current = null
  }, [])

  // Scan library from ~/Música recursively
  const scanLibrary = useCallback(async () => {
    setIsLoadingLib(true)
    const scanned: TrackItem[] = []

    const walk = async (dirPath: string) => {
      try {
        const list = await os.fs.list(dirPath)
        for (const node of list) {
          if (node.kind === 'folder') {
            await walk(`${dirPath}/${node.name}`)
          } else if (node.kind === 'file') {
            const ext = node.name.split('.').pop()?.toLowerCase() || ''
            if (SUPPORTED_AUDIO_EXTS.includes(ext)) {
              scanned.push({
                id: node.id,
                path: `${dirPath}/${node.name}`,
                title: node.name.replace(/\.[^/.]+$/, ''),
                fileName: node.name,
                size: node.size,
                modifiedAt: node.modifiedAt
              })
            }
          }
        }
      } catch {
        // directory may not exist
      }
    }

    try {
      const musicPath = os.fs.fromDisplayPath('~/Música')
      await walk(musicPath)
      setLibraryTracks(scanned)
    } catch {
      setLibraryTracks([])
    } finally {
      setIsLoadingLib(false)
    }
  }, [os.fs])

  // Initial scan and watch fs
  useEffect(() => {
    scanLibrary()
    const unsub = os.events.on('fs:changed', () => {
      scanLibrary()
    })
    return () => unsub()
  }, [os.events, scanLibrary])

  // Play a specific track index from queue
  const playTrackAtIndex = useCallback(
    async (index: number) => {
      if (index < 0 || index >= queue.length) return
      const track = queue[index]

      try {
        cleanupUrl()
        const resolved = os.fs.fromDisplayPath(track.path)
        const obj = await os.fs.getObjectUrl(resolved)
        revokeFnRef.current = obj.revoke
        currentObjectUrlRef.current = obj.url

        setCurrentTrackIndex(index)
        setCurrentTime(0)

        os.window.setTitle(`${track.title} - Música`)

        if (audioRef.current) {
          audioRef.current.src = obj.url
          audioRef.current.load()
          audioRef.current.play().then(() => {
            setIsPlaying(true)
          }).catch((err) => {
            console.warn('[Música] Play error:', err)
          })
        }
      } catch (err) {
        console.error('[Música] Error playing track:', err)
      }
    },
    [cleanupUrl, os.fs, os.window, queue]
  )

  // Load a file from external launch or dialog
  const loadAndPlayFile = useCallback(
    async (filePath: string) => {
      try {
        const resolved = os.fs.fromDisplayPath(filePath)
        const node = await os.fs.stat(resolved)
        if (node.kind !== 'file') return

        const newTrack: TrackItem = {
          id: node.id,
          path: resolved,
          title: node.name.replace(/\.[^/.]+$/, ''),
          fileName: node.name,
          size: node.size,
          modifiedAt: node.modifiedAt
        }

        setQueue((prev) => {
          const existingIdx = prev.findIndex((t) => t.path === resolved)
          if (existingIdx >= 0) {
            setTimeout(() => playTrackAtIndex(existingIdx), 50)
            return prev
          } else {
            const next = [...prev, newTrack]
            setTimeout(() => playTrackAtIndex(next.length - 1), 50)
            return next
          }
        })
      } catch (err) {
        console.error('[Música] Error loading external file:', err)
      }
    },
    [os.fs, playTrackAtIndex]
  )

  // LaunchArgs and openFileHandler
  useEffect(() => {
    if (launchArgs.filePath && typeof launchArgs.filePath === 'string') {
      loadAndPlayFile(launchArgs.filePath)
    }
  }, [launchArgs.filePath, loadAndPlayFile])

  useOpenFileHandler((path: string) => {
    loadAndPlayFile(path)
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupUrl()
    }
  }, [cleanupUrl])

  // Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) {
      if (queue.length > 0) {
        playTrackAtIndex(0)
      } else if (libraryTracks.length > 0) {
        setQueue([...libraryTracks])
        setTimeout(() => playTrackAtIndex(0), 50)
      }
      return
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {})
    }
  }

  // Next track logic (taking repeat & shuffle into account)
  const handleNext = useCallback(() => {
    if (queue.length === 0) return

    if (repeatMode === 'one' && currentTrackIndex >= 0) {
      playTrackAtIndex(currentTrackIndex)
      return
    }

    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * queue.length)
      playTrackAtIndex(nextIdx)
      return
    }

    if (currentTrackIndex < queue.length - 1) {
      playTrackAtIndex(currentTrackIndex + 1)
    } else if (repeatMode === 'all') {
      playTrackAtIndex(0)
    } else {
      setIsPlaying(false)
    }
  }, [currentTrackIndex, isShuffle, playTrackAtIndex, queue.length, repeatMode])

  // Prev track logic
  const handlePrev = useCallback(() => {
    if (queue.length === 0) return

    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        setCurrentTime(0)
      }
      return
    }

    if (currentTrackIndex > 0) {
      playTrackAtIndex(currentTrackIndex - 1)
    } else if (repeatMode === 'all') {
      playTrackAtIndex(queue.length - 1)
    }
  }, [currentTime, currentTrackIndex, playTrackAtIndex, queue.length, repeatMode])

  // Play a library track now (clearing queue or replacing)
  const handlePlayLibraryTrack = (track: TrackItem) => {
    setQueue([track, ...libraryTracks.filter((t) => t.id !== track.id)])
    setTimeout(() => playTrackAtIndex(0), 50)
  }

  // Add to queue
  const handleAddToQueue = (track: TrackItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setQueue((prev) => [...prev, track])
    if (queue.length === 0) {
      setTimeout(() => playTrackAtIndex(0), 50)
    }
  }

  // Remove from queue
  const handleRemoveFromQueue = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setQueue((prev) => prev.filter((_, i) => i !== index))
    if (index === currentTrackIndex) {
      if (queue.length > 1) {
        handleNext()
      } else {
        cleanupUrl()
        setIsPlaying(false)
        setCurrentTrackIndex(-1)
        os.window.setTitle('Música')
      }
    } else if (index < currentTrackIndex) {
      setCurrentTrackIndex((prev) => prev - 1)
    }
  }

  // Open external file dialog
  const handleOpenFileDialog = async () => {
    const selected = await os.dialogs.openFile({
      extensions: SUPPORTED_AUDIO_EXTS
    })
    if (selected && selected[0]) {
      loadAndPlayFile(selected[0])
    }
  }

  // Format time mm:ss
  const formatTime = (sec: number): string => {
    if (isNaN(sec) || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Filter library by search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return libraryTracks
    const q = searchQuery.toLowerCase()
    return libraryTracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.fileName.toLowerCase().includes(q)
    )
  }, [libraryTracks, searchQuery])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Hidden audio element that remains active even when minimized */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        }}
        onDurationChange={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration)
          }
        }}
        onEnded={handleNext}
      />

      {/* Top Header & Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'library' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'library' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'library' ? 600 : 400,
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer'
            }}
          >
            🎵 Mi biblioteca ({libraryTracks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'queue' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'queue' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'queue' ? 600 : 400,
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer'
            }}
          >
            📋 Cola de reproducción ({queue.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'library' && (
            <div style={{ width: '200px' }}>
              <TextField
                placeholder="Buscar música…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          <Button variant="subtle" onClick={scanLibrary} title="Escanear carpeta ~/Música">
            ↻ Actualizar
          </Button>

          <Button variant="primary" onClick={handleOpenFileDialog}>
            Abrir archivo…
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 48px 16px' }}>
        {activeTab === 'library' ? (
          filteredTracks.length === 0 ? (
            <EmptyState
              title={isLoadingLib ? 'Buscando canciones…' : 'Tu biblioteca de música está vacía'}
              description={
                isLoadingLib
                  ? 'Escaneando archivos en ~/Música…'
                  : 'Coloca pistas de audio en ~/Música o abre un archivo directamente.'
              }
              action={
                <Button variant="primary" onClick={handleOpenFileDialog}>
                  Abrir canción…
                </Button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredTracks.map((track) => {
                const isCurrent = currentTrack?.id === track.id
                return (
                  <div
                    key={track.id}
                    onClick={() => handlePlayLibraryTrack(track)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurrent ? 'var(--accent-subtle)' : 'var(--bg-card)',
                      border: isCurrent
                        ? '1px solid var(--accent-border)'
                        : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span style={{ fontSize: '18px' }}>{isCurrent && isPlaying ? '🔊' : '🎶'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: isCurrent ? 600 : 500,
                            fontSize: 'var(--font-size-sm)',
                            color: isCurrent ? 'var(--accent-color)' : 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {track.title}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {os.fs.toDisplayPath(track.path)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {formatSize(track.size)}
                      </span>
                      <Button
                        variant="subtle"
                        onClick={(e) => handleAddToQueue(track, e)}
                        title="Añadir a la cola"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        + Cola
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : queue.length === 0 ? (
          <EmptyState
            title="La cola de reproducción está vacía"
            description="Selecciona pistas de tu biblioteca o abre un archivo para empezar a escuchar."
            action={
              <Button variant="primary" onClick={() => setActiveTab('library')}>
                Ir a Mi biblioteca
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {queue.map((track, idx) => {
              const isCurrent = idx === currentTrackIndex
              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrackAtIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isCurrent ? 'var(--accent-subtle)' : 'var(--bg-card)',
                    border: isCurrent
                      ? '1px solid var(--accent-border)'
                      : '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', width: '20px' }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '16px' }}>{isCurrent && isPlaying ? '▶' : '🎵'}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span
                        style={{
                          fontWeight: isCurrent ? 600 : 500,
                          fontSize: 'var(--font-size-sm)',
                          color: isCurrent ? 'var(--accent-color)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {track.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {formatSize(track.size)}
                      </span>
                    </div>
                  </div>

                  <IconButton
                    icon="✕"
                    aria-label="Quitar de la cola"
                    onClick={(e) => handleRemoveFromQueue(idx, e)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Sticky Player Bar */}
      <div
        style={{
          height: '76px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--material-acrylic)',
          backdropFilter: 'var(--backdrop-filter-acrylic)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          gap: '20px'
        }}
      >
        {/* Left: Track Info */}
        <div style={{ width: '220px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0
            }}
          >
            🎵
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 'var(--font-size-xs)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={currentTrack?.title || 'Ninguna pista seleccionada'}
            >
              {currentTrack?.title || 'Sin reproducción'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {currentTrack ? 'Pista local' : 'Elige una canción'}
            </span>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div
          style={{
            flex: 1,
            maxWidth: '560px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconButton
              icon="🔀"
              aria-label="Aleatorio"
              title={`Aleatorio: ${isShuffle ? 'Activado' : 'Desactivado'}`}
              onClick={() => setIsShuffle((prev) => !prev)}
              style={{
                color: isShuffle ? 'var(--accent-color)' : 'var(--text-tertiary)',
                backgroundColor: isShuffle ? 'var(--accent-subtle)' : 'transparent'
              }}
            />

            <IconButton icon="⏮" aria-label="Anterior" onClick={handlePrev} />

            <button
              type="button"
              onClick={togglePlay}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-color)',
                color: 'var(--accent-text)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px'
              }}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <IconButton icon="⏭" aria-label="Siguiente" onClick={handleNext} />

            <IconButton
              icon={repeatMode === 'one' ? '🔂' : '🔁'}
              aria-label="Repetir"
              title={`Repetir: ${repeatMode === 'none' ? 'Desactivado' : repeatMode === 'all' ? 'Toda la cola' : 'Canción actual'}`}
              onClick={() =>
                setRepeatMode((prev) => (prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none'))
              }
              style={{
                color: repeatMode !== 'none' ? 'var(--accent-color)' : 'var(--text-tertiary)',
                backgroundColor: repeatMode !== 'none' ? 'var(--accent-subtle)' : 'transparent'
              }}
            />
          </div>

          {/* Time Scrubber */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', minWidth: '32px', textAlign: 'right' }}>
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const t = parseFloat(e.target.value)
                setCurrentTime(t)
                if (audioRef.current) {
                  audioRef.current.currentTime = t
                }
              }}
              style={{
                flex: 1,
                accentColor: 'var(--accent-color)',
                height: '4px',
                cursor: 'pointer'
              }}
            />

            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', minWidth: '32px' }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Queue Toggle */}
        <div style={{ width: '220px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <IconButton
            icon={isMuted || effectiveVolume === 0 ? '🔇' : effectiveVolume < 0.5 ? '🔉' : '🔊'}
            aria-label="Silenciar"
            onClick={() => setIsMuted((prev) => !prev)}
          />

          <div style={{ width: '90px' }}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : localVolume}
              onChange={(val) => {
                setIsMuted(false)
                setLocalVolume(val)
              }}
            />
          </div>

          <IconButton
            icon="📑"
            aria-label="Ver cola"
            title="Alternar vista de cola"
            onClick={() => setActiveTab((t) => (t === 'queue' ? 'library' : 'queue'))}
            style={{
              backgroundColor: activeTab === 'queue' ? 'var(--accent-subtle)' : 'transparent',
              color: activeTab === 'queue' ? 'var(--accent-color)' : 'inherit'
            }}
          />
        </div>
      </div>
    </div>
  )
}
