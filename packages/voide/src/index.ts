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
  lsTool,
  todoTool,
  taskTool,
  questionTool,
  getTodos,
  addTodo,
  updateTodoStatus,
  getTasks,
  getTask,
  createQuestion,
  answerQuestion,
  cancelQuestion,
  getPendingQuestion,
  hasPendingQuestions,
  askConfirm,
  askText,
  formatChoices,
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
export type { TodoItem } from './tool/todo'
export type { Task } from './tool/task'
export type { QuestionOptions, QuestionResult } from './tool/question'

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
  // Resume
  resumeSession,
  trackLastSession,
  getLastSessionId,
  getLastProjectSession,
  listSessions,
  getSessionDetails,
  formatSessionSummary,
  formatSessionList,
  getConversationPreview,
  cloneSession,
  mergeSessions,
  archiveSessions,
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
  // Resume types
  ResumeOptions,
  SessionMatch,
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
export {
  createTui,
  TuiRenderer,
  AgentSwitcher,
  createAgentSwitcher,
  getModeIndicator,
  getToolsDiff,
  formatToolsDiff,
  BUILT_IN_MODES,
} from './tui'
export type { AgentMode } from './tui'

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

// LSP (Language Server Protocol) support
export {
  LspClient,
  LspManager,
  DEFAULT_LSP_CONFIGS,
  getLspConfig,
  formatDiagnostics,
} from './lsp'
export type {
  LspConfig,
  LspDiagnostic,
  LspPosition,
  LspRange,
  LspLocation,
  LspHover,
  LspSymbol,
  DiagnosticSeverity,
} from './lsp'

// GitHub integration
export {
  GitHubClient,
  createGitHubClient,
} from './github'
export type {
  PullRequest,
  Issue,
  WorkflowRun,
  Comment,
  PRDiff,
  PRStatus,
} from './github'

// Authentication
export {
  AuthManager,
  getAuthManager,
  hasApiKey,
  getApiKey,
  formatAuthStatus,
  formatProviderRequirements,
  PROVIDER_AUTH,
} from './auth'
export type { Credentials, ProviderAuth } from './auth'

// Custom Commands
export {
  CommandLoader,
  getCommandLoader,
  initCommandsDir,
  createCommandTemplate,
} from './commands'
export type { CommandDefinition, CommandArg, CommandResult } from './commands'

// Theme Support
export {
  ThemeManager,
  getThemeManager,
  getActiveTheme,
  setTheme,
  parseColor,
  BUILT_IN_THEMES,
} from './theme'
export type { ThemeColors, ThemeConfig } from './theme'

// Shell Completion
export {
  generateBashCompletion,
  generateZshCompletion,
  generateFishCompletion,
  installCompletion,
  getCompletionScript,
  printCompletionScript,
} from './completion'
export type { CompletionCommand, CompletionOption, CompletionArg } from './completion'

// Updater
export {
  checkForUpdate,
  shouldCheckForUpdate,
  periodicUpdateCheck,
  upgrade,
  uninstall,
  getInstallInfo,
  formatVersionInfo,
  formatInstallInfo,
  selfUpdate,
  rollback,
  recordVersion,
} from './updater'
export type { VersionInfo, UpdateOptions, UninstallOptions } from './updater'

// Debug
export {
  getDebugInfo,
  formatDebugInfo,
  runDoctor,
  formatDoctorResults,
  getLogs,
  log,
  clearCache,
  getCacheStats,
  formatCacheStats,
  exportDebugDump,
} from './debug'
export type { DebugInfo, DoctorCheck } from './debug'

// mDNS Discovery
export {
  MdnsDiscovery,
  discoverServers,
  announceServer,
  getLocalAddresses,
  formatDiscoveredServers,
  getDiscovery,
} from './discovery'
export type { DiscoveredServer, DiscoveryOptions } from './discovery'

// OAuth
export {
  OAuthManager,
  getOAuthManager,
  performOAuthFlow,
  formatOAuthStatus,
  OAUTH_PROVIDERS,
} from './oauth'
export type { OAuthConfig, OAuthToken, OAuthState } from './oauth'

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
