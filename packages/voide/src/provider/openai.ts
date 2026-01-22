// OpenAI Provider for Voide CLI

import type { Provider, ChatRequest, ChatEvent, ModelInfo, ProviderConfig } from './types'
import type { Tool } from '../tool/types'

export interface OpenAIConfig extends ProviderConfig {
  apiKey?: string
  baseUrl?: string
  organization?: string
}

const OPENAI_MODELS: ModelInfo[] = [
  // GPT-5 series (latest)
  { id: 'gpt-5', name: 'GPT-5', contextWindow: 400000, maxOutput: 128000 },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', contextWindow: 400000, maxOutput: 128000 },
  // o3 series (reasoning)
  { id: 'o3', name: 'o3', contextWindow: 200000, maxOutput: 100000 },
  { id: 'o3-mini', name: 'o3 Mini', contextWindow: 200000, maxOutput: 100000 },
  // o1 series (reasoning)
  { id: 'o1', name: 'o1', contextWindow: 200000, maxOutput: 100000 },
  { id: 'o1-mini', name: 'o1 Mini', contextWindow: 128000, maxOutput: 65536 },
  { id: 'o1-preview', name: 'o1 Preview', contextWindow: 128000, maxOutput: 32768 },
  // GPT-4.1 series
  { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1000000, maxOutput: 32768 },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', contextWindow: 1000000, maxOutput: 32768 },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', contextWindow: 1000000, maxOutput: 32768 },
  // GPT-4o series
  { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxOutput: 16384 },
  { id: 'gpt-4o-2024-11-20', name: 'GPT-4o (Nov 2024)', contextWindow: 128000, maxOutput: 16384 },
  { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (Aug 2024)', contextWindow: 128000, maxOutput: 16384 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, maxOutput: 16384 },
  { id: 'gpt-4o-mini-2024-07-18', name: 'GPT-4o Mini (Jul 2024)', contextWindow: 128000, maxOutput: 16384 },
  // GPT-4 Turbo
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, maxOutput: 4096 },
  { id: 'gpt-4-turbo-2024-04-09', name: 'GPT-4 Turbo (Apr 2024)', contextWindow: 128000, maxOutput: 4096 },
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview', contextWindow: 128000, maxOutput: 4096 },
  // GPT-4 base
  { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, maxOutput: 8192 },
  { id: 'gpt-4-32k', name: 'GPT-4 32k', contextWindow: 32768, maxOutput: 32768 },
  // GPT-3.5
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, maxOutput: 4096 },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', contextWindow: 16385, maxOutput: 4096 },
]

export class OpenAIProvider implements Provider {
  name = 'openai'
  private config: OpenAIConfig
  private baseUrl: string

  constructor(config: OpenAIConfig = {}) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  }

  getModels(): ModelInfo[] {
    return OPENAI_MODELS
  }

  getDefaultModel(): string {
    return 'gpt-4o'
  }

  async *chat(request: ChatRequest): AsyncGenerator<ChatEvent> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY or provide apiKey in config.')
    }

    const model = request.model || this.getDefaultModel()
    const isO1Model = model.startsWith('o1')

    // Convert messages to OpenAI format
    const messages = request.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: Array.isArray(msg.content)
        ? msg.content.map(c => {
            if (c.type === 'text') return { type: 'text' as const, text: c.text }
            if (c.type === 'image') {
              return {
                type: 'image_url' as const,
                image_url: {
                  url: c.source.type === 'base64'
                    ? `data:${c.source.media_type};base64,${c.source.data}`
                    : c.source.data,
                },
              }
            }
            return { type: 'text' as const, text: '' }
          })
        : msg.content,
    }))

    // Build request body
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
    }

    // Add tools if provided (not supported by o1 models)
    if (request.tools && request.tools.length > 0 && !isO1Model) {
      body.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: toolToJsonSchema(tool),
        },
      }))
    }

    // Add optional parameters
    if (request.maxTokens) body.max_tokens = request.maxTokens
    if (request.temperature !== undefined && !isO1Model) body.temperature = request.temperature
    if (request.topP !== undefined && !isO1Model) body.top_p = request.topP
    if (request.stopSequences) body.stop = request.stopSequences

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    yield { type: 'message_start', message: { id: '', model, role: 'assistant' } }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentToolCall: { id: string; name: string; arguments: string } | null = null
    let inputTokens = 0
    let outputTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data) as OpenAIStreamEvent
            const delta = event.choices?.[0]?.delta

            if (delta?.content) {
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: delta.content } }
            }

            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.id) {
                  // New tool call
                  if (currentToolCall) {
                    yield {
                      type: 'content_block_start',
                      content_block: {
                        type: 'tool_use',
                        id: currentToolCall.id,
                        name: currentToolCall.name,
                        input: JSON.parse(currentToolCall.arguments || '{}'),
                      },
                    }
                  }
                  currentToolCall = {
                    id: toolCall.id,
                    name: toolCall.function?.name || '',
                    arguments: toolCall.function?.arguments || '',
                  }
                }
                else if (currentToolCall && toolCall.function?.arguments) {
                  currentToolCall.arguments += toolCall.function.arguments
                }
              }
            }

            // Track usage
            if (event.usage) {
              inputTokens = event.usage.prompt_tokens || 0
              outputTokens = event.usage.completion_tokens || 0
            }
          }
          catch {
            // Skip invalid JSON
          }
        }
      }

      // Emit final tool call if any
      if (currentToolCall) {
        yield {
          type: 'content_block_start',
          content_block: {
            type: 'tool_use',
            id: currentToolCall.id,
            name: currentToolCall.name,
            input: JSON.parse(currentToolCall.arguments || '{}'),
          },
        }
      }

      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      }
    }
    finally {
      reader.releaseLock()
    }
  }
}

interface OpenAIStreamEvent {
  choices?: Array<{
    delta?: {
      content?: string
      tool_calls?: Array<{
        id?: string
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

function toolToJsonSchema(tool: Tool): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: param.type,
      description: param.description,
    }
    if (param.enum) {
      properties[param.name] = { ...properties[param.name] as object, enum: param.enum }
    }
    if (param.required) {
      required.push(param.name)
    }
  }

  return {
    type: 'object',
    properties,
    required,
  }
}

export function createOpenAIProvider(config: OpenAIConfig = {}): OpenAIProvider {
  return new OpenAIProvider(config)
}
