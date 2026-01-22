// Session Resume for Voide CLI
// Allows continuing previous sessions with --continue or --session flags

import { join } from 'node:path'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import type { Session, SessionSummary } from './types'
import { getSessionStore } from './store'

const VOIDE_DIR = join(homedir(), '.voide')
const LAST_SESSION_FILE = join(VOIDE_DIR, 'last-session')

export interface ResumeOptions {
  // Continue the most recent session
  continue?: boolean
  // Resume a specific session by ID
  sessionId?: string
  // Resume a session for a specific project
  projectPath?: string
  // Search sessions by title/content
  search?: string
}

export interface SessionMatch {
  session: Session
  matchType: 'last' | 'id' | 'project' | 'search'
  score?: number
}

// Track the last used session
export async function trackLastSession(sessionId: string): Promise<void> {
  try {
    await writeFile(LAST_SESSION_FILE, sessionId, 'utf-8')
  }
  catch {
    // Ignore errors
  }
}

// Get the last used session ID
export async function getLastSessionId(): Promise<string | null> {
  try {
    const id = await readFile(LAST_SESSION_FILE, 'utf-8')
    return id.trim() || null
  }
  catch {
    return null
  }
}

// Get the last session for a specific project
export async function getLastProjectSession(projectPath: string): Promise<Session | null> {
  const store = getSessionStore()
  const sessions = await store.list(projectPath)

  if (sessions.length === 0) return null

  // Get the most recent session for this project
  return store.get(sessions[0].id)
}

// Resume a session based on options
export async function resumeSession(options: ResumeOptions): Promise<SessionMatch | null> {
  const store = getSessionStore()

  // Option 1: Continue most recent session
  if (options.continue) {
    // First try project-specific if projectPath provided
    if (options.projectPath) {
      const session = await getLastProjectSession(options.projectPath)
      if (session) {
        return { session, matchType: 'project' }
      }
    }

    // Fall back to global last session
    const lastId = await getLastSessionId()
    if (lastId) {
      const session = await store.get(lastId)
      if (session) {
        return { session, matchType: 'last' }
      }
    }

    // No last session found, get most recent overall
    const recent = await store.getRecent(1)
    if (recent.length > 0) {
      const session = await store.get(recent[0].id)
      if (session) {
        return { session, matchType: 'last' }
      }
    }

    return null
  }

  // Option 2: Resume specific session by ID
  if (options.sessionId) {
    // Support partial ID matching
    const sessions = await store.list()
    const match = sessions.find(s =>
      s.id === options.sessionId ||
      s.id.startsWith(options.sessionId!)
    )

    if (match) {
      const session = await store.get(match.id)
      if (session) {
        return { session, matchType: 'id' }
      }
    }
    return null
  }

  // Option 3: Search by title/content
  if (options.search) {
    const sessions = await store.list(options.projectPath)
    const query = options.search.toLowerCase()
    const matches: Array<{ summary: SessionSummary; score: number }> = []

    for (const summary of sessions) {
      let score = 0

      // Check title match
      if (summary.title.toLowerCase().includes(query)) {
        score += 10
      }

      // Check ID match
      if (summary.id.includes(query)) {
        score += 5
      }

      if (score > 0) {
        matches.push({ summary, score })
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score)

    if (matches.length > 0) {
      const session = await store.get(matches[0].summary.id)
      if (session) {
        return { session, matchType: 'search', score: matches[0].score }
      }
    }

    return null
  }

  return null
}

// List sessions with filtering and search
export async function listSessions(options: {
  projectPath?: string
  limit?: number
  search?: string
  includeContent?: boolean
}): Promise<SessionSummary[]> {
  const store = getSessionStore()
  let sessions = await store.list(options.projectPath)

  // Apply search filter
  if (options.search) {
    const query = options.search.toLowerCase()
    sessions = sessions.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.id.includes(query)
    )
  }

  // Apply limit
  if (options.limit) {
    sessions = sessions.slice(0, options.limit)
  }

  return sessions
}

// Get session details for display
export async function getSessionDetails(sessionId: string): Promise<{
  session: Session
  stats: {
    messageCount: number
    userMessages: number
    assistantMessages: number
    toolCalls: number
    duration: number
  }
} | null> {
  const store = getSessionStore()
  const session = await store.get(sessionId)

  if (!session) return null

  let userMessages = 0
  let assistantMessages = 0
  let toolCalls = 0

  for (const msg of session.messages) {
    if (msg.role === 'user') userMessages++
    if (msg.role === 'assistant') {
      assistantMessages++
      for (const content of msg.content) {
        if (content.type === 'tool_use') toolCalls++
      }
    }
  }

  return {
    session,
    stats: {
      messageCount: session.messages.length,
      userMessages,
      assistantMessages,
      toolCalls,
      duration: session.updatedAt - session.createdAt,
    },
  }
}

// Format session for display
export function formatSessionSummary(summary: SessionSummary, index?: number): string {
  const lines: string[] = []

  const prefix = index !== undefined ? `${index + 1}. ` : ''
  const date = new Date(summary.updatedAt).toLocaleDateString()
  const time = new Date(summary.updatedAt).toLocaleTimeString()

  lines.push(`${prefix}[${summary.id.slice(0, 8)}] ${summary.title}`)
  lines.push(`   ${date} ${time} | ${summary.messageCount} messages`)

  return lines.join('\n')
}

// Format session list for display
export function formatSessionList(sessions: SessionSummary[]): string {
  if (sessions.length === 0) {
    return 'No sessions found.'
  }

  const lines: string[] = ['## Recent Sessions', '']

  for (let i = 0; i < sessions.length; i++) {
    lines.push(formatSessionSummary(sessions[i], i))
    if (i < sessions.length - 1) lines.push('')
  }

  return lines.join('\n')
}

// Get conversation preview
export function getConversationPreview(session: Session, maxMessages = 5): string {
  const lines: string[] = []
  const messages = session.messages.slice(-maxMessages)

  for (const msg of messages) {
    const role = msg.role === 'user' ? '👤' : '🤖'
    for (const content of msg.content) {
      if (content.type === 'text') {
        const text = content.text.slice(0, 100)
        const truncated = content.text.length > 100 ? '...' : ''
        lines.push(`${role} ${text}${truncated}`)
      }
    }
  }

  return lines.join('\n')
}

// Clone a session for branching
export async function cloneSession(sessionId: string, upToMessageId?: string): Promise<Session | null> {
  const store = getSessionStore()
  const original = await store.get(sessionId)

  if (!original) return null

  let messages = [...original.messages]

  // If upToMessageId specified, truncate
  if (upToMessageId) {
    const idx = messages.findIndex(m => m.id === upToMessageId)
    if (idx !== -1) {
      messages = messages.slice(0, idx + 1)
    }
  }

  // Create new session with copied messages
  const newSession = await store.create(original.projectPath)
  newSession.messages = messages.map(m => ({
    ...m,
    id: `${m.id}-clone`,
  }))
  newSession.title = original.title ? `${original.title} (copy)` : undefined

  await store.update(newSession)
  return newSession
}

// Merge two sessions
export async function mergeSessions(
  targetId: string,
  sourceId: string,
  insertAfterMessageId?: string,
): Promise<Session | null> {
  const store = getSessionStore()
  const target = await store.get(targetId)
  const source = await store.get(sourceId)

  if (!target || !source) return null

  let insertIndex = target.messages.length

  if (insertAfterMessageId) {
    const idx = target.messages.findIndex(m => m.id === insertAfterMessageId)
    if (idx !== -1) {
      insertIndex = idx + 1
    }
  }

  // Insert source messages
  target.messages.splice(insertIndex, 0, ...source.messages.map(m => ({
    ...m,
    id: `${m.id}-merged`,
  })))

  await store.update(target)
  return target
}

// Archive old sessions
export async function archiveSessions(olderThanDays: number): Promise<{
  archived: string[]
  failed: string[]
}> {
  const store = getSessionStore()
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
  const sessions = await store.list()

  const archived: string[] = []
  const failed: string[] = []

  for (const summary of sessions) {
    if (summary.updatedAt < cutoff) {
      try {
        const session = await store.get(summary.id)
        if (session) {
          session.archived = true
          await store.update(session)
          archived.push(summary.id)
        }
      }
      catch {
        failed.push(summary.id)
      }
    }
  }

  return { archived, failed }
}
