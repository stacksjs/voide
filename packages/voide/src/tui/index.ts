// TUI components for Voide CLI
// Uses Clapp prompts for interactive UI

import type { ProcessorEvent } from '../session/processor'
import type { ResolvedVoideConfig } from '../config/types'

// ANSI codes for styling
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
}

// Theme-based colors
const THEMES = {
  default: {
    primary: COLORS.cyan,
    secondary: COLORS.blue,
    success: COLORS.green,
    warning: COLORS.yellow,
    error: COLORS.red,
    info: COLORS.gray,
    text: COLORS.white,
    muted: COLORS.dim,
  },
  monokai: {
    primary: '\x1b[38;5;81m',  // cyan
    secondary: '\x1b[38;5;141m', // purple
    success: '\x1b[38;5;148m', // green
    warning: '\x1b[38;5;208m', // orange
    error: '\x1b[38;5;204m',   // pink
    info: '\x1b[38;5;245m',    // gray
    text: '\x1b[38;5;231m',    // white
    muted: '\x1b[38;5;240m',   // dark gray
  },
  dracula: {
    primary: '\x1b[38;5;141m', // purple
    secondary: '\x1b[38;5;117m', // cyan
    success: '\x1b[38;5;84m',  // green
    warning: '\x1b[38;5;215m', // orange
    error: '\x1b[38;5;210m',   // red
    info: '\x1b[38;5;103m',    // comment
    text: '\x1b[38;5;253m',    // foreground
    muted: '\x1b[38;5;61m',    // current line
  },
}

type Theme = keyof typeof THEMES

/**
 * TUI renderer for Voide CLI
 */
export class TuiRenderer {
  private theme: typeof THEMES.default
  private emoji: boolean
  private maxWidth: number
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  private spinnerIndex = 0
  private spinnerInterval: ReturnType<typeof setInterval> | null = null

  constructor(config?: ResolvedVoideConfig) {
    const themeName = (config?.tui?.theme || 'default') as Theme
    this.theme = THEMES[themeName] || THEMES.default
    this.emoji = config?.tui?.emoji ?? true
    this.maxWidth = config?.tui?.maxWidth || 120
  }

  // Styling helpers
  private style(text: string, ...styles: string[]): string {
    return styles.join('') + text + COLORS.reset
  }

  primary(text: string): string {
    return this.style(text, this.theme.primary)
  }

  secondary(text: string): string {
    return this.style(text, this.theme.secondary)
  }

  success(text: string): string {
    return this.style(text, this.theme.success)
  }

  warning(text: string): string {
    return this.style(text, this.theme.warning)
  }

  error(text: string): string {
    return this.style(text, this.theme.error)
  }

  info(text: string): string {
    return this.style(text, this.theme.info)
  }

  muted(text: string): string {
    return this.style(text, this.theme.muted)
  }

  bold(text: string): string {
    return this.style(text, COLORS.bold)
  }

  // Icons
  icon(name: 'check' | 'cross' | 'arrow' | 'dot' | 'info' | 'warning' | 'tool' | 'user' | 'assistant'): string {
    if (!this.emoji) {
      return {
        check: '[OK]',
        cross: '[ERR]',
        arrow: '>',
        dot: '*',
        info: '[i]',
        warning: '[!]',
        tool: '[T]',
        user: '[U]',
        assistant: '[A]',
      }[name]
    }

    return {
      check: '✓',
      cross: '✗',
      arrow: '→',
      dot: '•',
      info: 'ℹ',
      warning: '⚠',
      tool: '🔧',
      user: '👤',
      assistant: '🤖',
    }[name]
  }

  // Message rendering
  renderUserMessage(text: string): void {
    console.log('')
    console.log(this.muted(`${this.icon('user')} You`))
    console.log(text)
    console.log('')
  }

  renderAssistantMessage(text: string): void {
    console.log('')
    console.log(this.primary(`${this.icon('assistant')} Voide`))
    console.log(text)
    console.log('')
  }

  renderToolCall(name: string, input: Record<string, unknown>): void {
    const inputStr = JSON.stringify(input, null, 2)
    const truncated = inputStr.length > 200 ? inputStr.slice(0, 197) + '...' : inputStr
    console.log(this.secondary(`${this.icon('tool')} ${name}`))
    console.log(this.muted(truncated))
  }

  renderToolResult(name: string, output: string, isError: boolean): void {
    const lines = output.split('\n')
    const preview = lines.slice(0, 5).join('\n')
    const truncated = lines.length > 5 ? preview + `\n${this.muted(`... (${lines.length - 5} more lines)`)}` : preview

    if (isError) {
      console.log(this.error(`${this.icon('cross')} ${name} failed`))
    }
    else {
      console.log(this.success(`${this.icon('check')} ${name}`))
    }
    console.log(truncated)
  }

  // Progress indicators
  startSpinner(message: string): void {
    this.stopSpinner()
    process.stdout.write(`${this.spinnerFrames[0]} ${message}`)

    this.spinnerInterval = setInterval(() => {
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length
      process.stdout.write(`\r${this.primary(this.spinnerFrames[this.spinnerIndex])} ${message}`)
    }, 80)
  }

  stopSpinner(finalMessage?: string): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval)
      this.spinnerInterval = null
      process.stdout.write('\r' + ' '.repeat(80) + '\r')
      if (finalMessage) {
        console.log(finalMessage)
      }
    }
  }

  // Event handling
  handleEvent(event: ProcessorEvent): void {
    switch (event.type) {
      case 'message:start':
        this.startSpinner('Thinking...')
        break

      case 'text:delta':
        this.stopSpinner()
        process.stdout.write(event.text)
        break

      case 'text:done':
        console.log('')
        break

      case 'tool:start':
        this.stopSpinner()
        this.renderToolCall(event.toolName, event.input)
        this.startSpinner(`Running ${event.toolName}...`)
        break

      case 'tool:done':
        this.stopSpinner()
        this.renderToolResult('Result', event.output, event.isError)
        break

      case 'message:done':
        this.stopSpinner()
        break

      case 'turn:done':
        // Silent
        break

      case 'error':
        this.stopSpinner()
        console.log(this.error(`${this.icon('cross')} Error: ${event.error}`))
        break
    }
  }

  // Headers and banners
  renderHeader(): void {
    console.log('')
    console.log(this.bold(this.primary('╭───────────────────────────────────────╮')))
    console.log(this.bold(this.primary('│')) + '         ' + this.bold('VOIDE') + ' - AI Code Assistant     ' + this.bold(this.primary('│')))
    console.log(this.bold(this.primary('╰───────────────────────────────────────╯')))
    console.log('')
    console.log(this.muted('Type your message or use /help for commands'))
    console.log('')
  }

  renderHelp(): void {
    console.log('')
    console.log(this.bold('Commands:'))
    console.log(`  ${this.primary('/help')}     Show this help message`)
    console.log(`  ${this.primary('/clear')}    Clear the screen`)
    console.log(`  ${this.primary('/session')}  Show session info`)
    console.log(`  ${this.primary('/new')}      Start a new session`)
    console.log(`  ${this.primary('/exit')}     Exit the CLI`)
    console.log('')
    console.log(this.bold('Shortcuts:'))
    console.log(`  ${this.muted('Ctrl+C')}    Cancel current operation`)
    console.log(`  ${this.muted('Ctrl+D')}    Exit`)
    console.log('')
  }

  renderSessionInfo(sessionId: string, projectPath: string, messageCount: number): void {
    console.log('')
    console.log(this.bold('Session Info:'))
    console.log(`  ${this.muted('ID:')} ${sessionId}`)
    console.log(`  ${this.muted('Project:')} ${projectPath}`)
    console.log(`  ${this.muted('Messages:')} ${messageCount}`)
    console.log('')
  }

  renderError(message: string): void {
    console.log('')
    console.log(this.error(`${this.icon('cross')} ${message}`))
    console.log('')
  }

  renderSuccess(message: string): void {
    console.log('')
    console.log(this.success(`${this.icon('check')} ${message}`))
    console.log('')
  }

  renderInfo(message: string): void {
    console.log('')
    console.log(this.info(`${this.icon('info')} ${message}`))
    console.log('')
  }
}

/**
 * Create a TUI renderer
 */
export function createTui(config?: ResolvedVoideConfig): TuiRenderer {
  return new TuiRenderer(config)
}
