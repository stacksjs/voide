/**
 * Settings Store - API keys and configuration (persisted)
 */
import { defineStore } from '../store'

export interface SettingsState {
  apiKeys: {
    anthropic: string | null
    openai: string | null
    claudeCliHost: string | null
  }
  github: {
    connected: boolean
    token: string | null
    username: string | null
    name: string | null
    email: string | null
    avatarUrl: string | null
  }
  lastRepoPath: string | null
}

export const settingsStore = defineStore<SettingsState>('settings', {
  state: {
    apiKeys: {
      anthropic: null,
      openai: null,
      claudeCliHost: null
    },
    github: {
      connected: false,
      token: null,
      username: null,
      name: null,
      email: null,
      avatarUrl: null
    },
    lastRepoPath: null
  },

  actions: {
    setApiKey(provider: 'anthropic' | 'openai' | 'claudeCliHost', key: string | null) {
      this.apiKeys = {
        ...this.apiKeys,
        [provider]: key
      }
    },

    setAllApiKeys(keys: SettingsState['apiKeys']) {
      this.apiKeys = keys
    },

    setGithub(github: Partial<SettingsState['github']>) {
      this.github = { ...this.github, ...github }
    },

    connectGithub(data: {
      token: string
      username: string
      name?: string
      email?: string
      avatarUrl?: string
    }) {
      this.github = {
        connected: true,
        token: data.token,
        username: data.username,
        name: data.name || null,
        email: data.email || null,
        avatarUrl: data.avatarUrl || null
      }
    },

    disconnectGithub() {
      this.github = {
        connected: false,
        token: null,
        username: null,
        name: null,
        email: null,
        avatarUrl: null
      }
    },

    setLastRepoPath(path: string | null) {
      this.lastRepoPath = path
    }
  },

  persist: {
    storage: 'local',
    key: 'voide:settings'
  }
})
