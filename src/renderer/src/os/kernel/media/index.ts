import { events } from '../events'

export class MediaService {
  private activeCameraStreams = new Set<MediaStream>()
  private activeMicrophoneStreams = new Set<MediaStream>()
  private instanceStreams = new Map<string, Set<MediaStream>>()

  async getCamera(constraints?: MediaTrackConstraints, instanceId?: string): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints || true
    })

    this.activeCameraStreams.add(stream)
    if (instanceId) {
      if (!this.instanceStreams.has(instanceId)) {
        this.instanceStreams.set(instanceId, new Set())
      }
      this.instanceStreams.get(instanceId)!.add(stream)
    }
    this.emitActiveStatus()

    // Listen for track ended
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        this.activeCameraStreams.delete(stream)
        if (instanceId) {
          this.instanceStreams.get(instanceId)?.delete(stream)
        }
        this.emitActiveStatus()
      })
    })

    return stream
  }

  async getMicrophone(constraints?: MediaTrackConstraints, instanceId?: string): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: constraints || true
    })

    this.activeMicrophoneStreams.add(stream)
    if (instanceId) {
      if (!this.instanceStreams.has(instanceId)) {
        this.instanceStreams.set(instanceId, new Set())
      }
      this.instanceStreams.get(instanceId)!.add(stream)
    }
    this.emitActiveStatus()

    stream.getAudioTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        this.activeMicrophoneStreams.delete(stream)
        if (instanceId) {
          this.instanceStreams.get(instanceId)?.delete(stream)
        }
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
    for (const set of this.instanceStreams.values()) {
      set.delete(stream)
    }
    this.emitActiveStatus()
  }

  stopAllForInstance(instanceId: string): void {
    const streams = this.instanceStreams.get(instanceId)
    if (streams) {
      streams.forEach((s) => this.stopStream(s))
      this.instanceStreams.delete(instanceId)
    }
  }

  isCameraActive(): boolean {
    return this.activeCameraStreams.size > 0
  }

  isMicrophoneActive(): boolean {
    return this.activeMicrophoneStreams.size > 0
  }

  hasActiveCamera(): boolean {
    return this.isCameraActive()
  }

  hasActiveMicrophone(): boolean {
    return this.isMicrophoneActive()
  }

  private emitActiveStatus(): void {
    events.emit('media:active', {
      camera: this.isCameraActive(),
      microphone: this.isMicrophoneActive()
    })
  }
}

export const media = new MediaService()
