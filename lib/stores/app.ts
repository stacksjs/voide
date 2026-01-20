/**
 * App Store - Core application state
 */
import { defineStore } from '../store'

export interface AppState {
  isRecording: boolean
  isProcessing: boolean
  processingChatId: string | null
  processingStartTime: number | null
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
    processingChatId: null,
    processingStartTime: null,
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

    setProcessing(isProcessing: boolean, chatId: string | null = null) {
      this.isProcessing = isProcessing
      this.processingChatId = isProcessing ? chatId : null
      this.processingStartTime = isProcessing ? Date.now() : null
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
