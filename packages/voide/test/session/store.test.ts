// Session Store Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  FileSessionStore,
  getSessionStore,
  createMessage,
  createSession,
  textContent,
  toolUseContent,
  toolResultContent,
} from '../../src/session/store'
import { createTempDir, cleanupTempDir, randomString } from '../utils/helpers'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { rm } from 'node:fs/promises'

describe('FileSessionStore', () => {
  let store: FileSessionStore
  let testProjectPath: string

  beforeEach(async () => {
    store = new FileSessionStore()
    testProjectPath = await createTempDir('session-test')
  })

  afterEach(async () => {
    await cleanupTempDir(testProjectPath)
  })

  describe('create', () => {
    test('should create a new session', async () => {
      const session = await store.create(testProjectPath)

      expect(session.id).toBeTruthy()
      expect(session.projectPath).toBe(testProjectPath)
      expect(session.messages).toEqual([])
      expect(session.createdAt).toBeLessThanOrEqual(Date.now())
      expect(session.updatedAt).toBeLessThanOrEqual(Date.now())
    })

    test('should generate unique IDs', async () => {
      const session1 = await store.create(testProjectPath)
      const session2 = await store.create(testProjectPath)

      expect(session1.id).not.toBe(session2.id)
    })
  })

  describe('get', () => {
    test('should retrieve existing session', async () => {
      const created = await store.create(testProjectPath)
      const retrieved = await store.get(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.projectPath).toBe(testProjectPath)
    })

    test('should return null for non-existent session', async () => {
      const session = await store.get('nonexistent-id')
      expect(session).toBeNull()
    })
  })

  describe('update', () => {
    test('should update session', async () => {
      const session = await store.create(testProjectPath)
      session.title = 'Updated Title'
      session.messages.push(createMessage('user', [textContent('Hello')]))

      await store.update(session)

      const retrieved = await store.get(session.id)
      expect(retrieved?.title).toBe('Updated Title')
      expect(retrieved?.messages.length).toBe(1)
    })

    test('should update timestamp on update', async () => {
      const session = await store.create(testProjectPath)
      const originalUpdatedAt = session.updatedAt

      // Wait a bit
      await new Promise(r => setTimeout(r, 10))

      session.title = 'New Title'
      await store.update(session)

      const retrieved = await store.get(session.id)
      expect(retrieved?.updatedAt).toBeGreaterThan(originalUpdatedAt)
    })
  })

  describe('delete', () => {
    test('should delete session', async () => {
      const session = await store.create(testProjectPath)
      await store.delete(session.id)

      const retrieved = await store.get(session.id)
      expect(retrieved).toBeNull()
    })

    test('should not error when deleting non-existent session', async () => {
      await expect(store.delete('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('list', () => {
    test('should list all sessions', async () => {
      await store.create(testProjectPath)
      await store.create(testProjectPath)
      await store.create(testProjectPath)

      const sessions = await store.list()
      expect(sessions.length).toBeGreaterThanOrEqual(3)
    })

    test('should filter by project path', async () => {
      const otherPath = await createTempDir('other-project')

      try {
        await store.create(testProjectPath)
        await store.create(testProjectPath)
        await store.create(otherPath)

        const filtered = await store.list(testProjectPath)
        expect(filtered.every(s => s.projectPath === testProjectPath)).toBe(true)
      }
      finally {
        await cleanupTempDir(otherPath)
      }
    })

    test('should sort by most recent', async () => {
      const session1 = await store.create(testProjectPath)
      await new Promise(r => setTimeout(r, 10))
      const session2 = await store.create(testProjectPath)
      await new Promise(r => setTimeout(r, 10))
      const session3 = await store.create(testProjectPath)

      const sessions = await store.list(testProjectPath)
      expect(sessions[0].id).toBe(session3.id)
    })

    test('should include message count', async () => {
      const session = await store.create(testProjectPath)
      session.messages.push(createMessage('user', [textContent('Hello')]))
      session.messages.push(createMessage('assistant', [textContent('Hi')]))
      await store.update(session)

      const sessions = await store.list(testProjectPath)
      const found = sessions.find(s => s.id === session.id)
      expect(found?.messageCount).toBe(2)
    })
  })

  describe('getRecent', () => {
    test('should return limited recent sessions', async () => {
      for (let i = 0; i < 15; i++) {
        await store.create(testProjectPath)
      }

      const recent = await store.getRecent(5)
      expect(recent.length).toBe(5)
    })
  })

  describe('addMessage', () => {
    test('should add message to session', async () => {
      const session = await store.create(testProjectPath)
      const message = createMessage('user', [textContent('Hello')])

      await store.addMessage(session.id, message)

      const retrieved = await store.get(session.id)
      expect(retrieved?.messages.length).toBe(1)
      expect(retrieved?.messages[0].id).toBe(message.id)
    })

    test('should throw for non-existent session', async () => {
      const message = createMessage('user', [textContent('Hello')])

      await expect(
        store.addMessage('nonexistent', message)
      ).rejects.toThrow('Session not found')
    })
  })

  describe('updateMessage', () => {
    test('should update message content', async () => {
      const session = await store.create(testProjectPath)
      const message = createMessage('assistant', [textContent('Original')])
      await store.addMessage(session.id, message)

      await store.updateMessage(session.id, message.id, [textContent('Updated')])

      const retrieved = await store.get(session.id)
      const updatedMessage = retrieved?.messages[0]
      expect((updatedMessage?.content[0] as { text: string }).text).toBe('Updated')
    })

    test('should throw for non-existent message', async () => {
      const session = await store.create(testProjectPath)

      await expect(
        store.updateMessage(session.id, 'nonexistent', [textContent('Test')])
      ).rejects.toThrow('Message not found')
    })
  })

  describe('prune', () => {
    test('should delete old sessions', async () => {
      const session = await store.create(testProjectPath)

      // Manually set old timestamp
      session.updatedAt = Date.now() - (60 * 24 * 60 * 60 * 1000) // 60 days ago
      await store.update(session)

      const deleted = await store.prune(30 * 24 * 60 * 60 * 1000) // 30 days
      expect(deleted).toBeGreaterThanOrEqual(1)

      const retrieved = await store.get(session.id)
      expect(retrieved).toBeNull()
    })
  })
})

describe('helper functions', () => {
  describe('createMessage', () => {
    test('should create message with ID and timestamp', () => {
      const message = createMessage('user', [textContent('Hello')])

      expect(message.id).toBeTruthy()
      expect(message.role).toBe('user')
      expect(message.content).toHaveLength(1)
      expect(message.timestamp).toBeLessThanOrEqual(Date.now())
    })

    test('should include metadata if provided', () => {
      const message = createMessage('assistant', [textContent('Hi')], {
        model: 'claude-sonnet-4-20250514',
      })

      expect(message.metadata?.model).toBe('claude-sonnet-4-20250514')
    })
  })

  describe('textContent', () => {
    test('should create text content', () => {
      const content = textContent('Hello world')

      expect(content.type).toBe('text')
      expect(content.text).toBe('Hello world')
    })
  })

  describe('toolUseContent', () => {
    test('should create tool use content', () => {
      const content = toolUseContent('tool-1', 'read', { path: '/test.txt' })

      expect(content.type).toBe('tool_use')
      expect(content.id).toBe('tool-1')
      expect(content.name).toBe('read')
      expect(content.input).toEqual({ path: '/test.txt' })
      expect(content.status).toBe('pending')
    })
  })

  describe('toolResultContent', () => {
    test('should create tool result content', () => {
      const content = toolResultContent('tool-1', 'File contents here')

      expect(content.type).toBe('tool_result')
      expect(content.toolUseId).toBe('tool-1')
      expect(content.output).toBe('File contents here')
      expect(content.isError).toBeFalsy()
    })

    test('should support error flag', () => {
      const content = toolResultContent('tool-1', 'Error: file not found', true)

      expect(content.isError).toBe(true)
    })
  })

  describe('createSession', () => {
    test('should create session using singleton store', async () => {
      const tempDir = await createTempDir('create-session-test')

      try {
        const session = await createSession(tempDir)
        expect(session.id).toBeTruthy()
        expect(session.projectPath).toBe(tempDir)
      }
      finally {
        await cleanupTempDir(tempDir)
      }
    })
  })

  describe('getSessionStore', () => {
    test('should return singleton instance', () => {
      const store1 = getSessionStore()
      const store2 = getSessionStore()

      expect(store1).toBe(store2)
    })
  })
})
