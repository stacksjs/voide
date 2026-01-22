// Core types for Voide CLI

export interface VoideConfig {
  // Provider configuration
  provider: ProviderConfig
  // Agent configuration
  agents: Record<string, AgentConfig>
  // Default agent to use
  defaultAgent: string
  // Permission rules
  permissions: PermissionRule[]
  // Custom instructions
  instructions?: string
  // MCP servers (Model Context Protocol)
  mcpServers?: Record<string, McpServerConfig>
  // Session configuration
  session?: SessionConfig
}

export interface ProviderConfig {
  // Default provider name
  default: string
  // Provider-specific settings
  anthropic?: {
    apiKey?: string
    baseUrl?: string
    model?: string
  }
  openai?: {
    apiKey?: string
    baseUrl?: string
    model?: string
  }
}

export interface AgentConfig {
  name: string
  description?: string
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  tools?: string[]
  permissions?: PermissionRule[]
}

export interface PermissionRule {
  permission: 'read' | 'write' | 'edit' | 'bash' | 'web' | 'all'
  pattern?: string
  action: 'allow' | 'deny' | 'ask'
}

export interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface SessionConfig {
  maxMessages?: number
  compactionThreshold?: number
  persistPath?: string
}

// Message types
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: MessageContent[]
  timestamp: number
  metadata?: Record<string, unknown>
}

export type MessageContent =
  | TextContent
  | ToolCallContent
  | ToolResultContent
  | FileContent
  | ErrorContent

export interface TextContent {
  type: 'text'
  text: string
}

export interface ToolCallContent {
  type: 'tool_call'
  toolId: string
  toolName: string
  input: Record<string, unknown>
}

export interface ToolResultContent {
  type: 'tool_result'
  toolId: string
  output: string
  isError?: boolean
}

export interface FileContent {
  type: 'file'
  path: string
  content?: string
  language?: string
}

export interface ErrorContent {
  type: 'error'
  message: string
  code?: string
}

// Tool types
export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameter[]
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>
}

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required?: boolean
  default?: unknown
}

export interface ToolContext {
  sessionId: string
  messageId: string
  workingDirectory: string
  abort: AbortSignal
  ask: (question: string, options?: string[]) => Promise<string>
}

export interface ToolResult {
  output: string
  title?: string
  metadata?: Record<string, unknown>
  isError?: boolean
}

// Session types
export interface Session {
  id: string
  projectPath: string
  createdAt: number
  updatedAt: number
  messages: Message[]
  metadata?: Record<string, unknown>
}

// CLI types
export interface CliArgs {
  command: string
  args: string[]
  flags: Record<string, string | boolean | string[]>
}

export interface Command {
  name: string
  description: string
  aliases?: string[]
  options?: CommandOption[]
  action: (args: CliArgs) => Promise<void>
}

export interface CommandOption {
  name: string
  alias?: string
  description: string
  type: 'string' | 'boolean' | 'array'
  default?: unknown
  required?: boolean
}

// Provider types
export interface Provider {
  name: string
  chat: (messages: Message[], options: ChatOptions) => AsyncIterable<ChatEvent>
  listModels?: () => Promise<ModelInfo[]>
}

export interface ChatOptions {
  model: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  systemPrompt?: string
  signal?: AbortSignal
}

export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; toolId: string; toolName: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolId: string; output: string }
  | { type: 'error'; error: string }
  | { type: 'done' }

export interface ModelInfo {
  id: string
  name: string
  contextLength: number
  inputPrice?: number
  outputPrice?: number
}

// TUI types
export interface TuiState {
  mode: 'input' | 'output' | 'confirm' | 'select'
  inputBuffer: string
  cursorPosition: number
  scrollOffset: number
  selectedIndex: number
  options?: string[]
}

// Event types
export type VoideEvent =
  | { type: 'message:start'; messageId: string }
  | { type: 'message:text'; messageId: string; text: string }
  | { type: 'message:tool_call'; messageId: string; toolId: string; toolName: string }
  | { type: 'message:tool_result'; messageId: string; toolId: string; output: string }
  | { type: 'message:done'; messageId: string }
  | { type: 'message:error'; messageId: string; error: string }
  | { type: 'session:created'; sessionId: string }
  | { type: 'session:loaded'; sessionId: string }
  | { type: 'permission:request'; permission: string; pattern: string }
  | { type: 'permission:response'; allowed: boolean }
