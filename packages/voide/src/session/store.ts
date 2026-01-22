// Session store implementation for Voide CLI
// Persists sessions to ~/.voide/sessions/

import { mkdir, readFile, writeFile, readdir, unlink, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import type { Session, SessionStore, SessionSummary, Message, MessageContent } from './types'

const VOIDE_DIR = join(homedir(), '.voide')
const SESSIONS_DIR = join(VOIDE_DIR, 'sessions')

export class FileSessionStore implements SessionStore {
  private initialized = false

  private async ensureDir(): Promise<void> {
    if (this.initialized) return
    await mkdir(SESSIONS_DIR, { recursive: true })
    this.initialized = true
  }

  private sessionPath(id: string): string {
    return join(SESSIONS_DIR, `${id}.json`)
  }

  async create(projectPath: string): Promise<Session> {
    await this.ensureDir()

    const session: Session = {
      id: generateId(),
      projectPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    }

    await this.save(session)
    return session
  }

  async get(id: string): Promise<Session | null> {
    await this.ensureDir()

    try {
      const data = await readFile(this.sessionPath(id), 'utf-8')
      return JSON.parse(data) as Session
    }
    catch {
      return null
    }
  }

  async update(session: Session): Promise<void> {
    session.updatedAt = Date.now()
    await this.save(session)
  }

  async delete(id: string): Promise<void> {
    try {
      await unlink(this.sessionPath(id))
    }
    catch {
      // Ignore if file doesn't exist
    }
  }

  async list(projectPath?: string): Promise<SessionSummary[]> {
    await this.ensureDir()

    try {
      const files = await readdir(SESSIONS_DIR)
      const summaries: SessionSummary[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const data = await readFile(join(SESSIONS_DIR, file), 'utf-8')
          const session = JSON.parse(data) as Session

          if (projectPath && session.projectPath !== projectPath) continue

          summaries.push({
            id: session.id,
            title: session.title || getDefaultTitle(session),
            projectPath: session.projectPath,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messages.length,
          })
        }
        catch {
          // Skip invalid files
        }
      }

      // Sort by most recent
      summaries.sort((a, b) => b.updatedAt - a.updatedAt)
      return summaries
    }
    catch {
      return []
    }
  }

  async getRecent(limit = 10): Promise<SessionSummary[]> {
    const all = await this.list()
    return all.slice(0, limit)
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)

    session.messages.push(message)
    await this.update(session)
  }

  async updateMessage(sessionId: string, messageId: string, content: MessageContent[]): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)

    const message = session.messages.find(m => m.id === messageId)
    if (!message) throw new Error(`Message not found: ${messageId}`)

    message.content = content
    await this.update(session)
  }

  async prune(maxAge = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    // Delete sessions older than maxAge (default 30 days)
    await this.ensureDir()

    const cutoff = Date.now() - maxAge
    let deleted = 0

    try {
      const files = await readdir(SESSIONS_DIR)

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const filePath = join(SESSIONS_DIR, file)
          const data = await readFile(filePath, 'utf-8')
          const session = JSON.parse(data) as Session

          if (session.updatedAt < cutoff) {
            await unlink(filePath)
            deleted++
          }
        }
        catch {
          // Skip invalid files
        }
      }
    }
    catch {
      // Ignore errors
    }

    return deleted
  }

  private async save(session: Session): Promise<void> {
    await this.ensureDir()
    const path = this.sessionPath(session.id)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify(session, null, 2), 'utf-8')
  }
}

// Generate a unique session ID
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${timestamp}-${random}`
}

// Get default title from first user message
function getDefaultTitle(session: Session): string {
  for (const message of session.messages) {
    if (message.role === 'user') {
      for (const content of message.content) {
        if (content.type === 'text') {
          const text = content.text.trim()
          // Get first line, truncate to 50 chars
          const firstLine = text.split('\n')[0]
          return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine
        }
      }
    }
  }
  return 'New Session'
}

// Singleton store instance
let store: FileSessionStore | null = null

export function getSessionStore(): FileSessionStore {
  if (!store) {
    store = new FileSessionStore()
  }
  return store
}

// Helper to create a new message
export function createMessage(
  role: 'user' | 'assistant' | 'system',
  content: MessageContent[],
  metadata?: Record<string, unknown>,
): Message {
  return {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
    metadata,
  }
}

// Helper to create text content
export function textContent(text: string): MessageContent {
  return { type: 'text', text }
}

// Helper to create tool use content
export function toolUseContent(id: string, name: string, input: Record<string, unknown>): MessageContent {
  return {
    type: 'tool_use',
    id,
    name,
    input,
    status: 'pending',
  }
}

// Helper to create tool result content
export function toolResultContent(toolUseId: string, output: string, isError = false): MessageContent {
  return {
    type: 'tool_result',
    toolUseId,
    output,
    isError,
  }
}

// Helper to create a new session
export async function createSession(projectPath: string): Promise<Session> {
  const sessionStore = getSessionStore()
  return sessionStore.create(projectPath)
}
