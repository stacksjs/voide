/**
 * Driving Mode Composable
 * Hands-free voice interaction mode with wake word detection
 */

import { useAudioCues } from './use-audio-cues'

export interface DrivingModeState {
  isEnabled: boolean
  isAwake: boolean // Whether wake word has been detected
}

export interface DrivingModeOptions {
  wakeWords?: RegExp[]
  onWake?: () => void
  onSleep?: () => void
  onToggle?: (enabled: boolean) => void
}

export interface DrivingModeRef {
  get: () => DrivingModeState
  isEnabled: () => boolean
  isAwake: () => boolean
  toggle: () => void
  enable: () => void
  disable: () => void
  wake: () => void
  sleep: () => void
  checkWakeWord: (transcript: string) => boolean
  subscribe: (fn: (state: DrivingModeState) => void) => () => void
}

// Default wake words - simple and reliable
const defaultWakeWords = [
  /^hey\b/i,
  /^okay\b/i,
  /^ok\b/i,
  /^yo\b/i,
]

export function useDrivingMode(options: DrivingModeOptions = {}): DrivingModeRef {
  const {
    wakeWords = defaultWakeWords,
    onWake,
    onSleep,
    onToggle,
  } = options

  const sounds = useAudioCues()
  const subscribers = new Set<(state: DrivingModeState) => void>()

  let state: DrivingModeState = {
    isEnabled: false,
    isAwake: false,
  }

  const notify = () => {
    for (const fn of subscribers) {
      try { fn(state) } catch (e) { console.error('[useDrivingMode]', e) }
    }
  }

  const enable = () => {
    if (state.isEnabled) return
    state = { ...state, isEnabled: true }
    sounds.wake()
    onToggle?.(true)
    notify()
  }

  const disable = () => {
    if (!state.isEnabled) return
    state = { isEnabled: false, isAwake: false }
    sounds.playTone(440, 0.15, 'sine', 0.15) // Soft deactivation
    onToggle?.(false)
    notify()
  }

  const toggle = () => {
    if (state.isEnabled) {
      disable()
    } else {
      enable()
    }
  }

  const wake = () => {
    if (!state.isEnabled || state.isAwake) return
    state = { ...state, isAwake: true }
    sounds.wake()
    onWake?.()
    notify()
  }

  const sleep = () => {
    if (!state.isAwake) return
    state = { ...state, isAwake: false }
    onSleep?.()
    notify()
  }

  // Check if transcript contains a wake word, returns the text after wake word
  const checkWakeWord = (transcript: string): boolean => {
    if (!state.isEnabled || state.isAwake) return false

    const trimmed = transcript.trim().toLowerCase()
    for (const pattern of wakeWords) {
      if (pattern.test(trimmed)) {
        wake()
        return true
      }
    }
    return false
  }

  // Get text after wake word
  const getTextAfterWakeWord = (transcript: string): string => {
    const trimmed = transcript.trim()
    for (const pattern of wakeWords) {
      if (pattern.test(trimmed.toLowerCase())) {
        return trimmed.replace(pattern, '').trim()
      }
    }
    return trimmed
  }

  return {
    get: () => state,
    isEnabled: () => state.isEnabled,
    isAwake: () => state.isAwake,
    toggle,
    enable,
    disable,
    wake,
    sleep,
    checkWakeWord,
    subscribe: (fn) => {
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
  }
}

// Singleton instance for app-wide usage
let drivingModeInstance: DrivingModeRef | null = null

export function getDrivingMode(options?: DrivingModeOptions): DrivingModeRef {
  if (!drivingModeInstance) {
    drivingModeInstance = useDrivingMode(options)
  }
  return drivingModeInstance
}
