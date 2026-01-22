// Authentication System for Voide CLI
// Manages API keys and credentials for various providers

import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir, readFile, writeFile, unlink, chmod } from 'node:fs/promises'

const VOIDE_DIR = join(homedir(), '.voide')
const CREDENTIALS_FILE = join(VOIDE_DIR, 'credentials.json')
const ENV_FILE = join(VOIDE_DIR, '.env')

export interface Credentials {
  // Anthropic
  ANTHROPIC_API_KEY?: string

  // OpenAI
  OPENAI_API_KEY?: string
  OPENAI_ORG_ID?: string

  // Google
  GOOGLE_API_KEY?: string
  GEMINI_API_KEY?: string
  GOOGLE_PROJECT_ID?: string
  GOOGLE_LOCATION?: string

  // Azure
  AZURE_OPENAI_API_KEY?: string
  AZURE_OPENAI_ENDPOINT?: string
  AZURE_OPENAI_DEPLOYMENT?: string

  // AWS Bedrock
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_SESSION_TOKEN?: string
  AWS_REGION?: string

  // Mistral
  MISTRAL_API_KEY?: string

  // Groq
  GROQ_API_KEY?: string

  // Together
  TOGETHER_API_KEY?: string

  // OpenRouter
  OPENROUTER_API_KEY?: string

  // Perplexity
  PERPLEXITY_API_KEY?: string

  // XAI
  XAI_API_KEY?: string

  // GitHub
  GITHUB_TOKEN?: string

  // Custom provider keys
  [key: string]: string | undefined
}

export interface ProviderAuth {
  name: string
  envKey: string
  description: string
  required: boolean
  mask?: boolean
  validate?: (value: string) => boolean
}

// Known provider authentication requirements
export const PROVIDER_AUTH: Record<string, ProviderAuth[]> = {
  anthropic: [
    {
      name: 'API Key',
      envKey: 'ANTHROPIC_API_KEY',
      description: 'Anthropic API key (starts with sk-ant-)',
      required: true,
      mask: true,
      validate: (v) => v.startsWith('sk-ant-'),
    },
  ],
  openai: [
    {
      name: 'API Key',
      envKey: 'OPENAI_API_KEY',
      description: 'OpenAI API key (starts with sk-)',
      required: true,
      mask: true,
      validate: (v) => v.startsWith('sk-'),
    },
    {
      name: 'Organization ID',
      envKey: 'OPENAI_ORG_ID',
      description: 'OpenAI organization ID (optional)',
      required: false,
    },
  ],
  google: [
    {
      name: 'API Key',
      envKey: 'GOOGLE_API_KEY',
      description: 'Google AI API key',
      required: true,
      mask: true,
    },
  ],
  azure: [
    {
      name: 'API Key',
      envKey: 'AZURE_OPENAI_API_KEY',
      description: 'Azure OpenAI API key',
      required: true,
      mask: true,
    },
    {
      name: 'Endpoint',
      envKey: 'AZURE_OPENAI_ENDPOINT',
      description: 'Azure OpenAI endpoint URL',
      required: true,
    },
    {
      name: 'Deployment',
      envKey: 'AZURE_OPENAI_DEPLOYMENT',
      description: 'Azure OpenAI deployment name',
      required: true,
    },
  ],
  bedrock: [
    {
      name: 'Access Key ID',
      envKey: 'AWS_ACCESS_KEY_ID',
      description: 'AWS access key ID',
      required: true,
      mask: true,
    },
    {
      name: 'Secret Access Key',
      envKey: 'AWS_SECRET_ACCESS_KEY',
      description: 'AWS secret access key',
      required: true,
      mask: true,
    },
    {
      name: 'Region',
      envKey: 'AWS_REGION',
      description: 'AWS region (e.g., us-east-1)',
      required: true,
    },
  ],
  mistral: [
    {
      name: 'API Key',
      envKey: 'MISTRAL_API_KEY',
      description: 'Mistral API key',
      required: true,
      mask: true,
    },
  ],
  groq: [
    {
      name: 'API Key',
      envKey: 'GROQ_API_KEY',
      description: 'Groq API key (starts with gsk_)',
      required: true,
      mask: true,
      validate: (v) => v.startsWith('gsk_'),
    },
  ],
  together: [
    {
      name: 'API Key',
      envKey: 'TOGETHER_API_KEY',
      description: 'Together AI API key',
      required: true,
      mask: true,
    },
  ],
  openrouter: [
    {
      name: 'API Key',
      envKey: 'OPENROUTER_API_KEY',
      description: 'OpenRouter API key (starts with sk-or-)',
      required: true,
      mask: true,
      validate: (v) => v.startsWith('sk-or-'),
    },
  ],
  perplexity: [
    {
      name: 'API Key',
      envKey: 'PERPLEXITY_API_KEY',
      description: 'Perplexity API key (starts with pplx-)',
      required: true,
      mask: true,
      validate: (v) => v.startsWith('pplx-'),
    },
  ],
  xai: [
    {
      name: 'API Key',
      envKey: 'XAI_API_KEY',
      description: 'xAI API key',
      required: true,
      mask: true,
    },
  ],
  github: [
    {
      name: 'Token',
      envKey: 'GITHUB_TOKEN',
      description: 'GitHub personal access token',
      required: true,
      mask: true,
      validate: (v) => v.startsWith('ghp_') || v.startsWith('gho_') || v.startsWith('github_pat_'),
    },
  ],
}

// Auth manager class
export class AuthManager {
  private credentials: Credentials = {}
  private initialized = false

  // Ensure directory exists
  private async ensureDir(): Promise<void> {
    await mkdir(VOIDE_DIR, { recursive: true })
  }

  // Load credentials from file
  async load(): Promise<void> {
    await this.ensureDir()

    try {
      const data = await readFile(CREDENTIALS_FILE, 'utf-8')
      this.credentials = JSON.parse(data)
    }
    catch {
      this.credentials = {}
    }

    this.initialized = true
  }

  // Save credentials to file (with restricted permissions)
  async save(): Promise<void> {
    await this.ensureDir()
    await writeFile(CREDENTIALS_FILE, JSON.stringify(this.credentials, null, 2), 'utf-8')

    // Set file permissions to user-only (0600)
    try {
      await chmod(CREDENTIALS_FILE, 0o600)
    }
    catch {
      // Ignore chmod errors on Windows
    }
  }

  // Get a credential
  get(key: string): string | undefined {
    // First check environment
    const envValue = process.env[key]
    if (envValue) return envValue

    // Then check stored credentials
    return this.credentials[key]
  }

  // Set a credential
  async set(key: string, value: string): Promise<void> {
    if (!this.initialized) await this.load()
    this.credentials[key] = value
    await this.save()
  }

  // Remove a credential
  async remove(key: string): Promise<void> {
    if (!this.initialized) await this.load()
    delete this.credentials[key]
    await this.save()
  }

  // Check if a provider is authenticated
  async isAuthenticated(provider: string): Promise<boolean> {
    if (!this.initialized) await this.load()

    const authReqs = PROVIDER_AUTH[provider.toLowerCase()]
    if (!authReqs) return false

    for (const req of authReqs) {
      if (req.required && !this.get(req.envKey)) {
        return false
      }
    }

    return true
  }

  // Get authentication status for all providers
  async getStatus(): Promise<Record<string, { authenticated: boolean; missing: string[] }>> {
    if (!this.initialized) await this.load()

    const status: Record<string, { authenticated: boolean; missing: string[] }> = {}

    for (const [provider, reqs] of Object.entries(PROVIDER_AUTH)) {
      const missing: string[] = []

      for (const req of reqs) {
        if (req.required && !this.get(req.envKey)) {
          missing.push(req.envKey)
        }
      }

      status[provider] = {
        authenticated: missing.length === 0,
        missing,
      }
    }

    return status
  }

  // Login to a provider (set all required credentials)
  async login(provider: string, values: Record<string, string>): Promise<{ success: boolean; errors: string[] }> {
    if (!this.initialized) await this.load()

    const authReqs = PROVIDER_AUTH[provider.toLowerCase()]
    if (!authReqs) {
      return { success: false, errors: [`Unknown provider: ${provider}`] }
    }

    const errors: string[] = []

    for (const req of authReqs) {
      const value = values[req.envKey]

      if (req.required && !value) {
        errors.push(`Missing required: ${req.envKey}`)
        continue
      }

      if (value) {
        // Validate if validator provided
        if (req.validate && !req.validate(value)) {
          errors.push(`Invalid format for ${req.envKey}: ${req.description}`)
          continue
        }

        this.credentials[req.envKey] = value
      }
    }

    if (errors.length === 0) {
      await this.save()
      return { success: true, errors: [] }
    }

    return { success: false, errors }
  }

  // Logout from a provider (remove all credentials)
  async logout(provider: string): Promise<void> {
    if (!this.initialized) await this.load()

    const authReqs = PROVIDER_AUTH[provider.toLowerCase()]
    if (!authReqs) return

    for (const req of authReqs) {
      delete this.credentials[req.envKey]
    }

    await this.save()
  }

  // Export credentials to .env format
  async exportToEnv(path?: string): Promise<string> {
    if (!this.initialized) await this.load()

    const lines: string[] = ['# Voide CLI Credentials', `# Generated: ${new Date().toISOString()}`, '']

    for (const [key, value] of Object.entries(this.credentials)) {
      if (value) {
        lines.push(`${key}="${value}"`)
      }
    }

    const content = lines.join('\n')

    if (path) {
      await writeFile(path, content, 'utf-8')
      try {
        await chmod(path, 0o600)
      }
      catch {
        // Ignore chmod errors
      }
    }

    return content
  }

  // Import credentials from .env file
  async importFromEnv(path: string): Promise<{ imported: string[]; errors: string[] }> {
    if (!this.initialized) await this.load()

    const imported: string[] = []
    const errors: string[] = []

    try {
      const content = await readFile(path, 'utf-8')
      const lines = content.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue

        // Parse KEY=VALUE or KEY="VALUE"
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=["']?(.*)["']?$/)
        if (match) {
          const [, key, value] = match
          this.credentials[key] = value.replace(/^["']|["']$/g, '')
          imported.push(key)
        }
        else {
          errors.push(`Invalid line: ${trimmed.slice(0, 30)}...`)
        }
      }

      await this.save()
    }
    catch (error) {
      errors.push(`Failed to read file: ${(error as Error).message}`)
    }

    return { imported, errors }
  }

  // Mask a credential value for display
  maskValue(value: string): string {
    if (value.length <= 8) return '****'
    return value.slice(0, 4) + '****' + value.slice(-4)
  }

  // Get all credentials (masked for display)
  async getMasked(): Promise<Record<string, string>> {
    if (!this.initialized) await this.load()

    const masked: Record<string, string> = {}

    for (const [key, value] of Object.entries(this.credentials)) {
      if (value) {
        // Check if this should be masked
        let shouldMask = true
        for (const providerReqs of Object.values(PROVIDER_AUTH)) {
          for (const req of providerReqs) {
            if (req.envKey === key && !req.mask) {
              shouldMask = false
              break
            }
          }
        }

        masked[key] = shouldMask ? this.maskValue(value) : value
      }
    }

    return masked
  }

  // Clear all credentials
  async clear(): Promise<void> {
    this.credentials = {}
    try {
      await unlink(CREDENTIALS_FILE)
    }
    catch {
      // Ignore if file doesn't exist
    }
  }
}

// Singleton instance
let authManager: AuthManager | null = null

export function getAuthManager(): AuthManager {
  if (!authManager) {
    authManager = new AuthManager()
  }
  return authManager
}

// Helper to check if API key is set for a provider
export async function hasApiKey(provider: string): Promise<boolean> {
  const auth = getAuthManager()
  return auth.isAuthenticated(provider)
}

// Helper to get API key for a provider
export async function getApiKey(provider: string, keyName?: string): Promise<string | undefined> {
  const auth = getAuthManager()
  await auth.load()

  if (keyName) {
    return auth.get(keyName)
  }

  // Get first required key for provider
  const reqs = PROVIDER_AUTH[provider.toLowerCase()]
  if (reqs && reqs.length > 0) {
    return auth.get(reqs[0].envKey)
  }

  return undefined
}

// Format auth status for display
export function formatAuthStatus(status: Record<string, { authenticated: boolean; missing: string[] }>): string {
  const lines: string[] = ['## Authentication Status', '']

  for (const [provider, info] of Object.entries(status)) {
    const icon = info.authenticated ? '✓' : '✗'
    const color = info.authenticated ? '\x1b[32m' : '\x1b[31m'
    const reset = '\x1b[0m'

    lines.push(`${color}${icon}${reset} ${provider.charAt(0).toUpperCase() + provider.slice(1)}`)

    if (!info.authenticated && info.missing.length > 0) {
      for (const key of info.missing) {
        lines.push(`    Missing: ${key}`)
      }
    }
  }

  return lines.join('\n')
}

// Format provider requirements for display
export function formatProviderRequirements(provider: string): string {
  const reqs = PROVIDER_AUTH[provider.toLowerCase()]
  if (!reqs) return `Unknown provider: ${provider}`

  const lines: string[] = [
    `## ${provider.charAt(0).toUpperCase() + provider.slice(1)} Authentication`,
    '',
  ]

  for (const req of reqs) {
    const required = req.required ? '(required)' : '(optional)'
    lines.push(`${req.name} ${required}`)
    lines.push(`  Environment: ${req.envKey}`)
    lines.push(`  ${req.description}`)
    lines.push('')
  }

  return lines.join('\n')
}
