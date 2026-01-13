/**
 * Audio Cues Composable
 * Web Audio API-based sound effects for voice interaction feedback
 */

export type ToneType = 'sine' | 'square' | 'sawtooth' | 'triangle'

export interface AudioCueOptions {
  volume?: number
}

export interface AudioCuesRef {
  isSupported: boolean
  play: (name: keyof typeof defaultSounds) => void
  playTone: (frequency: number, duration: number, type?: ToneType, volume?: number) => void
  listening: () => void
  processing: () => void
  done: () => void
  error: () => void
  wake: () => void
}

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioContext = new AudioContextClass()
    }
  }
  return audioContext
}

function playTone(
  frequency: number,
  duration: number,
  type: ToneType = 'sine',
  volume: number = 0.3
): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    gain.connect(ctx.destination)

    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start()
    oscillator.stop(ctx.currentTime + duration)
  } catch (e) {
    console.log('[useAudioCues] Could not play tone:', e)
  }
}

// Default sound effects
const defaultSounds = {
  // Quick high ping - listening activated
  listening: () => playTone(880, 0.12, 'sine', 0.25),

  // Soft processing indicator
  processing: () => playTone(440, 0.2, 'sine', 0.15),

  // Pleasant two-note chime - done
  done: () => {
    playTone(660, 0.15, 'sine', 0.2)
    setTimeout(() => playTone(880, 0.25, 'sine', 0.25), 150)
  },

  // Descending tone - error
  error: () => {
    playTone(440, 0.15, 'sine', 0.2)
    setTimeout(() => playTone(280, 0.25, 'sine', 0.2), 120)
  },

  // Wake word detected - ascending three-note chime
  wake: () => {
    playTone(520, 0.1, 'sine', 0.2)
    setTimeout(() => playTone(660, 0.1, 'sine', 0.2), 80)
    setTimeout(() => playTone(880, 0.15, 'sine', 0.25), 160)
  },
}

export function useAudioCues(options: AudioCueOptions = {}): AudioCuesRef {
  const isSupported = typeof window !== 'undefined' &&
    (!!window.AudioContext || !!(window as any).webkitAudioContext)

  return {
    isSupported,
    play: (name) => defaultSounds[name]?.(),
    playTone,
    listening: defaultSounds.listening,
    processing: defaultSounds.processing,
    done: defaultSounds.done,
    error: defaultSounds.error,
    wake: defaultSounds.wake,
  }
}

// Standalone helpers
export function playAudioCue(name: keyof typeof defaultSounds): void {
  defaultSounds[name]?.()
}

export { playTone }
