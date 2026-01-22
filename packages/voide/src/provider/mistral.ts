// Mistral Provider for Voide CLI

import type { Provider, ChatRequest, ChatEvent, ModelInfo, ProviderConfig } from './types'
import type { Tool } from '../tool/types'

export interface MistralConfig extends ProviderConfig {
  apiKey?: string
  baseUrl?: string
}

const MISTRAL_MODELS: ModelInfo[] = [
  { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000, maxOutput: 8192 },
  { id: 'mistral-medium-latest', name: 'Mistral Medium', contextWindow: 32000, maxOutput: 8192 },
  { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32000, maxOutput: 8192 },
  { id: 'codestral-latest', name: 'Codestral', contextWindow: 32000, maxOutput: 8192 },
  { id: 'open-mistral-7b', name: 'Mistral 7B', contextWindow: 32000, maxOutput: 8192 },
  { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B', contextWindow: 32000, maxOutput: 8192 },
  { id: 'open-mixtral-8x22b', name: 'Mixtral 8x22B', contextWindow: 64000, maxOutput: 8192 },
]

export class MistralProvider implements Provider {
  name = 'mistral'
  private config: MistralConfig
  private baseUrl: string

  constructor(config: MistralConfig = {}) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1'
  }

  getModels(): ModelInfo[] {
    return MISTRAL_MODELS
  }

  getDefaultModel(): string {
    return 'mistral-large-latest'
  }

  async *chat(request: ChatRequest): AsyncGenerator<ChatEvent> {
    const apiKey = this.config.apiKey || process.env.MISTRAL_API_KEY
    if (!apiKey) {
      throw new Error('Mistral API key not configured. Set MISTRAL_API_KEY.')
    }

    const model = request.model || this.getDefaultModel()

    // Convert messages to Mistral format (OpenAI-compatible)
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: Array.isArray(msg.content)
        ? msg.content.map(c => {
            if (c.type === 'text') return { type: 'text', text: c.text }
            if (c.type === 'image') {
              return {
                type: 'image_url',
                image_url: `data:${c.source.media_type};base64,${c.source.data}`,
              }
            }
            return { type: 'text', text: '' }
          })
        : msg.content,
    }))

    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: toolToJsonSchema(tool),
        },
      }))
    }

    if (request.maxTokens) body.max_tokens = request.maxTokens
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.topP !== undefined) body.top_p = request.topP

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string }
      throw new Error(`Mistral API error: ${response.status} - ${error.message || 'Unknown error'}`)
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
            const event = JSON.parse(data) as MistralStreamEvent
            const delta = event.choices?.[0]?.delta

            if (delta?.content) {
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: delta.content } }
            }

            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.id) {
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

interface MistralStreamEvent {
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

export function createMistralProvider(config: MistralConfig = {}): MistralProvider {
  return new MistralProvider(config)
}
