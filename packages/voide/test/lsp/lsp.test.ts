// LSP Integration Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  LspManager,
  createLspManager,
  getSupportedExtensions,
  type LspDiagnostic,
} from '../../src/lsp'
import { createTempDir, cleanupTempDir } from '../utils/helpers'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

describe('LspManager', () => {
  let tempDir: string
  let manager: LspManager

  beforeEach(async () => {
    tempDir = await createTempDir('lsp-test')
    manager = new LspManager(tempDir)
  })

  afterEach(async () => {
    manager.stopAll()
    await cleanupTempDir(tempDir)
  })

  describe('constructor', () => {
    test('should create instance with root path', () => {
      expect(manager).toBeInstanceOf(LspManager)
    })

    test('should accept custom configs', () => {
      const customConfigs = [
        {
          language: 'custom',
          command: 'custom-lsp',
          args: ['--stdio'],
          extensions: ['.custom'],
          rootPatterns: ['custom.json'],
        },
      ]

      const customManager = new LspManager(tempDir, customConfigs)
      expect(customManager).toBeInstanceOf(LspManager)
    })
  })

  describe('getAvailableServers', () => {
    test('should return list of available servers', () => {
      const servers = manager.getAvailableServers()

      expect(servers).toContain('typescript')
      expect(servers).toContain('python')
      expect(servers).toContain('rust')
      expect(servers).toContain('go')
    })
  })

  describe('getRunningServers', () => {
    test('should return empty array initially', () => {
      const running = manager.getRunningServers()
      expect(running).toEqual([])
    })
  })

  describe('getClientForFile', () => {
    test('should return null when no server started', () => {
      const client = manager.getClientForFile('/test/file.ts')
      expect(client).toBeNull()
    })
  })

  describe('getDiagnostics', () => {
    test('should return empty array for unknown file', () => {
      const diagnostics = manager.getDiagnostics('/test/file.ts')
      expect(diagnostics).toEqual([])
    })
  })

  describe('getAllDiagnostics', () => {
    test('should return empty array when no servers running', () => {
      const all = manager.getAllDiagnostics()
      expect(all).toEqual([])
    })
  })

  describe('formatDiagnostics', () => {
    test('should format empty list', () => {
      const formatted = manager.formatDiagnostics([])
      expect(formatted).toBe('No diagnostics')
    })

    test('should format error diagnostics', () => {
      const diagnostics: LspDiagnostic[] = [
        {
          file: '/test/file.ts',
          line: 10,
          column: 5,
          severity: 'error',
          message: 'Type error',
        },
      ]

      const formatted = manager.formatDiagnostics(diagnostics)

      expect(formatted).toContain('/test/file.ts')
      expect(formatted).toContain('11:6') // 0-indexed to 1-indexed
      expect(formatted).toContain('Type error')
      expect(formatted).toContain('✗')
    })

    test('should format warning diagnostics', () => {
      const diagnostics: LspDiagnostic[] = [
        {
          file: '/test/file.ts',
          line: 5,
          column: 0,
          severity: 'warning',
          message: 'Unused variable',
        },
      ]

      const formatted = manager.formatDiagnostics(diagnostics)

      expect(formatted).toContain('⚠')
      expect(formatted).toContain('Unused variable')
    })

    test('should format info diagnostics', () => {
      const diagnostics: LspDiagnostic[] = [
        {
          file: '/test/file.ts',
          line: 1,
          column: 0,
          severity: 'info',
          message: 'Information',
        },
      ]

      const formatted = manager.formatDiagnostics(diagnostics)

      expect(formatted).toContain('ℹ')
    })

    test('should group by file', () => {
      const diagnostics: LspDiagnostic[] = [
        {
          file: '/test/a.ts',
          line: 1,
          column: 0,
          severity: 'error',
          message: 'Error in A',
        },
        {
          file: '/test/b.ts',
          line: 1,
          column: 0,
          severity: 'error',
          message: 'Error in B',
        },
        {
          file: '/test/a.ts',
          line: 5,
          column: 0,
          severity: 'warning',
          message: 'Warning in A',
        },
      ]

      const formatted = manager.formatDiagnostics(diagnostics)

      expect(formatted).toContain('/test/a.ts')
      expect(formatted).toContain('/test/b.ts')
    })
  })

  describe('events', () => {
    test('should be an EventEmitter', () => {
      expect(typeof manager.on).toBe('function')
      expect(typeof manager.emit).toBe('function')
    })

    test('should allow registering handlers', () => {
      const handler = () => {}
      manager.on('diagnostics', handler)
      manager.on('log', handler)
      manager.on('error', handler)
      manager.on('serverStarted', handler)
      manager.on('serverStopped', handler)
      // Should not throw
    })
  })

  describe('stopServer', () => {
    test('should handle stopping non-existent server', () => {
      // Should not throw
      manager.stopServer('nonexistent')
    })
  })

  describe('stopAll', () => {
    test('should handle stopping when no servers running', () => {
      // Should not throw
      manager.stopAll()
    })
  })
})

describe('createLspManager', () => {
  test('should create LspManager instance', () => {
    const manager = createLspManager('/test/path')
    expect(manager).toBeInstanceOf(LspManager)
  })

  test('should pass configs to manager', () => {
    const configs = [
      {
        language: 'test',
        command: 'test-lsp',
        extensions: ['.test'],
        rootPatterns: [],
      },
    ]

    const manager = createLspManager('/test/path', configs)
    const servers = manager.getAvailableServers()

    expect(servers).toContain('test')
  })
})

describe('getSupportedExtensions', () => {
  test('should return array of extensions', () => {
    const extensions = getSupportedExtensions()

    expect(Array.isArray(extensions)).toBe(true)
    expect(extensions.length).toBeGreaterThan(0)
  })

  test('should include TypeScript extensions', () => {
    const extensions = getSupportedExtensions()

    expect(extensions).toContain('.ts')
    expect(extensions).toContain('.tsx')
  })

  test('should include JavaScript extensions', () => {
    const extensions = getSupportedExtensions()

    expect(extensions).toContain('.js')
    expect(extensions).toContain('.jsx')
  })

  test('should include Python extensions', () => {
    const extensions = getSupportedExtensions()

    expect(extensions).toContain('.py')
  })

  test('should include Rust extensions', () => {
    const extensions = getSupportedExtensions()

    expect(extensions).toContain('.rs')
  })

  test('should include Go extensions', () => {
    const extensions = getSupportedExtensions()

    expect(extensions).toContain('.go')
  })

  test('should include web extensions', () => {
    const extensions = getSupportedExtensions()

    expect(extensions).toContain('.html')
    expect(extensions).toContain('.css')
    expect(extensions).toContain('.json')
    expect(extensions).toContain('.yaml')
  })
})

describe('LspDiagnostic interface', () => {
  test('should have required properties', () => {
    const diagnostic: LspDiagnostic = {
      file: '/test/file.ts',
      line: 10,
      column: 5,
      severity: 'error',
      message: 'Test error',
    }

    expect(diagnostic.file).toBe('/test/file.ts')
    expect(diagnostic.line).toBe(10)
    expect(diagnostic.column).toBe(5)
    expect(diagnostic.severity).toBe('error')
    expect(diagnostic.message).toBe('Test error')
  })

  test('should support optional properties', () => {
    const diagnostic: LspDiagnostic = {
      file: '/test/file.ts',
      line: 10,
      column: 5,
      endLine: 12,
      endColumn: 10,
      severity: 'warning',
      message: 'Test warning',
      source: 'typescript',
      code: 'TS2322',
    }

    expect(diagnostic.endLine).toBe(12)
    expect(diagnostic.endColumn).toBe(10)
    expect(diagnostic.source).toBe('typescript')
    expect(diagnostic.code).toBe('TS2322')
  })

  test('should support all severity levels', () => {
    const severities: Array<'error' | 'warning' | 'info' | 'hint'> = ['error', 'warning', 'info', 'hint']

    for (const severity of severities) {
      const diagnostic: LspDiagnostic = {
        file: '/test',
        line: 1,
        column: 1,
        severity,
        message: 'Test',
      }

      expect(diagnostic.severity).toBe(severity)
    }
  })
})
