import { events } from '../events'

export class MediaService {
  private activeCameraStreams = new Set<MediaStream>()
  private activeMicrophoneStreams = new Set<MediaStream>()

  async getCamera(constraints?: MediaTrackConstraints): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints || true
    })

    this.activeCameraStreams.add(stream)
    this.emitActiveStatus()

    // Listen for track ended
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        this.activeCameraStreams.delete(stream)
        this.emitActiveStatus()
      })
    })

    return stream
  }

  async getMicrophone(constraints?: MediaTrackConstraints): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: constraints || true
    })

    this.activeMicrophoneStreams.add(stream)
    this.emitActiveStatus()

    stream.getAudioTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        this.activeMicrophoneStreams.delete(stream)
        this.emitActiveStatus()
      })
    })

    return stream
  }

  async listCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((d) => d.kind === 'videoinput')
  }

  stopStream(stream: MediaStream): void {
    stream.getTracks().forEach((t) => t.stop())
    this.activeCameraStreams.delete(stream)
    this.activeMicrophoneStreams.delete(stream)
    this.emitActiveStatus()
  }

  isCameraActive(): boolean {
    return this.activeCameraStreams.size > 0
  }

  isMicrophoneActive(): boolean {
    return this.activeMicrophoneStreams.size > 0
  }

  private emitActiveStatus(): void {
    events.emit('media:active', {
      camera: this.isCameraActive(),
      microphone: this.isMicrophoneActive()
    })
  }
}

export const media = new MediaService()
