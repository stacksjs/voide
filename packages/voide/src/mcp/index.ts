// MCP exports for Voide CLI

export * from './types'
export * from './client'

import type { McpServerConfig, McpTool } from './types'
import type { Tool, ToolContext, ToolResult } from '../tool/types'
import { getMcpClient } from './client'

/**
 * Connect to MCP servers from config
 */
export async function connectMcpServers(
  servers: Record<string, McpServerConfig>,
): Promise<void> {
  const client = getMcpClient()

  for (const [name, config] of Object.entries(servers)) {
    try {
      await client.connect(name, config)
      console.log(`Connected to MCP server: ${name}`)
    }
    catch (error) {
      console.error(`Failed to connect to MCP server ${name}:`, (error as Error).message)
    }
  }
}

/**
 * Convert MCP tool to Voide tool format
 */
export function mcpToolToVoideTool(mcpTool: McpTool): Tool {
  const client = getMcpClient()

  // Parse input schema to parameters
  const parameters = parseJsonSchema(mcpTool.inputSchema)

  return {
    name: `mcp:${mcpTool.serverName}:${mcpTool.name}`,
    description: mcpTool.description || `MCP tool from ${mcpTool.serverName}`,
    parameters,

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      try {
        const result = await client.callTool(mcpTool.serverName, mcpTool.name, args)

        // Convert result to string
        const output = result.content
          .map(c => {
            if (c.type === 'text') return c.text
            if (c.type === 'image') return `[Image: ${c.mimeType}]`
            if (c.type === 'resource') return `[Resource: ${c.uri}]`
            return ''
          })
          .filter(Boolean)
          .join('\n')

        return {
          output: output || '(no output)',
          title: `MCP: ${mcpTool.name}`,
          isError: result.isError,
        }
      }
      catch (error) {
        return {
          output: `MCP tool error: ${(error as Error).message}`,
          isError: true,
        }
      }
    },
  }
}

/**
 * Get all MCP tools as Voide tools
 */
export function getAllMcpTools(): Tool[] {
  const client = getMcpClient()
  const mcpTools = client.getAllTools()
  return mcpTools.map(mcpToolToVoideTool)
}

/**
 * Parse JSON Schema to tool parameters
 */
function parseJsonSchema(schema: Record<string, unknown>): Tool['parameters'] {
  const parameters: Tool['parameters'] = []

  if (schema.type !== 'object' || !schema.properties) {
    return parameters
  }

  const properties = schema.properties as Record<string, {
    type?: string
    description?: string
    enum?: string[]
    default?: unknown
  }>

  const required = (schema.required as string[]) || []

  for (const [name, prop] of Object.entries(properties)) {
    parameters.push({
      name,
      type: mapJsonSchemaType(prop.type),
      description: prop.description || '',
      required: required.includes(name),
      default: prop.default,
      enum: prop.enum,
    })
  }

  return parameters
}

/**
 * Map JSON Schema type to tool parameter type
 */
function mapJsonSchemaType(type?: string): 'string' | 'number' | 'boolean' | 'array' | 'object' {
  switch (type) {
    case 'string': return 'string'
    case 'number':
    case 'integer': return 'number'
    case 'boolean': return 'boolean'
    case 'array': return 'array'
    case 'object': return 'object'
    default: return 'string'
  }
}
