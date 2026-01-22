// MCP (Model Context Protocol) types for Voide CLI

export interface McpServerConfig {
  /** Command to run the server */
  command: string
  /** Arguments to pass to the command */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Working directory */
  cwd?: string
  /** Transport type */
  transport?: 'stdio' | 'http' | 'sse'
  /** HTTP/SSE URL (for non-stdio transports) */
  url?: string
}

export interface McpServer {
  name: string
  config: McpServerConfig
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  tools: McpTool[]
  resources: McpResource[]
  error?: string
}

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName: string
}

export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  serverName: string
}

// JSON-RPC types for MCP protocol
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

// MCP Protocol Messages
export interface McpInitializeParams {
  protocolVersion: string
  capabilities: {
    tools?: boolean
    resources?: boolean
    prompts?: boolean
  }
  clientInfo: {
    name: string
    version: string
  }
}

export interface McpInitializeResult {
  protocolVersion: string
  capabilities: {
    tools?: { listChanged?: boolean }
    resources?: { subscribe?: boolean, listChanged?: boolean }
    prompts?: { listChanged?: boolean }
  }
  serverInfo: {
    name: string
    version: string
  }
}

export interface McpToolsListResult {
  tools: Array<{
    name: string
    description?: string
    inputSchema: Record<string, unknown>
  }>
}

export interface McpResourcesListResult {
  resources: Array<{
    uri: string
    name: string
    description?: string
    mimeType?: string
  }>
}

export interface McpToolCallParams {
  name: string
  arguments?: Record<string, unknown>
}

export interface McpToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    uri?: string
  }>
  isError?: boolean
}

export interface McpResourceReadParams {
  uri: string
}

export interface McpResourceReadResult {
  contents: Array<{
    uri: string
    mimeType?: string
    text?: string
    blob?: string
  }>
}
