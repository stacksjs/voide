// Voide CLI - Main exports
// Voice AI Code Assistant

// Configuration (export first to establish base types)
export {
  loadConfig,
  getConfigPath,
  clearConfigCache,
  getAgentConfig,
  getEnabledTools,
  checkPermission,
  getConfigTemplate,
} from './config'
export type {
  VoideConfig,
  ResolvedVoideConfig,
  ProviderDriverConfig,
  ToolDriverConfig,
  AgentDriverConfig,
  AgentConfig,
  PermissionConfig,
  PermissionRule,
} from './config/types'

// Provider system
export {
  getProvider,
  clearProviders,
  defaultProvider,
  AnthropicProvider,
  createAnthropicProvider,
  parseToolUse,
  createToolResult,
  createTextMessage,
  createToolResultMessage,
} from './provider'
export type {
  Provider,
  ChatRequest,
  ChatMessage,
  ChatEvent,
  ModelInfo,
  ProviderConfig,
} from './provider/types'

// Tool system
export {
  registerTool,
  unregisterTool,
  getTool,
  getAllTools,
  getTools,
  getToolsForLLM,
  DEFAULT_TOOL_NAMES,
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  bashTool,
} from './tool'
export type {
  Tool,
  ToolContext,
  ToolResult,
  ToolParameter,
  PermissionChecker,
  PermissionType,
  PermissionResult,
} from './tool/types'

// Session management
export {
  getSessionStore,
  FileSessionStore,
  createMessage,
  textContent,
  toolUseContent,
  toolResultContent,
  createProcessor,
  SessionProcessor,
} from './session'
export type {
  Session,
  Message,
  MessageContent,
  SessionSummary,
  SessionStore,
  TokenUsage,
  ProcessorEvent,
  ProcessorOptions,
} from './session'

// Agent system
export {
  createAgent,
  createExploreAgent,
  getAvailableAgents,
} from './agent'
export type {
  Agent,
  AgentResult,
  AgentProcessOptions,
} from './agent'

// Permission system
export {
  createPermissionChecker,
  allowAllPermissions,
  denyAllPermissions,
  createFixedPermissions,
} from './permission'

// TUI
export { createTui, TuiRenderer } from './tui'

// Version
export const VERSION = '0.0.1'

// Quick start function
import { loadConfig } from './config'
import { createAgent } from './agent'
import { createTui } from './tui'

/**
 * Quick start function to create a Voide agent
 */
export async function createVoide(options?: {
  projectPath?: string
  agentName?: string
  askCallback?: (question: string) => Promise<boolean>
}) {
  const config = await loadConfig(options?.projectPath)
  const agent = createAgent(config, options?.agentName, options?.askCallback)
  const tui = createTui(config)

  return {
    agent,
    tui,
    config,

    async chat(message: string) {
      if (!agent.getSession()) {
        await agent.startSession(options?.projectPath || process.cwd())
      }

      return agent.process(message, {
        onEvent: (event) => tui.handleEvent(event),
      })
    },
  }
}
