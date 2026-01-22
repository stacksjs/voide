// Azure OpenAI Provider for Voide CLI

import type { Provider, ChatRequest, ChatEvent, ModelInfo, ProviderConfig } from './types'
import type { Tool } from '../tool/types'

export interface AzureConfig extends ProviderConfig {
  apiKey?: string
  endpoint?: string
  deploymentName?: string
  apiVersion?: string
}

export class AzureOpenAIProvider implements Provider {
  name = 'azure'
  private config: AzureConfig

  constructor(config: AzureConfig = {}) {
    this.config = config
  }

  getModels(): ModelInfo[] {
    // Azure deployments are custom, return common ones
    return [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxOutput: 16384 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, maxOutput: 16384 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, maxOutput: 4096 },
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, maxOutput: 8192 },
      { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, maxOutput: 4096 },
    ]
  }

  getDefaultModel(): string {
    return this.config.deploymentName || 'gpt-4o'
  }

  async *chat(request: ChatRequest): AsyncGenerator<ChatEvent> {
    const apiKey = this.config.apiKey || process.env.AZURE_OPENAI_API_KEY
    const endpoint = this.config.endpoint || process.env.AZURE_OPENAI_ENDPOINT
    const deploymentName = this.config.deploymentName || process.env.AZURE_OPENAI_DEPLOYMENT || request.model || 'gpt-4o'
    const apiVersion = this.config.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-01'

    if (!apiKey) {
      throw new Error('Azure OpenAI API key not configured. Set AZURE_OPENAI_API_KEY.')
    }
    if (!endpoint) {
      throw new Error('Azure OpenAI endpoint not configured. Set AZURE_OPENAI_ENDPOINT.')
    }

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

    const body: Record<string, unknown> = {
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
    if (request.stopSequences) body.stop = request.stopSequences

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`Azure OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    yield { type: 'message_start', message: { id: '', model: deploymentName, role: 'assistant' } }

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
            const event = JSON.parse(data) as AzureStreamEvent
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

interface AzureStreamEvent {
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

export function createAzureProvider(config: AzureConfig = {}): AzureOpenAIProvider {
  return new AzureOpenAIProvider(config)
}
