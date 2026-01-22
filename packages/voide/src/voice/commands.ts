// Voice Commands for Voide CLI
// Natural language command processing

import { EventEmitter } from 'node:events'

export interface VoiceCommand {
  /** Command name/identifier */
  name: string
  /** Patterns to match (regex or keywords) */
  patterns: Array<string | RegExp>
  /** Command description */
  description?: string
  /** Handler function */
  handler: (match: CommandMatch) => void | Promise<void>
  /** Whether command requires confirmation */
  requiresConfirmation?: boolean
}

export interface CommandMatch {
  /** Matched command */
  command: VoiceCommand
  /** Original transcription */
  transcription: string
  /** Extracted parameters */
  params: Record<string, string>
  /** Confidence score (0-1) */
  confidence: number
}

export interface VoiceCommandsConfig {
  /** Wake word to activate commands */
  wakeWord?: string
  /** Custom commands */
  commands?: VoiceCommand[]
  /** Fuzzy matching threshold (0-1) */
  fuzzyThreshold?: number
  /** Command timeout (ms) */
  timeout?: number
}

// Built-in commands
const BUILTIN_COMMANDS: VoiceCommand[] = [
  {
    name: 'help',
    patterns: ['help', 'what can you do', 'commands', 'show commands'],
    description: 'Show available commands',
    handler: () => {},
  },
  {
    name: 'stop',
    patterns: ['stop', 'cancel', 'abort', 'never mind', 'nevermind'],
    description: 'Stop current operation',
    handler: () => {},
  },
  {
    name: 'read',
    patterns: [/read\s+(?:file\s+)?(.+)/i, /open\s+(?:file\s+)?(.+)/i],
    description: 'Read a file',
    handler: () => {},
  },
  {
    name: 'search',
    patterns: [/search\s+(?:for\s+)?(.+)/i, /find\s+(.+)/i, /grep\s+(.+)/i],
    description: 'Search for text in files',
    handler: () => {},
  },
  {
    name: 'run',
    patterns: [/run\s+(.+)/i, /execute\s+(.+)/i],
    description: 'Run a command',
    requiresConfirmation: true,
    handler: () => {},
  },
  {
    name: 'commit',
    patterns: [/commit\s+(?:with\s+message\s+)?(.+)?/i, /save\s+changes/i],
    description: 'Commit changes to git',
    handler: () => {},
  },
  {
    name: 'status',
    patterns: ['status', 'git status', 'what changed', 'show changes'],
    description: 'Show git status',
    handler: () => {},
  },
  {
    name: 'clear',
    patterns: ['clear', 'clear screen', 'reset'],
    description: 'Clear the conversation',
    handler: () => {},
  },
  {
    name: 'exit',
    patterns: ['exit', 'quit', 'bye', 'goodbye', 'close'],
    description: 'Exit Voide',
    handler: () => {},
  },
  {
    name: 'undo',
    patterns: ['undo', 'revert', 'undo last', 'revert last'],
    description: 'Undo last action',
    handler: () => {},
  },
  {
    name: 'explain',
    patterns: [/explain\s+(.+)/i, /what\s+(?:is|does)\s+(.+)/i],
    description: 'Explain code or concept',
    handler: () => {},
  },
  {
    name: 'create',
    patterns: [/create\s+(?:a\s+)?(?:new\s+)?(.+)/i, /make\s+(?:a\s+)?(?:new\s+)?(.+)/i],
    description: 'Create a new file or component',
    handler: () => {},
  },
  {
    name: 'edit',
    patterns: [/edit\s+(.+)/i, /change\s+(.+)/i, /modify\s+(.+)/i],
    description: 'Edit a file',
    handler: () => {},
  },
  {
    name: 'delete',
    patterns: [/delete\s+(.+)/i, /remove\s+(.+)/i],
    description: 'Delete a file',
    requiresConfirmation: true,
    handler: () => {},
  },
  {
    name: 'test',
    patterns: [/run\s+tests?/i, /test\s+(.+)?/i],
    description: 'Run tests',
    handler: () => {},
  },
  {
    name: 'build',
    patterns: [/build(?:\s+(.+))?/i, /compile(?:\s+(.+))?/i],
    description: 'Build the project',
    handler: () => {},
  },
  {
    name: 'yes',
    patterns: ['yes', 'yeah', 'yep', 'confirm', 'do it', 'proceed', 'ok', 'okay'],
    description: 'Confirm action',
    handler: () => {},
  },
  {
    name: 'no',
    patterns: ['no', 'nope', 'cancel', 'dont', 'don\'t', 'negative'],
    description: 'Cancel action',
    handler: () => {},
  },
]

/**
 * Voice Commands processor
 */
export class VoiceCommands extends EventEmitter {
  private config: VoiceCommandsConfig
  private commands: VoiceCommand[]
  private isListening = false
  private pendingConfirmation?: {
    command: VoiceCommand
    match: CommandMatch
    timeout: NodeJS.Timeout
  }

  constructor(config: VoiceCommandsConfig = {}) {
    super()
    this.config = {
      wakeWord: config.wakeWord || 'hey voide',
      fuzzyThreshold: config.fuzzyThreshold || 0.6,
      timeout: config.timeout || 10000,
      ...config,
    }

    // Merge custom commands with built-in
    this.commands = [
      ...BUILTIN_COMMANDS,
      ...(config.commands || []),
    ]
  }

  /**
   * Process a transcription
   */
  process(transcription: string): CommandMatch | null {
    const text = transcription.toLowerCase().trim()

    // Check for wake word
    const wakeWord = this.config.wakeWord!.toLowerCase()
    let commandText = text

    if (text.startsWith(wakeWord)) {
      commandText = text.slice(wakeWord.length).trim()
      this.emit('wake', { transcription })
    }

    // Check for pending confirmation
    if (this.pendingConfirmation) {
      return this.handleConfirmation(commandText)
    }

    // Try to match a command
    const match = this.matchCommand(commandText)

    if (match) {
      this.emit('match', match)

      // Check if confirmation is required
      if (match.command.requiresConfirmation) {
        this.requestConfirmation(match)
        return match
      }

      // Execute command
      this.executeCommand(match)
    }
    else {
      this.emit('noMatch', { transcription: commandText })
    }

    return match
  }

  /**
   * Match transcription to a command
   */
  private matchCommand(text: string): CommandMatch | null {
    let bestMatch: CommandMatch | null = null
    let bestConfidence = 0

    for (const command of this.commands) {
      for (const pattern of command.patterns) {
        let confidence = 0
        let params: Record<string, string> = {}

        if (typeof pattern === 'string') {
          // Exact or fuzzy string match
          if (text.includes(pattern.toLowerCase())) {
            confidence = pattern.length / text.length
          }
          else {
            confidence = this.fuzzyMatch(text, pattern.toLowerCase())
          }
        }
        else {
          // Regex match
          const match = text.match(pattern)
          if (match) {
            confidence = 0.9 // High confidence for regex matches

            // Extract capture groups as params
            match.slice(1).forEach((value, index) => {
              if (value) {
                params[`$${index + 1}`] = value.trim()
              }
            })
          }
        }

        if (confidence > bestConfidence && confidence >= this.config.fuzzyThreshold!) {
          bestConfidence = confidence
          bestMatch = {
            command,
            transcription: text,
            params,
            confidence,
          }
        }
      }
    }

    return bestMatch
  }

  /**
   * Fuzzy string matching
   */
  private fuzzyMatch(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0 || len2 === 0) return 0
    if (str1 === str2) return 1

    // Simple Levenshtein-based similarity
    const matrix: number[][] = []

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        )
      }
    }

    const distance = matrix[len1][len2]
    return 1 - distance / Math.max(len1, len2)
  }

  /**
   * Request confirmation for a command
   */
  private requestConfirmation(match: CommandMatch): void {
    this.emit('confirmationRequired', match)

    const timeout = setTimeout(() => {
      this.pendingConfirmation = undefined
      this.emit('confirmationTimeout', match)
    }, this.config.timeout!)

    this.pendingConfirmation = {
      command: match.command,
      match,
      timeout,
    }
  }

  /**
   * Handle confirmation response
   */
  private handleConfirmation(text: string): CommandMatch | null {
    const pending = this.pendingConfirmation!
    clearTimeout(pending.timeout)
    this.pendingConfirmation = undefined

    // Check for yes/no
    const yesPatterns = ['yes', 'yeah', 'yep', 'confirm', 'do it', 'proceed', 'ok', 'okay']
    const noPatterns = ['no', 'nope', 'cancel', 'dont', 'don\'t', 'negative', 'stop']

    const isYes = yesPatterns.some(p => text.includes(p))
    const isNo = noPatterns.some(p => text.includes(p))

    if (isYes) {
      this.emit('confirmed', pending.match)
      this.executeCommand(pending.match)
      return pending.match
    }
    else if (isNo) {
      this.emit('cancelled', pending.match)
      return null
    }
    else {
      // Unclear response, cancel
      this.emit('confirmationUnclear', { text, match: pending.match })
      return null
    }
  }

  /**
   * Execute a matched command
   */
  private async executeCommand(match: CommandMatch): Promise<void> {
    this.emit('execute:start', match)

    try {
      await match.command.handler(match)
      this.emit('execute:end', match)
    }
    catch (error) {
      this.emit('execute:error', { match, error })
    }
  }

  /**
   * Register a custom command
   */
  register(command: VoiceCommand): void {
    this.commands.push(command)
    this.emit('command:register', command)
  }

  /**
   * Unregister a command
   */
  unregister(name: string): void {
    const index = this.commands.findIndex(c => c.name === name)
    if (index >= 0) {
      const command = this.commands.splice(index, 1)[0]
      this.emit('command:unregister', command)
    }
  }

  /**
   * Get all registered commands
   */
  getCommands(): VoiceCommand[] {
    return [...this.commands]
  }

  /**
   * Get commands formatted for help display
   */
  getHelpText(): string {
    const lines: string[] = ['Voice Commands:']

    for (const command of this.commands) {
      const patterns = command.patterns
        .map(p => typeof p === 'string' ? `"${p}"` : p.source)
        .slice(0, 2)
        .join(', ')

      const confirmation = command.requiresConfirmation ? ' [requires confirmation]' : ''
      lines.push(`  ${command.name}: ${command.description || patterns}${confirmation}`)
    }

    return lines.join('\n')
  }

  /**
   * Set command handler
   */
  setHandler(name: string, handler: VoiceCommand['handler']): void {
    const command = this.commands.find(c => c.name === name)
    if (command) {
      command.handler = handler
    }
  }

  /**
   * Check if awaiting confirmation
   */
  get awaitingConfirmation(): boolean {
    return this.pendingConfirmation !== undefined
  }

  /**
   * Cancel pending confirmation
   */
  cancelConfirmation(): void {
    if (this.pendingConfirmation) {
      clearTimeout(this.pendingConfirmation.timeout)
      const match = this.pendingConfirmation.match
      this.pendingConfirmation = undefined
      this.emit('cancelled', match)
    }
  }
}

/**
 * Create voice commands handler
 */
export function createVoiceCommands(config: VoiceCommandsConfig = {}): VoiceCommands {
  return new VoiceCommands(config)
}

/**
 * Parse intent from natural language
 */
export function parseIntent(text: string): {
  intent: string
  entities: Record<string, string>
  confidence: number
} {
  const text_lower = text.toLowerCase()

  // File operations
  if (/read|open|show|view|cat/.test(text_lower)) {
    const fileMatch = text_lower.match(/(?:read|open|show|view|cat)\s+(?:file\s+)?([^\s]+(?:\.[a-z]+)?)/i)
    return {
      intent: 'read_file',
      entities: { file: fileMatch?.[1] || '' },
      confidence: 0.8,
    }
  }

  if (/search|find|grep|look for/.test(text_lower)) {
    const searchMatch = text_lower.match(/(?:search|find|grep|look)\s+(?:for\s+)?(.+?)(?:\s+in\s+(.+))?$/i)
    return {
      intent: 'search',
      entities: {
        query: searchMatch?.[1] || '',
        path: searchMatch?.[2] || '',
      },
      confidence: 0.8,
    }
  }

  if (/run|execute|start/.test(text_lower)) {
    const runMatch = text_lower.match(/(?:run|execute|start)\s+(.+)/i)
    return {
      intent: 'run_command',
      entities: { command: runMatch?.[1] || '' },
      confidence: 0.8,
    }
  }

  if (/create|make|new/.test(text_lower)) {
    return {
      intent: 'create',
      entities: { description: text },
      confidence: 0.7,
    }
  }

  if (/edit|change|modify|update/.test(text_lower)) {
    return {
      intent: 'edit',
      entities: { description: text },
      confidence: 0.7,
    }
  }

  if (/delete|remove/.test(text_lower)) {
    const deleteMatch = text_lower.match(/(?:delete|remove)\s+(.+)/i)
    return {
      intent: 'delete',
      entities: { target: deleteMatch?.[1] || '' },
      confidence: 0.8,
    }
  }

  if (/explain|what is|what does/.test(text_lower)) {
    return {
      intent: 'explain',
      entities: { topic: text },
      confidence: 0.7,
    }
  }

  // Default to chat
  return {
    intent: 'chat',
    entities: { message: text },
    confidence: 0.5,
  }
}
