// Google (Gemini) Provider for Voide CLI

import type { Provider, ChatRequest, ChatEvent, ModelInfo, ProviderConfig } from './types'
import type { Tool } from '../tool/types'

export interface GoogleConfig extends ProviderConfig {
  apiKey?: string
  projectId?: string
  location?: string
  useVertexAI?: boolean
}

const GEMINI_MODELS: ModelInfo[] = [
  // Gemini 3 series (latest)
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', contextWindow: 1048576, maxOutput: 65536 },
  // Gemini 2.5 series
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', contextWindow: 1048576, maxOutput: 65536 },
  { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', contextWindow: 1048576, maxOutput: 65536 },
  // Gemini 2.0 series
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576, maxOutput: 8192 },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', contextWindow: 1048576, maxOutput: 8192 },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', contextWindow: 1048576, maxOutput: 8192 },
  { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', contextWindow: 1048576, maxOutput: 65536 },
  // Gemini 1.5 series
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2097152, maxOutput: 8192 },
  { id: 'gemini-1.5-pro-002', name: 'Gemini 1.5 Pro 002', contextWindow: 2097152, maxOutput: 8192 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1048576, maxOutput: 8192 },
  { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash 002', contextWindow: 1048576, maxOutput: 8192 },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', contextWindow: 1048576, maxOutput: 8192 },
  // Gemini 1.0 series
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', contextWindow: 32760, maxOutput: 8192 },
  { id: 'gemini-1.0-pro-vision', name: 'Gemini 1.0 Pro Vision', contextWindow: 32760, maxOutput: 4096 },
]

export class GoogleProvider implements Provider {
  name = 'google'
  private config: GoogleConfig

  constructor(config: GoogleConfig = {}) {
    this.config = config
  }

  getModels(): ModelInfo[] {
    return GEMINI_MODELS
  }

  getDefaultModel(): string {
    return 'gemini-1.5-pro'
  }

  async *chat(request: ChatRequest): AsyncGenerator<ChatEvent> {
    const apiKey = this.config.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Google API key not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY.')
    }

    const model = request.model || this.getDefaultModel()

    // Convert messages to Gemini format
    const contents = request.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: Array.isArray(msg.content)
          ? msg.content.map(c => {
              if (c.type === 'text') return { text: c.text }
              if (c.type === 'image') {
                return {
                  inline_data: {
                    mime_type: c.source.media_type,
                    data: c.source.data,
                  },
                }
              }
              return { text: '' }
            })
          : [{ text: msg.content as string }],
      }))

    // Extract system instruction
    const systemMessage = request.messages.find(m => m.role === 'system')
    const systemInstruction = systemMessage
      ? {
          parts: Array.isArray(systemMessage.content)
            ? systemMessage.content.filter(c => c.type === 'text').map(c => ({ text: (c as { text: string }).text }))
            : [{ text: systemMessage.content as string }],
        }
      : undefined

    // Build request body
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens || 8192,
        temperature: request.temperature ?? 1.0,
        topP: request.topP ?? 0.95,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = systemInstruction
    }

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      body.tools = [{
        functionDeclarations: request.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: toolToGeminiSchema(tool),
        })),
      }]
    }

    const baseUrl = this.config.useVertexAI
      ? `https://${this.config.location || 'us-central1'}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location || 'us-central1'}/publishers/google/models/${model}:streamGenerateContent`
      : `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.config.useVertexAI) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`Google API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    yield { type: 'message_start', message: { id: '', model, role: 'assistant' } }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let inputTokens = 0
    let outputTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Gemini returns JSON array chunks
        try {
          // Handle line-delimited JSON
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue

            const chunk = JSON.parse(line) as GeminiStreamChunk

            if (chunk.candidates?.[0]?.content?.parts) {
              for (const part of chunk.candidates[0].content.parts) {
                if (part.text) {
                  yield { type: 'content_block_delta', delta: { type: 'text_delta', text: part.text } }
                }
                if (part.functionCall) {
                  yield {
                    type: 'content_block_start',
                    content_block: {
                      type: 'tool_use',
                      id: `tool-${Date.now()}`,
                      name: part.functionCall.name,
                      input: part.functionCall.args || {},
                    },
                  }
                }
              }
            }

            if (chunk.usageMetadata) {
              inputTokens = chunk.usageMetadata.promptTokenCount || 0
              outputTokens = chunk.usageMetadata.candidatesTokenCount || 0
            }
          }
        }
        catch {
          // Partial JSON, continue buffering
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

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
        functionCall?: {
          name: string
          args?: Record<string, unknown>
        }
      }>
    }
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
}

function toolToGeminiSchema(tool: Tool): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const param of tool.parameters) {
    let type = param.type
    if (type === 'number') type = 'number'
    if (type === 'boolean') type = 'boolean'
    if (type === 'array') type = 'array'
    if (type === 'object') type = 'object'

    properties[param.name] = {
      type: type.toUpperCase(),
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
    type: 'OBJECT',
    properties,
    required,
  }
}

export function createGoogleProvider(config: GoogleConfig = {}): GoogleProvider {
  return new GoogleProvider(config)
}
