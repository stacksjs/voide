/**
 * Voide Stores - Central export with client-side registration
 */

// Store exports
export { appStore, type AppState } from './app'
export { chatStore, type ChatState, type Message, type Chat, type PendingPrompt } from './chat'
export { settingsStore, type SettingsState } from './settings'
export { uiStore, type UIState } from './ui'

// Store utilities
export {
  createStore,
  computed,
  defineStore,
  registerStoresClient,
  getDefinedStore,
  getDefinedStoreNames
} from '../store'

// Composables (Nuxt-style browser API utilities)
export * from '../composables'

// Import stores for registration
import { appStore } from './app'
import { chatStore } from './chat'
import { settingsStore } from './settings'
import { uiStore } from './ui'
import { registerStoresClient } from '../store'

// Register stores for client-side @stores imports
if (typeof window !== 'undefined') {
  registerStoresClient({
    appStore,
    chatStore,
    settingsStore,
    uiStore
  })
}
