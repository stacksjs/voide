// Google/Gemini Provider Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { GoogleProvider, createGoogleProvider } from '../../src/provider/google'
import { createStreamingResponse, withEnv } from '../utils/helpers'

describe('GoogleProvider', () => {
  let provider: GoogleProvider
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    provider = new GoogleProvider({ apiKey: 'test-api-key' })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('constructor', () => {
    test('should create provider with config', () => {
      const provider = new GoogleProvider({ apiKey: 'google-test-key' })
      expect(provider.name).toBe('google')
    })

    test('should support Vertex AI config', () => {
      const provider = new GoogleProvider({
        useVertexAI: true,
        projectId: 'my-project',
        location: 'us-central1',
      })
      expect(provider.name).toBe('google')
    })
  })

  describe('getModels', () => {
    test('should return available models', () => {
      const models = provider.getModels()
      expect(models.length).toBeGreaterThan(0)
    })

    test('should include Gemini 3 Flash Preview', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id === 'gemini-3-flash-preview')).toBe(true)
    })

    test('should include Gemini 2.5 models', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id.includes('gemini-2.5'))).toBe(true)
    })

    test('should include Gemini 2.0 models', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id === 'gemini-2.0-flash')).toBe(true)
    })

    test('should include Gemini 1.5 models', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id === 'gemini-1.5-pro')).toBe(true)
      expect(models.some(m => m.id === 'gemini-1.5-flash')).toBe(true)
    })

    test('should have correct context window for Gemini 1.5 Pro', () => {
      const models = provider.getModels()
      const gemini15Pro = models.find(m => m.id === 'gemini-1.5-pro')
      expect(gemini15Pro?.contextWindow).toBe(2097152) // 2M tokens
    })
  })

  describe('getDefaultModel', () => {
    test('should return gemini-1.5-pro as default', () => {
      const defaultModel = provider.getDefaultModel()
      expect(defaultModel).toBe('gemini-1.5-pro')
    })
  })

  describe('chat', () => {
    test('should stream chat response', async () => {
      const chunks = [
        '{"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
        '{"candidates":[{"content":{"parts":[{"text":" world!"}]}}]}\n',
        '{"candidates":[{"content":{"parts":[{"text":""}]}}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5}}\n',
      ]

      globalThis.fetch = async () => createStreamingResponse(chunks)

      const events: unknown[] = []
      for await (const event of provider.chat({
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        events.push(event)
      }

      expect(events.length).toBeGreaterThan(0)
      expect(events.some(e => (e as { type: string }).type === 'message_start')).toBe(true)
    })

    test('should handle function calls', async () => {
      const chunks = [
        '{"candidates":[{"content":{"parts":[{"functionCall":{"name":"read","args":{"path":"/test.txt"}}}]}}]}\n',
      ]

      globalThis.fetch = async () => createStreamingResponse(chunks)

      const events: unknown[] = []
      for await (const event of provider.chat({
        messages: [{ role: 'user', content: 'Read test.txt' }],
        tools: [{
          name: 'read',
          description: 'Read a file',
          parameters: [{ name: 'path', type: 'string', required: true, description: 'File path' }],
        }],
      })) {
        events.push(event)
      }

      expect(events.some(e => (e as { type: string }).type === 'content_block_start')).toBe(true)
    })

    test('should throw error without API key', async () => {
      const providerNoKey = new GoogleProvider({})

      await withEnv({ GOOGLE_API_KEY: '', GEMINI_API_KEY: '' }, async () => {
        let threw = false
        try {
          for await (const _ of providerNoKey.chat({ messages: [{ role: 'user', content: 'Hi' }] })) {
            // consume
          }
        }
        catch (e) {
          threw = true
          expect((e as Error).message).toContain('API key')
        }
        expect(threw).toBe(true)
      })
    })

    test('should convert messages to Gemini format', async () => {
      let capturedBody: unknown

      globalThis.fetch = async (url, init) => {
        capturedBody = JSON.parse(init?.body as string)
        return createStreamingResponse(['{"candidates":[{"content":{"parts":[{"text":""}]}}]}\n'])
      }

      try {
        for await (const _ of provider.chat({
          messages: [
            { role: 'system', content: 'You are helpful.' },
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
        })) {
          // consume
        }
      }
      catch {
        // May throw
      }

      const body = capturedBody as { contents: Array<{ role: string }> }
      expect(body.contents.some(c => c.role === 'user')).toBe(true)
      expect(body.contents.some(c => c.role === 'model')).toBe(true)
    })

    test('should handle system instruction', async () => {
      let capturedBody: unknown

      globalThis.fetch = async (url, init) => {
        capturedBody = JSON.parse(init?.body as string)
        return createStreamingResponse(['{"candidates":[{"content":{"parts":[{"text":""}]}}]}\n'])
      }

      try {
        for await (const _ of provider.chat({
          messages: [
            { role: 'system', content: 'You are a coding assistant.' },
            { role: 'user', content: 'Hello' },
          ],
        })) {
          // consume
        }
      }
      catch {
        // May throw
      }

      const body = capturedBody as { systemInstruction?: { parts: Array<{ text: string }> } }
      expect(body.systemInstruction).toBeDefined()
      expect(body.systemInstruction?.parts[0].text).toBe('You are a coding assistant.')
    })
  })
})

describe('createGoogleProvider', () => {
  test('should create provider with factory function', () => {
    const provider = createGoogleProvider({ apiKey: 'test-key' })
    expect(provider).toBeInstanceOf(GoogleProvider)
    expect(provider.name).toBe('google')
  })
})
