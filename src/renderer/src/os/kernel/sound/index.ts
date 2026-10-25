import { playSyntheticTone } from './tones'

export type SystemSound =
  | 'boot'
  | 'login'
  | 'logout'
  | 'shutdown'
  | 'notification'
  | 'error'
  | 'trash'
  | 'empty-trash'
  | 'alarm'
  | 'shutter'
  | 'lock'

// Dynamically discover audio files if any are placed in system/sounds/
const soundFiles = import.meta.glob<string>(
  '../../../system/sounds/*.{mp3,ogg,wav}',
  { eager: true, import: 'default' }
)

export class SoundService {
  private volume = 80 // 0 - 100
  private muted = false
  private systemSounds = true

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(100, vol))
  }

  getVolume(): number {
    return this.volume
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  isMuted(): boolean {
    return this.muted
  }

  setSystemSounds(enabled: boolean): void {
    this.systemSounds = enabled
  }

  /**
   * Effective system volume (0.0 - 1.0), taking into account muting.
   */
  getEffectiveVolume(): number {
    if (this.muted) return 0
    return this.volume / 100
  }

  playSystem(name: SystemSound): void {
    // If system sounds disabled, only alarm and shutter are allowed to sound (Section 4.13)
    if (!this.systemSounds && name !== 'alarm' && name !== 'shutter') {
      return
    }

    const effVol = this.getEffectiveVolume()
    if (effVol <= 0) return

    // Look for matching file in system/sounds/<name>.(mp3|ogg|wav)
    const fileKey = Object.keys(soundFiles).find((k) =>
      k.includes(`/system/sounds/${name}.`)
    )

    if (fileKey && soundFiles[fileKey]) {
      try {
        const audio = new Audio(soundFiles[fileKey])
        audio.volume = effVol
        audio.play().catch(() => {
          // Fallback to Web Audio if audio.play() fails
          playSyntheticTone(name, effVol)
        })
        return
      } catch {
        // Fallback
      }
    }

    // Default to Web Audio synthetic tone
    playSyntheticTone(name, effVol)
  }
}

export const sound = new SoundService()
