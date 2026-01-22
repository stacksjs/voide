// Provider types for Voide CLI

import type { ToolDefinition } from '../types'

export interface Provider {
  readonly name: string
  readonly id: string

  // Chat completion with streaming
  chat(request: ChatRequest): AsyncGenerator<ChatEvent, void, unknown>

  // List available models
  listModels(): Promise<ModelInfo[]>

  // Check if provider is configured
  isConfigured(): boolean
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  signal?: AbortSignal
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export interface ImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export type ChatEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | ErrorEvent

export interface MessageStartEvent {
  type: 'message_start'
  message: {
    id: string
    model: string
    role: 'assistant'
  }
}

export interface ContentBlockStartEvent {
  type: 'content_block_start'
  index: number
  content_block: TextBlock | ToolUseBlock
}

export interface ContentBlockDeltaEvent {
  type: 'content_block_delta'
  index: number
  delta: TextDelta | ToolInputDelta
}

export interface TextDelta {
  type: 'text_delta'
  text: string
}

export interface ToolInputDelta {
  type: 'input_json_delta'
  partial_json: string
}

export interface ContentBlockStopEvent {
  type: 'content_block_stop'
  index: number
}

export interface MessageDeltaEvent {
  type: 'message_delta'
  delta: {
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  }
  usage?: {
    output_tokens: number
  }
}

export interface MessageStopEvent {
  type: 'message_stop'
}

export interface ErrorEvent {
  type: 'error'
  error: {
    type: string
    message: string
  }
}

export interface ModelInfo {
  id: string
  name: string
  contextLength: number
  inputPrice?: number   // per million tokens
  outputPrice?: number  // per million tokens
  supportsTools?: boolean
  supportsVision?: boolean
  maxOutputTokens?: number
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  maxRetries?: number
  timeout?: number
}
