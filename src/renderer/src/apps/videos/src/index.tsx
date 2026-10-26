import { useState, useEffect, useRef, useCallback } from 'react'
import { useOS, useLaunchArgs, useOpenFileHandler, useSystemVolume, type FsNode } from '@os/sdk'
import { EmptyState, Button, IconButton } from '@os/ui'

const SUPPORTED_VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov']

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const sStr = s < 10 ? `0${s}` : `${s}`
  if (h > 0) {
    const mStr = m < 10 ? `0${m}` : `${m}`
    return `${h}:${mStr}:${sStr}`
  }
  return `${m}:${sStr}`
}

export default function VideosApp(): JSX.Element {
  const os = useOS()
  const launchArgs = useLaunchArgs()
  const systemVolume = useSystemVolume()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const revokeRef = useRef<(() => void) | null>(null)
  const hideControlsTimerRef = useRef<number | null>(null)

  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [currentNode, setCurrentNode] = useState<FsNode | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [folderVideos, setFolderVideos] = useState<FsNode[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(-1)

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [localVolume, setLocalVolume] = useState<number>(100)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1)

  // UI state
  const [showControls, setShowControls] = useState<boolean>(true)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false)
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false)

  // Quick library scan for empty state
  const [libraryVideos, setLibraryVideos] = useState<Array<{ node: FsNode; path: string }>>([])

  const cleanupObjectUrl = useCallback(() => {
    if (revokeRef.current) {
      revokeRef.current()
      revokeRef.current = null
    }
  }, [])

  // Sync volume with video element
  useEffect(() => {
    if (videoRef.current) {
      const effective = isMuted ? 0 : Math.max(0, Math.min(1, (localVolume / 100) * systemVolume))
      videoRef.current.volume = effective
    }
  }, [localVolume, isMuted, systemVolume])

  // Load a video
  const loadVideo = useCallback(
    async (filePath: string) => {
      try {
        const resolved = os.fs.fromDisplayPath(filePath)
        const node = await os.fs.stat(resolved)
        if (node.kind !== 'file') return

        const ext = node.name.split('.').pop()?.toLowerCase() || ''
        if (!SUPPORTED_VIDEO_EXTS.includes(ext)) return

        cleanupObjectUrl()
        const obj = await os.fs.getObjectUrl(resolved)
        revokeRef.current = obj.revoke

        setCurrentPath(resolved)
        setCurrentNode(node)
        setVideoUrl(obj.url)
        setCurrentTime(0)
        setIsPlaying(true)

        os.window.setTitle(`${node.name} - Películas y TV`)

        // Load folder playlist
        const parentDir = resolved.substring(0, resolved.lastIndexOf('/')) || '/'
        try {
          const list = await os.fs.list(parentDir)
          const vids = list.filter((n) => {
            const e = n.name.split('.').pop()?.toLowerCase() || ''
            return n.kind === 'file' && SUPPORTED_VIDEO_EXTS.includes(e)
          })
          setFolderVideos(vids)
          const idx = vids.findIndex((n) => n.id === node.id || n.name === node.name)
          setCurrentIndex(idx)
        } catch {
          setFolderVideos([])
          setCurrentIndex(-1)
        }
      } catch (err) {
        console.error('[Películas y TV] Error al cargar video:', err)
      }
    },
    [cleanupObjectUrl, os.fs, os.window]
  )

  // Initial load
  useEffect(() => {
    if (launchArgs.filePath && typeof launchArgs.filePath === 'string') {
      loadVideo(launchArgs.filePath)
    }
  }, [launchArgs.filePath, loadVideo])

  useOpenFileHandler((path: string) => {
    loadVideo(path)
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupObjectUrl()
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current)
      }
    }
  }, [cleanupObjectUrl])

  // Scan ~/Videos on launch for empty state
  useEffect(() => {
    let mounted = true
    const scanVideos = async () => {
      try {
        const found: Array<{ node: FsNode; path: string }> = []
        const scanDir = async (dir: string) => {
          try {
            const items = await os.fs.list(dir)
            for (const item of items) {
              const fullPath = `${dir === '/' ? '' : dir}/${item.name}`
              if (item.kind === 'folder') {
                await scanDir(fullPath)
              } else {
                const ext = item.name.split('.').pop()?.toLowerCase() || ''
                if (SUPPORTED_VIDEO_EXTS.includes(ext)) {
                  found.push({ node: item, path: fullPath })
                }
              }
            }
          } catch {
            // ignore
          }
        }
        await scanDir('~/Videos')
        if (mounted) {
          setLibraryVideos(found)
        }
      } catch {
        // ignore
      }
    }
    scanVideos()
    return () => {
      mounted = false
    }
  }, [os.fs])

  // Controls auto-hide logic
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current)
    }
    if (isPlaying && !isScrubbing) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying, isScrubbing])

  const handleMouseMove = () => {
    resetControlsTimer()
  }

  const handleMouseLeave = () => {
    if (isPlaying && !isScrubbing) {
      setShowControls(false)
    }
  }

  // Playback handlers
  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
      setShowControls(true)
    } else {
      videoRef.current.play().catch(() => {})
      setIsPlaying(true)
      resetControlsTimer()
    }
  }

  const handleSkip = (deltaSeconds: number) => {
    if (!videoRef.current) return
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + deltaSeconds))
    videoRef.current.currentTime = target
    setCurrentTime(target)
    resetControlsTimer()
  }

  const handleSeek = (newFraction: number) => {
    if (!videoRef.current || duration <= 0) return
    const target = Math.max(0, Math.min(duration, newFraction * duration))
    videoRef.current.currentTime = target
    setCurrentTime(target)
  }

  const playIndex = (index: number) => {
    if (index >= 0 && index < folderVideos.length) {
      const node = folderVideos[index]
      if (currentPath) {
        const parentDir = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
        const full = `${parentDir === '/' ? '' : parentDir}/${node.name}`
        loadVideo(full)
      }
    }
  }

  const handleNext = () => {
    if (currentIndex < folderVideos.length - 1) {
      playIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      playIndex(currentIndex - 1)
    }
  }

  const handleOpenDialog = async () => {
    try {
      const res = await os.dialogs.openFile({
        extensions: SUPPORTED_VIDEO_EXTS,
        multiple: false
      })
      if (res && res.length > 0) {
        loadVideo(res[0])
      }
    } catch {
      // canceled
    }
  }

  // Cycle speed
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.5]
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIdx]
    setPlaybackRate(nextRate)
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000000',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* If no video is selected, show library / empty state */}
      {!videoUrl ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--bg-canvas)'
          }}
        >
          <EmptyState
            title="Películas y TV"
            description="Reproduce tus videos y grabaciones en formatos MP4, WebM, OGG y MOV."
            action={
              <Button variant="primary" onClick={handleOpenDialog}>
                Abrir video…
              </Button>
            }
          />

          {libraryVideos.length > 0 && (
            <div
              style={{
                marginTop: '32px',
                width: '100%',
                maxWidth: '680px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                padding: '16px'
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}
              >
                Videos encontrados en ~/Videos ({libraryVideos.length})
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '12px',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}
              >
                {libraryVideos.map((item) => (
                  <div
                    key={item.path}
                    onClick={() => loadVideo(item.path)}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'
                    }}
                  >
                    <div style={{ fontSize: '24px', textAlign: 'center' }}>🎬</div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={item.node.name}
                    >
                      {item.node.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {(item.node.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Video Player Area */
        <div
          style={{
            flex: 1,
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000'
          }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            playsInline
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current && !isScrubbing) {
                setCurrentTime(videoRef.current.currentTime)
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration)
                const effective = isMuted
                  ? 0
                  : Math.max(0, Math.min(1, (localVolume / 100) * systemVolume))
                videoRef.current.volume = effective
                videoRef.current.playbackRate = playbackRate
              }
            }}
            onEnded={() => {
              setIsPlaying(false)
              if (currentIndex < folderVideos.length - 1) {
                handleNext()
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: showControls ? 'default' : 'none'
            }}
          />

          {/* Top Info Bar (shows video title and open/playlist buttons) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'opacity 0.25s ease',
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? 'auto' : 'none',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎬</span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}
              >
                {currentNode?.name}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Button
                variant="subtle"
                size="small"
                onClick={handleOpenDialog}
                style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                Abrir…
              </Button>
              {folderVideos.length > 1 && (
                <Button
                  variant={showPlaylist ? 'primary' : 'subtle'}
                  size="small"
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  style={{
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  ☰ Lista ({currentIndex + 1}/{folderVideos.length})
                </Button>
              )}
            </div>
          </div>

          {/* Side Playlist Overlay */}
          {showPlaylist && folderVideos.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: '12px',
                bottom: '80px',
                width: '280px',
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f4f4f5' }}>
                  Videos en esta carpeta
                </span>
                <IconButton
                  title="Cerrar lista"
                  icon="✕"
                  size="small"
                  onClick={() => setShowPlaylist(false)}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                {folderVideos.map((vid, idx) => {
                  const isCurrent = idx === currentIndex
                  return (
                    <div
                      key={vid.id || vid.name}
                      onClick={() => playIndex(idx)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        marginBottom: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        backgroundColor: isCurrent ? 'var(--accent-color)' : 'transparent',
                        color: isCurrent ? '#ffffff' : '#e4e4e7',
                        fontWeight: isCurrent ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>{isCurrent ? '▶' : '🎬'}</span>
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {vid.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bottom Floating Control Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px 20px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'opacity 0.25s ease',
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? 'auto' : 'none',
              zIndex: 10
            }}
          >
            {/* Progress Scrubber */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: '#e4e4e7',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '40px',
                  textAlign: 'right'
                }}
              >
                {formatTime(currentTime)}
              </span>

              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseDown={(e) => {
                  setIsScrubbing(true)
                  const rect = e.currentTarget.getBoundingClientRect()
                  const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  handleSeek(fraction)

                  const handleMouseMoveScrub = (moveEvent: MouseEvent) => {
                    const f = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width))
                    handleSeek(f)
                  }

                  const handleMouseUpScrub = () => {
                    setIsScrubbing(false)
                    window.removeEventListener('mousemove', handleMouseMoveScrub)
                    window.removeEventListener('mouseup', handleMouseUpScrub)
                  }

                  window.addEventListener('mousemove', handleMouseMoveScrub)
                  window.addEventListener('mouseup', handleMouseUpScrub)
                }}
              >
                {/* Track background */}
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    position: 'relative'
                  }}
                >
                  {/* Progress fill */}
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '2px',
                      backgroundColor: 'var(--accent-color)',
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
                    }}
                  />
                  {/* Thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
                    }}
                  />
                </div>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  color: '#e4e4e7',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '40px'
                }}
              >
                {formatTime(duration)}
              </span>
            </div>

            {/* Buttons Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '2px'
              }}
            >
              {/* Left: Prev, Skip -10, Play/Pause, Skip +10, Next */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconButton
                  title="Video anterior"
                  icon="⏮"
                  disabled={currentIndex <= 0}
                  onClick={handlePrev}
                />
                <IconButton
                  title="Retroceder 10 segundos"
                  icon="⏪"
                  onClick={() => handleSkip(-10)}
                />
                <Button
                  variant="primary"
                  onClick={togglePlay}
                  style={{
                    minWidth: '70px',
                    fontWeight: 600
                  }}
                >
                  {isPlaying ? '⏸ Pausa' : '▶ Reproducir'}
                </Button>
                <IconButton
                  title="Adelantar 10 segundos"
                  icon="⏩"
                  onClick={() => handleSkip(10)}
                />
                <IconButton
                  title="Siguiente video"
                  icon="⏭"
                  disabled={currentIndex >= folderVideos.length - 1}
                  onClick={handleNext}
                />
              </div>

              {/* Right: Volume, Speed, Fullscreen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconButton
                    title={isMuted ? 'Activar sonido' : 'Silenciar'}
                    icon={isMuted || localVolume === 0 ? '🔇' : localVolume < 50 ? '🔉' : '🔊'}
                    onClick={() => setIsMuted(!isMuted)}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : localVolume}
                    onChange={(e) => {
                      setLocalVolume(Number(e.target.value))
                      if (isMuted) setIsMuted(false)
                    }}
                    style={{
                      width: '75px',
                      accentColor: 'var(--accent-color)',
                      cursor: 'pointer'
                    }}
                    title={`Volumen: ${isMuted ? 0 : localVolume}%`}
                  />
                </div>

                {/* Playback speed */}
                <Button
                  variant="subtle"
                  size="small"
                  onClick={cyclePlaybackRate}
                  style={{
                    color: '#ffffff',
                    fontSize: '11px',
                    borderColor: 'rgba(255,255,255,0.2)',
                    minWidth: '44px'
                  }}
                  title="Velocidad de reproducción"
                >
                  {playbackRate}x
                </Button>

                {/* Fullscreen inside window */}
                <IconButton
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  icon={isFullscreen ? '🗗' : '🗖'}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
