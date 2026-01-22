// Session Export/Import for Voide CLI

import { readFile, writeFile } from 'node:fs/promises'
import type { Session, Message, MessageContent } from './types'
import { getSessionStore } from './store'

export interface ExportedSession {
  version: '1.0'
  exportedAt: number
  session: Session
}

export interface ExportOptions {
  includeToolResults?: boolean
  includeMetadata?: boolean
  format?: 'json' | 'markdown'
}

/**
 * Export a session to JSON
 */
export async function exportSession(
  sessionId: string,
  options: ExportOptions = {},
): Promise<string> {
  const store = getSessionStore()
  const session = await store.get(sessionId)

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  if (options.format === 'markdown') {
    return exportToMarkdown(session, options)
  }

  const exported: ExportedSession = {
    version: '1.0',
    exportedAt: Date.now(),
    session: options.includeMetadata ? session : stripMetadata(session),
  }

  return JSON.stringify(exported, null, 2)
}

/**
 * Export session to markdown format
 */
function exportToMarkdown(session: Session, options: ExportOptions): string {
  const parts: string[] = []

  parts.push(`# Voide Session: ${session.id}`)
  parts.push('')
  parts.push(`**Project:** ${session.projectPath}`)
  parts.push(`**Created:** ${new Date(session.createdAt).toLocaleString()}`)
  parts.push(`**Updated:** ${new Date(session.updatedAt).toLocaleString()}`)
  parts.push('')
  parts.push('---')
  parts.push('')

  for (const message of session.messages) {
    const role = message.role === 'user' ? '👤 User' : message.role === 'assistant' ? '🤖 Assistant' : '📋 System'
    parts.push(`## ${role}`)
    parts.push('')

    for (const content of message.content) {
      if (content.type === 'text') {
        parts.push(content.text)
      }
      else if (content.type === 'tool_use') {
        parts.push(`**Tool Call:** \`${content.name}\``)
        parts.push('```json')
        parts.push(JSON.stringify(content.input, null, 2))
        parts.push('```')
      }
      else if (content.type === 'tool_result' && options.includeToolResults) {
        parts.push(`**Tool Result:**`)
        parts.push('```')
        parts.push(content.output.slice(0, 1000) + (content.output.length > 1000 ? '\n...(truncated)' : ''))
        parts.push('```')
      }
    }

    parts.push('')
    parts.push('---')
    parts.push('')
  }

  return parts.join('\n')
}

/**
 * Strip metadata from session for cleaner export
 */
function stripMetadata(session: Session): Session {
  return {
    ...session,
    metadata: undefined,
    messages: session.messages.map(m => ({
      ...m,
      metadata: undefined,
    })),
  }
}

/**
 * Import a session from JSON
 */
export async function importSession(data: string): Promise<Session> {
  let exported: ExportedSession

  try {
    exported = JSON.parse(data) as ExportedSession
  }
  catch {
    throw new Error('Invalid JSON format')
  }

  if (exported.version !== '1.0') {
    throw new Error(`Unsupported export version: ${exported.version}`)
  }

  const store = getSessionStore()
  const session = exported.session

  // Generate new ID to avoid conflicts
  const newId = generateId()
  const importedSession: Session = {
    ...session,
    id: newId,
    metadata: {
      ...session.metadata,
      importedFrom: session.id,
      importedAt: Date.now(),
    },
  }

  await store.update(importedSession)
  return importedSession
}

/**
 * Export session to file
 */
export async function exportSessionToFile(
  sessionId: string,
  filePath: string,
  options: ExportOptions = {},
): Promise<void> {
  const content = await exportSession(sessionId, options)
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Import session from file
 */
export async function importSessionFromFile(filePath: string): Promise<Session> {
  const content = await readFile(filePath, 'utf-8')
  return importSession(content)
}

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${timestamp}-${random}`
}
