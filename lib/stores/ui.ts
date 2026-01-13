/**
 * UI Store - Modal state and UI interactions
 */
import { defineStore } from '../store'

export interface UIState {
  modals: {
    github: boolean
    settings: boolean
  }
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    message: string
    duration?: number
  }>
}

export const uiStore = defineStore<UIState>('ui', {
  state: {
    modals: {
      github: false,
      settings: false
    },
    notifications: []
  },

  actions: {
    openModal(modal: keyof UIState['modals']) {
      this.modals = { ...this.modals, [modal]: true }
    },

    closeModal(modal: keyof UIState['modals']) {
      this.modals = { ...this.modals, [modal]: false }
    },

    closeAllModals() {
      this.modals = {
        github: false,
        settings: false
      }
    },

    toggleModal(modal: keyof UIState['modals']) {
      this.modals = { ...this.modals, [modal]: !this.modals[modal] }
    },

    notify(
      type: 'info' | 'success' | 'warning' | 'error',
      message: string,
      duration: number = 3000
    ): string {
      const id = `notification-${Date.now()}`

      this.notifications = [...this.notifications, { id, type, message, duration }]

      if (duration > 0) {
        setTimeout(() => {
          this.dismissNotification(id)
        }, duration)
      }

      return id
    },

    dismissNotification(id: string) {
      this.notifications = this.notifications.filter(n => n.id !== id)
    },

    clearNotifications() {
      this.notifications = []
    }
  }
})
