// Provider exports for Voide CLI

export * from './types'
export * from './anthropic'

import type { Provider, ProviderConfig } from './types'
import { AnthropicProvider } from './anthropic'

export type ProviderType = 'anthropic' | 'openai'

const providers = new Map<string, Provider>()

export function getProvider(type: ProviderType = 'anthropic', config?: ProviderConfig): Provider {
  const key = `${type}:${JSON.stringify(config || {})}`

  if (!providers.has(key)) {
    switch (type) {
      case 'anthropic':
        providers.set(key, new AnthropicProvider(config))
        break
      case 'openai':
        // OpenAI provider can be added later
        throw new Error('OpenAI provider not yet implemented')
      default:
        throw new Error(`Unknown provider type: ${type}`)
    }
  }

  return providers.get(key)!
}

export function clearProviders(): void {
  providers.clear()
}

// Default provider instance
export const defaultProvider = new AnthropicProvider()
