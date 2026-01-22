// Tool system exports for Voide CLI

export * from './types'
export { readTool } from './read'
export { writeTool } from './write'
export { editTool } from './edit'
export { globTool } from './glob'
export { grepTool } from './grep'
export { bashTool } from './bash'
export { webfetchTool } from './webfetch'
export { websearchTool } from './websearch'
export { patchTool } from './patch'
export { multieditTool } from './multiedit'

import type { Tool, ToolDefinitionForLLM, toolToAnthropicFormat as toAnthropicFormat } from './types'
import { toolToAnthropicFormat } from './types'
import { readTool } from './read'
import { writeTool } from './write'
import { editTool } from './edit'
import { globTool } from './glob'
import { grepTool } from './grep'
import { bashTool } from './bash'
import { webfetchTool } from './webfetch'
import { websearchTool } from './websearch'
import { patchTool } from './patch'
import { multieditTool } from './multiedit'

// Tool registry
const tools = new Map<string, Tool>()

// Register default tools
function registerDefaultTools(): void {
  registerTool(readTool)
  registerTool(writeTool)
  registerTool(editTool)
  registerTool(globTool)
  registerTool(grepTool)
  registerTool(bashTool)
  registerTool(webfetchTool)
  registerTool(websearchTool)
  registerTool(patchTool)
  registerTool(multieditTool)
}

// Register a tool
export function registerTool(tool: Tool): void {
  tools.set(tool.name, tool)
}

// Unregister a tool
export function unregisterTool(name: string): boolean {
  return tools.delete(name)
}

// Get a tool by name
export function getTool(name: string): Tool | undefined {
  // Initialize tools if empty
  if (tools.size === 0) {
    registerDefaultTools()
  }
  return tools.get(name)
}

// Get all registered tools
export function getAllTools(): Tool[] {
  // Initialize tools if empty
  if (tools.size === 0) {
    registerDefaultTools()
  }
  return Array.from(tools.values())
}

// Get tools by names
export function getTools(names: string[]): Tool[] {
  // Initialize tools if empty
  if (tools.size === 0) {
    registerDefaultTools()
  }
  return names.map(name => tools.get(name)).filter((t): t is Tool => t !== undefined)
}

// Get tools formatted for Anthropic API
export function getToolsForLLM(names?: string[]): ToolDefinitionForLLM[] {
  const toolList = names ? getTools(names) : getAllTools()
  return toolList.map(toolToAnthropicFormat)
}

// Default tool names for different agent modes
export const DEFAULT_TOOL_NAMES = {
  // Full access for code editing
  build: ['read', 'write', 'edit', 'glob', 'grep', 'bash'],

  // Read-only for exploration
  explore: ['read', 'glob', 'grep'],

  // Planning mode - read only, no execution
  plan: ['read', 'glob', 'grep'],

  // Minimal set
  minimal: ['read', 'bash'],
}

// Initialize tools
registerDefaultTools()
