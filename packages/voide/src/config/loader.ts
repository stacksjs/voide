// Configuration loader for Voide CLI
// Integrates with bunfig for voide.config.ts support

import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { access } from 'node:fs/promises'
import type { VoideConfig, ResolvedVoideConfig, PermissionRule, AgentConfig } from './types'

// Default configuration values
const DEFAULT_CONFIG: ResolvedVoideConfig = {
  providers: {
    default: 'anthropic',
    anthropic: {
      model: 'claude-sonnet-4-20250514',
      maxRetries: 3,
      timeout: 120000,
    },
    openai: {
      model: 'gpt-4o',
      maxRetries: 3,
      timeout: 120000,
    },
    custom: {},
  },

  tools: {
    builtIn: {
      read: true,
      write: true,
      edit: true,
      glob: true,
      grep: true,
      bash: true,
    },
    custom: {},
    disabled: [],
  },

  agents: {
    default: 'build',
    builtIn: {
      build: {
        name: 'Build',
        description: 'Full access agent for coding tasks',
        tools: ['read', 'write', 'edit', 'glob', 'grep', 'bash'],
      },
      explore: {
        name: 'Explore',
        description: 'Read-only agent for exploring codebases',
        tools: ['read', 'glob', 'grep'],
      },
      plan: {
        name: 'Plan',
        description: 'Planning agent for designing solutions',
        tools: ['read', 'glob', 'grep'],
      },
    },
    custom: {},
  },

  permissions: {
    rules: [
      { permission: 'read', action: 'allow' },
      { permission: 'write', pattern: '*.env*', action: 'deny' },
      { permission: 'write', pattern: '**/credentials*', action: 'deny' },
      { permission: 'bash', action: 'allow' },
    ],
    allowedPaths: [],
    deniedPaths: [
      '**/.env*',
      '**/credentials*',
      '**/secrets*',
      '**/.ssh/*',
      '**/.aws/*',
    ],
    allowedCommands: [],
    deniedCommands: [],
  },

  session: {
    backend: 'file',
    persistence: {
      enabled: true,
      path: join(homedir(), '.voide', 'sessions'),
      maxSessions: 100,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    compaction: {
      enabled: true,
      threshold: 100,
    },
  },

  storage: {
    type: 'file',
    path: join(homedir(), '.voide'),
  },

  tui: {
    theme: 'default',
    emoji: true,
    syntaxHighlighting: true,
    maxWidth: 120,
  },

  instructions: '',
  verbose: false,
  debug: false,
}

// Config cache
let cachedConfig: ResolvedVoideConfig | null = null
let configPath: string | null = null

/**
 * Load configuration from voide.config.ts
 * Uses bunfig if available, falls back to manual loading
 */
export async function loadConfig(projectPath?: string): Promise<ResolvedVoideConfig> {
  if (cachedConfig && !projectPath) {
    return cachedConfig
  }

  const searchPaths = projectPath
    ? [projectPath]
    : [process.cwd(), homedir()]

  let userConfig: VoideConfig = {}

  // Try to find and load config file
  for (const searchPath of searchPaths) {
    const configFiles = [
      join(searchPath, 'voide.config.ts'),
      join(searchPath, 'voide.config.js'),
      join(searchPath, '.voide', 'config.ts'),
      join(searchPath, '.voide', 'config.js'),
    ]

    for (const file of configFiles) {
      try {
        await access(file)
        configPath = file
        userConfig = await loadConfigFile(file)
        break
      }
      catch {
        // File doesn't exist, continue
      }
    }

    if (configPath) break
  }

  // Merge with defaults
  const resolved = mergeConfig(DEFAULT_CONFIG, userConfig)

  // Cache for reuse
  if (!projectPath) {
    cachedConfig = resolved
  }

  return resolved
}

/**
 * Load a config file using Bun
 */
async function loadConfigFile(filePath: string): Promise<VoideConfig> {
  try {
    // Try using bunfig if available
    try {
      const bunfig = await import('bunfig')
      if (bunfig && typeof bunfig.loadConfig === 'function') {
        const config = await bunfig.loadConfig({
          name: 'voide',
          defaultConfig: {} as VoideConfig,
          cwd: resolve(filePath, '..'),
        })
        if (config) return config as VoideConfig
      }
    }
    catch {
      // bunfig not available or incompatible, fall back to direct import
    }

    // Direct import as fallback
    const module = await import(filePath)
    return (module.default || module) as VoideConfig
  }
  catch (error) {
    console.warn(`Warning: Could not load config from ${filePath}:`, (error as Error).message)
    return {}
  }
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(defaults: ResolvedVoideConfig, user: VoideConfig): ResolvedVoideConfig {
  return {
    providers: {
      ...defaults.providers,
      ...user.providers,
      anthropic: { ...defaults.providers.anthropic, ...user.providers?.anthropic },
      openai: { ...defaults.providers.openai, ...user.providers?.openai },
      custom: { ...defaults.providers.custom, ...user.providers?.custom },
    },

    tools: {
      ...defaults.tools,
      ...user.tools,
      builtIn: { ...defaults.tools.builtIn, ...user.tools?.builtIn },
      custom: { ...defaults.tools.custom, ...user.tools?.custom },
      disabled: user.tools?.disabled || defaults.tools.disabled,
    },

    agents: {
      ...defaults.agents,
      default: user.agents?.default || defaults.agents.default,
      builtIn: {
        build: { ...defaults.agents.builtIn?.build, ...user.agents?.builtIn?.build },
        explore: { ...defaults.agents.builtIn?.explore, ...user.agents?.builtIn?.explore },
        plan: { ...defaults.agents.builtIn?.plan, ...user.agents?.builtIn?.plan },
      },
      custom: { ...defaults.agents.custom, ...user.agents?.custom },
    },

    permissions: {
      rules: user.permissions?.rules || defaults.permissions.rules,
      allowedPaths: [...defaults.permissions.allowedPaths, ...(user.permissions?.allowedPaths || [])],
      deniedPaths: [...defaults.permissions.deniedPaths, ...(user.permissions?.deniedPaths || [])],
      allowedCommands: [...defaults.permissions.allowedCommands, ...(user.permissions?.allowedCommands || [])],
      deniedCommands: [...defaults.permissions.deniedCommands, ...(user.permissions?.deniedCommands || [])],
    },

    session: {
      ...defaults.session,
      ...user.session,
      persistence: { ...defaults.session.persistence, ...user.session?.persistence },
      compaction: { ...defaults.session.compaction, ...user.session?.compaction },
    },

    storage: {
      ...defaults.storage,
      ...user.storage,
    },

    tui: {
      ...defaults.tui,
      ...user.tui,
    },

    instructions: user.instructions || defaults.instructions,
    verbose: user.verbose ?? defaults.verbose,
    debug: user.debug ?? defaults.debug,
  }
}

/**
 * Get current config path
 */
export function getConfigPath(): string | null {
  return configPath
}

/**
 * Clear config cache
 */
export function clearConfigCache(): void {
  cachedConfig = null
  configPath = null
}

/**
 * Get an agent configuration by name
 */
export function getAgentConfig(config: ResolvedVoideConfig, name: string): AgentConfig | null {
  // Check built-in agents
  const builtIn = config.agents.builtIn as Record<string, AgentConfig | undefined>
  if (builtIn[name]) {
    return builtIn[name]!
  }

  // Check custom agents
  if (config.agents.custom[name]) {
    return config.agents.custom[name]
  }

  return null
}

/**
 * Get enabled tool names
 */
export function getEnabledTools(config: ResolvedVoideConfig): string[] {
  const tools: string[] = []
  const builtIn = config.tools.builtIn as Record<string, boolean | object | undefined>

  for (const [name, enabled] of Object.entries(builtIn)) {
    if (enabled && !config.tools.disabled.includes(name)) {
      tools.push(name)
    }
  }

  // Add custom tools
  for (const name of Object.keys(config.tools.custom)) {
    if (!config.tools.disabled.includes(name)) {
      tools.push(name)
    }
  }

  return tools
}

/**
 * Check if a permission is allowed
 */
export function checkPermission(
  config: ResolvedVoideConfig,
  permission: string,
  target?: string,
): 'allow' | 'deny' | 'ask' {
  // Check denied paths first
  if (target) {
    for (const pattern of config.permissions.deniedPaths) {
      if (matchGlob(target, pattern)) {
        return 'deny'
      }
    }

    for (const pattern of config.permissions.allowedPaths) {
      if (matchGlob(target, pattern)) {
        return 'allow'
      }
    }
  }

  // Check rules
  for (const rule of config.permissions.rules) {
    if (rule.permission === permission || rule.permission === 'all') {
      if (!rule.pattern || (target && matchGlob(target, rule.pattern))) {
        return rule.action
      }
    }
  }

  // Default to ask
  return 'ask'
}

/**
 * Simple glob matching
 */
function matchGlob(path: string, pattern: string): boolean {
  // Convert glob to regex
  const regex = new RegExp(
    '^' +
    pattern
      .replace(/\*\*/g, '{{DOUBLE_STAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\{\{DOUBLE_STAR\}\}/g, '.*')
    + '$',
  )
  return regex.test(path)
}

/**
 * Create a config file template
 */
export function getConfigTemplate(): string {
  return `import type { VoideConfig } from '@voide/cli'

export default {
  // Provider configuration
  providers: {
    default: 'anthropic',
    anthropic: {
      // apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
    },
  },

  // Agent configuration
  agents: {
    default: 'build',
    builtIn: {
      build: {
        tools: ['read', 'write', 'edit', 'glob', 'grep', 'bash'],
      },
    },
    // custom: {
    //   myAgent: {
    //     name: 'My Custom Agent',
    //     systemPrompt: 'You are a helpful assistant.',
    //     tools: ['read', 'grep'],
    //   },
    // },
  },

  // Permission rules
  permissions: {
    rules: [
      { permission: 'read', action: 'allow' },
      { permission: 'write', pattern: '*.env*', action: 'deny' },
      { permission: 'bash', action: 'allow' },
    ],
  },

  // TUI settings
  tui: {
    theme: 'default',
    emoji: true,
  },

  // Custom instructions
  // instructions: 'Always use TypeScript.',
} satisfies VoideConfig
`
}
