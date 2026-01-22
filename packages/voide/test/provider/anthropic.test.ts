// Anthropic Provider Tests

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { AnthropicProvider, createAnthropicProvider } from '../../src/provider/anthropic'
import { createMockLLMStream, withEnv } from '../utils/helpers'

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    provider = new AnthropicProvider({ apiKey: 'test-api-key' })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('constructor', () => {
    test('should create provider with config', () => {
      const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' })
      expect(provider.name).toBe('anthropic')
    })

    test('should use environment variable if no apiKey provided', async () => {
      await withEnv({ ANTHROPIC_API_KEY: 'env-api-key' }, () => {
        const provider = new AnthropicProvider({})
        expect(provider).toBeDefined()
      })
    })
  })

  describe('getModels', () => {
    test('should return available models', () => {
      const models = provider.getModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models.some(m => m.id.includes('claude'))).toBe(true)
    })

    test('should include Claude 4.5 models', () => {
      const models = provider.getModels()
      expect(models.some(m => m.id === 'claude-opus-4-5-20250514')).toBe(true)
      expect(models.some(m => m.id === 'claude-sonnet-4-5-20250514')).toBe(true)
    })

    test('should have correct context window sizes', () => {
      const models = provider.getModels()
      const opus = models.find(m => m.id === 'claude-opus-4-5-20250514')
      expect(opus?.contextWindow).toBe(200000)
    })
  })

  describe('getDefaultModel', () => {
    test('should return a valid default model', () => {
      const defaultModel = provider.getDefaultModel()
      expect(defaultModel).toBeTruthy()
      expect(defaultModel.includes('claude')).toBe(true)
    })
  })

  describe('chat', () => {
    test('should stream chat response', async () => {
      const mockEvents = [
        { type: 'message_start', data: { message: { id: 'msg_1', model: 'claude-sonnet-4-20250514', role: 'assistant' } } },
        { type: 'content_block_delta', data: { delta: { type: 'text_delta', text: 'Hello' } } },
        { type: 'content_block_delta', data: { delta: { type: 'text_delta', text: ' world' } } },
        { type: 'message_delta', data: { delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 10, output_tokens: 5 } } },
      ]

      globalThis.fetch = async () => createMockLLMStream(mockEvents)

      const events: unknown[] = []
      for await (const event of provider.chat({
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        events.push(event)
      }

      expect(events.length).toBeGreaterThan(0)
      expect(events.some(e => (e as { type: string }).type === 'message_start')).toBe(true)
    })

    test('should handle tool use in response', async () => {
      const mockEvents = [
        { type: 'message_start', data: { message: { id: 'msg_1', model: 'claude-sonnet-4-20250514', role: 'assistant' } } },
        { type: 'content_block_start', data: { content_block: { type: 'tool_use', id: 'tool_1', name: 'read', input: {} } } },
        { type: 'content_block_delta', data: { delta: { type: 'input_json_delta', partial_json: '{"path":' } } },
        { type: 'content_block_delta', data: { delta: { type: 'input_json_delta', partial_json: '"/test.txt"}' } } },
        { type: 'content_block_stop', data: {} },
        { type: 'message_delta', data: { delta: { stop_reason: 'tool_use' }, usage: { input_tokens: 10, output_tokens: 20 } } },
      ]

      globalThis.fetch = async () => createMockLLMStream(mockEvents)

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
      const providerNoKey = new AnthropicProvider({})

      await withEnv({ ANTHROPIC_API_KEY: '' }, async () => {
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

    test('should handle API errors gracefully', async () => {
      globalThis.fetch = async () => new Response(
        JSON.stringify({ error: { message: 'Rate limit exceeded' } }),
        { status: 429 }
      )

      let threw = false
      try {
        for await (const _ of provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })) {
          // consume
        }
      }
      catch (e) {
        threw = true
        expect((e as Error).message).toContain('429')
      }
      expect(threw).toBe(true)
    })

    test('should include system message', async () => {
      let capturedBody: unknown

      globalThis.fetch = async (url, init) => {
        capturedBody = JSON.parse(init?.body as string)
        return createMockLLMStream([
          { type: 'message_start', data: { message: { id: 'msg_1', model: 'claude-sonnet-4-20250514', role: 'assistant' } } },
          { type: 'message_delta', data: { delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 10, output_tokens: 5 } } },
        ])
      }

      for await (const _ of provider.chat({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' },
        ],
      })) {
        // consume
      }

      expect((capturedBody as { system: string }).system).toBe('You are a helpful assistant.')
    })
  })
})

describe('createAnthropicProvider', () => {
  test('should create provider with factory function', () => {
    const provider = createAnthropicProvider({ apiKey: 'test-key' })
    expect(provider).toBeInstanceOf(AnthropicProvider)
    expect(provider.name).toBe('anthropic')
  })
})
