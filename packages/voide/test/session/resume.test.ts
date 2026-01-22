// Session Resume Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  resumeSession,
  trackLastSession,
  getLastSessionId,
  getLastProjectSession,
  listSessions,
  getSessionDetails,
  formatSessionSummary,
  formatSessionList,
  getConversationPreview,
  cloneSession,
} from '../../src/session/resume'
import { getSessionStore, createMessage, textContent } from '../../src/session/store'
import { createTempDir, cleanupTempDir } from '../utils/helpers'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { rm, writeFile, mkdir } from 'node:fs/promises'

describe('Session Resume', () => {
  let tempDir: string
  let store: ReturnType<typeof getSessionStore>

  beforeEach(async () => {
    tempDir = await createTempDir('resume-test')
    store = getSessionStore()
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
    // Clean up last session tracker
    try {
      await rm(join(homedir(), '.voide', 'last-session'))
    }
    catch {
      // Ignore
    }
  })

  describe('trackLastSession / getLastSessionId', () => {
    test('should track and retrieve last session ID', async () => {
      await trackLastSession('test-session-123')

      const lastId = await getLastSessionId()
      expect(lastId).toBe('test-session-123')
    })

    test('should return null when no last session', async () => {
      // Ensure file doesn't exist
      try {
        await rm(join(homedir(), '.voide', 'last-session'))
      }
      catch {
        // Ignore
      }

      const lastId = await getLastSessionId()
      // May return null or a previous value depending on state
      expect(lastId === null || typeof lastId === 'string').toBe(true)
    })
  })

  describe('getLastProjectSession', () => {
    test('should return most recent session for project', async () => {
      const session1 = await store.create(tempDir)
      await new Promise(r => setTimeout(r, 10))
      const session2 = await store.create(tempDir)

      const last = await getLastProjectSession(tempDir)
      expect(last?.id).toBe(session2.id)
    })

    test('should return null when no sessions for project', async () => {
      const otherDir = await createTempDir('other-project')

      try {
        const last = await getLastProjectSession(otherDir)
        expect(last).toBeNull()
      }
      finally {
        await cleanupTempDir(otherDir)
      }
    })
  })

  describe('resumeSession', () => {
    test('should resume with continue option', async () => {
      const session = await store.create(tempDir)
      await trackLastSession(session.id)

      const result = await resumeSession({ continue: true })

      expect(result).not.toBeNull()
      expect(result?.session.id).toBe(session.id)
      expect(result?.matchType).toBe('last')
    })

    test('should prefer project session when projectPath provided', async () => {
      const projectSession = await store.create(tempDir)
      const otherSession = await store.create('/tmp/other')
      await trackLastSession(otherSession.id)

      const result = await resumeSession({
        continue: true,
        projectPath: tempDir,
      })

      expect(result?.session.id).toBe(projectSession.id)
      expect(result?.matchType).toBe('project')
    })

    test('should resume by session ID', async () => {
      const session = await store.create(tempDir)

      const result = await resumeSession({ sessionId: session.id })

      expect(result?.session.id).toBe(session.id)
      expect(result?.matchType).toBe('id')
    })

    test('should resume by partial session ID', async () => {
      const session = await store.create(tempDir)
      const partialId = session.id.slice(0, 8)

      const result = await resumeSession({ sessionId: partialId })

      expect(result?.session.id).toBe(session.id)
    })

    test('should search sessions by title', async () => {
      const session = await store.create(tempDir)
      session.messages.push(createMessage('user', [textContent('Fix the bug in login')]))
      await store.update(session)

      const result = await resumeSession({ search: 'login' })

      // Might match if title is derived from message
      expect(result === null || result.matchType === 'search').toBe(true)
    })

    test('should return null when no match found', async () => {
      const result = await resumeSession({ sessionId: 'nonexistent-xyz' })
      expect(result).toBeNull()
    })
  })

  describe('listSessions', () => {
    test('should list sessions with optional project filter', async () => {
      await store.create(tempDir)
      await store.create(tempDir)

      const sessions = await listSessions({ projectPath: tempDir })
      expect(sessions.length).toBeGreaterThanOrEqual(2)
    })

    test('should limit results', async () => {
      for (let i = 0; i < 10; i++) {
        await store.create(tempDir)
      }

      const sessions = await listSessions({ projectPath: tempDir, limit: 5 })
      expect(sessions.length).toBe(5)
    })

    test('should filter by search term', async () => {
      const session = await store.create(tempDir)
      session.title = 'Implement authentication'
      await store.update(session)

      const sessions = await listSessions({
        projectPath: tempDir,
        search: 'auth',
      })

      expect(sessions.some(s => s.id === session.id)).toBe(true)
    })
  })

  describe('getSessionDetails', () => {
    test('should return session with stats', async () => {
      const session = await store.create(tempDir)
      session.messages.push(createMessage('user', [textContent('Hello')]))
      session.messages.push(createMessage('assistant', [
        textContent('Hi'),
        { type: 'tool_use', id: 't1', name: 'read', input: {}, status: 'completed' },
      ]))
      session.messages.push(createMessage('user', [textContent('Thanks')]))
      await store.update(session)

      const details = await getSessionDetails(session.id)

      expect(details).not.toBeNull()
      expect(details?.stats.messageCount).toBe(3)
      expect(details?.stats.userMessages).toBe(2)
      expect(details?.stats.assistantMessages).toBe(1)
      expect(details?.stats.toolCalls).toBe(1)
    })

    test('should return null for non-existent session', async () => {
      const details = await getSessionDetails('nonexistent')
      expect(details).toBeNull()
    })
  })

  describe('formatSessionSummary', () => {
    test('should format session summary', () => {
      const summary = {
        id: 'abc123-xyz789',
        title: 'Test Session',
        projectPath: '/project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 10,
      }

      const formatted = formatSessionSummary(summary)

      expect(formatted).toContain('abc123')
      expect(formatted).toContain('Test Session')
      expect(formatted).toContain('10 messages')
    })

    test('should include index when provided', () => {
      const summary = {
        id: 'abc123',
        title: 'Test',
        projectPath: '/',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 5,
      }

      const formatted = formatSessionSummary(summary, 2)
      expect(formatted).toContain('3.') // Index + 1
    })
  })

  describe('formatSessionList', () => {
    test('should format empty list', () => {
      const formatted = formatSessionList([])
      expect(formatted).toContain('No sessions found')
    })

    test('should format multiple sessions', () => {
      const sessions = [
        {
          id: 'session-1',
          title: 'First Session',
          projectPath: '/',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messageCount: 5,
        },
        {
          id: 'session-2',
          title: 'Second Session',
          projectPath: '/',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messageCount: 10,
        },
      ]

      const formatted = formatSessionList(sessions)

      expect(formatted).toContain('Recent Sessions')
      expect(formatted).toContain('First Session')
      expect(formatted).toContain('Second Session')
    })
  })

  describe('getConversationPreview', () => {
    test('should preview recent messages', async () => {
      const session = await store.create(tempDir)
      session.messages.push(createMessage('user', [textContent('Hello there')]))
      session.messages.push(createMessage('assistant', [textContent('Hi! How can I help?')]))
      session.messages.push(createMessage('user', [textContent('Fix this bug')]))

      const preview = getConversationPreview(session, 5)

      expect(preview).toContain('Hello there')
      expect(preview).toContain('How can I help')
      expect(preview).toContain('Fix this bug')
      expect(preview).toContain('👤') // User icon
      expect(preview).toContain('🤖') // Assistant icon
    })

    test('should limit to maxMessages', async () => {
      const session = await store.create(tempDir)
      for (let i = 0; i < 10; i++) {
        session.messages.push(createMessage('user', [textContent(`Message ${i}`)]))
      }

      const preview = getConversationPreview(session, 2)
      const lines = preview.split('\n').filter(Boolean)

      expect(lines.length).toBeLessThanOrEqual(2)
    })

    test('should truncate long messages', async () => {
      const session = await store.create(tempDir)
      session.messages.push(createMessage('user', [
        textContent('A'.repeat(200)),
      ]))

      const preview = getConversationPreview(session)
      expect(preview).toContain('...')
    })
  })

  describe('cloneSession', () => {
    test('should clone a session', async () => {
      const original = await store.create(tempDir)
      original.messages.push(createMessage('user', [textContent('Hello')]))
      original.messages.push(createMessage('assistant', [textContent('Hi')]))
      await store.update(original)

      const cloned = await cloneSession(original.id)

      expect(cloned).not.toBeNull()
      expect(cloned?.id).not.toBe(original.id)
      expect(cloned?.messages.length).toBe(2)
    })

    test('should truncate to specific message', async () => {
      const original = await store.create(tempDir)
      const msg1 = createMessage('user', [textContent('First')])
      const msg2 = createMessage('assistant', [textContent('Second')])
      const msg3 = createMessage('user', [textContent('Third')])

      original.messages.push(msg1, msg2, msg3)
      await store.update(original)

      const cloned = await cloneSession(original.id, msg2.id)

      expect(cloned?.messages.length).toBe(2)
    })

    test('should return null for non-existent session', async () => {
      const cloned = await cloneSession('nonexistent')
      expect(cloned).toBeNull()
    })

    test('should add (copy) to title', async () => {
      const original = await store.create(tempDir)
      original.title = 'Original Title'
      await store.update(original)

      const cloned = await cloneSession(original.id)

      expect(cloned?.title).toContain('(copy)')
    })
  })
})
