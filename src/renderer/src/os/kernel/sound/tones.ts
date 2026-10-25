// Web Audio API harmonic sound synthesizers for system sounds

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function playSyntheticTone(name: string, masterVolume = 1): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(masterVolume * 0.4, now)
    masterGain.connect(ctx.destination)

    switch (name) {
      case 'boot': {
        // Warm 4-note ascending chord (Eb, G, Bb, Eb)
        const freqs = [311.13, 392.0, 466.16, 622.25]
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(f, now + i * 0.12)

          gain.gain.setValueAtTime(0, now)
          gain.gain.setValueAtTime(0.001, now + i * 0.12)
          gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.1)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2)

          osc.connect(gain)
          gain.connect(masterGain)
          osc.start(now + i * 0.12)
          osc.stop(now + 2.3)
        })
        break
      }

      case 'login': {
        // Bright 3-note chime (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99]
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(f, now + i * 0.08)

          gain.gain.setValueAtTime(0.2, now + i * 0.08)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.8)

          osc.connect(gain)
          gain.connect(masterGain)
          osc.start(now + i * 0.08)
          osc.stop(now + i * 0.08 + 0.85)
        })
        break
      }

      case 'logout': {
        // Descending 3-note chime (G5 -> E5 -> C5)
        const notes = [783.99, 659.25, 523.25]
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(f, now + i * 0.08)

          gain.gain.setValueAtTime(0.2, now + i * 0.08)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.7)

          osc.connect(gain)
          gain.connect(masterGain)
          osc.start(now + i * 0.08)
          osc.stop(now + i * 0.08 + 0.75)
        })
        break
      }

      case 'shutdown': {
        // Soft fading warm low chord
        const freqs = [392.0, 311.13, 261.63]
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(f, now + i * 0.1)

          gain.gain.setValueAtTime(0.2, now + i * 0.1)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)

          osc.connect(gain)
          gain.connect(masterGain)
          osc.start(now + i * 0.1)
          osc.stop(now + 1.9)
        })
        break
      }

      case 'notification': {
        // Two-tone bell (E6, B6)
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(1318.51, now)
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(1975.53, now + 0.1)

        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(masterGain)

        osc1.start(now)
        osc1.stop(now + 0.15)
        osc2.start(now + 0.1)
        osc2.stop(now + 0.6)
        break
      }

      case 'error': {
        // Low cautionary double beep
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(180, now)

        gain.gain.setValueAtTime(0.2, now)
        gain.gain.setValueAtTime(0.01, now + 0.08)
        gain.gain.setValueAtTime(0.2, now + 0.12)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.36)
        break
      }

      case 'trash':
      case 'empty-trash': {
        // Filtered noise sweep
        const bufferSize = ctx.sampleRate * 0.25
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(1200, now)
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.25)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(masterGain)
        noise.start(now)
        break
      }

      case 'alarm': {
        // Electronic high repeating chirp
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        osc.frequency.setValueAtTime(1760, now + 0.1)
        osc.frequency.setValueAtTime(880, now + 0.2)
        osc.frequency.setValueAtTime(1760, now + 0.3)

        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)

        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.46)
        break
      }

      case 'shutter': {
        // Crisp camera shutter click
        const bufferSize = ctx.sampleRate * 0.08
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02))
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.setValueAtTime(2000, now)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.4, now)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(masterGain)
        noise.start(now)
        break
      }

      case 'lock': {
        // Subtle soft mechanical tick
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(400, now)
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05)

        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)

        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.07)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.warn(`[Sound] Could not synthesize sound "${name}":`, err)
  }
}
