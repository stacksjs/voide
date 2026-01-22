// Theme Support for Voide CLI
// Allows users to customize CLI appearance with themes

import { join } from 'node:path'
import { homedir } from 'node:os'
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'

const VOIDE_DIR = join(homedir(), '.voide')
const THEMES_DIR = join(VOIDE_DIR, 'themes')
const ACTIVE_THEME_FILE = join(VOIDE_DIR, 'active-theme')

// Color definitions
export interface ThemeColors {
  // Primary colors
  primary: string
  secondary: string
  accent: string

  // Status colors
  success: string
  warning: string
  error: string
  info: string

  // Text colors
  text: string
  textMuted: string
  textInverse: string

  // Background colors
  background: string
  backgroundAlt: string
  backgroundHighlight: string

  // Border colors
  border: string
  borderFocus: string

  // Syntax highlighting
  keyword: string
  string: string
  number: string
  comment: string
  function: string
  variable: string
  type: string
  operator: string
}

export interface ThemeConfig {
  name: string
  description?: string
  author?: string
  version?: string
  colors: ThemeColors
  emoji?: boolean
  boxDrawing?: 'unicode' | 'ascii' | 'none'
  spinnerStyle?: 'dots' | 'line' | 'arc' | 'none'
}

// ANSI 256 color to escape code
function color256(code: number): string {
  return `\x1b[38;5;${code}m`
}

// RGB color to escape code
function colorRgb(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`
}

// Parse color string to ANSI escape code
export function parseColor(color: string): string {
  if (!color) return ''

  // Already an escape code
  if (color.startsWith('\x1b[')) return color

  // Hex color (#RRGGBB or #RGB)
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    let r: number, g: number, b: number

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    }
    else {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }

    return colorRgb(r, g, b)
  }

  // 256 color code (number)
  if (/^\d+$/.test(color)) {
    return color256(parseInt(color))
  }

  // Named ANSI colors
  const namedColors: Record<string, string> = {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    grey: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
  }

  return namedColors[color] || ''
}

// Built-in themes
export const BUILT_IN_THEMES: Record<string, ThemeConfig> = {
  default: {
    name: 'Default',
    description: 'Clean default theme with cyan accents',
    colors: {
      primary: '#00CED1',     // Dark cyan
      secondary: '#4169E1',   // Royal blue
      accent: '#9370DB',      // Medium purple
      success: '#32CD32',     // Lime green
      warning: '#FFD700',     // Gold
      error: '#DC143C',       // Crimson
      info: '#808080',        // Gray
      text: '#FFFFFF',        // White
      textMuted: '#A0A0A0',   // Light gray
      textInverse: '#000000', // Black
      background: '#1E1E1E',  // Dark gray
      backgroundAlt: '#2D2D2D',
      backgroundHighlight: '#3D3D3D',
      border: '#404040',
      borderFocus: '#00CED1',
      keyword: '#C586C0',     // Purple
      string: '#CE9178',      // Orange
      number: '#B5CEA8',      // Light green
      comment: '#6A9955',     // Green
      function: '#DCDCAA',    // Yellow
      variable: '#9CDCFE',    // Light blue
      type: '#4EC9B0',        // Teal
      operator: '#D4D4D4',    // Light gray
    },
    emoji: true,
    boxDrawing: 'unicode',
    spinnerStyle: 'dots',
  },

  monokai: {
    name: 'Monokai',
    description: 'Classic Monokai color scheme',
    colors: {
      primary: '#66D9EF',     // Cyan
      secondary: '#AE81FF',   // Purple
      accent: '#F92672',      // Pink
      success: '#A6E22E',     // Green
      warning: '#FD971F',     // Orange
      error: '#F92672',       // Pink
      info: '#75715E',        // Comment gray
      text: '#F8F8F2',        // Light
      textMuted: '#75715E',   // Comment
      textInverse: '#272822', // Dark
      background: '#272822',  // Dark
      backgroundAlt: '#3E3D32',
      backgroundHighlight: '#49483E',
      border: '#3E3D32',
      borderFocus: '#66D9EF',
      keyword: '#F92672',
      string: '#E6DB74',
      number: '#AE81FF',
      comment: '#75715E',
      function: '#A6E22E',
      variable: '#F8F8F2',
      type: '#66D9EF',
      operator: '#F92672',
    },
    emoji: true,
    boxDrawing: 'unicode',
    spinnerStyle: 'dots',
  },

  dracula: {
    name: 'Dracula',
    description: 'Popular Dracula theme',
    colors: {
      primary: '#BD93F9',     // Purple
      secondary: '#8BE9FD',   // Cyan
      accent: '#FF79C6',      // Pink
      success: '#50FA7B',     // Green
      warning: '#FFB86C',     // Orange
      error: '#FF5555',       // Red
      info: '#6272A4',        // Comment
      text: '#F8F8F2',        // Foreground
      textMuted: '#6272A4',   // Comment
      textInverse: '#282A36', // Background
      background: '#282A36',  // Background
      backgroundAlt: '#44475A',
      backgroundHighlight: '#44475A',
      border: '#44475A',
      borderFocus: '#BD93F9',
      keyword: '#FF79C6',
      string: '#F1FA8C',
      number: '#BD93F9',
      comment: '#6272A4',
      function: '#50FA7B',
      variable: '#F8F8F2',
      type: '#8BE9FD',
      operator: '#FF79C6',
    },
    emoji: true,
    boxDrawing: 'unicode',
    spinnerStyle: 'dots',
  },

  nord: {
    name: 'Nord',
    description: 'Arctic, north-bluish color palette',
    colors: {
      primary: '#88C0D0',     // Nord8 - cyan
      secondary: '#81A1C1',   // Nord9 - blue
      accent: '#B48EAD',      // Nord15 - purple
      success: '#A3BE8C',     // Nord14 - green
      warning: '#EBCB8B',     // Nord13 - yellow
      error: '#BF616A',       // Nord11 - red
      info: '#4C566A',        // Nord3 - gray
      text: '#ECEFF4',        // Nord6 - snow
      textMuted: '#4C566A',   // Nord3
      textInverse: '#2E3440', // Nord0
      background: '#2E3440',  // Nord0
      backgroundAlt: '#3B4252',
      backgroundHighlight: '#434C5E',
      border: '#3B4252',
      borderFocus: '#88C0D0',
      keyword: '#81A1C1',
      string: '#A3BE8C',
      number: '#B48EAD',
      comment: '#4C566A',
      function: '#88C0D0',
      variable: '#D8DEE9',
      type: '#8FBCBB',
      operator: '#81A1C1',
    },
    emoji: true,
    boxDrawing: 'unicode',
    spinnerStyle: 'dots',
  },

  gruvbox: {
    name: 'Gruvbox',
    description: 'Retro groove color scheme',
    colors: {
      primary: '#83A598',     // Aqua
      secondary: '#458588',   // Blue
      accent: '#D3869B',      // Purple
      success: '#B8BB26',     // Green
      warning: '#FABD2F',     // Yellow
      error: '#FB4934',       // Red
      info: '#928374',        // Gray
      text: '#EBDBB2',        // Foreground
      textMuted: '#928374',   // Gray
      textInverse: '#282828', // Background
      background: '#282828',
      backgroundAlt: '#3C3836',
      backgroundHighlight: '#504945',
      border: '#3C3836',
      borderFocus: '#83A598',
      keyword: '#FB4934',
      string: '#B8BB26',
      number: '#D3869B',
      comment: '#928374',
      function: '#B8BB26',
      variable: '#83A598',
      type: '#FABD2F',
      operator: '#FE8019',
    },
    emoji: true,
    boxDrawing: 'unicode',
    spinnerStyle: 'dots',
  },

  solarized: {
    name: 'Solarized Dark',
    description: 'Solarized dark color scheme',
    colors: {
      primary: '#268BD2',     // Blue
      secondary: '#2AA198',   // Cyan
      accent: '#6C71C4',      // Violet
      success: '#859900',     // Green
      warning: '#B58900',     // Yellow
      error: '#DC322F',       // Red
      info: '#657B83',        // Base00
      text: '#839496',        // Base0
      textMuted: '#657B83',   // Base00
      textInverse: '#002B36', // Base03
      background: '#002B36',  // Base03
      backgroundAlt: '#073642',
      backgroundHighlight: '#073642',
      border: '#073642',
      borderFocus: '#268BD2',
      keyword: '#859900',
      string: '#2AA198',
      number: '#D33682',
      comment: '#657B83',
      function: '#268BD2',
      variable: '#839496',
      type: '#B58900',
      operator: '#859900',
    },
    emoji: true,
    boxDrawing: 'unicode',
    spinnerStyle: 'dots',
  },

  minimal: {
    name: 'Minimal',
    description: 'Minimal monochrome theme',
    colors: {
      primary: 'white',
      secondary: 'gray',
      accent: 'white',
      success: 'white',
      warning: 'white',
      error: 'white',
      info: 'gray',
      text: 'white',
      textMuted: 'gray',
      textInverse: 'black',
      background: 'black',
      backgroundAlt: 'black',
      backgroundHighlight: 'gray',
      border: 'gray',
      borderFocus: 'white',
      keyword: 'white',
      string: 'white',
      number: 'white',
      comment: 'gray',
      function: 'white',
      variable: 'white',
      type: 'white',
      operator: 'white',
    },
    emoji: false,
    boxDrawing: 'ascii',
    spinnerStyle: 'line',
  },
}

// Theme manager class
export class ThemeManager {
  private themes: Map<string, ThemeConfig> = new Map()
  private activeTheme: ThemeConfig
  private loaded = false

  constructor() {
    // Initialize with built-in themes
    for (const [name, theme] of Object.entries(BUILT_IN_THEMES)) {
      this.themes.set(name.toLowerCase(), theme)
    }
    this.activeTheme = BUILT_IN_THEMES.default
  }

  // Load themes from disk
  async load(): Promise<void> {
    // Load custom themes from ~/.voide/themes/
    try {
      const files = await readdir(THEMES_DIR)

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const path = join(THEMES_DIR, file)
          const content = await readFile(path, 'utf-8')
          const theme = JSON.parse(content) as ThemeConfig

          if (theme.name && theme.colors) {
            this.themes.set(theme.name.toLowerCase(), theme)
          }
        }
        catch {
          // Skip invalid theme files
        }
      }
    }
    catch {
      // Themes directory doesn't exist
    }

    // Load active theme preference
    try {
      const activeThemeName = await readFile(ACTIVE_THEME_FILE, 'utf-8')
      const theme = this.themes.get(activeThemeName.trim().toLowerCase())
      if (theme) {
        this.activeTheme = theme
      }
    }
    catch {
      // No active theme file, use default
    }

    this.loaded = true
  }

  // Get a theme by name
  get(name: string): ThemeConfig | undefined {
    return this.themes.get(name.toLowerCase())
  }

  // Get all themes
  getAll(): ThemeConfig[] {
    return Array.from(this.themes.values())
  }

  // Get theme names
  getNames(): string[] {
    return Array.from(this.themes.keys())
  }

  // Get active theme
  getActive(): ThemeConfig {
    return this.activeTheme
  }

  // Set active theme
  async setActive(name: string): Promise<boolean> {
    const theme = this.themes.get(name.toLowerCase())
    if (!theme) return false

    this.activeTheme = theme

    // Save preference
    try {
      await mkdir(VOIDE_DIR, { recursive: true })
      await writeFile(ACTIVE_THEME_FILE, name.toLowerCase(), 'utf-8')
    }
    catch {
      // Ignore save errors
    }

    return true
  }

  // Add/update a custom theme
  async saveTheme(theme: ThemeConfig): Promise<void> {
    this.themes.set(theme.name.toLowerCase(), theme)

    // Save to file
    await mkdir(THEMES_DIR, { recursive: true })
    const path = join(THEMES_DIR, `${theme.name.toLowerCase()}.json`)
    await writeFile(path, JSON.stringify(theme, null, 2), 'utf-8')
  }

  // Create ANSI-colored text
  colorize(text: string, colorName: keyof ThemeColors): string {
    const color = parseColor(this.activeTheme.colors[colorName])
    const reset = '\x1b[0m'
    return color + text + reset
  }

  // Get box drawing characters based on theme
  getBoxChars(): {
    topLeft: string
    topRight: string
    bottomLeft: string
    bottomRight: string
    horizontal: string
    vertical: string
    teeLeft: string
    teeRight: string
    teeUp: string
    teeDown: string
    cross: string
  } {
    const style = this.activeTheme.boxDrawing || 'unicode'

    if (style === 'unicode') {
      return {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│',
        teeLeft: '├',
        teeRight: '┤',
        teeUp: '┴',
        teeDown: '┬',
        cross: '┼',
      }
    }

    if (style === 'ascii') {
      return {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|',
        teeLeft: '+',
        teeRight: '+',
        teeUp: '+',
        teeDown: '+',
        cross: '+',
      }
    }

    // none
    return {
      topLeft: '',
      topRight: '',
      bottomLeft: '',
      bottomRight: '',
      horizontal: '',
      vertical: '',
      teeLeft: '',
      teeRight: '',
      teeUp: '',
      teeDown: '',
      cross: '',
    }
  }

  // Get spinner frames based on theme
  getSpinnerFrames(): string[] {
    const style = this.activeTheme.spinnerStyle || 'dots'

    switch (style) {
      case 'dots':
        return ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
      case 'line':
        return ['-', '\\', '|', '/']
      case 'arc':
        return ['◜', '◠', '◝', '◞', '◡', '◟']
      default:
        return ['']
    }
  }

  // Format theme list for display
  formatList(): string {
    const themes = this.getAll()
    const active = this.activeTheme.name.toLowerCase()

    const lines: string[] = ['## Available Themes', '']

    for (const theme of themes) {
      const marker = theme.name.toLowerCase() === active ? '▸ ' : '  '
      const preview = this.getThemePreview(theme)
      lines.push(`${marker}${theme.name}`)
      lines.push(`   ${theme.description || 'No description'}`)
      lines.push(`   ${preview}`)
      lines.push('')
    }

    lines.push('Use /theme <name> to switch themes')

    return lines.join('\n')
  }

  // Get a color preview for a theme
  private getThemePreview(theme: ThemeConfig): string {
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.success,
      theme.colors.warning,
      theme.colors.error,
    ]

    const reset = '\x1b[0m'
    const blocks = colors.map(c => parseColor(c) + '██' + reset)

    return blocks.join(' ')
  }
}

// Singleton instance
let themeManager: ThemeManager | null = null

export async function getThemeManager(): Promise<ThemeManager> {
  if (!themeManager) {
    themeManager = new ThemeManager()
    await themeManager.load()
  }
  return themeManager
}

// Quick access to active theme
export async function getActiveTheme(): Promise<ThemeConfig> {
  const manager = await getThemeManager()
  return manager.getActive()
}

// Quick theme switching
export async function setTheme(name: string): Promise<boolean> {
  const manager = await getThemeManager()
  return manager.setActive(name)
}
