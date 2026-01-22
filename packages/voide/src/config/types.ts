// Configuration types for Voide CLI
// Supports driver-based architecture with bunfig integration

import type { Provider, ProviderConfig } from '../provider/types'
import type { Tool } from '../tool/types'

/**
 * Main Voide configuration - used in voide.config.ts
 */
export interface VoideConfig {
  /**
   * Provider drivers for LLM integrations
   */
  providers?: ProviderDriverConfig

  /**
   * Tool drivers for extending functionality
   */
  tools?: ToolDriverConfig

  /**
   * Agent configurations for different modes
   */
  agents?: AgentDriverConfig

  /**
   * Permission rules
   */
  permissions?: PermissionConfig

  /**
   * Session configuration
   */
  session?: SessionDriverConfig

  /**
   * Storage driver configuration
   */
  storage?: StorageDriverConfig

  /**
   * TUI configuration
   */
  tui?: TuiConfig

  /**
   * Custom instructions to include in system prompt
   */
  instructions?: string

  /**
   * Enable verbose output
   */
  verbose?: boolean

  /**
   * Enable debug mode
   */
  debug?: boolean
}

/**
 * Provider driver configuration
 */
export interface ProviderDriverConfig {
  /**
   * Default provider to use
   */
  default?: string

  /**
   * Anthropic provider settings
   */
  anthropic?: AnthropicDriverConfig

  /**
   * OpenAI provider settings
   */
  openai?: OpenAIDriverConfig

  /**
   * Custom provider drivers
   */
  custom?: Record<string, CustomProviderDriver>
}

export interface AnthropicDriverConfig {
  /**
   * API key (defaults to ANTHROPIC_API_KEY env var)
   */
  apiKey?: string

  /**
   * Base URL for API
   */
  baseUrl?: string

  /**
   * Default model
   */
  model?: string

  /**
   * Max retries on failure
   */
  maxRetries?: number

  /**
   * Request timeout in ms
   */
  timeout?: number
}

export interface OpenAIDriverConfig {
  /**
   * API key (defaults to OPENAI_API_KEY env var)
   */
  apiKey?: string

  /**
   * Base URL for API
   */
  baseUrl?: string

  /**
   * Default model
   */
  model?: string

  /**
   * Max retries on failure
   */
  maxRetries?: number

  /**
   * Request timeout in ms
   */
  timeout?: number
}

export interface CustomProviderDriver {
  /**
   * Factory function to create the provider
   */
  create: (config: ProviderConfig) => Provider

  /**
   * Default configuration
   */
  defaults?: ProviderConfig
}

/**
 * Tool driver configuration
 */
export interface ToolDriverConfig {
  /**
   * Built-in tools to enable (defaults to all)
   */
  builtIn?: BuiltInToolConfig

  /**
   * Custom tool drivers
   */
  custom?: Record<string, CustomToolDriver>

  /**
   * Tools to disable
   */
  disabled?: string[]
}

export interface BuiltInToolConfig {
  /**
   * Enable read tool
   */
  read?: boolean | ReadToolConfig

  /**
   * Enable write tool
   */
  write?: boolean | WriteToolConfig

  /**
   * Enable edit tool
   */
  edit?: boolean | EditToolConfig

  /**
   * Enable glob tool
   */
  glob?: boolean | GlobToolConfig

  /**
   * Enable grep tool
   */
  grep?: boolean | GrepToolConfig

  /**
   * Enable bash tool
   */
  bash?: boolean | BashToolConfig
}

export interface ReadToolConfig {
  /**
   * Max file size to read (bytes)
   */
  maxFileSize?: number

  /**
   * Default line limit
   */
  defaultLineLimit?: number
}

export interface WriteToolConfig {
  /**
   * Patterns to block from writing
   */
  blockedPatterns?: string[]
}

export interface EditToolConfig {
  /**
   * Patterns to block from editing
   */
  blockedPatterns?: string[]
}

export interface GlobToolConfig {
  /**
   * Max results to return
   */
  maxResults?: number

  /**
   * Patterns to ignore
   */
  ignorePatterns?: string[]
}

export interface GrepToolConfig {
  /**
   * Max matches to return
   */
  maxMatches?: number

  /**
   * Patterns to ignore
   */
  ignorePatterns?: string[]
}

export interface BashToolConfig {
  /**
   * Commands that require confirmation
   */
  dangerousPatterns?: RegExp[]

  /**
   * Commands that are completely blocked
   */
  blockedPatterns?: RegExp[]

  /**
   * Default timeout in ms
   */
  timeout?: number
}

export interface CustomToolDriver {
  /**
   * Factory function to create the tool
   */
  create: () => Tool

  /**
   * Tool metadata
   */
  meta?: {
    name: string
    description: string
  }
}

/**
 * Agent driver configuration
 */
export interface AgentDriverConfig {
  /**
   * Default agent to use
   */
  default?: string

  /**
   * Built-in agents
   */
  builtIn?: {
    /**
     * Build agent (full access)
     */
    build?: AgentConfig

    /**
     * Explore agent (read-only)
     */
    explore?: AgentConfig

    /**
     * Plan agent (read-only, planning mode)
     */
    plan?: AgentConfig
  }

  /**
   * Custom agents
   */
  custom?: Record<string, AgentConfig>
}

export interface AgentConfig {
  /**
   * Agent display name
   */
  name?: string

  /**
   * Agent description
   */
  description?: string

  /**
   * System prompt override
   */
  systemPrompt?: string

  /**
   * Model to use
   */
  model?: string

  /**
   * Temperature (0-1)
   */
  temperature?: number

  /**
   * Max tokens for response
   */
  maxTokens?: number

  /**
   * Tools this agent can use
   */
  tools?: string[]

  /**
   * Permission overrides for this agent
   */
  permissions?: PermissionRule[]
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  /**
   * Default permission rules
   */
  rules?: PermissionRule[]

  /**
   * Path patterns to always allow
   */
  allowedPaths?: string[]

  /**
   * Path patterns to always deny
   */
  deniedPaths?: string[]

  /**
   * Bash commands to always allow
   */
  allowedCommands?: string[]

  /**
   * Bash commands to always deny
   */
  deniedCommands?: string[]
}

export interface PermissionRule {
  /**
   * Permission type
   */
  permission: 'read' | 'write' | 'edit' | 'bash' | 'web' | 'all'

  /**
   * Glob pattern to match
   */
  pattern?: string

  /**
   * Action to take
   */
  action: 'allow' | 'deny' | 'ask'
}

/**
 * Session driver configuration
 */
export interface SessionDriverConfig {
  /**
   * Storage backend
   */
  backend?: 'file' | 'memory' | 'custom'

  /**
   * Custom session store
   */
  customStore?: CustomSessionStore

  /**
   * Session persistence settings
   */
  persistence?: {
    /**
     * Enable persistence
     */
    enabled?: boolean

    /**
     * Custom storage path
     */
    path?: string

    /**
     * Max sessions to keep
     */
    maxSessions?: number

    /**
     * Auto-prune sessions older than (ms)
     */
    maxAge?: number
  }

  /**
   * Message compaction settings
   */
  compaction?: {
    /**
     * Enable message compaction for long conversations
     */
    enabled?: boolean

    /**
     * Threshold to trigger compaction (message count)
     */
    threshold?: number
  }
}

export interface CustomSessionStore {
  create: () => Promise<unknown>
  get: (id: string) => Promise<unknown>
  update: (session: unknown) => Promise<void>
  delete: (id: string) => Promise<void>
  list: () => Promise<unknown[]>
}

/**
 * Storage driver configuration
 */
export interface StorageDriverConfig {
  /**
   * Storage backend type
   */
  type?: 'file' | 'memory' | 'custom'

  /**
   * Storage path (for file backend)
   */
  path?: string

  /**
   * Custom storage driver
   */
  custom?: CustomStorageDriver
}

export interface CustomStorageDriver {
  read: (key: string) => Promise<string | null>
  write: (key: string, value: string) => Promise<void>
  delete: (key: string) => Promise<void>
  list: (prefix?: string) => Promise<string[]>
}

/**
 * TUI configuration
 */
export interface TuiConfig {
  /**
   * Color theme
   */
  theme?: 'default' | 'dracula' | 'nord' | 'solarized' | 'monokai'

  /**
   * Enable emoji in output
   */
  emoji?: boolean

  /**
   * Enable syntax highlighting
   */
  syntaxHighlighting?: boolean

  /**
   * Max output width
   */
  maxWidth?: number
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedVoideConfig {
  providers: {
    default: string
    anthropic?: AnthropicDriverConfig
    openai?: OpenAIDriverConfig
    custom: Record<string, CustomProviderDriver>
  }
  tools: {
    builtIn: BuiltInToolConfig
    custom: Record<string, CustomToolDriver>
    disabled: string[]
  }
  agents: {
    default: string
    builtIn?: {
      build?: AgentConfig
      explore?: AgentConfig
      plan?: AgentConfig
    }
    custom: Record<string, AgentConfig>
  }
  permissions: {
    rules: PermissionRule[]
    allowedPaths: string[]
    deniedPaths: string[]
    allowedCommands: string[]
    deniedCommands: string[]
  }
  session: {
    backend: 'file' | 'memory' | 'custom'
    customStore?: CustomSessionStore
    persistence: {
      enabled: boolean
      path: string
      maxSessions: number
      maxAge: number
    }
    compaction: {
      enabled: boolean
      threshold: number
    }
  }
  storage: {
    type: 'file' | 'memory' | 'custom'
    path: string
    custom?: CustomStorageDriver
  }
  tui: {
    theme: 'default' | 'dracula' | 'nord' | 'solarized' | 'monokai'
    emoji: boolean
    syntaxHighlighting: boolean
    maxWidth: number
  }
  instructions: string
  verbose: boolean
  debug: boolean
}
