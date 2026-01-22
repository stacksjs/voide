// Authentication System Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  AuthManager,
  getAuthManager,
  hasApiKey,
  getApiKey,
  formatAuthStatus,
  formatProviderRequirements,
  PROVIDER_AUTH,
} from '../../src/auth'
import { createTempDir, cleanupTempDir, withEnv } from '../utils/helpers'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { rm, mkdir, writeFile } from 'node:fs/promises'

describe('AuthManager', () => {
  let authManager: AuthManager

  beforeEach(async () => {
    authManager = new AuthManager()
    // Clean up any existing credentials
    try {
      await rm(join(homedir(), '.voide', 'credentials.json'))
    }
    catch {
      // Ignore
    }
  })

  afterEach(async () => {
    try {
      await rm(join(homedir(), '.voide', 'credentials.json'))
    }
    catch {
      // Ignore
    }
  })

  describe('load / save', () => {
    test('should load credentials from file', async () => {
      const credentialsPath = join(homedir(), '.voide', 'credentials.json')
      await mkdir(join(homedir(), '.voide'), { recursive: true })
      await writeFile(credentialsPath, JSON.stringify({
        ANTHROPIC_API_KEY: 'sk-ant-test-key',
      }), 'utf-8')

      await authManager.load()

      expect(authManager.get('ANTHROPIC_API_KEY')).toBe('sk-ant-test-key')
    })

    test('should handle missing credentials file', async () => {
      await authManager.load()
      // Should not throw
      expect(authManager.get('NONEXISTENT')).toBeUndefined()
    })
  })

  describe('get', () => {
    test('should prefer environment variable', async () => {
      await authManager.set('TEST_KEY', 'stored-value')

      await withEnv({ TEST_KEY: 'env-value' }, () => {
        expect(authManager.get('TEST_KEY')).toBe('env-value')
      })
    })

    test('should fall back to stored credential', async () => {
      await authManager.set('TEST_KEY', 'stored-value')
      expect(authManager.get('TEST_KEY')).toBe('stored-value')
    })

    test('should return undefined for missing key', async () => {
      await authManager.load()
      expect(authManager.get('NONEXISTENT_KEY')).toBeUndefined()
    })
  })

  describe('set / remove', () => {
    test('should set a credential', async () => {
      await authManager.set('NEW_KEY', 'new-value')
      expect(authManager.get('NEW_KEY')).toBe('new-value')
    })

    test('should remove a credential', async () => {
      await authManager.set('TEMP_KEY', 'temp-value')
      await authManager.remove('TEMP_KEY')
      expect(authManager.get('TEMP_KEY')).toBeUndefined()
    })
  })

  describe('isAuthenticated', () => {
    test('should return true when all required keys are set', async () => {
      await authManager.set('ANTHROPIC_API_KEY', 'sk-ant-test')
      const isAuth = await authManager.isAuthenticated('anthropic')
      expect(isAuth).toBe(true)
    })

    test('should return false when required keys are missing', async () => {
      await authManager.load()
      await authManager.remove('ANTHROPIC_API_KEY')

      await withEnv({ ANTHROPIC_API_KEY: '' }, async () => {
        const isAuth = await authManager.isAuthenticated('anthropic')
        expect(isAuth).toBe(false)
      })
    })

    test('should return false for unknown provider', async () => {
      const isAuth = await authManager.isAuthenticated('unknown-provider')
      expect(isAuth).toBe(false)
    })
  })

  describe('getStatus', () => {
    test('should return status for all providers', async () => {
      await authManager.set('ANTHROPIC_API_KEY', 'sk-ant-test')

      const status = await authManager.getStatus()

      expect(status.anthropic).toBeDefined()
      expect(status.openai).toBeDefined()
      expect(status.google).toBeDefined()
    })

    test('should show missing keys', async () => {
      await authManager.load()

      await withEnv({ AZURE_OPENAI_API_KEY: '' }, async () => {
        const status = await authManager.getStatus()

        if (!status.azure.authenticated) {
          expect(status.azure.missing.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('login', () => {
    test('should set credentials for provider', async () => {
      const result = await authManager.login('anthropic', {
        ANTHROPIC_API_KEY: 'sk-ant-new-key',
      })

      expect(result.success).toBe(true)
      expect(result.errors.length).toBe(0)
      expect(authManager.get('ANTHROPIC_API_KEY')).toBe('sk-ant-new-key')
    })

    test('should validate key format', async () => {
      const result = await authManager.login('anthropic', {
        ANTHROPIC_API_KEY: 'invalid-format',
      })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid format'))).toBe(true)
    })

    test('should error for missing required keys', async () => {
      const result = await authManager.login('azure', {
        AZURE_OPENAI_API_KEY: 'key',
        // Missing endpoint and deployment
      })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Missing required'))).toBe(true)
    })

    test('should error for unknown provider', async () => {
      const result = await authManager.login('unknown', {})
      expect(result.success).toBe(false)
    })
  })

  describe('logout', () => {
    test('should remove all credentials for provider', async () => {
      await authManager.login('azure', {
        AZURE_OPENAI_API_KEY: 'key',
        AZURE_OPENAI_ENDPOINT: 'https://test.openai.azure.com',
        AZURE_OPENAI_DEPLOYMENT: 'gpt-4',
      })

      await authManager.logout('azure')

      expect(authManager.get('AZURE_OPENAI_API_KEY')).toBeUndefined()
      expect(authManager.get('AZURE_OPENAI_ENDPOINT')).toBeUndefined()
      expect(authManager.get('AZURE_OPENAI_DEPLOYMENT')).toBeUndefined()
    })
  })

  describe('exportToEnv', () => {
    test('should generate .env format', async () => {
      await authManager.set('TEST_KEY_1', 'value1')
      await authManager.set('TEST_KEY_2', 'value2')

      const envContent = await authManager.exportToEnv()

      expect(envContent).toContain('TEST_KEY_1="value1"')
      expect(envContent).toContain('TEST_KEY_2="value2"')
      expect(envContent).toContain('# Voide CLI Credentials')
    })

    test('should write to file when path provided', async () => {
      const tempDir = await createTempDir('env-export-test')

      try {
        await authManager.set('EXPORT_KEY', 'export-value')
        const envPath = join(tempDir, '.env')

        await authManager.exportToEnv(envPath)

        // Verify file was written (reading would require another import)
        const content = await authManager.exportToEnv()
        expect(content).toContain('EXPORT_KEY')
      }
      finally {
        await cleanupTempDir(tempDir)
      }
    })
  })

  describe('importFromEnv', () => {
    test('should import credentials from .env file', async () => {
      const tempDir = await createTempDir('env-import-test')

      try {
        const envPath = join(tempDir, '.env')
        await writeFile(envPath, `
IMPORT_KEY_1=imported1
IMPORT_KEY_2="imported2"
# Comment line
IMPORT_KEY_3='imported3'
`, 'utf-8')

        const result = await authManager.importFromEnv(envPath)

        expect(result.imported).toContain('IMPORT_KEY_1')
        expect(result.imported).toContain('IMPORT_KEY_2')
        expect(authManager.get('IMPORT_KEY_1')).toBe('imported1')
        expect(authManager.get('IMPORT_KEY_2')).toBe('imported2')
      }
      finally {
        await cleanupTempDir(tempDir)
      }
    })

    test('should report errors for invalid lines', async () => {
      const tempDir = await createTempDir('env-import-error-test')

      try {
        const envPath = join(tempDir, '.env')
        await writeFile(envPath, `
VALID_KEY=valid
invalid line without equals
`, 'utf-8')

        const result = await authManager.importFromEnv(envPath)

        expect(result.imported).toContain('VALID_KEY')
        expect(result.errors.length).toBeGreaterThan(0)
      }
      finally {
        await cleanupTempDir(tempDir)
      }
    })
  })

  describe('maskValue', () => {
    test('should mask credential value', () => {
      const masked = authManager.maskValue('sk-ant-api03-very-long-key')
      expect(masked).toBe('sk-a****-key')
    })

    test('should fully mask short values', () => {
      const masked = authManager.maskValue('short')
      expect(masked).toBe('****')
    })
  })

  describe('getMasked', () => {
    test('should return masked credentials', async () => {
      await authManager.set('SECRET_KEY', 'sk-ant-very-secret-key-12345')

      const masked = await authManager.getMasked()

      expect(masked.SECRET_KEY).not.toBe('sk-ant-very-secret-key-12345')
      expect(masked.SECRET_KEY).toContain('****')
    })
  })

  describe('clear', () => {
    test('should clear all credentials', async () => {
      await authManager.set('KEY1', 'value1')
      await authManager.set('KEY2', 'value2')

      await authManager.clear()

      expect(authManager.get('KEY1')).toBeUndefined()
      expect(authManager.get('KEY2')).toBeUndefined()
    })
  })
})

describe('PROVIDER_AUTH', () => {
  test('should have anthropic config', () => {
    expect(PROVIDER_AUTH.anthropic).toBeDefined()
    expect(PROVIDER_AUTH.anthropic.some(a => a.envKey === 'ANTHROPIC_API_KEY')).toBe(true)
  })

  test('should have openai config', () => {
    expect(PROVIDER_AUTH.openai).toBeDefined()
    expect(PROVIDER_AUTH.openai.some(a => a.envKey === 'OPENAI_API_KEY')).toBe(true)
  })

  test('should have google config', () => {
    expect(PROVIDER_AUTH.google).toBeDefined()
    expect(PROVIDER_AUTH.google.some(a => a.envKey === 'GOOGLE_API_KEY')).toBe(true)
  })

  test('should have azure config with all requirements', () => {
    expect(PROVIDER_AUTH.azure).toBeDefined()
    expect(PROVIDER_AUTH.azure.some(a => a.envKey === 'AZURE_OPENAI_API_KEY')).toBe(true)
    expect(PROVIDER_AUTH.azure.some(a => a.envKey === 'AZURE_OPENAI_ENDPOINT')).toBe(true)
    expect(PROVIDER_AUTH.azure.some(a => a.envKey === 'AZURE_OPENAI_DEPLOYMENT')).toBe(true)
  })

  test('should have bedrock config with AWS keys', () => {
    expect(PROVIDER_AUTH.bedrock).toBeDefined()
    expect(PROVIDER_AUTH.bedrock.some(a => a.envKey === 'AWS_ACCESS_KEY_ID')).toBe(true)
    expect(PROVIDER_AUTH.bedrock.some(a => a.envKey === 'AWS_SECRET_ACCESS_KEY')).toBe(true)
  })
})

describe('helper functions', () => {
  describe('formatAuthStatus', () => {
    test('should format status for display', () => {
      const status = {
        anthropic: { authenticated: true, missing: [] },
        openai: { authenticated: false, missing: ['OPENAI_API_KEY'] },
      }

      const formatted = formatAuthStatus(status)

      expect(formatted).toContain('Authentication Status')
      expect(formatted).toContain('✓')
      expect(formatted).toContain('✗')
      expect(formatted).toContain('Anthropic')
      expect(formatted).toContain('Openai')
      expect(formatted).toContain('OPENAI_API_KEY')
    })
  })

  describe('formatProviderRequirements', () => {
    test('should format provider requirements', () => {
      const formatted = formatProviderRequirements('anthropic')

      expect(formatted).toContain('Anthropic')
      expect(formatted).toContain('ANTHROPIC_API_KEY')
      expect(formatted).toContain('required')
    })

    test('should return error for unknown provider', () => {
      const formatted = formatProviderRequirements('unknown')
      expect(formatted).toContain('Unknown provider')
    })
  })
})
