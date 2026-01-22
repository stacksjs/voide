// Session types for Voide CLI

export interface Session {
  id: string
  projectPath: string
  createdAt: number
  updatedAt: number
  title?: string
  messages: Message[]
  metadata?: Record<string, unknown>
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: MessageContent[]
  timestamp: number
  model?: string
  usage?: TokenUsage
  metadata?: Record<string, unknown>
}

export type MessageContent =
  | TextContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent
  | ErrorContent

export interface TextContent {
  type: 'text'
  text: string
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface ToolResultContent {
  type: 'tool_result'
  toolUseId: string
  output: string
  isError?: boolean
  duration?: number
}

export interface ThinkingContent {
  type: 'thinking'
  text: string
}

export interface ErrorContent {
  type: 'error'
  message: string
  code?: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export interface SessionSummary {
  id: string
  title: string
  projectPath: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface SessionStore {
  // Session CRUD
  create(projectPath: string): Promise<Session>
  get(id: string): Promise<Session | null>
  update(session: Session): Promise<void>
  delete(id: string): Promise<void>

  // List sessions
  list(projectPath?: string): Promise<SessionSummary[]>
  getRecent(limit?: number): Promise<SessionSummary[]>

  // Message operations
  addMessage(sessionId: string, message: Message): Promise<void>
  updateMessage(sessionId: string, messageId: string, content: MessageContent[]): Promise<void>

  // Cleanup
  prune(maxAge?: number): Promise<number>
}
