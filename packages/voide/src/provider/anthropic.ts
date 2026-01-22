// Anthropic Provider implementation for Voide CLI

import type {
  ChatEvent,
  ChatMessage,
  ChatRequest,
  ContentBlock,
  ModelInfo,
  Provider,
  ProviderConfig,
  TextBlock,
  ToolUseBlock,
} from './types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const API_VERSION = '2023-06-01'

// Model definitions with pricing (per million tokens)
const ANTHROPIC_MODELS: ModelInfo[] = [
  // Claude 4.5 series (latest)
  {
    id: 'claude-opus-4-5-20250514',
    name: 'Claude Opus 4.5',
    contextLength: 200000,
    inputPrice: 15,
    outputPrice: 75,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 64000,
  },
  {
    id: 'claude-sonnet-4-5-20250514',
    name: 'Claude Sonnet 4.5',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 64000,
  },
  {
    id: 'claude-haiku-4-5-20250514',
    name: 'Claude Haiku 4.5',
    contextLength: 200000,
    inputPrice: 1,
    outputPrice: 5,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 64000,
  },
  // Claude 4 series
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    contextLength: 200000,
    inputPrice: 15,
    outputPrice: 75,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 32000,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 64000,
  },
  // Claude 3.5 series
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet v2',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    contextLength: 200000,
    inputPrice: 0.8,
    outputPrice: 4,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 8192,
  },
  // Claude 3 series
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    contextLength: 200000,
    inputPrice: 15,
    outputPrice: 75,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 4096,
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 4096,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    contextLength: 200000,
    inputPrice: 0.25,
    outputPrice: 1.25,
    supportsTools: true,
    supportsVision: true,
    maxOutputTokens: 4096,
  },
]

export class AnthropicProvider implements Provider {
  readonly name = 'Anthropic'
  readonly id = 'anthropic'

  private apiKey: string | undefined
  private baseUrl: string
  private defaultModel: string
  private maxRetries: number
  private timeout: number

  constructor(config: ProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY
    this.baseUrl = config.baseUrl || ANTHROPIC_API_URL
    this.defaultModel = config.model || DEFAULT_MODEL
    this.maxRetries = config.maxRetries || 3
    this.timeout = config.timeout || 120000
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  async listModels(): Promise<ModelInfo[]> {
    return ANTHROPIC_MODELS
  }

  async *chat(request: ChatRequest): AsyncGenerator<ChatEvent, void, unknown> {
    if (!this.apiKey) {
      yield {
        type: 'error',
        error: {
          type: 'authentication_error',
          message: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.',
        },
      }
      return
    }

    const model = request.model || this.defaultModel
    const messages = this.formatMessages(request.messages)
    const tools = request.tools ? this.formatTools(request.tools) : undefined

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: request.maxTokens || 8192,
      stream: true,
    }

    if (request.systemPrompt) {
      body.system = request.systemPrompt
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    if (tools && tools.length > 0) {
      body.tools = tools
    }

    let lastError: Error | undefined
    let retries = 0

    while (retries < this.maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        // Combine abort signals if provided
        if (request.signal) {
          request.signal.addEventListener('abort', () => controller.abort())
        }

        const response = await fetch(`${this.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': API_VERSION,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } }
          yield {
            type: 'error',
            error: {
              type: `http_${response.status}`,
              message: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
            },
          }
          return
        }

        if (!response.body) {
          yield {
            type: 'error',
            error: {
              type: 'stream_error',
              message: 'Response body is empty',
            },
          }
          return
        }

        // Stream SSE events
        yield* this.parseSSEStream(response.body)
        return
      }
      catch (error) {
        lastError = error as Error
        retries++

        if (retries < this.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
        }
      }
    }

    yield {
      type: 'error',
      error: {
        type: 'network_error',
        message: lastError?.message || 'Failed to connect to Anthropic API',
      },
    }
  }

  private formatMessages(messages: ChatMessage[]): Array<{ role: string, content: string | ContentBlock[] }> {
    return messages
      .filter(m => m.role !== 'system') // System messages go in the system parameter
      .map(m => ({
        role: m.role,
        content: m.content,
      }))
  }

  private formatTools(tools: Array<{ name: string, description: string, parameters: Array<{ name: string, type: string, description: string, required?: boolean }> }>): Array<{ name: string, description: string, input_schema: Record<string, unknown> }> {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map(p => [
            p.name,
            {
              type: p.type,
              description: p.description,
            },
          ]),
        ),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    }))
  }

  private async *parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent, void, unknown> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const event = JSON.parse(data) as ChatEvent
              yield event
            }
            catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim()
        if (data && data !== '[DONE]') {
          try {
            const event = JSON.parse(data) as ChatEvent
            yield event
          }
          catch {
            // Ignore parse errors
          }
        }
      }
    }
    finally {
      reader.releaseLock()
    }
  }
}

// Helper to create an Anthropic provider
export function createAnthropicProvider(config?: ProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config)
}

// Helper to convert tool calls from Anthropic format to our format
export function parseToolUse(block: ToolUseBlock): { id: string, name: string, input: Record<string, unknown> } {
  return {
    id: block.id,
    name: block.name,
    input: block.input,
  }
}

// Helper to create tool result for response
export function createToolResult(toolUseId: string, content: string, isError = false): ContentBlock {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content,
    is_error: isError,
  }
}

// Helper to create text message
export function createTextMessage(role: 'user' | 'assistant', text: string): ChatMessage {
  return {
    role,
    content: text,
  }
}

// Helper to create message with tool result
export function createToolResultMessage(results: Array<{ tool_use_id: string, content: string, is_error?: boolean }>): ChatMessage {
  return {
    role: 'user',
    content: results.map(r => ({
      type: 'tool_result' as const,
      tool_use_id: r.tool_use_id,
      content: r.content,
      is_error: r.is_error,
    })),
  }
}
