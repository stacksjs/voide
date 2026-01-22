// OAuth Handling for Voide CLI
// Implements OAuth 2.0 flows for various providers

import { createServer, type Server } from 'node:http'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { URL } from 'node:url'
import { randomBytes, createHash } from 'node:crypto'

const VOIDE_DIR = join(homedir(), '.voide')
const OAUTH_TOKENS_FILE = join(VOIDE_DIR, 'oauth-tokens.json')

export interface OAuthConfig {
  clientId: string
  clientSecret?: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  redirectUri?: string
  usePKCE?: boolean
}

export interface OAuthToken {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  tokenType: string
  scope?: string
}

export interface OAuthState {
  state: string
  codeVerifier?: string
  provider: string
  createdAt: number
}

// Provider configurations
export const OAUTH_PROVIDERS: Record<string, OAuthConfig> = {
  google: {
    clientId: '', // User must provide
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/generative-language',
      'https://www.googleapis.com/auth/cloud-platform',
    ],
    usePKCE: true,
  },

  azure: {
    clientId: '', // User must provide
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'https://cognitiveservices.azure.com/.default',
      'offline_access',
    ],
    usePKCE: true,
  },

  github: {
    clientId: '', // User must provide
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user', 'read:org'],
    usePKCE: false,
  },

  anthropic: {
    clientId: '', // For Anthropic Console OAuth
    authorizationUrl: 'https://console.anthropic.com/oauth/authorize',
    tokenUrl: 'https://console.anthropic.com/oauth/token',
    scopes: ['api:read', 'api:write'],
    usePKCE: true,
  },
}

// Generate random state for OAuth
function generateState(): string {
  return randomBytes(32).toString('base64url')
}

// Generate PKCE code verifier
function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

// Generate PKCE code challenge from verifier
function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

// OAuth Manager class
export class OAuthManager {
  private tokens: Map<string, OAuthToken> = new Map()
  private pendingStates: Map<string, OAuthState> = new Map()
  private server: Server | null = null
  private loaded = false

  // Load saved tokens
  async load(): Promise<void> {
    try {
      const data = await readFile(OAUTH_TOKENS_FILE, 'utf-8')
      const tokens = JSON.parse(data) as Record<string, OAuthToken>

      for (const [provider, token] of Object.entries(tokens)) {
        this.tokens.set(provider, token)
      }
    }
    catch {
      // No saved tokens
    }

    this.loaded = true
  }

  // Save tokens
  private async save(): Promise<void> {
    try {
      await mkdir(VOIDE_DIR, { recursive: true })

      const tokens: Record<string, OAuthToken> = {}
      for (const [provider, token] of this.tokens) {
        tokens[provider] = token
      }

      await writeFile(OAUTH_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8')
    }
    catch {
      // Ignore save errors
    }
  }

  // Get authorization URL for a provider
  getAuthorizationUrl(
    provider: string,
    config?: Partial<OAuthConfig>,
  ): { url: string; state: string; codeVerifier?: string } {
    const providerConfig = { ...OAUTH_PROVIDERS[provider], ...config }

    if (!providerConfig) {
      throw new Error(`Unknown OAuth provider: ${provider}`)
    }

    const state = generateState()
    let codeVerifier: string | undefined
    let codeChallenge: string | undefined

    if (providerConfig.usePKCE) {
      codeVerifier = generateCodeVerifier()
      codeChallenge = generateCodeChallenge(codeVerifier)
    }

    // Store state for verification
    this.pendingStates.set(state, {
      state,
      codeVerifier,
      provider,
      createdAt: Date.now(),
    })

    // Build URL
    const url = new URL(providerConfig.authorizationUrl)
    url.searchParams.set('client_id', providerConfig.clientId)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', providerConfig.redirectUri || 'http://localhost:9876/callback')
    url.searchParams.set('scope', providerConfig.scopes.join(' '))
    url.searchParams.set('state', state)

    if (codeChallenge) {
      url.searchParams.set('code_challenge', codeChallenge)
      url.searchParams.set('code_challenge_method', 'S256')
    }

    return { url: url.toString(), state, codeVerifier }
  }

  // Exchange authorization code for token
  async exchangeCode(
    provider: string,
    code: string,
    state: string,
    config?: Partial<OAuthConfig>,
  ): Promise<OAuthToken> {
    const pendingState = this.pendingStates.get(state)
    if (!pendingState || pendingState.provider !== provider) {
      throw new Error('Invalid state parameter')
    }

    // Remove used state
    this.pendingStates.delete(state)

    // Clean old states (older than 10 minutes)
    const cutoff = Date.now() - 600000
    for (const [s, stateInfo] of this.pendingStates) {
      if (stateInfo.createdAt < cutoff) {
        this.pendingStates.delete(s)
      }
    }

    const providerConfig = { ...OAUTH_PROVIDERS[provider], ...config }

    // Build token request
    const params = new URLSearchParams()
    params.set('grant_type', 'authorization_code')
    params.set('code', code)
    params.set('redirect_uri', providerConfig.redirectUri || 'http://localhost:9876/callback')
    params.set('client_id', providerConfig.clientId)

    if (providerConfig.clientSecret) {
      params.set('client_secret', providerConfig.clientSecret)
    }

    if (pendingState.codeVerifier) {
      params.set('code_verifier', pendingState.codeVerifier)
    }

    // Request token
    const response = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      token_type: string
      scope?: string
    }

    const token: OAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    }

    // Store token
    this.tokens.set(provider, token)
    await this.save()

    return token
  }

  // Refresh access token
  async refreshToken(
    provider: string,
    config?: Partial<OAuthConfig>,
  ): Promise<OAuthToken> {
    const currentToken = this.tokens.get(provider)
    if (!currentToken?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const providerConfig = { ...OAUTH_PROVIDERS[provider], ...config }

    const params = new URLSearchParams()
    params.set('grant_type', 'refresh_token')
    params.set('refresh_token', currentToken.refreshToken)
    params.set('client_id', providerConfig.clientId)

    if (providerConfig.clientSecret) {
      params.set('client_secret', providerConfig.clientSecret)
    }

    const response = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token refresh failed: ${error}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      token_type: string
      scope?: string
    }

    const token: OAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || currentToken.refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    }

    this.tokens.set(provider, token)
    await this.save()

    return token
  }

  // Get valid access token (refresh if needed)
  async getAccessToken(provider: string, config?: Partial<OAuthConfig>): Promise<string | null> {
    if (!this.loaded) await this.load()

    const token = this.tokens.get(provider)
    if (!token) return null

    // Check if expired
    if (token.expiresAt && token.expiresAt < Date.now() + 60000) {
      // Token expires in less than 1 minute, refresh
      if (token.refreshToken) {
        try {
          const newToken = await this.refreshToken(provider, config)
          return newToken.accessToken
        }
        catch {
          return null
        }
      }
      return null
    }

    return token.accessToken
  }

  // Check if provider is authenticated
  async isAuthenticated(provider: string): Promise<boolean> {
    const token = await this.getAccessToken(provider)
    return token !== null
  }

  // Revoke token
  async revokeToken(provider: string): Promise<void> {
    this.tokens.delete(provider)
    await this.save()
  }

  // Start local callback server
  startCallbackServer(port = 9876): Promise<{ code: string; state: string }> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        const url = new URL(req.url || '', `http://localhost:${port}`)

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code')
          const state = url.searchParams.get('state')
          const error = url.searchParams.get('error')

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`
              <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>Authentication Failed</h1>
                  <p>Error: ${error}</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `)
            this.stopCallbackServer()
            reject(new Error(error))
            return
          }

          if (code && state) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(`
              <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>Authentication Successful</h1>
                  <p>You can close this window and return to the CLI.</p>
                  <script>window.close();</script>
                </body>
              </html>
            `)
            this.stopCallbackServer()
            resolve({ code, state })
          }
          else {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end('Missing code or state parameter')
          }
        }
        else {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Not found')
        }
      })

      this.server.listen(port, () => {
        // Server started
      })

      this.server.on('error', (err) => {
        reject(err)
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        this.stopCallbackServer()
        reject(new Error('Authentication timed out'))
      }, 300000)
    })
  }

  // Stop callback server
  stopCallbackServer(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  // Get token info for display
  getTokenInfo(provider: string): {
    authenticated: boolean
    expiresAt?: Date
    scopes?: string[]
  } | null {
    const token = this.tokens.get(provider)
    if (!token) return null

    return {
      authenticated: true,
      expiresAt: token.expiresAt ? new Date(token.expiresAt) : undefined,
      scopes: token.scope?.split(' '),
    }
  }
}

// Singleton instance
let oauthManager: OAuthManager | null = null

export function getOAuthManager(): OAuthManager {
  if (!oauthManager) {
    oauthManager = new OAuthManager()
  }
  return oauthManager
}

// Perform full OAuth flow
export async function performOAuthFlow(
  provider: string,
  config?: Partial<OAuthConfig>,
): Promise<OAuthToken> {
  const manager = getOAuthManager()

  // Start callback server
  const callbackPromise = manager.startCallbackServer()

  // Get authorization URL
  const { url, state, codeVerifier } = manager.getAuthorizationUrl(provider, config)

  // Open browser
  console.log(`\nPlease open this URL in your browser to authenticate:`)
  console.log(`\n${url}\n`)

  // Try to open browser automatically
  const openCommand = process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' : 'xdg-open'

  try {
    const { execSync } = await import('node:child_process')
    execSync(`${openCommand} "${url}"`, { stdio: 'ignore' })
  }
  catch {
    // Manual open required
  }

  // Wait for callback
  const { code } = await callbackPromise

  // Exchange code for token
  return manager.exchangeCode(provider, code, state, config)
}

// Format OAuth status for display
export async function formatOAuthStatus(): Promise<string> {
  const manager = getOAuthManager()
  await manager.load()

  const lines: string[] = ['## OAuth Status', '']

  for (const provider of Object.keys(OAUTH_PROVIDERS)) {
    const info = manager.getTokenInfo(provider)

    if (info?.authenticated) {
      const expires = info.expiresAt
        ? `expires ${info.expiresAt.toLocaleString()}`
        : 'no expiry'
      lines.push(`✓ ${provider}: Authenticated (${expires})`)
      if (info.scopes) {
        lines.push(`  Scopes: ${info.scopes.join(', ')}`)
      }
    }
    else {
      lines.push(`✗ ${provider}: Not authenticated`)
    }
  }

  return lines.join('\n')
}
