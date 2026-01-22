// Tool types for Voide CLI

export interface Tool {
  readonly name: string
  readonly description: string
  readonly parameters: ToolParameter[]
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
}

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required?: boolean
  default?: unknown
  enum?: string[]
}

export interface ToolContext {
  sessionId: string
  messageId: string
  workingDirectory: string
  signal: AbortSignal
  permissions: PermissionChecker
  ask: (question: string, options?: AskOptions) => Promise<string>
  log: (message: string) => void
}

export interface AskOptions {
  type?: 'text' | 'confirm' | 'select'
  options?: string[]
  default?: string
}

export interface PermissionChecker {
  check(permission: PermissionType, path?: string): Promise<PermissionResult>
  checkBash(command: string): Promise<PermissionResult>
}

export type PermissionType = 'read' | 'write' | 'edit' | 'bash' | 'web'

export interface PermissionResult {
  allowed: boolean
  reason?: string
}

export interface ToolResult {
  output: string
  title?: string
  metadata?: Record<string, unknown>
  isError?: boolean
}

export interface ToolDefinitionForLLM {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
      items?: { type: string }
    }>
    required: string[]
  }
}

// Convert Tool to format expected by Anthropic API
export function toolToAnthropicFormat(tool: Tool): ToolDefinitionForLLM {
  const properties: Record<string, { type: string, description: string, enum?: string[], items?: { type: string } }> = {}
  const required: string[] = []

  for (const param of tool.parameters) {
    const prop: { type: string, description: string, enum?: string[], items?: { type: string } } = {
      type: param.type === 'array' ? 'array' : param.type,
      description: param.description,
    }

    if (param.enum) {
      prop.enum = param.enum
    }

    if (param.type === 'array') {
      prop.items = { type: 'string' }
    }

    properties[param.name] = prop

    if (param.required) {
      required.push(param.name)
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties,
      required,
    },
  }
}
