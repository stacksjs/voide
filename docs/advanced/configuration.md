# Advanced Configuration

This guide covers advanced configuration options for voide, including environment-specific settings, custom providers, and performance tuning.

## Configuration Hierarchy

voide loads configuration from multiple sources (later sources override earlier ones):

1. Built-in defaults
2. `voide.config.ts` file
3. Environment variables
4. Runtime configuration

## Complete Configuration Schema

```ts
import type { VoideConfig } from 'voide'

const config: VoideConfig = {
  // Anthropic API settings
  anthropic: {
    apiKey: string
    model: string
    maxTokens: number
    temperature: number
    systemPrompt: string
    baseUrl: string
    headers: Record<string, string>
    retry: RetryConfig
    rateLimit: RateLimitConfig
  }

  // Voice recognition settings
  voice: {
    language: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    confidenceThreshold: number
    silenceTimeout: number
    autoSendOnSilence: boolean
    punctuation: PunctuationConfig
    errorHandling: ErrorHandlingConfig
  }

  // Text-to-speech settings
  tts: {
    enabled: boolean
    voice: string
    rate: number
    pitch: number
    volume: number
    skipCodeBlocks: boolean
    codeHandling: 'skip' | 'summary' | 'full'
  }

  // Voice command settings
  commands: {
    send: string[]
    reset: string[]
    undo: string[]
    custom: CustomCommand[]
    disabled: string[]
  }

  // UI settings
  ui: {
    theme: 'light' | 'dark' | 'auto'
    fontSize: number
    showTimestamps: boolean
    showAvatars: boolean
    animations: boolean
    codeTheme: string
  }

  // Storage settings
  storage: {
    enabled: boolean
    prefix: string
    persist: PersistConfig
    maxHistory: number
  }

  // Privacy settings
  privacy: {
    storeTranscripts: boolean
    clearOnClose: boolean
    localOnly: boolean
  }

  // Development settings
  dev: {
    debug: boolean
    logRequests: boolean
    mockSpeech: boolean
  }
}
```

## Environment-Specific Configuration

### Development vs Production

```ts
// voide.config.ts
import type { VoideConfig } from 'voide'

const isDev = process.env.NODE_ENV === 'development'

const config: VoideConfig = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: isDev ? 'claude-3-haiku-20240307' : 'claude-3-5-sonnet-20241022',
    maxTokens: isDev ? 1024 : 4096,
  },

  voice: {
    silenceTimeout: isDev ? 3000 : 2000,
  },

  dev: {
    debug: isDev,
    logRequests: isDev,
  },

  storage: {
    enabled: true,
    maxHistory: isDev ? 10 : 100,
  },
}

export default config
```

### Using defineConfig

```ts
import { defineConfig } from 'voide'

export default defineConfig(({ mode }) => ({
  anthropic: {
    model: mode === 'development'
      ? 'claude-3-haiku-20240307'
      : 'claude-3-5-sonnet-20241022',
  },
}))
```

## Custom AI Providers

### Using a Proxy

```ts
export default {
  anthropic: {
    baseUrl: 'https://your-proxy.com/v1',
    headers: {
      'X-Proxy-Auth': process.env.PROXY_TOKEN,
    },
  },
}
```

### Custom Provider

```ts
import { defineProvider } from 'voide'

const customProvider = defineProvider({
  name: 'custom-ai',

  async send(messages, options) {
    const response = await fetch('https://your-api.com/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({ messages, ...options }),
    })

    return response.json()
  },

  async stream(messages, options) {
    // Return async iterator for streaming
  },
})

export default {
  provider: customProvider,
}
```

## Advanced Voice Settings

### Recognition Tuning

```ts
export default {
  voice: {
    // Language with region
    language: 'en-US',

    // Recognition engine options
    engine: {
      // Prefer accuracy over speed
      mode: 'accuracy', // 'speed' | 'balanced' | 'accuracy'

      // Custom grammar (if supported)
      grammar: `
        #JSGF V1.0;
        grammar commands;
        public <command> = send | reset | oops | cancel;
      `,

      // Noise suppression
      noiseSuppression: true,

      // Echo cancellation
      echoCancellation: true,
    },

    // Timing settings
    timing: {
      // Minimum speech duration (ms)
      minSpeechDuration: 200,

      // Maximum silence during speech (ms)
      maxSilenceWithinSpeech: 1000,

      // Delay before finalizing results (ms)
      finalizationDelay: 500,
    },
  },
}
```

### Custom Punctuation Rules

```ts
export default {
  voice: {
    punctuation: {
      // Enable/disable
      enabled: true,

      // Built-in rules to disable
      disabled: ['hash', 'at sign'],

      // Custom rules
      custom: [
        // Programming operators
        { spoken: 'arrow function', symbol: '=>' },
        { spoken: 'triple equals', symbol: '===' },
        { spoken: 'double equals', symbol: '==' },
        { spoken: 'not equals', symbol: '!==' },
        { spoken: 'spread operator', symbol: '...' },
        { spoken: 'optional chain', symbol: '?.' },
        { spoken: 'null coalesce', symbol: '??' },

        // Template literals
        { spoken: 'template start', symbol: '${' },
        { spoken: 'template end', symbol: '}' },

        // TypeScript
        { spoken: 'generic open', symbol: '<' },
        { spoken: 'generic close', symbol: '>' },
      ],

      // Post-processing function
      postProcess: (text) => {
        // Custom cleanup logic
        return text.replace(/\s+/g, ' ').trim()
      },
    },
  },
}
```

## Text-to-Speech Configuration

### Voice Selection

```ts
export default {
  tts: {
    enabled: true,

    // Specific voice ID
    voice: 'Google US English',

    // Or voice selection criteria
    voiceSelection: {
      language: 'en-US',
      gender: 'male', // 'male' | 'female' | 'neutral'
      quality: 'high', // 'low' | 'medium' | 'high'
    },

    // Fallback voices
    fallbackVoices: [
      'Microsoft David',
      'Alex',
    ],
  },
}
```

### Response Processing

```ts
export default {
  tts: {
    enabled: true,

    // How to handle code blocks
    codeHandling: 'summary',

    // Custom text processor
    textProcessor: (text) => {
      // Remove markdown formatting
      text = text.replace(/\*\*(.*?)\*\*/g, '$1')
      text = text.replace(/`(.*?)`/g, '$1')

      // Expand abbreviations
      text = text.replace(/e\.g\./g, 'for example')
      text = text.replace(/i\.e\./g, 'that is')

      return text
    },

    // SSML support (if available)
    ssml: true,
    ssmlProcessor: (text) => {
      return `<speak><prosody rate="medium">${text}</prosody></speak>`
    },
  },
}
```

## Conversation Management

### Context Handling

```ts
export default {
  conversation: {
    // Maximum tokens to keep in context
    maxContextTokens: 100000,

    // Minimum messages to keep
    minContextMessages: 5,

    // Context management strategy
    strategy: 'sliding-window', // 'sliding-window' | 'summarize' | 'truncate'

    // Summarization settings (if strategy is 'summarize')
    summarize: {
      // When to trigger summarization
      threshold: 50000, // tokens

      // Summary prompt
      prompt: 'Summarize the conversation so far, keeping key code and decisions.',

      // Keep N recent messages unsummarized
      keepRecent: 10,
    },
  },
}
```

### Message Hooks

```ts
export default {
  hooks: {
    // Before sending to AI
    beforeSend: async (message, context) => {
      // Add metadata
      return {
        ...message,
        metadata: {
          timestamp: Date.now(),
          version: '1.0',
        },
      }
    },

    // After receiving response
    afterReceive: async (response, context) => {
      // Log usage
      console.log(`Used ${response.usage.outputTokens} tokens`)
      return response
    },

    // Before adding to history
    beforeStore: async (message, context) => {
      // Filter sensitive data
      return sanitize(message)
    },
  },
}
```

## Performance Configuration

### Memory Management

```ts
export default {
  performance: {
    // Maximum transcript buffer size
    maxTranscriptBuffer: 10000, // characters

    // Garbage collection interval
    gcInterval: 60000, // ms

    // Message limit in UI
    maxVisibleMessages: 100,

    // Lazy load old messages
    lazyLoadMessages: true,
  },
}
```

### Network Optimization

```ts
export default {
  network: {
    // Request timeout
    timeout: 30000, // ms

    // Connection pooling
    keepAlive: true,

    // Compression
    compression: true,

    // Retry configuration
    retry: {
      maxAttempts: 3,
      backoff: 'exponential',
      baseDelay: 1000,
      maxDelay: 10000,
    },
  },
}
```

## Security Configuration

### API Key Management

```ts
export default {
  security: {
    // Rotate API key
    apiKeyRotation: {
      enabled: true,
      interval: 86400000, // 24 hours
      getNewKey: async () => {
        // Fetch new key from secure source
        return fetchNewApiKey()
      },
    },

    // Rate limiting (client-side)
    rateLimit: {
      requestsPerMinute: 20,
      tokensPerMinute: 50000,
    },
  },
}
```

### Content Filtering

```ts
export default {
  security: {
    // Input sanitization
    sanitizeInput: true,

    // Content filtering
    contentFilter: {
      enabled: true,
      // Block certain patterns
      blockedPatterns: [
        /password\s*[:=]\s*\S+/gi,
        /api[_-]?key\s*[:=]\s*\S+/gi,
      ],
      // Replacement text
      replacement: '[REDACTED]',
    },
  },
}
```

## Plugin System

### Using Plugins

```ts
import { loggingPlugin, analyticsPlugin } from 'voide-plugins'

export default {
  plugins: [
    loggingPlugin({
      level: 'info',
      destination: './voide.log',
    }),

    analyticsPlugin({
      endpoint: 'https://analytics.example.com',
      apiKey: process.env.ANALYTICS_KEY,
    }),
  ],
}
```

### Creating Plugins

```ts
import type { VoidePlugin } from 'voide'

const myPlugin: VoidePlugin = {
  name: 'my-plugin',

  // Initialize plugin
  setup(app) {
    console.log('Plugin initialized')
  },

  // Hook into events
  hooks: {
    'message:before': (message) => {
      console.log('Sending:', message)
    },
    'message:after': (response) => {
      console.log('Received:', response)
    },
    'voice:start': () => {
      console.log('Voice started')
    },
    'voice:result': (transcript) => {
      console.log('Transcript:', transcript)
    },
  },
}
```

## Configuration Validation

### Schema Validation

```ts
import { validateConfig, VoideConfigSchema } from 'voide'

const myConfig = {
  anthropic: {
    apiKey: 'test',
  },
}

const result = validateConfig(myConfig)

if (!result.success) {
  console.error('Config errors:', result.errors)
}
```

### Runtime Validation

```ts
export default {
  // Validate at startup
  strict: true,

  // Validation rules
  validation: {
    // Warn about deprecated options
    warnDeprecated: true,

    // Fail on unknown options
    failOnUnknown: false,
  },
}
```

## Next Steps

- [Custom Commands](/advanced/custom-commands) - Create custom voice commands
- [Performance](/advanced/performance) - Optimize voide performance
- [API Integration](/advanced/api-integration) - Advanced API usage
