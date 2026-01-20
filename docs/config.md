# Configuration

voide can be customized through configuration files, environment variables, and runtime settings.

## Configuration File

Create a `voide.config.ts` file in your project root:

```ts
import type { VoideConfig } from 'voide'

const config: VoideConfig = {
  // Anthropic API configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4096,
  },

  // Voice recognition settings
  voice: {
    language: 'en-US',
    continuous: true,
    interimResults: true,
  },

  // Text-to-speech settings
  tts: {
    enabled: true,
    voice: 'en-US-Neural2-J',
    rate: 1.0,
    pitch: 1.0,
  },

  // UI settings
  ui: {
    theme: 'auto',
    fontSize: 14,
    showTimestamps: true,
  },
}

export default config
```

## Configuration Options

### Anthropic Settings

```ts
interface AnthropicConfig {
  // Your Anthropic API key (required)
  apiKey: string

  // Claude model to use
  model:
    | 'claude-3-opus-20240229'
    | 'claude-3-sonnet-20240229'
    | 'claude-3-haiku-20240307'
    | 'claude-3-5-sonnet-20241022'

  // Maximum tokens in response
  maxTokens: number // Default: 4096

  // Temperature for response randomness (0-1)
  temperature: number // Default: 0.7

  // System prompt for Claude
  systemPrompt: string

  // API base URL (for proxies)
  baseUrl: string // Default: 'https://api.anthropic.com'
}
```

### Voice Recognition Settings

```ts
interface VoiceConfig {
  // Recognition language (BCP-47 code)
  language: string // Default: 'en-US'

  // Enable continuous recognition
  continuous: boolean // Default: true

  // Show results before finalization
  interimResults: boolean // Default: true

  // Maximum alternatives for recognition
  maxAlternatives: number // Default: 1

  // Silence timeout (ms)
  silenceTimeout: number // Default: 1500

  // Minimum confidence threshold (0-1)
  confidenceThreshold: number // Default: 0.7
}
```

### Text-to-Speech Settings

```ts
interface TTSConfig {
  // Enable text-to-speech
  enabled: boolean // Default: false

  // Voice identifier
  voice: string // Default: browser default

  // Speech rate (0.5-2)
  rate: number // Default: 1.0

  // Voice pitch (0.5-2)
  pitch: number // Default: 1.0

  // Volume (0-1)
  volume: number // Default: 1.0

  // Skip code blocks in TTS
  skipCodeBlocks: boolean // Default: true

  // Read punctuation
  readPunctuation: boolean // Default: false
}
```

### UI Settings

```ts
interface UIConfig {
  // Color theme
  theme: 'light' | 'dark' | 'auto' // Default: 'auto'

  // Base font size (px)
  fontSize: number // Default: 14

  // Show message timestamps
  showTimestamps: boolean // Default: true

  // Show user avatars
  showAvatars: boolean // Default: true

  // Enable animations
  animations: boolean // Default: true

  // Chat panel width
  chatWidth: number | string // Default: '400px'

  // Syntax highlighting theme
  codeTheme: 'github' | 'monokai' | 'nord' | 'dracula'
}
```

## Environment Variables

voide respects these environment variables:

```sh
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional
VOIDE_MODEL=claude-3-sonnet-20240229
VOIDE_MAX_TOKENS=4096
VOIDE_LANGUAGE=en-US
VOIDE_THEME=dark
VOIDE_TTS_ENABLED=true
VOIDE_DEBUG=true

# Server settings
VOIDE_PORT=3000
VOIDE_HOST=localhost
```

## System Prompts

Customize Claude's behavior with system prompts:

```ts
const config: VoideConfig = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    systemPrompt: `You are voide, a voice-first coding assistant.

Guidelines:
- Keep responses concise for voice output
- Always include code examples when relevant
- Explain code in simple terms
- Ask clarifying questions when needed
- Format code with proper syntax highlighting

Context:
- User is interacting via voice
- Responses may be read aloud
- Prefer shorter, focused answers`,
  },
}
```

### Task-Specific Prompts

```ts
const prompts = {
  coding: `You are a senior software developer helping with code.
Focus on clean, maintainable code with proper error handling.`,

  debugging: `You are a debugging expert. Analyze problems systematically.
Ask about error messages, logs, and recent changes.`,

  learning: `You are a patient programming teacher.
Explain concepts step by step with examples.`,
}

// Use in configuration
config.anthropic.systemPrompt = prompts.coding
```

## Voice Command Configuration

### Custom Commands

```ts
const config: VoideConfig = {
  commands: {
    // Override built-in commands
    send: ['go', 'send', 'submit', 'execute'],
    reset: ['reset', 'clear', 'start over'],
    undo: ['oops', 'undo', 'delete that'],

    // Custom commands
    custom: [
      {
        triggers: ['format code', 'prettify'],
        action: 'FORMAT_CODE',
        handler: (ctx) => {
          // Custom action
        },
      },
      {
        triggers: ['save file', 'save this'],
        action: 'SAVE_FILE',
        handler: async (ctx) => {
          await saveCurrentFile(ctx.content)
        },
      },
    ],
  },
}
```

### Punctuation Mapping

```ts
const config: VoideConfig = {
  punctuation: {
    // Add custom punctuation mappings
    custom: [
      { spoken: 'arrow', symbol: '=>' },
      { spoken: 'triple equals', symbol: '===' },
      { spoken: 'spread', symbol: '...' },
    ],

    // Disable specific mappings
    disabled: ['hash', 'pound sign'],
  },
}
```

## Keyboard Shortcuts

```ts
const config: VoideConfig = {
  shortcuts: {
    toggleMic: 'cmd+shift+m', // macOS
    // toggleMic: 'ctrl+shift+m', // Windows/Linux
    send: 'cmd+enter',
    clearChat: 'cmd+k',
    settings: 'cmd+/',
    escape: 'escape',
  },
}
```

## Persistence

### Local Storage

```ts
const config: VoideConfig = {
  storage: {
    // Enable local storage
    enabled: true,

    // Storage key prefix
    prefix: 'voide_',

    // What to persist
    persist: {
      settings: true,
      chatHistory: true,
      favorites: true,
    },

    // Maximum chat history
    maxHistory: 100,
  },
}
```

### Export/Import Settings

```ts
import { exportSettings, importSettings } from 'voide'

// Export current settings
const settings = exportSettings()
localStorage.setItem('voide_backup', JSON.stringify(settings))

// Import settings
const backup = localStorage.getItem('voide_backup')
if (backup) {
  importSettings(JSON.parse(backup))
}
```

## Development Settings

```ts
const config: VoideConfig = {
  dev: {
    // Enable debug mode
    debug: true,

    // Log API requests
    logRequests: true,

    // Mock speech recognition
    mockSpeech: false,

    // Delay responses (ms)
    responseDelay: 0,
  },
}
```

## Complete Example

```ts
// voide.config.ts
import type { VoideConfig } from 'voide'

const config: VoideConfig = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt: `You are voide, a voice-first coding assistant.
Keep responses concise and code-focused.`,
  },

  voice: {
    language: 'en-US',
    continuous: true,
    interimResults: true,
    silenceTimeout: 2000,
    confidenceThreshold: 0.7,
  },

  tts: {
    enabled: true,
    voice: 'en-US-Neural2-J',
    rate: 1.1,
    skipCodeBlocks: true,
  },

  ui: {
    theme: 'dark',
    fontSize: 14,
    showTimestamps: true,
    codeTheme: 'github',
  },

  commands: {
    send: ['go', 'send', 'submit'],
    reset: ['reset', 'clear'],
  },

  storage: {
    enabled: true,
    persist: {
      settings: true,
      chatHistory: true,
    },
    maxHistory: 50,
  },

  dev: {
    debug: process.env.NODE_ENV === 'development',
  },
}

export default config
```

## Next Steps

- [Voice Commands](/features/voice-commands) - Customize voice commands
- [AI Integration](/features/ai-integration) - Advanced AI configuration
- [Custom Commands](/advanced/custom-commands) - Create custom commands
