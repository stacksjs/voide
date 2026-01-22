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
  webfetchTool,
  websearchTool,
  patchTool,
  multieditTool,
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
  createSession,
  textContent,
  toolUseContent,
  toolResultContent,
  createProcessor,
  SessionProcessor,
  // Compaction
  compactMessages,
  estimateTokens,
  needsCompaction,
  getCompactionStats,
  // Export/Import
  exportSession,
  importSession,
  exportSessionToFile,
  importSessionFromFile,
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
  // Compaction types
  CompactionOptions,
  CompactionResult,
  // Export types
  ExportedSession,
  ExportOptions,
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

// Context (instructions, git, skills)
export {
  loadProjectInstructions,
  formatInstructions,
  loadProjectContext,
  loadGitContext,
  formatGitContext,
  isGitRepo,
  getGitRoot,
  getCurrentBranch,
  getGitStatus,
  getRecentCommits,
  getRemotes,
  getStagedDiff,
  getUnstagedDiff,
  loadSkills,
  getAutoLoadSkills,
  findSkillByTrigger,
  formatSkillsForPrompt,
  formatAutoLoadSkills,
  loadFullContext,
  formatFullContext,
} from './context'
export type {
  ProjectInstructions,
  GitContext,
  GitStatus,
  GitCommit,
  GitRemote,
  Skill,
  SkillFrontmatter,
  FullContext,
} from './context'

// MCP (Model Context Protocol)
export {
  getMcpClient,
  McpClient,
  connectMcpServers,
  mcpToolToVoideTool,
  getAllMcpTools,
} from './mcp'
export type {
  McpServerConfig,
  McpTool,
  McpResource,
  McpToolCallResult,
  McpServer,
} from './mcp'

// Stats/Usage tracking
export {
  loadStats,
  saveStats,
  calculateCost,
  recordUsage,
  formatStats,
  getTodayStats,
  resetStats,
} from './stats'
export type {
  UsageStats,
  ModelStats,
  DayStats,
} from './stats'

// Hooks system
export {
  loadHooks,
  clearHooksCache,
  runHooks,
  createHookRunner,
} from './hooks'
export type {
  HookType,
  HookConfig,
  HooksConfig,
  HookContext,
  HookResult,
} from './hooks'

// Watch/Attach mode
export {
  FileWatcher,
  SessionAttacher,
  WatchAttachMode,
  createWatchMode,
  startWatchMode,
} from './watch'
export type {
  WatchOptions,
  WatchEvent,
  AttachOptions,
  AttachEvent,
} from './watch'

// Image support
export {
  isSupportedImage,
  getMediaType,
  loadImage,
  imageFromUrl,
  imageFromBase64,
  toAnthropicImageContent,
  parseImageReferences,
  processTextWithImages,
  createMultimodalContent,
  estimateImageTokens,
  validateImages,
  captureScreenshot,
  describeImageInput,
} from './image'
export type {
  ImageMediaType,
  ImageInput,
  ImageContent,
} from './image'

// Server mode
export {
  VoideServer,
  createServer,
  startServer,
  VoideClient,
  createClient,
} from './server'
export type {
  ServerOptions,
  ServerRequest,
  ServerResponse,
  WebSocketMessage,
} from './server'

// Voice support
export {
  VoiceManager,
  createVoiceManager,
  VoiceInput,
  createVoiceInput,
  recordAndTranscribe,
  VoiceOutput,
  createVoiceOutput,
  speak,
  VoiceCommands,
  createVoiceCommands,
  parseIntent,
} from './voice'
export type {
  VoiceConfig,
  VoiceInputConfig,
  TranscriptionResult,
  VoiceOutputConfig,
  TTSProvider,
  SpeechResult,
  VoiceCommand,
  CommandMatch,
  VoiceCommandsConfig,
} from './voice'

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
