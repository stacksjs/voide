// OpenAI-Compatible Provider for Voide CLI
// Works with Groq, Together, OpenRouter, Perplexity, DeepInfra, Cerebras, xAI, etc.

import type { Provider, ChatRequest, ChatEvent, ModelInfo, ProviderConfig } from './types'
import type { Tool } from '../tool/types'

export interface OpenAICompatibleConfig extends ProviderConfig {
  name: string
  apiKey?: string
  baseUrl: string
  models: ModelInfo[]
  defaultModel?: string
  headers?: Record<string, string>
  apiKeyEnvVar?: string
}

export class OpenAICompatibleProvider implements Provider {
  name: string
  private config: OpenAICompatibleConfig

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.name
    this.config = config
  }

  getModels(): ModelInfo[] {
    return this.config.models
  }

  getDefaultModel(): string {
    return this.config.defaultModel || this.config.models[0]?.id || 'default'
  }

  async *chat(request: ChatRequest): AsyncGenerator<ChatEvent> {
    const apiKey = this.config.apiKey
      || (this.config.apiKeyEnvVar ? process.env[this.config.apiKeyEnvVar] : undefined)
      || process.env[`${this.name.toUpperCase()}_API_KEY`]

    if (!apiKey) {
      throw new Error(`${this.name} API key not configured. Set ${this.config.apiKeyEnvVar || `${this.name.toUpperCase()}_API_KEY`}.`)
    }

    const model = request.model || this.getDefaultModel()

    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: Array.isArray(msg.content)
        ? msg.content.map(c => {
            if (c.type === 'text') return { type: 'text', text: c.text }
            if (c.type === 'image') {
              return {
                type: 'image_url',
                image_url: {
                  url: c.source.type === 'base64'
                    ? `data:${c.source.media_type};base64,${c.source.data}`
                    : c.source.data,
                },
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
    if (request.stopSequences) body.stop = request.stopSequences

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...this.config.headers,
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string }
      throw new Error(`${this.name} API error: ${response.status} - ${error.error?.message || error.message || 'Unknown error'}`)
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
            const event = JSON.parse(data) as StreamEvent
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

interface StreamEvent {
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

// Pre-configured providers

export const GroqProvider = (config: Partial<OpenAICompatibleConfig> = {}) =>
  new OpenAICompatibleProvider({
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnvVar: 'GROQ_API_KEY',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 128000, maxOutput: 32768 },
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', contextWindow: 128000, maxOutput: 32768 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextWindow: 128000, maxOutput: 8192 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, maxOutput: 32768 },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192, maxOutput: 8192 },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    ...config,
  })

export const TogetherProvider = (config: Partial<OpenAICompatibleConfig> = {}) =>
  new OpenAICompatibleProvider({
    name: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    apiKeyEnvVar: 'TOGETHER_API_KEY',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B', contextWindow: 128000, maxOutput: 4096 },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', contextWindow: 128000, maxOutput: 4096 },
      { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', contextWindow: 65536, maxOutput: 4096 },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', contextWindow: 32768, maxOutput: 4096 },
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', contextWindow: 64000, maxOutput: 8192 },
    ],
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    ...config,
  })

export const OpenRouterProvider = (config: Partial<OpenAICompatibleConfig> = {}) =>
  new OpenAICompatibleProvider({
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000, maxOutput: 8192 },
      { id: 'openai/gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxOutput: 16384 },
      { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro', contextWindow: 2097152, maxOutput: 8192 },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', contextWindow: 128000, maxOutput: 4096 },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000, maxOutput: 8192 },
    ],
    defaultModel: 'anthropic/claude-3.5-sonnet',
    headers: {
      'HTTP-Referer': 'https://voide.dev',
      'X-Title': 'Voide CLI',
    },
    ...config,
  })

export const PerplexityProvider = (config: Partial<OpenAICompatibleConfig> = {}) =>
  new OpenAICompatibleProvider({
    name: 'perplexity',
    baseUrl: 'https://api.perplexity.ai',
    apiKeyEnvVar: 'PERPLEXITY_API_KEY',
    models: [
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online', contextWindow: 128000, maxOutput: 4096 },
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online', contextWindow: 128000, maxOutput: 4096 },
      { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large Chat', contextWindow: 128000, maxOutput: 4096 },
      { id: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B', contextWindow: 128000, maxOutput: 4096 },
    ],
    defaultModel: 'llama-3.1-sonar-large-128k-online',
    ...config,
  })

export const DeepInfraProvider = (config: Partial<OpenAICompatibleConfig> = {}) =>
  new OpenAICompatibleProvider({
    name: 'deepinfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    apiKeyEnvVar: 'DEEPINFRA_API_KEY',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', contextWindow: 128000, maxOutput: 4096 },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', contextWindow: 128000, maxOutput: 4096 },
      { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', contextWindow: 65536, maxOutput: 4096 },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', contextWindow: 32768, maxOutput: 4096 },
    ],
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    ...config,
  })

export const CerebrasProvider = (config: Partial<OpenAICompatibleConfig> = {}) =>
  new OpenAICompatibleProvider({
    name: 'cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKeyEnvVar: 'CEREBRAS_API_KEY',
    models: [
      { id: 'llama3.1-70b', name: 'Llama 3.1 70B', contextWindow: 128000, maxOutput: 8192 },
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B', contextWindow: 128000, maxOutput: 8192 },
    ],
    defaultModel: 'llama3.1-70b',
    ...config,
  })

export const XAIProvider = (config: Partial<OpenAICompatibleConfig> = {}) =>
  new OpenAICompatibleProvider({
    name: 'xai',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyEnvVar: 'XAI_API_KEY',
    models: [
      { id: 'grok-2-1212', name: 'Grok 2', contextWindow: 131072, maxOutput: 32768 },
      { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', contextWindow: 32768, maxOutput: 8192 },
      { id: 'grok-beta', name: 'Grok Beta', contextWindow: 131072, maxOutput: 8192 },
    ],
    defaultModel: 'grok-2-1212',
    ...config,
  })

export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider(config)
}
