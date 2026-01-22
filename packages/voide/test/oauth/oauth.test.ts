// OAuth Tests

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import {
  OAuthManager,
  getOAuthManager,
  formatOAuthStatus,
  OAUTH_PROVIDERS,
} from '../../src/oauth'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { rm, mkdir, writeFile } from 'node:fs/promises'

describe('OAUTH_PROVIDERS', () => {
  test('should have google provider', () => {
    expect(OAUTH_PROVIDERS.google).toBeDefined()
    expect(OAUTH_PROVIDERS.google.authorizationUrl).toContain('google')
    expect(OAUTH_PROVIDERS.google.tokenUrl).toContain('google')
    expect(OAUTH_PROVIDERS.google.scopes.length).toBeGreaterThan(0)
    expect(OAUTH_PROVIDERS.google.usePKCE).toBe(true)
  })

  test('should have azure provider', () => {
    expect(OAUTH_PROVIDERS.azure).toBeDefined()
    expect(OAUTH_PROVIDERS.azure.authorizationUrl).toContain('microsoft')
    expect(OAUTH_PROVIDERS.azure.tokenUrl).toContain('microsoft')
    expect(OAUTH_PROVIDERS.azure.scopes).toContain('offline_access')
  })

  test('should have github provider', () => {
    expect(OAUTH_PROVIDERS.github).toBeDefined()
    expect(OAUTH_PROVIDERS.github.authorizationUrl).toContain('github')
    expect(OAUTH_PROVIDERS.github.tokenUrl).toContain('github')
    expect(OAUTH_PROVIDERS.github.scopes).toContain('repo')
    expect(OAUTH_PROVIDERS.github.usePKCE).toBe(false)
  })

  test('should have anthropic provider', () => {
    expect(OAUTH_PROVIDERS.anthropic).toBeDefined()
    expect(OAUTH_PROVIDERS.anthropic.authorizationUrl).toContain('anthropic')
    expect(OAUTH_PROVIDERS.anthropic.tokenUrl).toContain('anthropic')
  })

  test('all providers should have required fields', () => {
    for (const [name, config] of Object.entries(OAUTH_PROVIDERS)) {
      expect(config.authorizationUrl).toBeTruthy()
      expect(config.tokenUrl).toBeTruthy()
      expect(Array.isArray(config.scopes)).toBe(true)
      expect(typeof config.usePKCE).toBe('boolean')
    }
  })
})

describe('OAuthManager', () => {
  let manager: OAuthManager
  const voideDir = join(homedir(), '.voide')
  const tokensFile = join(voideDir, 'oauth-tokens.json')

  beforeEach(async () => {
    manager = new OAuthManager()
    // Clean up any existing tokens
    try {
      await rm(tokensFile, { force: true })
    }
    catch {
      // Ignore
    }
  })

  afterEach(async () => {
    manager.stopCallbackServer()
    try {
      await rm(tokensFile, { force: true })
    }
    catch {
      // Ignore
    }
  })

  describe('load', () => {
    test('should handle missing tokens file', async () => {
      await manager.load()
      // Should not throw
    })

    test('should load saved tokens', async () => {
      await mkdir(voideDir, { recursive: true })
      await writeFile(tokensFile, JSON.stringify({
        google: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          tokenType: 'Bearer',
        },
      }))

      await manager.load()

      const token = await manager.getAccessToken('google')
      expect(token).toBe('test-access-token')
    })
  })

  describe('getAuthorizationUrl', () => {
    test('should generate authorization URL', () => {
      const result = manager.getAuthorizationUrl('google', {
        clientId: 'test-client-id',
      })

      expect(result.url).toContain('accounts.google.com')
      expect(result.url).toContain('client_id=test-client-id')
      expect(result.url).toContain('response_type=code')
      expect(result.state).toBeTruthy()
    })

    test('should include scopes', () => {
      const result = manager.getAuthorizationUrl('google', {
        clientId: 'test-client-id',
      })

      expect(result.url).toContain('scope=')
    })

    test('should include PKCE code challenge when enabled', () => {
      const result = manager.getAuthorizationUrl('google', {
        clientId: 'test-client-id',
        usePKCE: true,
      })

      expect(result.url).toContain('code_challenge=')
      expect(result.url).toContain('code_challenge_method=S256')
      expect(result.codeVerifier).toBeTruthy()
    })

    test('should not include PKCE when disabled', () => {
      const result = manager.getAuthorizationUrl('github', {
        clientId: 'test-client-id',
      })

      expect(result.url).not.toContain('code_challenge=')
      expect(result.codeVerifier).toBeUndefined()
    })

    test('should include redirect URI', () => {
      const result = manager.getAuthorizationUrl('google', {
        clientId: 'test-client-id',
      })

      expect(result.url).toContain('redirect_uri=')
    })

    test('should use custom redirect URI', () => {
      const result = manager.getAuthorizationUrl('google', {
        clientId: 'test-client-id',
        redirectUri: 'https://custom.redirect/callback',
      })

      expect(result.url).toContain('custom.redirect')
    })

    test('should throw for unknown provider', () => {
      expect(() => {
        manager.getAuthorizationUrl('unknown', {})
      }).toThrow()
    })
  })

  describe('exchangeCode', () => {
    test('should reject invalid state', async () => {
      await expect(
        manager.exchangeCode('google', 'code', 'invalid-state', {
          clientId: 'test',
        }),
      ).rejects.toThrow('Invalid state')
    })

    test('should reject mismatched provider', async () => {
      // Generate state for google
      manager.getAuthorizationUrl('google', { clientId: 'test' })

      // Try to use it for azure
      await expect(
        manager.exchangeCode('azure', 'code', 'some-state', {
          clientId: 'test',
        }),
      ).rejects.toThrow('Invalid state')
    })
  })

  describe('getAccessToken', () => {
    test('should return null for missing token', async () => {
      await manager.load()
      const token = await manager.getAccessToken('nonexistent')
      expect(token).toBeNull()
    })

    test('should return stored token', async () => {
      await mkdir(voideDir, { recursive: true })
      await writeFile(tokensFile, JSON.stringify({
        test: {
          accessToken: 'my-token',
          tokenType: 'Bearer',
          expiresAt: Date.now() + 3600000, // 1 hour from now
        },
      }))

      await manager.load()
      const token = await manager.getAccessToken('test')
      expect(token).toBe('my-token')
    })

    test('should return null for expired token without refresh', async () => {
      await mkdir(voideDir, { recursive: true })
      await writeFile(tokensFile, JSON.stringify({
        test: {
          accessToken: 'expired-token',
          tokenType: 'Bearer',
          expiresAt: Date.now() - 1000, // Expired
        },
      }))

      await manager.load()
      const token = await manager.getAccessToken('test')
      expect(token).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    test('should return false for unauthenticated provider', async () => {
      await manager.load()
      const isAuth = await manager.isAuthenticated('google')
      expect(isAuth).toBe(false)
    })

    test('should return true for authenticated provider', async () => {
      await mkdir(voideDir, { recursive: true })
      await writeFile(tokensFile, JSON.stringify({
        test: {
          accessToken: 'valid-token',
          tokenType: 'Bearer',
          expiresAt: Date.now() + 3600000,
        },
      }))

      await manager.load()
      const isAuth = await manager.isAuthenticated('test')
      expect(isAuth).toBe(true)
    })
  })

  describe('revokeToken', () => {
    test('should remove token', async () => {
      await mkdir(voideDir, { recursive: true })
      await writeFile(tokensFile, JSON.stringify({
        test: {
          accessToken: 'token-to-revoke',
          tokenType: 'Bearer',
        },
      }))

      await manager.load()
      await manager.revokeToken('test')

      const token = await manager.getAccessToken('test')
      expect(token).toBeNull()
    })
  })

  describe('getTokenInfo', () => {
    test('should return null for missing token', () => {
      const info = manager.getTokenInfo('nonexistent')
      expect(info).toBeNull()
    })
  })

  describe('callback server', () => {
    test('should stop without starting', () => {
      // Should not throw
      manager.stopCallbackServer()
    })
  })
})

describe('getOAuthManager', () => {
  test('should return singleton instance', () => {
    const m1 = getOAuthManager()
    const m2 = getOAuthManager()

    expect(m1).toBe(m2)
    expect(m1).toBeInstanceOf(OAuthManager)
  })
})

describe('formatOAuthStatus', () => {
  let manager: OAuthManager
  const voideDir = join(homedir(), '.voide')
  const tokensFile = join(voideDir, 'oauth-tokens.json')

  beforeEach(async () => {
    try {
      await rm(tokensFile, { force: true })
    }
    catch {
      // Ignore
    }
  })

  afterEach(async () => {
    try {
      await rm(tokensFile, { force: true })
    }
    catch {
      // Ignore
    }
  })

  test('should format status for all providers', async () => {
    const formatted = await formatOAuthStatus()

    expect(formatted).toContain('OAuth Status')
    expect(formatted).toContain('google')
    expect(formatted).toContain('azure')
    expect(formatted).toContain('github')
    expect(formatted).toContain('anthropic')
  })

  test('should show not authenticated', async () => {
    const formatted = await formatOAuthStatus()

    expect(formatted).toContain('Not authenticated')
    expect(formatted).toContain('✗')
  })

  test('should show authenticated providers', async () => {
    await mkdir(voideDir, { recursive: true })
    await writeFile(tokensFile, JSON.stringify({
      google: {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
        scope: 'scope1 scope2',
      },
    }))

    const formatted = await formatOAuthStatus()

    expect(formatted).toContain('✓')
    expect(formatted).toContain('google')
    expect(formatted).toContain('Authenticated')
    expect(formatted).toContain('expires')
  })

  test('should show scopes for authenticated providers', async () => {
    await mkdir(voideDir, { recursive: true })
    await writeFile(tokensFile, JSON.stringify({
      google: {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 3600000,
        scope: 'scope1 scope2',
      },
    }))

    const formatted = await formatOAuthStatus()

    expect(formatted).toContain('Scopes')
    expect(formatted).toContain('scope1')
    expect(formatted).toContain('scope2')
  })
})
