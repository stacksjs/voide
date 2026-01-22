// Provider exports for Voide CLI

export * from './types'
export * from './anthropic'
export * from './openai'
export * from './google'
export * from './mistral'
export * from './azure'
export * from './bedrock'
export * from './openai-compatible'

import type { Provider, ProviderConfig } from './types'
import { AnthropicProvider } from './anthropic'
import { OpenAIProvider, type OpenAIConfig } from './openai'
import { GoogleProvider, type GoogleConfig } from './google'
import { MistralProvider, type MistralConfig } from './mistral'
import { AzureOpenAIProvider, type AzureConfig } from './azure'
import { BedrockProvider, type BedrockConfig } from './bedrock'
import {
  OpenAICompatibleProvider,
  GroqProvider,
  TogetherProvider,
  OpenRouterProvider,
  PerplexityProvider,
  DeepInfraProvider,
  CerebrasProvider,
  XAIProvider,
  type OpenAICompatibleConfig,
} from './openai-compatible'

export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'gemini'
  | 'mistral'
  | 'azure'
  | 'bedrock'
  | 'groq'
  | 'together'
  | 'openrouter'
  | 'perplexity'
  | 'deepinfra'
  | 'cerebras'
  | 'xai'
  | 'custom'

const providers = new Map<string, Provider>()

export interface ProviderOptions {
  anthropic?: ProviderConfig
  openai?: OpenAIConfig
  google?: GoogleConfig
  gemini?: GoogleConfig
  mistral?: MistralConfig
  azure?: AzureConfig
  bedrock?: BedrockConfig
  groq?: Partial<OpenAICompatibleConfig>
  together?: Partial<OpenAICompatibleConfig>
  openrouter?: Partial<OpenAICompatibleConfig>
  perplexity?: Partial<OpenAICompatibleConfig>
  deepinfra?: Partial<OpenAICompatibleConfig>
  cerebras?: Partial<OpenAICompatibleConfig>
  xai?: Partial<OpenAICompatibleConfig>
  custom?: OpenAICompatibleConfig
}

export function getProvider(type: ProviderType = 'anthropic', config?: ProviderConfig): Provider {
  const key = `${type}:${JSON.stringify(config || {})}`

  if (!providers.has(key)) {
    const provider = createProvider(type, config)
    providers.set(key, provider)
  }

  return providers.get(key)!
}

export function createProvider(type: ProviderType, config?: ProviderConfig): Provider {
  switch (type) {
    case 'anthropic':
      return new AnthropicProvider(config)

    case 'openai':
      return new OpenAIProvider(config as OpenAIConfig)

    case 'google':
    case 'gemini':
      return new GoogleProvider(config as GoogleConfig)

    case 'mistral':
      return new MistralProvider(config as MistralConfig)

    case 'azure':
      return new AzureOpenAIProvider(config as AzureConfig)

    case 'bedrock':
      return new BedrockProvider(config as BedrockConfig)

    case 'groq':
      return GroqProvider(config as Partial<OpenAICompatibleConfig>)

    case 'together':
      return TogetherProvider(config as Partial<OpenAICompatibleConfig>)

    case 'openrouter':
      return OpenRouterProvider(config as Partial<OpenAICompatibleConfig>)

    case 'perplexity':
      return PerplexityProvider(config as Partial<OpenAICompatibleConfig>)

    case 'deepinfra':
      return DeepInfraProvider(config as Partial<OpenAICompatibleConfig>)

    case 'cerebras':
      return CerebrasProvider(config as Partial<OpenAICompatibleConfig>)

    case 'xai':
      return XAIProvider(config as Partial<OpenAICompatibleConfig>)

    case 'custom':
      if (!config || !(config as OpenAICompatibleConfig).baseUrl) {
        throw new Error('Custom provider requires baseUrl in config')
      }
      return new OpenAICompatibleProvider(config as OpenAICompatibleConfig)

    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}

export function clearProviders(): void {
  providers.clear()
}

/**
 * Get all available provider types
 */
export function getAvailableProviders(): ProviderType[] {
  return [
    'anthropic',
    'openai',
    'google',
    'mistral',
    'azure',
    'bedrock',
    'groq',
    'together',
    'openrouter',
    'perplexity',
    'deepinfra',
    'cerebras',
    'xai',
    'custom',
  ]
}

/**
 * Get provider info
 */
export function getProviderInfo(type: ProviderType): {
  name: string
  envVar: string
  description: string
} {
  const info: Record<ProviderType, { name: string; envVar: string; description: string }> = {
    anthropic: {
      name: 'Anthropic',
      envVar: 'ANTHROPIC_API_KEY',
      description: 'Claude models (Opus, Sonnet, Haiku)',
    },
    openai: {
      name: 'OpenAI',
      envVar: 'OPENAI_API_KEY',
      description: 'GPT-4, GPT-4o, o1 models',
    },
    google: {
      name: 'Google AI',
      envVar: 'GOOGLE_API_KEY',
      description: 'Gemini models',
    },
    gemini: {
      name: 'Google Gemini',
      envVar: 'GEMINI_API_KEY',
      description: 'Gemini models (alias for google)',
    },
    mistral: {
      name: 'Mistral',
      envVar: 'MISTRAL_API_KEY',
      description: 'Mistral and Mixtral models',
    },
    azure: {
      name: 'Azure OpenAI',
      envVar: 'AZURE_OPENAI_API_KEY',
      description: 'Azure-hosted OpenAI models',
    },
    bedrock: {
      name: 'AWS Bedrock',
      envVar: 'AWS_ACCESS_KEY_ID',
      description: 'Claude, Titan, Llama on AWS',
    },
    groq: {
      name: 'Groq',
      envVar: 'GROQ_API_KEY',
      description: 'Fast inference for Llama, Mixtral',
    },
    together: {
      name: 'Together AI',
      envVar: 'TOGETHER_API_KEY',
      description: 'Llama, Mixtral, Qwen, DeepSeek',
    },
    openrouter: {
      name: 'OpenRouter',
      envVar: 'OPENROUTER_API_KEY',
      description: 'Access multiple providers via one API',
    },
    perplexity: {
      name: 'Perplexity',
      envVar: 'PERPLEXITY_API_KEY',
      description: 'Sonar models with web search',
    },
    deepinfra: {
      name: 'DeepInfra',
      envVar: 'DEEPINFRA_API_KEY',
      description: 'Llama, Mixtral, Qwen',
    },
    cerebras: {
      name: 'Cerebras',
      envVar: 'CEREBRAS_API_KEY',
      description: 'Ultra-fast Llama inference',
    },
    xai: {
      name: 'xAI',
      envVar: 'XAI_API_KEY',
      description: 'Grok models',
    },
    custom: {
      name: 'Custom',
      envVar: '',
      description: 'Custom OpenAI-compatible endpoint',
    },
  }

  return info[type]
}

// Default provider instance
export const defaultProvider = new AnthropicProvider()
