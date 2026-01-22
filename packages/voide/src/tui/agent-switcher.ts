// Agent Switcher for Voide TUI
// Allows switching between different agent modes during a session

import type { ResolvedVoideConfig, AgentConfig } from '../config/types'
import { getAgentConfig, getEnabledTools } from '../config'
import { createAgent, getAvailableAgents } from '../agent'
import type { Agent } from '../agent'
import type { Session } from '../session'

export interface AgentMode {
  name: string
  displayName: string
  description: string
  tools: string[]
  shortcut?: string
  color?: string
}

// Built-in agent modes
export const BUILT_IN_MODES: AgentMode[] = [
  {
    name: 'build',
    displayName: 'Build',
    description: 'Full access for code editing and execution',
    tools: ['read', 'write', 'edit', 'glob', 'grep', 'bash', 'ls', 'todo', 'task', 'question'],
    shortcut: 'b',
    color: 'green',
  },
  {
    name: 'explore',
    displayName: 'Explore',
    description: 'Read-only mode for exploration and research',
    tools: ['read', 'glob', 'grep', 'ls'],
    shortcut: 'e',
    color: 'blue',
  },
  {
    name: 'plan',
    displayName: 'Plan',
    description: 'Planning mode - read-only with task tracking',
    tools: ['read', 'glob', 'grep', 'ls', 'todo', 'task'],
    shortcut: 'p',
    color: 'magenta',
  },
  {
    name: 'minimal',
    displayName: 'Minimal',
    description: 'Minimal tools for simple tasks',
    tools: ['read', 'bash'],
    shortcut: 'm',
    color: 'gray',
  },
  {
    name: 'interactive',
    displayName: 'Interactive',
    description: 'Full access with interactive prompts',
    tools: ['read', 'write', 'edit', 'glob', 'grep', 'bash', 'ls', 'todo', 'task', 'question'],
    shortcut: 'i',
    color: 'cyan',
  },
]

export class AgentSwitcher {
  private config: ResolvedVoideConfig
  private currentMode: AgentMode
  private currentAgent: Agent | null = null
  private customModes: AgentMode[] = []
  private askCallback?: (question: string) => Promise<boolean>

  constructor(config: ResolvedVoideConfig, askCallback?: (question: string) => Promise<boolean>) {
    this.config = config
    this.askCallback = askCallback
    this.currentMode = BUILT_IN_MODES[0] // Default to build mode

    // Load custom modes from config
    this.loadCustomModes()
  }

  private loadCustomModes(): void {
    // Get agent configs from config
    const agentConfigs = this.config.agents || {}

    for (const [name, agentConfig] of Object.entries(agentConfigs)) {
      // Skip built-in modes
      if (BUILT_IN_MODES.find(m => m.name === name)) continue

      const config = agentConfig as AgentConfig
      this.customModes.push({
        name,
        displayName: config.name || name,
        description: config.systemPrompt?.slice(0, 50) || `Custom agent: ${name}`,
        tools: config.enabledTools || [],
        color: 'yellow',
      })
    }
  }

  // Get all available modes
  getAllModes(): AgentMode[] {
    return [...BUILT_IN_MODES, ...this.customModes]
  }

  // Get current mode
  getCurrentMode(): AgentMode {
    return this.currentMode
  }

  // Get current agent
  getCurrentAgent(): Agent | null {
    return this.currentAgent
  }

  // Switch to a mode by name or shortcut
  switchMode(nameOrShortcut: string): AgentMode | null {
    const allModes = this.getAllModes()

    // Find mode by name or shortcut
    const mode = allModes.find(m =>
      m.name.toLowerCase() === nameOrShortcut.toLowerCase() ||
      m.shortcut === nameOrShortcut.toLowerCase()
    )

    if (mode) {
      this.currentMode = mode
      this.currentAgent = createAgent(this.config, mode.name, this.askCallback)
      return mode
    }

    return null
  }

  // Initialize agent for current mode
  initializeAgent(session?: Session): Agent {
    this.currentAgent = createAgent(this.config, this.currentMode.name, this.askCallback)

    if (session) {
      // Restore session to agent
      this.currentAgent.restoreSession(session)
    }

    return this.currentAgent
  }

  // Format mode for display
  formatMode(mode: AgentMode, current = false): string {
    const marker = current ? '▸ ' : '  '
    const shortcut = mode.shortcut ? ` [${mode.shortcut}]` : ''
    return `${marker}${mode.displayName}${shortcut}: ${mode.description}`
  }

  // Format all modes for display
  formatModeList(): string {
    const lines: string[] = ['## Agent Modes', '']

    for (const mode of this.getAllModes()) {
      const isCurrent = mode.name === this.currentMode.name
      lines.push(this.formatMode(mode, isCurrent))
    }

    lines.push('')
    lines.push('Use /mode <name> or /mode <shortcut> to switch')

    return lines.join('\n')
  }

  // Parse mode command
  parseCommand(input: string): { action: 'list' | 'switch' | 'info'; target?: string } | null {
    const trimmed = input.trim()

    // /mode or /modes - list modes
    if (trimmed === '/mode' || trimmed === '/modes') {
      return { action: 'list' }
    }

    // /mode <name> - switch mode
    if (trimmed.startsWith('/mode ')) {
      const target = trimmed.slice(6).trim()
      return { action: 'switch', target }
    }

    // /mode:info - show current mode info
    if (trimmed === '/mode:info') {
      return { action: 'info' }
    }

    return null
  }

  // Get mode info
  getModeInfo(): string {
    const mode = this.currentMode
    const lines: string[] = [
      `## Current Mode: ${mode.displayName}`,
      '',
      mode.description,
      '',
      '**Tools:**',
      ...mode.tools.map(t => `  - ${t}`),
    ]

    return lines.join('\n')
  }

  // Quick switch via shortcut key
  handleShortcut(key: string): AgentMode | null {
    return this.switchMode(key)
  }
}

// Create agent switcher
export function createAgentSwitcher(
  config: ResolvedVoideConfig,
  askCallback?: (question: string) => Promise<boolean>,
): AgentSwitcher {
  return new AgentSwitcher(config, askCallback)
}

// ANSI color codes for mode colors
const MODE_COLORS: Record<string, string> = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
}

// Get colored mode indicator for status line
export function getModeIndicator(mode: AgentMode): string {
  const color = MODE_COLORS[mode.color || 'gray'] || MODE_COLORS.gray
  const reset = '\x1b[0m'
  return `${color}[${mode.displayName}]${reset}`
}

// Get tools diff between modes
export function getToolsDiff(from: AgentMode, to: AgentMode): {
  added: string[]
  removed: string[]
} {
  const fromSet = new Set(from.tools)
  const toSet = new Set(to.tools)

  const added = to.tools.filter(t => !fromSet.has(t))
  const removed = from.tools.filter(t => !toSet.has(t))

  return { added, removed }
}

// Format tools diff for display
export function formatToolsDiff(from: AgentMode, to: AgentMode): string {
  const diff = getToolsDiff(from, to)
  const lines: string[] = []

  if (diff.added.length > 0) {
    lines.push(`Added tools: ${diff.added.join(', ')}`)
  }
  if (diff.removed.length > 0) {
    lines.push(`Removed tools: ${diff.removed.join(', ')}`)
  }
  if (lines.length === 0) {
    lines.push('No tool changes')
  }

  return lines.join('\n')
}
