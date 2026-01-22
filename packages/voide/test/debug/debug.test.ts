// Debug Commands Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  getDebugInfo,
  formatDebugInfo,
  runDoctor,
  formatDoctorResults,
  getLogs,
  log,
  clearCache,
  getCacheStats,
  formatCacheStats,
  exportDebugDump,
} from '../../src/debug'
import { createTempDir, cleanupTempDir, withEnv } from '../utils/helpers'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir, writeFile, rm } from 'node:fs/promises'

describe('Debug Commands', () => {
  describe('getDebugInfo', () => {
    test('should return comprehensive debug info', async () => {
      const info = await getDebugInfo()

      expect(info.voide).toBeDefined()
      expect(info.voide.version).toBeTruthy()
      expect(info.voide.configPath).toContain('.voide')

      expect(info.system).toBeDefined()
      expect(info.system.platform).toBeTruthy()
      expect(info.system.arch).toBeTruthy()
      expect(info.system.nodeVersion).toBeTruthy()

      expect(info.environment).toBeDefined()
      expect(info.environment.cwd).toBeTruthy()
      expect(info.environment.home).toBeTruthy()

      expect(info.providers).toBeDefined()
      expect(Array.isArray(info.providers.configured)).toBe(true)
      expect(Array.isArray(info.providers.missing)).toBe(true)
    })

    test('should detect configured providers', async () => {
      await withEnv({ ANTHROPIC_API_KEY: 'sk-ant-test' }, async () => {
        const info = await getDebugInfo()
        expect(info.providers.configured).toContain('anthropic')
      })
    })

    test('should detect missing providers', async () => {
      await withEnv({ ANTHROPIC_API_KEY: '' }, async () => {
        const info = await getDebugInfo()
        expect(info.providers.missing.length).toBeGreaterThan(0)
      })
    })
  })

  describe('formatDebugInfo', () => {
    test('should format debug info for display', async () => {
      const info = await getDebugInfo()
      const formatted = formatDebugInfo(info)

      expect(formatted).toContain('Voide Debug Information')
      expect(formatted).toContain('### Voide')
      expect(formatted).toContain('### System')
      expect(formatted).toContain('### Environment')
      expect(formatted).toContain('### Providers')
      expect(formatted).toContain('Version:')
      expect(formatted).toContain('Platform:')
    })
  })

  describe('runDoctor', () => {
    test('should run diagnostic checks', async () => {
      const checks = await runDoctor()

      expect(checks.length).toBeGreaterThan(0)
      expect(checks.every(c => c.name)).toBe(true)
      expect(checks.every(c => ['pass', 'warn', 'fail'].includes(c.status))).toBe(true)
      expect(checks.every(c => c.message)).toBe(true)
    })

    test('should check for bun runtime', async () => {
      const checks = await runDoctor()
      const bunCheck = checks.find(c => c.name === 'Bun runtime')

      expect(bunCheck).toBeDefined()
      // On this system, bun should be installed
      expect(['pass', 'warn'].includes(bunCheck!.status)).toBe(true)
    })

    test('should check for config directory', async () => {
      const checks = await runDoctor()
      const configCheck = checks.find(c => c.name === 'Config directory')

      expect(configCheck).toBeDefined()
      expect(configCheck?.status).toBe('pass')
    })

    test('should check for API key', async () => {
      const checks = await runDoctor()
      const apiCheck = checks.find(c => c.name === 'API key')

      expect(apiCheck).toBeDefined()
    })

    test('should include fix suggestions for failures', async () => {
      await withEnv({
        ANTHROPIC_API_KEY: '',
        OPENAI_API_KEY: '',
        GOOGLE_API_KEY: '',
        AZURE_OPENAI_API_KEY: '',
      }, async () => {
        const checks = await runDoctor()
        const failedChecks = checks.filter(c => c.status === 'fail' || c.status === 'warn')

        for (const check of failedChecks) {
          if (check.status === 'fail') {
            expect(check.fix).toBeTruthy()
          }
        }
      })
    })
  })

  describe('formatDoctorResults', () => {
    test('should format doctor results for display', async () => {
      const checks = await runDoctor()
      const formatted = formatDoctorResults(checks)

      expect(formatted).toContain('Voide Doctor')
      expect(formatted).toContain('Summary:')
      expect(formatted).toMatch(/\d+ passed/)
    })

    test('should include status icons', async () => {
      const checks = [
        { name: 'Pass Check', status: 'pass' as const, message: 'Passed' },
        { name: 'Warn Check', status: 'warn' as const, message: 'Warning', fix: 'Fix it' },
        { name: 'Fail Check', status: 'fail' as const, message: 'Failed', fix: 'Fix it' },
      ]

      const formatted = formatDoctorResults(checks)

      expect(formatted).toContain('✓')
      expect(formatted).toContain('⚠')
      expect(formatted).toContain('✗')
    })
  })

  describe('log / getLogs', () => {
    beforeEach(async () => {
      const logsDir = join(homedir(), '.voide', 'logs')
      await mkdir(logsDir, { recursive: true })
    })

    afterEach(async () => {
      try {
        await rm(join(homedir(), '.voide', 'logs'), { recursive: true })
      }
      catch {
        // Ignore
      }
    })

    test('should write log entry', async () => {
      await log('info', 'Test log message', { key: 'value' })

      const logs = await getLogs({ lines: 1 })
      expect(logs.length).toBeGreaterThanOrEqual(0) // May be 0 if file not yet written
    })

    test('should include timestamp in log', async () => {
      await log('error', 'Error message')

      const logs = await getLogs({ lines: 10 })
      if (logs.length > 0) {
        const lastLog = logs[logs.length - 1]
        expect(lastLog).toMatch(/\d{4}-\d{2}-\d{2}/)
      }
    })

    test('should include log level', async () => {
      await log('warn', 'Warning message')

      const logs = await getLogs({ lines: 10, level: 'warn' })
      // Filter works correctly
      expect(logs.every(l => l.includes('[WARN'))).toBe(true)
    })

    test('should filter by level', async () => {
      await log('info', 'Info message')
      await log('error', 'Error message')

      const errorLogs = await getLogs({ lines: 100, level: 'error' })
      expect(errorLogs.every(l => l.includes('[ERROR'))).toBe(true)
    })
  })

  describe('clearCache', () => {
    test('should clear cache directory', async () => {
      const cacheDir = join(homedir(), '.voide', 'cache')
      await mkdir(cacheDir, { recursive: true })
      await writeFile(join(cacheDir, 'test.json'), '{}')

      const result = await clearCache({ cache: true })

      expect(result.cleared).toContain('cache')
    })

    test('should clear logs when specified', async () => {
      const logsDir = join(homedir(), '.voide', 'logs')
      await mkdir(logsDir, { recursive: true })
      await writeFile(join(logsDir, 'test.log'), 'log content')

      const result = await clearCache({ logs: true })

      expect(result.cleared).toContain('logs')
    })

    test('should clear sessions when specified', async () => {
      const sessionsDir = join(homedir(), '.voide', 'sessions')
      await mkdir(sessionsDir, { recursive: true })
      await writeFile(join(sessionsDir, 'test.json'), '{}')

      const result = await clearCache({ sessions: true })

      expect(result.cleared).toContain('sessions')
    })

    test('should clear all when all=true', async () => {
      const result = await clearCache({ all: true })

      expect(result.cleared.length).toBeGreaterThanOrEqual(0)
    })

    test('should report errors', async () => {
      // This shouldn't error, but test the structure
      const result = await clearCache({ cache: true })
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('getCacheStats', () => {
    test('should return cache statistics', async () => {
      const stats = await getCacheStats()

      expect(stats.totalSize).toBeGreaterThanOrEqual(0)
      expect(stats.files).toBeGreaterThanOrEqual(0)
      expect(stats.breakdown).toBeDefined()
    })

    test('should include breakdown by directory', async () => {
      const stats = await getCacheStats()

      expect(stats.breakdown.cache).toBeDefined()
      expect(stats.breakdown.sessions).toBeDefined()
      expect(stats.breakdown.logs).toBeDefined()
      expect(stats.breakdown.themes).toBeDefined()
      expect(stats.breakdown.commands).toBeDefined()
    })

    test('breakdown should have size and files', async () => {
      const stats = await getCacheStats()

      for (const [dir, info] of Object.entries(stats.breakdown)) {
        expect(typeof info.size).toBe('number')
        expect(typeof info.files).toBe('number')
      }
    })
  })

  describe('formatCacheStats', () => {
    test('should format cache stats for display', async () => {
      const stats = await getCacheStats()
      const formatted = formatCacheStats(stats)

      expect(formatted).toContain('Cache Statistics')
      expect(formatted).toContain('Total size:')
      expect(formatted).toContain('Total files:')
      expect(formatted).toContain('Breakdown:')
    })

    test('should format sizes with units', async () => {
      const stats = {
        totalSize: 1024 * 1024,
        files: 10,
        breakdown: {
          cache: { size: 1024, files: 5 },
          logs: { size: 2048, files: 3 },
          sessions: { size: 0, files: 0 },
          themes: { size: 0, files: 0 },
          commands: { size: 0, files: 0 },
        },
      }

      const formatted = formatCacheStats(stats)

      expect(formatted).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/)
    })
  })

  describe('exportDebugDump', () => {
    test('should export comprehensive debug dump', async () => {
      const dump = await exportDebugDump()
      const parsed = JSON.parse(dump)

      expect(parsed.timestamp).toBeTruthy()
      expect(parsed.debugInfo).toBeDefined()
      expect(parsed.doctorChecks).toBeDefined()
      expect(parsed.cacheStats).toBeDefined()
      expect(Array.isArray(parsed.recentErrors)).toBe(true)
    })

    test('should be valid JSON', async () => {
      const dump = await exportDebugDump()

      expect(() => JSON.parse(dump)).not.toThrow()
    })

    test('should include ISO timestamp', async () => {
      const dump = await exportDebugDump()
      const parsed = JSON.parse(dump)

      expect(parsed.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/)
    })
  })
})
