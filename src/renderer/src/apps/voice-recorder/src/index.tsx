import { useState, useEffect, useRef, useCallback } from 'react'
import { useOS, useSystemVolume, type FsNode } from '@os/sdk'
import { Button, IconButton, EmptyState } from '@os/ui'

type RecordingState = 'idle' | 'recording' | 'paused'

interface AudioItem {
  node: FsNode
  path: string
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const mStr = m < 10 ? `0${m}` : `${m}`
  const sStr = s < 10 ? `0${s}` : `${s}`
  return `${mStr}:${sStr}`
}

function getFormattedDateFilename(): string {
  const now = new Date()
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const hh = pad(now.getHours())
  const min = pad(now.getMinutes())
  const ss = pad(now.getSeconds())
  return `Grabación_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.webm`
}

export default function VoiceRecorderApp(): JSX.Element {
  const os = useOS()
  const systemVolume = useSystemVolume()

  // Recording state
  const [recState, setRecState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // MediaRecorder & Web Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<number | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Recordings list
  const [recordings, setRecordings] = useState<AudioItem[]>([])
  const [activeTab, setActiveTab] = useState<'record' | 'list'>('record')

  // Player state for playback of selected recording
  const [playingItem, setPlayingItem] = useState<AudioItem | null>(null)
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const revokePlayerRef = useRef<(() => void) | null>(null)

  // Load existing recordings from ~/Música/Grabaciones
  const loadRecordings = useCallback(async () => {
    try {
      const folderPath = '~/Música/Grabaciones'
      const exists = await os.fs.exists(folderPath)
      if (!exists) {
        await os.fs.mkdir(folderPath, { recursive: true })
        setRecordings([])
        return
      }

      const list = await os.fs.list(folderPath)
      const webmItems = list
        .filter((n) => n.kind === 'file' && n.name.toLowerCase().endsWith('.webm'))
        .sort((a, b) => b.modifiedAt - a.modifiedAt)
        .map((node) => ({
          node,
          path: `${folderPath}/${node.name}`
        }))

      setRecordings(webmItems)
    } catch (err) {
      console.error('[Grabadora] Error al listar grabaciones:', err)
      setRecordings([])
    }
  }, [os.fs])

  useEffect(() => {
    loadRecordings()
  }, [loadRecordings])

  // Stop media stream tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
      }
      if (revokePlayerRef.current) {
        revokePlayerRef.current()
      }
    }
  }, [stopStream])

  // Waveform drawing loop
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render)
      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#0D9488' // hebi OS turquoise accent
      ctx.beginPath()

      const sliceWidth = (canvas.width * 1.0) / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    render()
  }, [])

  // Start recording
  const startRecording = async () => {
    setErrorMessage(null)
    try {
      const stream = await os.media.getMicrophone()
      streamRef.current = stream

      // Set up Web Audio Analyser
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      drawWaveform()

      // Set up MediaRecorder
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        stopStream()
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size > 0) {
          const filename = getFormattedDateFilename()
          const folderPath = '~/Música/Grabaciones'
          try {
            await os.fs.mkdir(folderPath, { recursive: true })
            await os.fs.writeFile(`${folderPath}/${filename}`, audioBlob)
            await loadRecordings()
            os.notify({
              title: 'Grabación guardada',
              body: `${filename} guardada en ~/Música/Grabaciones`,
              sound: true
            })
          } catch (saveErr) {
            console.error('[Grabadora] Error al guardar audio:', saveErr)
            await os.dialogs.alert({
              title: 'Error al guardar grabación',
              message: 'No se pudo escribir el archivo de audio en ~/Música/Grabaciones.'
            })
          }
        }

        setRecState('idle')
        setDuration(0)
      }

      recorder.start(200)
      setRecState('recording')
      setDuration(0)

      timerIntervalRef.current = window.setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err: unknown) {
      console.error('[Grabadora] Error al acceder al micrófono:', err)
      setErrorMessage(
        (err as Error).message ||
          'No se pudo acceder al micrófono. Verifica que esté conectado y disponible.'
      )
      setRecState('idle')
    }
  }

  // Pause / Resume recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecState('paused')
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecState('recording')
      timerIntervalRef.current = window.setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && (recState === 'recording' || recState === 'paused')) {
      mediaRecorderRef.current.stop()
    }
  }

  // Play a recorded item from list
  const playRecording = async (item: AudioItem) => {
    try {
      if (revokePlayerRef.current) {
        revokePlayerRef.current()
        revokePlayerRef.current = null
      }

      const obj = await os.fs.getObjectUrl(item.path)
      revokePlayerRef.current = obj.revoke

      setPlayingItem(item)
      setPlayingUrl(obj.url)
      setAudioCurrentTime(0)
      setIsPlayingAudio(true)

      setTimeout(() => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.volume = systemVolume
          audioPlayerRef.current.play().catch(() => {})
        }
      }, 50)
    } catch (err) {
      console.error('[Grabadora] Error al reproducir grabación:', err)
    }
  }

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return
    if (isPlayingAudio) {
      audioPlayerRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      audioPlayerRef.current.play().catch(() => {})
      setIsPlayingAudio(true)
    }
  }

  const handleRename = async (item: AudioItem) => {
    const currentName = item.node.name
    const dotIdx = currentName.lastIndexOf('.')
    const baseName = dotIdx !== -1 ? currentName.substring(0, dotIdx) : currentName

    const newBase = await os.dialogs.prompt({
      title: 'Renombrar grabación',
      message: 'Ingresa el nuevo nombre:',
      defaultValue: baseName
    })

    if (!newBase || newBase.trim() === '' || newBase === baseName) return
    const newName = `${newBase.trim()}.webm`

    try {
      await os.fs.rename(item.path, newName)
      await loadRecordings()
      if (playingItem?.path === item.path) {
        setPlayingItem({ ...item, path: `~/Música/Grabaciones/${newName}` })
      }
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error al renombrar',
        message: (err as Error).message || 'No se pudo renombrar el archivo.'
      })
    }
  }

  const handleDelete = async (item: AudioItem) => {
    const confirm = await os.dialogs.confirm({
      title: 'Eliminar grabación',
      message: `¿Deseas enviar "${item.node.name}" a la Papelera de reciclaje?`,
      confirmLabel: 'Eliminar',
      destructive: true
    })

    if (!confirm) return

    try {
      await os.fs.trash(item.path)
      if (playingItem?.path === item.path) {
        setPlayingItem(null)
        setPlayingUrl(null)
        setIsPlayingAudio(false)
      }
      await loadRecordings()
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error al eliminar',
        message: (err as Error).message || 'No se pudo eliminar la grabación.'
      })
    }
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
      {/* Navigation tabs header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant={activeTab === 'record' ? 'primary' : 'subtle'}
            size="small"
            onClick={() => setActiveTab('record')}
          >
            🎙 Grabar
          </Button>
          <Button
            variant={activeTab === 'list' ? 'primary' : 'subtle'}
            size="small"
            onClick={() => setActiveTab('list')}
          >
            📋 Grabaciones ({recordings.length})
          </Button>
        </div>

        {recState !== 'idle' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: recState === 'recording' ? '#ef4444' : '#f59e0b',
              fontWeight: 600
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: recState === 'recording' ? '#ef4444' : '#f59e0b',
                display: 'inline-block'
              }}
            />
            {recState === 'recording' ? 'GRABANDO' : 'EN PAUSA'}
          </div>
        )}
      </div>

      {/* Main View Area */}
      {activeTab === 'record' ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative'
          }}
        >
          {errorMessage && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                right: '16px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '12px',
                textAlign: 'center'
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Real-time Waveform Canvas */}
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              height: '110px',
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {recState !== 'idle' ? (
              <canvas
                ref={canvasRef}
                width={380}
                height={110}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                El espectro de audio se visualizará aquí al grabar
              </div>
            )}
          </div>

          {/* Timer Display */}
          <div
            style={{
              fontSize: '44px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '1px',
              color: recState === 'recording' ? 'var(--accent-color)' : 'var(--text-primary)',
              marginBottom: '28px'
            }}
          >
            {formatDuration(duration)}
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {recState === 'idle' ? (
              <button
                onClick={startRecording}
                title="Iniciar grabación"
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  border: '4px solid rgba(239, 68, 68, 0.3)',
                  color: '#ffffff',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                  transition: 'transform 0.15s ease, background-color 0.15s ease'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                🎙
              </button>
            ) : (
              <>
                {/* Pause / Resume */}
                <IconButton
                  title={recState === 'recording' ? 'Pausar' : 'Reanudar'}
                  icon={recState === 'recording' ? '⏸' : '▶'}
                  size="large"
                  onClick={recState === 'recording' ? pauseRecording : resumeRecording}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '18px'
                  }}
                />

                {/* Big Stop Button */}
                <button
                  onClick={stopRecording}
                  title="Detener y guardar"
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    border: '4px solid rgba(239, 68, 68, 0.3)',
                    color: '#ffffff',
                    fontSize: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  ⏹
                </button>
              </>
            )}
          </div>

          <div
            style={{
              marginTop: '20px',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              textAlign: 'center'
            }}
          >
            {recState === 'idle'
              ? 'Toca el micrófono para comenzar'
              : 'Las grabaciones se guardan en ~/Música/Grabaciones/'}
          </div>
        </div>
      ) : (
        /* Recordings List Tab */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflowY: 'auto',
            padding: '16px'
          }}
        >
          {recordings.length === 0 ? (
            <EmptyState
              title="No hay grabaciones"
              description="Aún no tienes grabaciones guardadas en ~/Música/Grabaciones."
              action={
                <Button variant="primary" onClick={() => setActiveTab('record')}>
                  Iniciar una grabación
                </Button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recordings.map((item) => {
                const isSelected = playingItem?.path === item.path
                return (
                  <div
                    key={item.path}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-card)',
                      border: isSelected
                        ? '1px solid var(--accent-color)'
                        : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          overflow: 'hidden'
                        }}
                      >
                        <IconButton
                          title={isSelected && isPlayingAudio ? 'Pausar' : 'Reproducir'}
                          icon={isSelected && isPlayingAudio ? '⏸' : '▶'}
                          size="small"
                          variant="primary"
                          onClick={() => {
                            if (isSelected) {
                              togglePlayAudio()
                            } else {
                              playRecording(item)
                            }
                          }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={item.node.name}
                          >
                            {item.node.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {new Date(item.node.modifiedAt).toLocaleString()} •{' '}
                            {(item.node.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconButton
                          title="Renombrar"
                          icon="✏"
                          size="small"
                          onClick={() => handleRename(item)}
                        />
                        <IconButton
                          title="Eliminar"
                          icon="🗑"
                          size="small"
                          variant="destructive"
                          onClick={() => handleDelete(item)}
                        />
                      </div>
                    </div>

                    {/* Inline Player scrubber for active item */}
                    {isSelected && playingUrl && (
                      <div
                        style={{
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            minWidth: '35px'
                          }}
                        >
                          {formatDuration(audioCurrentTime)}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={audioDuration || 1}
                          step={0.1}
                          value={audioCurrentTime}
                          onChange={(e) => {
                            const t = Number(e.target.value)
                            setAudioCurrentTime(t)
                            if (audioPlayerRef.current) {
                              audioPlayerRef.current.currentTime = t
                            }
                          }}
                          style={{
                            flex: 1,
                            accentColor: 'var(--accent-color)',
                            cursor: 'pointer'
                          }}
                        />
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            minWidth: '35px'
                          }}
                        >
                          {formatDuration(audioDuration)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Hidden HTML Audio element for playback */}
          {playingUrl && (
            <audio
              ref={audioPlayerRef}
              src={playingUrl}
              onTimeUpdate={() => {
                if (audioPlayerRef.current) {
                  setAudioCurrentTime(audioPlayerRef.current.currentTime)
                }
              }}
              onLoadedMetadata={() => {
                if (audioPlayerRef.current) {
                  setAudioDuration(audioPlayerRef.current.duration)
                  audioPlayerRef.current.volume = systemVolume
                }
              }}
              onEnded={() => {
                setIsPlayingAudio(false)
                setAudioCurrentTime(0)
              }}
              style={{ display: 'none' }}
            />
          )}
        </div>
      )}
    </div>
  )
}
