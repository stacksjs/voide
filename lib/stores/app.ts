/**
 * App Store - Core application state
 */
import { defineStore } from '../store'

export interface AppState {
  isRecording: boolean
  isProcessing: boolean
  transcript: string
  repoPath: string
  hasChanges: boolean
  speechSupported: boolean
  currentDriver: string
  isNativeApp: boolean
  terminalTitle: string
}

export const appStore = defineStore<AppState>('app', {
  state: {
    isRecording: false,
    isProcessing: false,
    transcript: '',
    repoPath: '',
    hasChanges: false,
    speechSupported: false,
    currentDriver: 'claude-sdk',
    isNativeApp: false,
    terminalTitle: 'Voide - Ready'
  },

  actions: {
    setRecording(isRecording: boolean) {
      this.isRecording = isRecording
    },

    setProcessing(isProcessing: boolean) {
      this.isProcessing = isProcessing
    },

    setTranscript(transcript: string) {
      this.transcript = transcript
    },

    setRepoPath(repoPath: string) {
      this.repoPath = repoPath
    },

    setHasChanges(hasChanges: boolean) {
      this.hasChanges = hasChanges
    },

    setTerminalTitle(terminalTitle: string) {
      this.terminalTitle = terminalTitle
    },

    setDriver(currentDriver: string) {
      this.currentDriver = currentDriver
    },

    setNativeApp(isNativeApp: boolean) {
      this.isNativeApp = isNativeApp
    },

    setSpeechSupported(speechSupported: boolean) {
      this.speechSupported = speechSupported
    }
  },

  persist: {
    storage: 'local',
    key: 'voide:app'
  }
})
