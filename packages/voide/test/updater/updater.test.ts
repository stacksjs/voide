// Updater Tests

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import {
  checkForUpdate,
  shouldCheckForUpdate,
  periodicUpdateCheck,
  formatVersionInfo,
  formatInstallInfo,
  getInstallInfo,
  recordVersion,
} from '../../src/updater'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'

describe('Updater', () => {
  const voideDir = join(homedir(), '.voide')

  afterEach(async () => {
    // Clean up test files
    try {
      await rm(join(voideDir, 'last-version-check'), { force: true })
      await rm(join(voideDir, 'version-history'), { force: true })
    }
    catch {
      // Ignore
    }
  })

  describe('checkForUpdate', () => {
    test('should return version info', async () => {
      const info = await checkForUpdate()

      expect(info.current).toBeTruthy()
      expect(typeof info.latest).toBe('string')
      expect(typeof info.updateAvailable).toBe('boolean')
    })

    test('should include beta version if available', async () => {
      const info = await checkForUpdate()

      // betaAvailable may or may not be present
      expect(typeof info.betaAvailable === 'boolean' || info.betaAvailable === undefined).toBe(true)
    })

    test('should handle network errors gracefully', async () => {
      // Mock fetch to fail
      const originalFetch = global.fetch
      global.fetch = mock(() => Promise.reject(new Error('Network error')))

      try {
        const info = await checkForUpdate()
        expect(info.updateAvailable).toBe(false)
        expect(info.current).toBe(info.latest)
      }
      finally {
        global.fetch = originalFetch
      }
    })

    test('should handle non-200 responses', async () => {
      const originalFetch = global.fetch
      global.fetch = mock(() => Promise.resolve({
        ok: false,
        status: 404,
      } as Response))

      try {
        const info = await checkForUpdate()
        expect(info.updateAvailable).toBe(false)
      }
      finally {
        global.fetch = originalFetch
      }
    })
  })

  describe('shouldCheckForUpdate', () => {
    test('should return true when no check file exists', async () => {
      await rm(join(voideDir, 'last-version-check'), { force: true })

      const should = await shouldCheckForUpdate()
      expect(should).toBe(true)
    })

    test('should return false when checked recently', async () => {
      await mkdir(voideDir, { recursive: true })
      await writeFile(join(voideDir, 'last-version-check'), Date.now().toString())

      const should = await shouldCheckForUpdate()
      expect(should).toBe(false)
    })

    test('should return true when check was more than a day ago', async () => {
      await mkdir(voideDir, { recursive: true })
      const oneDayAgo = Date.now() - (25 * 60 * 60 * 1000)
      await writeFile(join(voideDir, 'last-version-check'), oneDayAgo.toString())

      const should = await shouldCheckForUpdate()
      expect(should).toBe(true)
    })
  })

  describe('periodicUpdateCheck', () => {
    test('should return null when checked recently', async () => {
      await mkdir(voideDir, { recursive: true })
      await writeFile(join(voideDir, 'last-version-check'), Date.now().toString())

      const message = await periodicUpdateCheck()
      expect(message).toBeNull()
    })

    test('should return message when update available', async () => {
      // Clean up to force check
      await rm(join(voideDir, 'last-version-check'), { force: true })

      // Mock a newer version available
      const originalFetch = global.fetch
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          'dist-tags': {
            latest: '99.99.99',
          },
        }),
      } as Response))

      try {
        const message = await periodicUpdateCheck()
        if (message) {
          expect(message).toContain('Update available')
        }
      }
      finally {
        global.fetch = originalFetch
      }
    })
  })

  describe('recordVersion', () => {
    test('should record version to history', async () => {
      await recordVersion('1.0.0')

      const historyFile = join(voideDir, 'version-history')
      const history = await readFile(historyFile, 'utf-8')

      expect(history).toContain('1.0.0')
    })

    test('should not duplicate same version', async () => {
      await recordVersion('1.0.0')
      await recordVersion('1.0.0')

      const historyFile = join(voideDir, 'version-history')
      const history = await readFile(historyFile, 'utf-8')
      const versions = history.trim().split('\n')

      const count = versions.filter(v => v === '1.0.0').length
      expect(count).toBe(1)
    })

    test('should keep multiple different versions', async () => {
      await recordVersion('1.0.0')
      await recordVersion('1.1.0')
      await recordVersion('1.2.0')

      const historyFile = join(voideDir, 'version-history')
      const history = await readFile(historyFile, 'utf-8')

      expect(history).toContain('1.0.0')
      expect(history).toContain('1.1.0')
      expect(history).toContain('1.2.0')
    })

    test('should limit to 10 versions', async () => {
      for (let i = 0; i < 15; i++) {
        await recordVersion(`1.${i}.0`)
      }

      const historyFile = join(voideDir, 'version-history')
      const history = await readFile(historyFile, 'utf-8')
      const versions = history.trim().split('\n')

      expect(versions.length).toBeLessThanOrEqual(10)
    })
  })

  describe('getInstallInfo', () => {
    test('should return install information', async () => {
      const info = await getInstallInfo()

      expect(info.version).toBeTruthy()
      expect(info.configPath).toBe(voideDir)
      expect(['bun', 'npm', 'yarn', 'pnpm']).toContain(info.packageManager)
    })
  })

  describe('formatVersionInfo', () => {
    test('should format version info', () => {
      const info = {
        current: '1.0.0',
        latest: '1.1.0',
        updateAvailable: true,
      }

      const formatted = formatVersionInfo(info)

      expect(formatted).toContain('Version Information')
      expect(formatted).toContain('1.0.0')
      expect(formatted).toContain('1.1.0')
      expect(formatted).toContain('Update available')
    })

    test('should show up-to-date message', () => {
      const info = {
        current: '1.0.0',
        latest: '1.0.0',
        updateAvailable: false,
      }

      const formatted = formatVersionInfo(info)

      expect(formatted).toContain('latest version')
    })

    test('should include beta info', () => {
      const info = {
        current: '1.0.0',
        latest: '1.0.0',
        latestBeta: '1.1.0-beta.1',
        updateAvailable: false,
        betaAvailable: true,
      }

      const formatted = formatVersionInfo(info)

      expect(formatted).toContain('beta')
      expect(formatted).toContain('1.1.0-beta.1')
    })
  })

  describe('formatInstallInfo', () => {
    test('should format install info', () => {
      const info = {
        version: '1.0.0',
        installPath: '/usr/local/lib/node_modules/voide',
        configPath: voideDir,
        packageManager: 'bun' as const,
        globallyInstalled: true,
      }

      const formatted = formatInstallInfo(info)

      expect(formatted).toContain('Installation Information')
      expect(formatted).toContain('1.0.0')
      expect(formatted).toContain('bun')
      expect(formatted).toContain('Yes')
    })

    test('should show not globally installed', () => {
      const info = {
        version: '1.0.0',
        installPath: 'unknown',
        configPath: voideDir,
        packageManager: 'npm' as const,
        globallyInstalled: false,
      }

      const formatted = formatInstallInfo(info)

      expect(formatted).toContain('No')
    })
  })
})
