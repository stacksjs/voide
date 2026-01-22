// Theme Support Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  ThemeManager,
  getThemeManager,
  getActiveTheme,
  setTheme,
  parseColor,
  BUILT_IN_THEMES,
} from '../../src/theme'
import { createTempDir, cleanupTempDir } from '../utils/helpers'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { rm, mkdir, writeFile } from 'node:fs/promises'

describe('ThemeManager', () => {
  let themeManager: ThemeManager

  beforeEach(() => {
    themeManager = new ThemeManager()
  })

  afterEach(async () => {
    try {
      await rm(join(homedir(), '.voide', 'active-theme'))
    }
    catch {
      // Ignore
    }
  })

  describe('constructor', () => {
    test('should initialize with built-in themes', () => {
      const themes = themeManager.getAll()
      expect(themes.length).toBeGreaterThanOrEqual(Object.keys(BUILT_IN_THEMES).length)
    })

    test('should default to default theme', () => {
      const active = themeManager.getActive()
      expect(active.name).toBe('Default')
    })
  })

  describe('get', () => {
    test('should get theme by name', () => {
      const theme = themeManager.get('monokai')
      expect(theme).toBeDefined()
      expect(theme?.name).toBe('Monokai')
    })

    test('should be case insensitive', () => {
      const theme1 = themeManager.get('DRACULA')
      const theme2 = themeManager.get('dracula')
      expect(theme1).toEqual(theme2)
    })

    test('should return undefined for unknown theme', () => {
      const theme = themeManager.get('nonexistent')
      expect(theme).toBeUndefined()
    })
  })

  describe('getAll', () => {
    test('should return all themes', () => {
      const themes = themeManager.getAll()
      expect(themes.some(t => t.name === 'Default')).toBe(true)
      expect(themes.some(t => t.name === 'Monokai')).toBe(true)
      expect(themes.some(t => t.name === 'Dracula')).toBe(true)
    })
  })

  describe('getNames', () => {
    test('should return theme names', () => {
      const names = themeManager.getNames()
      expect(names).toContain('default')
      expect(names).toContain('monokai')
      expect(names).toContain('dracula')
    })
  })

  describe('setActive', () => {
    test('should change active theme', async () => {
      const success = await themeManager.setActive('dracula')
      expect(success).toBe(true)

      const active = themeManager.getActive()
      expect(active.name).toBe('Dracula')
    })

    test('should return false for unknown theme', async () => {
      const success = await themeManager.setActive('nonexistent')
      expect(success).toBe(false)
    })

    test('should persist theme preference', async () => {
      await themeManager.setActive('nord')

      // Create new manager
      const newManager = new ThemeManager()
      await newManager.load()

      // Should load saved preference
      expect(newManager.getActive().name).toBe('Nord')
    })
  })

  describe('saveTheme', () => {
    test('should save custom theme', async () => {
      const customTheme = {
        name: 'CustomTest',
        description: 'Test theme',
        colors: {
          ...BUILT_IN_THEMES.default.colors,
          primary: '#FF0000',
        },
      }

      await themeManager.saveTheme(customTheme as any)

      const saved = themeManager.get('customtest')
      expect(saved).toBeDefined()
      expect(saved?.colors.primary).toBe('#FF0000')
    })
  })

  describe('colorize', () => {
    test('should apply color to text', () => {
      const colored = themeManager.colorize('Test', 'primary')
      expect(colored).toContain('\x1b[')
      expect(colored).toContain('Test')
      expect(colored).toContain('\x1b[0m') // Reset
    })
  })

  describe('getBoxChars', () => {
    test('should return unicode box chars by default', () => {
      const chars = themeManager.getBoxChars()
      expect(chars.topLeft).toBe('╭')
      expect(chars.horizontal).toBe('─')
      expect(chars.vertical).toBe('│')
    })

    test('should return ascii chars for minimal theme', async () => {
      await themeManager.setActive('minimal')
      const chars = themeManager.getBoxChars()
      expect(chars.topLeft).toBe('+')
      expect(chars.horizontal).toBe('-')
    })
  })

  describe('getSpinnerFrames', () => {
    test('should return dots spinner by default', () => {
      const frames = themeManager.getSpinnerFrames()
      expect(frames.length).toBeGreaterThan(0)
      expect(frames).toContain('⠋')
    })

    test('should return line spinner for minimal theme', async () => {
      await themeManager.setActive('minimal')
      const frames = themeManager.getSpinnerFrames()
      expect(frames).toContain('-')
      expect(frames).toContain('|')
    })
  })

  describe('formatList', () => {
    test('should format theme list', () => {
      const formatted = themeManager.formatList()

      expect(formatted).toContain('Available Themes')
      expect(formatted).toContain('Default')
      expect(formatted).toContain('Monokai')
      expect(formatted).toContain('/theme <name>')
    })

    test('should mark active theme', async () => {
      await themeManager.setActive('dracula')
      const formatted = themeManager.formatList()

      // Active theme should have marker
      expect(formatted).toContain('▸')
    })

    test('should show color preview', () => {
      const formatted = themeManager.formatList()
      // Should have color blocks (██)
      expect(formatted).toContain('██')
    })
  })
})

describe('parseColor', () => {
  test('should parse hex colors', () => {
    const color = parseColor('#FF5500')
    expect(color).toContain('\x1b[38;2;')
    expect(color).toContain('255')
  })

  test('should parse short hex colors', () => {
    const color = parseColor('#F00')
    expect(color).toContain('\x1b[38;2;')
    expect(color).toContain('255')
  })

  test('should parse named colors', () => {
    const red = parseColor('red')
    expect(red).toBe('\x1b[31m')

    const cyan = parseColor('cyan')
    expect(cyan).toBe('\x1b[36m')
  })

  test('should parse 256 color codes', () => {
    const color = parseColor('141')
    expect(color).toBe('\x1b[38;5;141m')
  })

  test('should return empty for invalid color', () => {
    const color = parseColor('invalidcolor')
    expect(color).toBe('')
  })

  test('should return escape codes as-is', () => {
    const code = '\x1b[31m'
    const result = parseColor(code)
    expect(result).toBe(code)
  })
})

describe('BUILT_IN_THEMES', () => {
  test('should have default theme', () => {
    expect(BUILT_IN_THEMES.default).toBeDefined()
    expect(BUILT_IN_THEMES.default.name).toBe('Default')
    expect(BUILT_IN_THEMES.default.colors.primary).toBeTruthy()
  })

  test('should have monokai theme', () => {
    expect(BUILT_IN_THEMES.monokai).toBeDefined()
    expect(BUILT_IN_THEMES.monokai.name).toBe('Monokai')
  })

  test('should have dracula theme', () => {
    expect(BUILT_IN_THEMES.dracula).toBeDefined()
    expect(BUILT_IN_THEMES.dracula.name).toBe('Dracula')
  })

  test('should have nord theme', () => {
    expect(BUILT_IN_THEMES.nord).toBeDefined()
    expect(BUILT_IN_THEMES.nord.name).toBe('Nord')
  })

  test('should have gruvbox theme', () => {
    expect(BUILT_IN_THEMES.gruvbox).toBeDefined()
    expect(BUILT_IN_THEMES.gruvbox.name).toBe('Gruvbox')
  })

  test('should have solarized theme', () => {
    expect(BUILT_IN_THEMES.solarized).toBeDefined()
    expect(BUILT_IN_THEMES.solarized.name).toBe('Solarized Dark')
  })

  test('should have minimal theme', () => {
    expect(BUILT_IN_THEMES.minimal).toBeDefined()
    expect(BUILT_IN_THEMES.minimal.emoji).toBe(false)
    expect(BUILT_IN_THEMES.minimal.boxDrawing).toBe('ascii')
  })

  test('all themes should have required color properties', () => {
    const requiredColors = [
      'primary', 'secondary', 'accent',
      'success', 'warning', 'error', 'info',
      'text', 'textMuted', 'textInverse',
      'background', 'backgroundAlt', 'backgroundHighlight',
      'border', 'borderFocus',
    ]

    for (const [name, theme] of Object.entries(BUILT_IN_THEMES)) {
      for (const color of requiredColors) {
        expect(theme.colors[color as keyof typeof theme.colors]).toBeTruthy()
      }
    }
  })
})

describe('helper functions', () => {
  describe('getActiveTheme', () => {
    test('should return active theme', async () => {
      const theme = await getActiveTheme()
      expect(theme).toBeDefined()
      expect(theme.name).toBeTruthy()
    })
  })

  describe('setTheme', () => {
    test('should set active theme', async () => {
      const success = await setTheme('monokai')
      expect(success).toBe(true)

      const theme = await getActiveTheme()
      expect(theme.name).toBe('Monokai')
    })
  })
})
