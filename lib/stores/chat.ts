/**
 * Chat Store - Messages and chat persistence
 */
import { defineStore } from '../store'

export interface Message {
  type: 'user' | 'assistant' | 'system' | 'error' | 'prompt'
  content: string
  header: string
  timestamp: number
  updated?: number
}

export interface PendingPrompt {
  id: string
  text: string
  options: string[]
  labels?: string[]
}

export interface Chat {
  id: string
  title?: string
  messages: Message[]
  repoPath: string
  driver: string
  sessionId?: string
  createdAt: number
  updatedAt: number
}

export interface ChatState {
  currentChatId: string | null
  messages: Message[]
  inputText: string
  charCount: number
  pendingPrompt: PendingPrompt | null
  sessionId: string | null
}

const STORAGE_KEY_CHATS = 'voide:chats'
const STORAGE_KEY_CHAT_COUNTER = 'voide:chat_counter'

// Chat persistence helpers
function getAllChats(): Record<string, Chat> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CHATS) || '{}')
  } catch {
    return {}
  }
}

function saveAllChats(chats: Record<string, Chat>) {
  localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats))
}

export const chatStore = defineStore<ChatState>('chat', {
  state: {
    currentChatId: null,
    messages: [],
    inputText: '',
    charCount: 0,
    pendingPrompt: null,
    sessionId: null
  },

  actions: {
    generateChatId(): string {
      const counter = parseInt(localStorage.getItem(STORAGE_KEY_CHAT_COUNTER) || '0', 10) + 1
      localStorage.setItem(STORAGE_KEY_CHAT_COUNTER, counter.toString())
      return counter.toString()
    },

    getChatIdFromUrl(): string | null {
      const match = window.location.pathname.match(/^\/chat\/(\d+)$/)
      return match ? match[1] : null
    },

    getAllChats,

    startNewChat(repoPath: string = '', driver: string = 'claude-cli-local', initialMessage?: Message): string {
      const chatId = this.generateChatId()
      const messages = initialMessage ? [initialMessage] : []

      this.currentChatId = chatId
      this.messages = messages

      const chats = getAllChats()
      chats[chatId] = {
        id: chatId,
        messages,
        repoPath,
        driver,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      saveAllChats(chats)

      history.pushState({ chatId }, '', `/chat/${chatId}`)
      return chatId
    },

    loadChat(chatId: string): boolean {
      const chats = getAllChats()
      const chat = chats[chatId]

      if (chat) {
        this.currentChatId = chatId
        this.messages = chat.messages || []
        this.sessionId = chat.sessionId || null
        return true
      }
      return false
    },

    saveCurrentChat(repoPath: string, driver: string) {
      if (!this.currentChatId) return

      const chats = getAllChats()
      const existingChat = chats[this.currentChatId]
      chats[this.currentChatId] = {
        id: this.currentChatId,
        title: existingChat?.title,
        messages: this.messages,
        repoPath,
        driver,
        sessionId: this.sessionId || undefined,
        createdAt: existingChat?.createdAt || Date.now(),
        updatedAt: Date.now()
      }
      saveAllChats(chats)
    },

    setChatTitle(chatId: string, title: string) {
      const chats = getAllChats()
      if (chats[chatId]) {
        chats[chatId].title = title
        chats[chatId].updatedAt = Date.now()
        saveAllChats(chats)
      }
    },

    deleteChat(chatId: string) {
      const chats = getAllChats()
      delete chats[chatId]
      saveAllChats(chats)
    },

    addMessage(type: Message['type'], content: string, header?: string): Message {
      const driverName = header || (
        type === 'user' ? 'You' :
        type === 'assistant' ? 'AI' :
        type === 'system' ? 'System' : 'Error'
      )

      const newMessage: Message = {
        type,
        content,
        header: driverName,
        timestamp: Date.now()
      }

      this.messages = [...this.messages, newMessage]
      return newMessage
    },

    updateLastMessage(type: Message['type'], content: string) {
      const messages = [...this.messages]

      if (messages.length > 0 && messages[messages.length - 1].type === type) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
          updated: Date.now()
        }
        this.messages = messages
      }
    },

    removeLastMessage() {
      if (this.messages.length > 0) {
        this.messages = this.messages.slice(0, -1)
      }
    },

    clearMessages() {
      this.messages = []
    },

    setInputText(inputText: string) {
      this.inputText = inputText
      this.charCount = inputText.length
    },

    clearInput() {
      this.inputText = ''
      this.charCount = 0
    },

    newChat() {
      this.currentChatId = null
      this.messages = []
      this.pendingPrompt = null
      this.sessionId = null
      history.pushState({}, '', '/')
    },

    setPendingPrompt(prompt: PendingPrompt | null) {
      this.pendingPrompt = prompt
    },

    clearPendingPrompt() {
      this.pendingPrompt = null
    },

    setSessionId(sessionId: string | null) {
      this.sessionId = sessionId
    }
  }
})
