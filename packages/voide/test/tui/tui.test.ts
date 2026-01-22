// TUI Renderer Tests

import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test'
import { TuiRenderer, createTui } from '../../src/tui'

describe('TuiRenderer', () => {
  let tui: TuiRenderer
  let consoleSpy: ReturnType<typeof spyOn>
  let stdoutSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    tui = new TuiRenderer()
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
    stdoutSpy = spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    stdoutSpy.mockRestore()
    tui.stopSpinner()
  })

  describe('constructor', () => {
    test('should use default theme', () => {
      const renderer = new TuiRenderer()
      expect(renderer).toBeDefined()
    })

    test('should use configured theme', () => {
      const renderer = new TuiRenderer({ tui: { theme: 'monokai' } } as any)
      expect(renderer).toBeDefined()
    })

    test('should respect emoji setting', () => {
      const withEmoji = new TuiRenderer({ tui: { emoji: true } } as any)
      const withoutEmoji = new TuiRenderer({ tui: { emoji: false } } as any)

      expect(withEmoji.icon('check')).toBe('✓')
      expect(withoutEmoji.icon('check')).toBe('[OK]')
    })
  })

  describe('styling methods', () => {
    test('should apply primary style', () => {
      const styled = tui.primary('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[')
      expect(styled).toContain('\x1b[0m')
    })

    test('should apply secondary style', () => {
      const styled = tui.secondary('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[')
    })

    test('should apply success style', () => {
      const styled = tui.success('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[')
    })

    test('should apply warning style', () => {
      const styled = tui.warning('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[')
    })

    test('should apply error style', () => {
      const styled = tui.error('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[')
    })

    test('should apply info style', () => {
      const styled = tui.info('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[')
    })

    test('should apply muted style', () => {
      const styled = tui.muted('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[')
    })

    test('should apply bold style', () => {
      const styled = tui.bold('test')
      expect(styled).toContain('test')
      expect(styled).toContain('\x1b[1m')
    })
  })

  describe('icons', () => {
    test('should return emoji icons by default', () => {
      const renderer = new TuiRenderer({ tui: { emoji: true } } as any)
      expect(renderer.icon('check')).toBe('✓')
      expect(renderer.icon('cross')).toBe('✗')
      expect(renderer.icon('arrow')).toBe('→')
      expect(renderer.icon('dot')).toBe('•')
      expect(renderer.icon('info')).toBe('ℹ')
      expect(renderer.icon('warning')).toBe('⚠')
      expect(renderer.icon('tool')).toBe('🔧')
      expect(renderer.icon('user')).toBe('👤')
      expect(renderer.icon('assistant')).toBe('🤖')
    })

    test('should return text icons when emoji disabled', () => {
      const renderer = new TuiRenderer({ tui: { emoji: false } } as any)
      expect(renderer.icon('check')).toBe('[OK]')
      expect(renderer.icon('cross')).toBe('[ERR]')
      expect(renderer.icon('arrow')).toBe('>')
      expect(renderer.icon('dot')).toBe('*')
      expect(renderer.icon('info')).toBe('[i]')
      expect(renderer.icon('warning')).toBe('[!]')
      expect(renderer.icon('tool')).toBe('[T]')
      expect(renderer.icon('user')).toBe('[U]')
      expect(renderer.icon('assistant')).toBe('[A]')
    })
  })

  describe('message rendering', () => {
    test('should render user message', () => {
      tui.renderUserMessage('Hello world')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render assistant message', () => {
      tui.renderAssistantMessage('Hi there')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render tool call', () => {
      tui.renderToolCall('read', { path: '/test' })
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should truncate long tool inputs', () => {
      const longInput = { data: 'x'.repeat(300) }
      tui.renderToolCall('write', longInput)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render tool result success', () => {
      tui.renderToolResult('read', 'File contents', false)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render tool result error', () => {
      tui.renderToolResult('read', 'File not found', true)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should truncate long tool output', () => {
      const longOutput = Array(20).fill('line').join('\n')
      tui.renderToolResult('read', longOutput, false)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('spinner', () => {
    test('should start spinner', () => {
      tui.startSpinner('Loading...')
      expect(stdoutSpy).toHaveBeenCalled()
    })

    test('should stop spinner', () => {
      tui.startSpinner('Loading...')
      tui.stopSpinner()
      expect(stdoutSpy).toHaveBeenCalled()
    })

    test('should stop spinner with message', () => {
      tui.startSpinner('Loading...')
      tui.stopSpinner('Done!')
      expect(consoleSpy).toHaveBeenCalledWith('Done!')
    })

    test('should handle multiple start calls', () => {
      tui.startSpinner('First')
      tui.startSpinner('Second')
      tui.stopSpinner()
      // Should not error
    })
  })

  describe('event handling', () => {
    test('should handle message:start event', () => {
      tui.handleEvent({ type: 'message:start' } as any)
      expect(stdoutSpy).toHaveBeenCalled()
    })

    test('should handle text:delta event', () => {
      tui.handleEvent({ type: 'text:delta', text: 'Hello' } as any)
      expect(stdoutSpy).toHaveBeenCalled()
    })

    test('should handle text:done event', () => {
      tui.handleEvent({ type: 'text:done' } as any)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should handle tool:start event', () => {
      tui.handleEvent({
        type: 'tool:start',
        toolName: 'read',
        input: { path: '/test' },
      } as any)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should handle tool:done event', () => {
      tui.handleEvent({
        type: 'tool:done',
        output: 'Result',
        isError: false,
      } as any)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should handle message:done event', () => {
      tui.handleEvent({ type: 'message:done' } as any)
      // Should stop spinner if running
    })

    test('should handle error event', () => {
      tui.handleEvent({ type: 'error', error: 'Something went wrong' } as any)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('headers and banners', () => {
    test('should render header', () => {
      tui.renderHeader()
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render help', () => {
      tui.renderHelp()
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render mode list', () => {
      const modes = [
        { name: 'build', displayName: 'Build', description: 'Full access', shortcut: 'b' },
        { name: 'explore', displayName: 'Explore', description: 'Read-only', shortcut: 'e' },
      ]
      tui.renderModeList(modes, 'build')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render mode switch', () => {
      const diff = { added: ['bash', 'write'], removed: ['read'] }
      tui.renderModeSwitch('explore', 'build', diff)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render session list', () => {
      const sessions = [
        { id: 'abc123', title: 'Session 1', updatedAt: Date.now(), messageCount: 5 },
        { id: 'def456', title: 'Session 2', updatedAt: Date.now(), messageCount: 10 },
      ]
      tui.renderSessionList(sessions)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render session info', () => {
      tui.renderSessionInfo('abc123', '/project', 10)
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render error message', () => {
      tui.renderError('Something went wrong')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render success message', () => {
      tui.renderSuccess('Operation completed')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should render info message', () => {
      tui.renderInfo('Here is some information')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})

describe('createTui', () => {
  test('should create TuiRenderer instance', () => {
    const renderer = createTui()
    expect(renderer).toBeInstanceOf(TuiRenderer)
  })

  test('should pass config to renderer', () => {
    const config = { tui: { theme: 'dracula', emoji: false } } as any
    const renderer = createTui(config)
    expect(renderer).toBeInstanceOf(TuiRenderer)
    expect(renderer.icon('check')).toBe('[OK]')
  })
})
