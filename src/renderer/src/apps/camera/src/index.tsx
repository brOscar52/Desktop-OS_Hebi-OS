import { useState, useEffect, useRef, useCallback } from 'react'
import { useOS, type FsNode } from '@os/sdk'
import { Button, IconButton, Select, EmptyState } from '@os/ui'

type CameraMode = 'photo' | 'video'
type TimerOption = 0 | 3 | 10

interface LastCapture {
  path: string
  name: string
  url: string
  type: 'photo' | 'video'
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function getTimestampString(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const hh = pad(now.getHours())
  const min = pad(now.getMinutes())
  const ss = pad(now.getSeconds())
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${pad(m)}:${pad(s)}`
}

export default function CameraApp(): JSX.Element {
  const os = useOS()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])

  // Camera devices
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modes & settings
  const [mode, setMode] = useState<CameraMode>('photo')
  const [timerSetting, setTimerSetting] = useState<TimerOption>(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isMirrored, setIsMirrored] = useState<boolean>(true)
  const [flash, setFlash] = useState<boolean>(false)

  // Video recording state
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0)
  const recordTimerRef = useRef<number | null>(null)

  // Last capture preview
  const [lastCapture, setLastCapture] = useState<LastCapture | null>(null)
  const lastCaptureRevokeRef = useRef<(() => void) | null>(null)

  // Initialize and list cameras
  const refreshCameras = useCallback(async () => {
    try {
      const list = await os.media.listCameras()
      setCameras(list)
      if (list.length > 0 && !selectedCameraId) {
        setSelectedCameraId(list[0].deviceId)
      }
    } catch {
      // ignore
    }
  }, [os.media, selectedCameraId])

  // Stop current video stream
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
  }, [])

  // Start camera stream
  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopTracks()
      setErrorMsg(null)

      try {
        const constraints: MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId } }
          : {}

        const stream = await os.media.getCamera(constraints)
        streamRef.current = stream
        setHasCameraAccess(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }

        await refreshCameras()
      } catch (err: unknown) {
        console.error('[Cámara] Error al acceder a la cámara:', err)
        setHasCameraAccess(false)
        setErrorMsg(
          (err as Error).message ||
            'No se pudo encontrar ninguna cámara web o se denegó el acceso.'
        )
      }
    },
    [os.media, stopTracks, refreshCameras]
  )

  // Initial camera mount
  useEffect(() => {
    startCamera(selectedCameraId)
    return () => {
      stopTracks()
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current)
      }
      if (lastCaptureRevokeRef.current) {
        lastCaptureRevokeRef.current()
      }
    }
  }, [startCamera, stopTracks, selectedCameraId])

  // Scan for existing last capture from ~/Imágenes/Cámara and ~/Videos/Cámara
  useEffect(() => {
    let mounted = true
    const checkCaptures = async () => {
      try {
        const photosFolder = '~/Imágenes/Cámara'
        const videosFolder = '~/Videos/Cámara'

        let photos: FsNode[] = []
        let videos: FsNode[] = []

        if (await os.fs.exists(photosFolder)) {
          photos = await os.fs.list(photosFolder)
        }
        if (await os.fs.exists(videosFolder)) {
          videos = await os.fs.list(videosFolder)
        }

        const all: Array<{ node: FsNode; type: 'photo' | 'video'; folder: string }> = [
          ...photos
            .filter((n) => n.kind === 'file')
            .map((node) => ({ node, type: 'photo' as const, folder: photosFolder })),
          ...videos
            .filter((n) => n.kind === 'file')
            .map((node) => ({ node, type: 'video' as const, folder: videosFolder }))
        ]

        if (all.length > 0) {
          all.sort((a, b) => b.node.modifiedAt - a.node.modifiedAt)
          const latest = all[0]
          const fullPath = `${latest.folder}/${latest.node.name}`
          const obj = await os.fs.getObjectUrl(fullPath)
          if (mounted) {
            if (lastCaptureRevokeRef.current) {
              lastCaptureRevokeRef.current()
            }
            lastCaptureRevokeRef.current = obj.revoke
            setLastCapture({
              path: fullPath,
              name: latest.node.name,
              url: obj.url,
              type: latest.type
            })
          }
        }
      } catch {
        // ignore
      }
    }
    checkCaptures()
    return () => {
      mounted = false
    }
  }, [os.fs])

  // Take photo snapshot
  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (isMirrored) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) return

      // Shutter sound and flash effect
      os.sound.playSystem('shutter')
      setFlash(true)
      setTimeout(() => setFlash(false), 200)

      const filename = `Foto_${getTimestampString()}.png`
      const folderPath = '~/Imágenes/Cámara'
      await os.fs.mkdir(folderPath, { recursive: true })
      const filePath = `${folderPath}/${filename}`
      await os.fs.writeFile(filePath, blob)

      // Update thumbnail
      const previewUrl = URL.createObjectURL(blob)
      if (lastCaptureRevokeRef.current) {
        lastCaptureRevokeRef.current()
      }
      lastCaptureRevokeRef.current = () => URL.revokeObjectURL(previewUrl)
      setLastCapture({
        path: filePath,
        name: filename,
        url: previewUrl,
        type: 'photo'
      })

      os.notify({
        title: 'Foto guardada',
        body: `${filename} guardada en ~/Imágenes/Cámara`,
        sound: false
      })
    } catch (err) {
      console.error('[Cámara] Error al capturar foto:', err)
    }
  }, [isMirrored, os])

  // Start video recording
  const startVideoRecording = async () => {
    if (!streamRef.current) return
    try {
      // Get microphone audio
      const audioStream = await os.media.getMicrophone()
      audioStreamRef.current = audioStream

      const combinedStream = new MediaStream([
        ...streamRef.current.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ])

      videoChunksRef.current = []
      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current)
          recordTimerRef.current = null
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop())
          audioStreamRef.current = null
        }

        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' })
        if (videoBlob.size > 0) {
          const filename = `Video_${getTimestampString()}.webm`
          const folderPath = '~/Videos/Cámara'
          try {
            await os.fs.mkdir(folderPath, { recursive: true })
            const filePath = `${folderPath}/${filename}`
            await os.fs.writeFile(filePath, videoBlob)

            const previewUrl = URL.createObjectURL(videoBlob)
            if (lastCaptureRevokeRef.current) {
              lastCaptureRevokeRef.current()
            }
            lastCaptureRevokeRef.current = () => URL.revokeObjectURL(previewUrl)
            setLastCapture({
              path: filePath,
              name: filename,
              url: previewUrl,
              type: 'video'
            })

            os.notify({
              title: 'Video guardado',
              body: `${filename} guardado en ~/Videos/Cámara`,
              sound: true
            })
          } catch (saveErr) {
            console.error('[Cámara] Error al guardar video:', saveErr)
          }
        }

        setIsRecording(false)
        setRecordingSeconds(0)
      }

      recorder.start(500)
      setIsRecording(true)
      setRecordingSeconds(0)

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1)
      }, 1000)
    } catch (err: unknown) {
      console.error('[Cámara] Error al iniciar grabación de video:', err)
      await os.dialogs.alert({
        title: 'Error de grabación',
        message: (err as Error).message || 'No se pudo iniciar la grabación de video.'
      })
    }
  }

  // Stop video recording
  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  // Trigger shutter button with countdown timer support
  const handleShutterClick = () => {
    if (mode === 'video') {
      if (isRecording) {
        stopVideoRecording()
      } else {
        startVideoRecording()
      }
      return
    }

    // Photo mode with timer
    if (timerSetting > 0) {
      setCountdown(timerSetting)
      let current = timerSetting
      const intId = window.setInterval(() => {
        current -= 1
        if (current <= 0) {
          window.clearInterval(intId)
          setCountdown(null)
          capturePhoto()
        } else {
          setCountdown(current)
        }
      }, 1000)
    } else {
      capturePhoto()
    }
  }

  // Open last capture in default associated viewer
  const handleOpenLastCapture = () => {
    if (lastCapture) {
      if (lastCapture.type === 'photo') {
        os.apps.launch('image-viewer', { filePath: lastCapture.path })
      } else {
        os.apps.launch('videos', { filePath: lastCapture.path })
      }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Flash Overlay */}
      {flash && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            zIndex: 100,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Main Preview Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          overflow: 'hidden'
        }}
      >
        {hasCameraAccess === false ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-canvas)',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <EmptyState
              title="Cámara no disponible"
              description={
                errorMsg ||
                'No se pudo conectar con la cámara web. Asegúrate de otorgar los permisos necesarios.'
              }
              action={
                <Button variant="primary" onClick={() => startCamera(selectedCameraId)}>
                  Reintentar conexión
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: isMirrored ? 'scaleX(-1)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            />

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div
                style={{
                  position: 'absolute',
                  fontSize: '96px',
                  fontWeight: 800,
                  color: '#ffffff',
                  textShadow: '0 4px 16px rgba(0,0,0,0.8)',
                  animation: 'pulse 1s infinite'
                }}
              >
                {countdown}
              </div>
            )}

            {/* Recording Indicator & Timer */}
            {isRecording && (
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  padding: '6px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.85)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff'
                  }}
                />
                <span>REC {formatDuration(recordingSeconds)}</span>
              </div>
            )}

            {/* Top Toolbar (Camera selector, Mirror, Timer) */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10
              }}
            >
              {/* Multiple cameras switcher */}
              {cameras.length > 1 && (
                <div style={{ width: '130px' }}>
                  <Select
                    options={cameras.map((c, idx) => ({
                      value: c.deviceId,
                      label: c.label || `Cámara ${idx + 1}`
                    }))}
                    value={selectedCameraId}
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedCameraId(id)
                      startCamera(id)
                    }}
                  />
                </div>
              )}

              {/* Timer Switcher */}
              <Button
                variant={timerSetting > 0 ? 'primary' : 'subtle'}
                size="small"
                onClick={() => {
                  const next: TimerOption =
                    timerSetting === 0 ? 3 : timerSetting === 3 ? 10 : 0
                  setTimerSetting(next)
                }}
                style={{
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.2)',
                  minWidth: '50px'
                }}
                title="Temporizador de cuenta regresiva"
              >
                ⏱ {timerSetting > 0 ? `${timerSetting}s` : 'Off'}
              </Button>

              {/* Mirror Toggle */}
              <IconButton
                title={isMirrored ? 'Efecto espejo activado' : 'Efecto espejo desactivado'}
                icon="🪞"
                active={isMirrored}
                onClick={() => setIsMirrored(!isMirrored)}
                style={{
                  color: '#ffffff',
                  backgroundColor: isMirrored
                    ? 'var(--accent-color)'
                    : 'rgba(255,255,255,0.15)'
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Right Control Bar (Fluent Camera Style) */}
      <div
        style={{
          width: '90px',
          backgroundColor: '#18181b',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 8px',
          zIndex: 20
        }}
      >
        {/* Top: Mode Selector (Vertical) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'center'
          }}
        >
          <button
            onClick={() => {
              if (!isRecording) setMode('photo')
            }}
            disabled={isRecording}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: mode === 'photo' ? 'var(--accent-color)' : 'transparent',
              color: mode === 'photo' ? '#ffffff' : '#a1a1aa',
              fontSize: '11px',
              fontWeight: 600,
              cursor: isRecording ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px',
              transition: 'all 0.15s ease'
            }}
          >
            FOTO
          </button>
          <button
            onClick={() => setMode('video')}
            disabled={isRecording}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: mode === 'video' ? 'var(--accent-color)' : 'transparent',
              color: mode === 'video' ? '#ffffff' : '#a1a1aa',
              fontSize: '11px',
              fontWeight: 600,
              cursor: isRecording ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px',
              transition: 'all 0.15s ease'
            }}
          >
            VIDEO
          </button>
        </div>

        {/* Center: Big Shutter Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button
            onClick={handleShutterClick}
            disabled={hasCameraAccess === false}
            title={
              mode === 'photo'
                ? 'Tomar foto'
                : isRecording
                ? 'Detener grabación'
                : 'Iniciar grabación de video'
            }
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '4px solid rgba(255, 255, 255, 0.4)',
              cursor: hasCameraAccess === false ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {mode === 'photo' ? (
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '2px solid #000000'
                }}
              />
            ) : isRecording ? (
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: '#ef4444'
                }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444'
                }}
              />
            )}
          </button>
        </div>

        {/* Bottom: Last Capture Thumbnail */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {lastCapture ? (
            <div
              onClick={handleOpenLastCapture}
              title={`Abrir última captura: ${lastCapture.name}`}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.4)',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                backgroundColor: '#000000',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {lastCapture.type === 'photo' ? (
                <img
                  src={lastCapture.url}
                  alt={lastCapture.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1e293b',
                    fontSize: '18px'
                  }}
                >
                  🎬
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: 'rgba(255,255,255,0.3)'
              }}
              title="Sin capturas previas"
            >
              📷
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
