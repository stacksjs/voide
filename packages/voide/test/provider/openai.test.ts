// OpenAI Provider Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { OpenAIProvider, createOpenAIProvider } from '../../src/provider/openai'
import { createStreamingResponse, withEnv } from '../utils/helpers'

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    provider = new OpenAIProvider({ apiKey: 'test-api-key' })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('constructor', () => {
    test('should create provider with config', () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' })
      expect(provider.name).toBe('openai')
    })

    test('should support organization ID', () => {
      const provider = new OpenAIProvider({
        apiKey: 'sk-test',
        organization: 'org-123',
      })
      expect(provider.name).toBe('openai')
    })
  })

  describe('getModels', () => {
    test('should return available models', () => {
      const models = provider.getModels()
      expect(models.length).toBeGreaterThan(0)
    })

    test('should include GPT-4o models', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id === 'gpt-4o')).toBe(true)
      expect(models.some(m => m.id === 'gpt-4o-mini')).toBe(true)
    })

    test('should include GPT-5 models', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id === 'gpt-5')).toBe(true)
    })

    test('should include o1 reasoning models', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id === 'o1')).toBe(true)
      expect(models.some(m => m.id === 'o3')).toBe(true)
      expect(models.some(m => m.id === 'o3-mini')).toBe(true)
    })
  })

  describe('getDefaultModel', () => {
    test('should return gpt-4o as default', () => {
      const defaultModel = provider.getDefaultModel()
      expect(defaultModel).toBe('gpt-4o')
    })
  })

  describe('chat', () => {
    test('should stream chat response', async () => {
      const chunks = [
        'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"delta":{"content":" world"},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"delta":{},"finish_reason":"stop","index":0}],"usage":{"prompt_tokens":10,"completion_tokens":5}}\n\n',
        'data: [DONE]\n\n',
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
        'data: {"id":"chatcmpl-1","choices":[{"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"read","arguments":""}}]},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-1","choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":"}}]},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-1","choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"/test.txt\\"}"}}]},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-1","choices":[{"delta":{},"finish_reason":"tool_calls","index":0}]}\n\n',
        'data: [DONE]\n\n',
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
      const providerNoKey = new OpenAIProvider({})

      await withEnv({ OPENAI_API_KEY: '' }, async () => {
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

    test('should support max tokens setting', async () => {
      let capturedBody: unknown

      globalThis.fetch = async (url, init) => {
        capturedBody = JSON.parse(init?.body as string)
        return createStreamingResponse(['data: [DONE]\n\n'])
      }

      try {
        for await (const _ of provider.chat({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 100,
        })) {
          // consume
        }
      }
      catch {
        // May throw due to empty response
      }

      expect((capturedBody as { max_tokens: number }).max_tokens).toBe(100)
    })

    test('should support temperature setting', async () => {
      let capturedBody: unknown

      globalThis.fetch = async (url, init) => {
        capturedBody = JSON.parse(init?.body as string)
        return createStreamingResponse(['data: [DONE]\n\n'])
      }

      try {
        for await (const _ of provider.chat({
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.5,
        })) {
          // consume
        }
      }
      catch {
        // May throw due to empty response
      }

      expect((capturedBody as { temperature: number }).temperature).toBe(0.5)
    })
  })
})

describe('createOpenAIProvider', () => {
  test('should create provider with factory function', () => {
    const provider = createOpenAIProvider({ apiKey: 'test-key' })
    expect(provider).toBeInstanceOf(OpenAIProvider)
    expect(provider.name).toBe('openai')
  })
})
