// Agent Switcher Tests

import { describe, test, expect, beforeEach } from 'bun:test'
import {
  AgentSwitcher,
  createAgentSwitcher,
  getModeIndicator,
  getToolsDiff,
  formatToolsDiff,
  BUILT_IN_MODES,
} from '../../src/tui/agent-switcher'

describe('BUILT_IN_MODES', () => {
  test('should have build mode', () => {
    const build = BUILT_IN_MODES.find(m => m.name === 'build')
    expect(build).toBeDefined()
    expect(build?.displayName).toBe('Build')
    expect(build?.shortcut).toBe('b')
    expect(build?.tools).toContain('write')
    expect(build?.tools).toContain('edit')
    expect(build?.tools).toContain('bash')
  })

  test('should have explore mode', () => {
    const explore = BUILT_IN_MODES.find(m => m.name === 'explore')
    expect(explore).toBeDefined()
    expect(explore?.displayName).toBe('Explore')
    expect(explore?.shortcut).toBe('e')
    expect(explore?.tools).toContain('read')
    expect(explore?.tools).toContain('glob')
    expect(explore?.tools).not.toContain('write')
    expect(explore?.tools).not.toContain('bash')
  })

  test('should have plan mode', () => {
    const plan = BUILT_IN_MODES.find(m => m.name === 'plan')
    expect(plan).toBeDefined()
    expect(plan?.displayName).toBe('Plan')
    expect(plan?.shortcut).toBe('p')
    expect(plan?.tools).toContain('todo')
    expect(plan?.tools).toContain('task')
  })

  test('should have minimal mode', () => {
    const minimal = BUILT_IN_MODES.find(m => m.name === 'minimal')
    expect(minimal).toBeDefined()
    expect(minimal?.displayName).toBe('Minimal')
    expect(minimal?.shortcut).toBe('m')
    expect(minimal?.tools.length).toBeLessThan(5)
  })

  test('should have interactive mode', () => {
    const interactive = BUILT_IN_MODES.find(m => m.name === 'interactive')
    expect(interactive).toBeDefined()
    expect(interactive?.displayName).toBe('Interactive')
    expect(interactive?.shortcut).toBe('i')
    expect(interactive?.tools).toContain('question')
  })

  test('all modes should have required properties', () => {
    for (const mode of BUILT_IN_MODES) {
      expect(mode.name).toBeTruthy()
      expect(mode.displayName).toBeTruthy()
      expect(mode.description).toBeTruthy()
      expect(Array.isArray(mode.tools)).toBe(true)
    }
  })
})

describe('AgentSwitcher', () => {
  let switcher: AgentSwitcher

  beforeEach(() => {
    const mockConfig = {
      agents: {},
    } as any
    switcher = new AgentSwitcher(mockConfig)
  })

  describe('getAllModes', () => {
    test('should return all built-in modes', () => {
      const modes = switcher.getAllModes()
      expect(modes.length).toBeGreaterThanOrEqual(BUILT_IN_MODES.length)
    })

    test('should include custom modes', () => {
      const configWithCustom = {
        agents: {
          custom: {
            name: 'Custom Agent',
            systemPrompt: 'Custom prompt',
            enabledTools: ['read', 'write'],
          },
        },
      } as any

      const switcherWithCustom = new AgentSwitcher(configWithCustom)
      const modes = switcherWithCustom.getAllModes()

      expect(modes.some(m => m.name === 'custom')).toBe(true)
    })
  })

  describe('getCurrentMode', () => {
    test('should default to build mode', () => {
      const mode = switcher.getCurrentMode()
      expect(mode.name).toBe('build')
    })
  })

  describe('switchMode', () => {
    test('should switch by name', () => {
      const result = switcher.switchMode('explore')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('explore')
      expect(switcher.getCurrentMode().name).toBe('explore')
    })

    test('should switch by shortcut', () => {
      const result = switcher.switchMode('p')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('plan')
    })

    test('should be case insensitive', () => {
      const result = switcher.switchMode('EXPLORE')
      expect(result?.name).toBe('explore')
    })

    test('should return null for unknown mode', () => {
      const result = switcher.switchMode('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('parseCommand', () => {
    test('should parse /mode as list', () => {
      const result = switcher.parseCommand('/mode')
      expect(result?.action).toBe('list')
    })

    test('should parse /modes as list', () => {
      const result = switcher.parseCommand('/modes')
      expect(result?.action).toBe('list')
    })

    test('should parse /mode <name> as switch', () => {
      const result = switcher.parseCommand('/mode explore')
      expect(result?.action).toBe('switch')
      expect(result?.target).toBe('explore')
    })

    test('should parse /mode:info as info', () => {
      const result = switcher.parseCommand('/mode:info')
      expect(result?.action).toBe('info')
    })

    test('should return null for non-mode commands', () => {
      const result = switcher.parseCommand('/help')
      expect(result).toBeNull()
    })
  })

  describe('formatMode', () => {
    test('should format mode for display', () => {
      const mode = BUILT_IN_MODES[0]
      const formatted = switcher.formatMode(mode)

      expect(formatted).toContain(mode.displayName)
      expect(formatted).toContain(mode.description)
    })

    test('should mark current mode', () => {
      const mode = BUILT_IN_MODES[0]
      const formatted = switcher.formatMode(mode, true)

      expect(formatted).toContain('▸')
    })

    test('should include shortcut', () => {
      const mode = BUILT_IN_MODES.find(m => m.shortcut)
      if (mode) {
        const formatted = switcher.formatMode(mode)
        expect(formatted).toContain(`[${mode.shortcut}]`)
      }
    })
  })

  describe('formatModeList', () => {
    test('should format all modes', () => {
      const formatted = switcher.formatModeList()

      expect(formatted).toContain('Agent Modes')
      expect(formatted).toContain('Build')
      expect(formatted).toContain('Explore')
      expect(formatted).toContain('/mode')
    })
  })

  describe('getModeInfo', () => {
    test('should return current mode info', () => {
      const info = switcher.getModeInfo()

      expect(info).toContain('Current Mode')
      expect(info).toContain('Build')
      expect(info).toContain('Tools')
    })

    test('should list tools', () => {
      const info = switcher.getModeInfo()
      const currentMode = switcher.getCurrentMode()

      for (const tool of currentMode.tools) {
        expect(info).toContain(tool)
      }
    })
  })

  describe('handleShortcut', () => {
    test('should switch mode by shortcut', () => {
      const result = switcher.handleShortcut('e')
      expect(result?.name).toBe('explore')
    })

    test('should return null for invalid shortcut', () => {
      const result = switcher.handleShortcut('x')
      expect(result).toBeNull()
    })
  })
})

describe('createAgentSwitcher', () => {
  test('should create AgentSwitcher instance', () => {
    const config = { agents: {} } as any
    const switcher = createAgentSwitcher(config)
    expect(switcher).toBeInstanceOf(AgentSwitcher)
  })

  test('should accept ask callback', () => {
    const config = { agents: {} } as any
    const askCallback = async () => true
    const switcher = createAgentSwitcher(config, askCallback)
    expect(switcher).toBeInstanceOf(AgentSwitcher)
  })
})

describe('getModeIndicator', () => {
  test('should return colored indicator', () => {
    const mode = BUILT_IN_MODES[0]
    const indicator = getModeIndicator(mode)

    expect(indicator).toContain('[Build]')
    expect(indicator).toContain('\x1b[')
    expect(indicator).toContain('\x1b[0m')
  })

  test('should use mode color', () => {
    const greenMode = BUILT_IN_MODES.find(m => m.color === 'green')
    if (greenMode) {
      const indicator = getModeIndicator(greenMode)
      expect(indicator).toContain('\x1b[32m')
    }
  })

  test('should default to gray for unknown color', () => {
    const mode = { ...BUILT_IN_MODES[0], color: 'unknown' }
    const indicator = getModeIndicator(mode)
    expect(indicator).toContain('\x1b[90m')
  })
})

describe('getToolsDiff', () => {
  test('should find added tools', () => {
    const from = { name: 'a', displayName: 'A', description: '', tools: ['read'] }
    const to = { name: 'b', displayName: 'B', description: '', tools: ['read', 'write'] }

    const diff = getToolsDiff(from, to)

    expect(diff.added).toContain('write')
    expect(diff.removed).toHaveLength(0)
  })

  test('should find removed tools', () => {
    const from = { name: 'a', displayName: 'A', description: '', tools: ['read', 'write'] }
    const to = { name: 'b', displayName: 'B', description: '', tools: ['read'] }

    const diff = getToolsDiff(from, to)

    expect(diff.removed).toContain('write')
    expect(diff.added).toHaveLength(0)
  })

  test('should find both added and removed', () => {
    const from = { name: 'a', displayName: 'A', description: '', tools: ['read', 'bash'] }
    const to = { name: 'b', displayName: 'B', description: '', tools: ['read', 'write'] }

    const diff = getToolsDiff(from, to)

    expect(diff.added).toContain('write')
    expect(diff.removed).toContain('bash')
  })

  test('should return empty arrays when no changes', () => {
    const from = { name: 'a', displayName: 'A', description: '', tools: ['read', 'write'] }
    const to = { name: 'b', displayName: 'B', description: '', tools: ['read', 'write'] }

    const diff = getToolsDiff(from, to)

    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })
})

describe('formatToolsDiff', () => {
  test('should format added tools', () => {
    const from = { name: 'a', displayName: 'A', description: '', tools: ['read'] }
    const to = { name: 'b', displayName: 'B', description: '', tools: ['read', 'write', 'edit'] }

    const formatted = formatToolsDiff(from, to)

    expect(formatted).toContain('Added tools:')
    expect(formatted).toContain('write')
    expect(formatted).toContain('edit')
  })

  test('should format removed tools', () => {
    const from = { name: 'a', displayName: 'A', description: '', tools: ['read', 'bash', 'write'] }
    const to = { name: 'b', displayName: 'B', description: '', tools: ['read'] }

    const formatted = formatToolsDiff(from, to)

    expect(formatted).toContain('Removed tools:')
    expect(formatted).toContain('bash')
    expect(formatted).toContain('write')
  })

  test('should show no changes message', () => {
    const from = { name: 'a', displayName: 'A', description: '', tools: ['read'] }
    const to = { name: 'b', displayName: 'B', description: '', tools: ['read'] }

    const formatted = formatToolsDiff(from, to)

    expect(formatted).toContain('No tool changes')
  })
})
