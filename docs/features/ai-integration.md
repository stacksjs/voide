# AI Integration

voide integrates with Anthropic's Claude AI to provide intelligent code assistance. This guide covers how the AI integration works and how to optimize it for your workflow.

## Claude Models

### Available Models

voide supports all Claude models:

| Model | Best For | Speed | Context |
|-------|----------|-------|---------|
| claude-3-opus | Complex reasoning, detailed analysis | Slower | 200K |
| claude-3-5-sonnet | Balanced performance, coding tasks | Fast | 200K |
| claude-3-sonnet | General purpose, good balance | Fast | 200K |
| claude-3-haiku | Quick responses, simple tasks | Fastest | 200K |

### Selecting a Model

```ts
// voide.config.ts
export default {
  anthropic: {
    model: 'claude-3-5-sonnet-20241022', // Recommended for coding
  },
}
```

### Runtime Model Switching

```ts
import { setModel } from 'voide'

// Switch models based on task
setModel('claude-3-opus-20240229') // For complex analysis
setModel('claude-3-haiku-20240307') // For quick questions
```

## Conversation Context

### How Context Works

voide maintains conversation history that's sent with each request:

```
[System Prompt]
[Message 1: User]
[Message 2: Claude]
[Message 3: User]
[Message 4: Claude]
[Current Message: User] → Sent to Claude
```

### Context Window

Claude has a 200K token context window. voide manages this automatically:

```ts
export default {
  anthropic: {
    // Automatically trim old messages when approaching limit
    maxContextTokens: 100000,

    // Keep at minimum N most recent exchanges
    minContextMessages: 10,

    // Strategy for trimming
    contextStrategy: 'sliding-window', // or 'summarize'
  },
}
```

### Clearing Context

Reset conversation when switching topics:

```
Voice: "Clear chat"
```

Or programmatically:

```ts
import { clearConversation } from 'voide'

clearConversation()
```

## System Prompts

### Default System Prompt

voide uses a default system prompt optimized for voice coding:

```ts
const defaultPrompt = `You are voide, a voice-first AI coding assistant.

Your responses should be:
- Concise and direct (optimized for voice output)
- Code-focused with working examples
- Clear and well-explained

When providing code:
- Use proper syntax highlighting
- Include brief comments for complex logic
- Show complete, runnable examples

When asked to modify code:
- Show only the relevant changes
- Explain what was changed and why`
```

### Custom System Prompts

Override with your own prompt:

```ts
export default {
  anthropic: {
    systemPrompt: `You are a senior TypeScript developer.
Always use:
- Strict TypeScript with explicit types
- Functional programming patterns
- Error handling with Result types
- Comprehensive JSDoc comments`,
  },
}
```

### Dynamic System Prompts

Change prompts based on context:

```ts
import { setSystemPrompt } from 'voide'

// For debugging sessions
setSystemPrompt(`You are a debugging expert.
Ask about: error messages, recent changes, expected vs actual behavior.
Suggest: logging, breakpoints, step-by-step analysis.`)

// For code review
setSystemPrompt(`You are a code reviewer.
Focus on: bugs, performance, security, maintainability.
Provide: specific line references, severity ratings, fix suggestions.`)
```

## Response Handling

### Streaming Responses

Claude responses are streamed in real-time:

```ts
import { sendMessage } from 'voide'

await sendMessage('Explain async/await', {
  onStart: () => {
    console.log('Response started')
  },
  onToken: (token) => {
    // Each token as it arrives
    process.stdout.write(token)
  },
  onComplete: (response) => {
    console.log('Full response:', response)
  },
})
```

### Canceling Responses

Stop Claude mid-response:

```
Voice: "Cancel"
```

Or programmatically:

```ts
import { cancelResponse } from 'voide'

const controller = cancelResponse()
// Response is interrupted
```

### Response Types

voide parses Claude's responses into structured types:

```ts
interface ClaudeResponse {
  content: string
  codeBlocks: CodeBlock[]
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence'
}

interface CodeBlock {
  language: string
  code: string
  filename?: string
}
```

## Code Handling

### Code Block Detection

voide automatically detects and formats code blocks:

```ts
import { parseResponse } from 'voide'

const response = parseResponse(claudeResponse)

response.codeBlocks.forEach((block) => {
  console.log(`Language: ${block.language}`)
  console.log(`Code:\n${block.code}`)
})
```

### Syntax Highlighting

Code is highlighted using your preferred theme:

```ts
export default {
  ui: {
    codeTheme: 'github', // 'monokai', 'nord', 'dracula'
  },
}
```

### Copy Code

Users can copy code blocks with one click or voice:

```
Voice: "Copy the code"
Voice: "Copy that function"
```

## Text-to-Speech Integration

### TTS for Responses

Claude's responses can be read aloud:

```ts
export default {
  tts: {
    enabled: true,
    skipCodeBlocks: true, // Don't read code aloud
    readPunctuation: false,
  },
}
```

### Smart Reading

voide intelligently reads responses:

- **Text**: Read normally
- **Code blocks**: Skipped or summarized
- **Lists**: Read with pauses
- **Links**: Read text, skip URLs

```ts
export default {
  tts: {
    codeHandling: 'summary', // 'skip', 'summary', 'full'
    // 'summary': "Here's a JavaScript function..."
    // 'skip': Completely skip code
    // 'full': Read code (not recommended)
  },
}
```

## Error Handling

### API Errors

```ts
import { sendMessage, VoideError } from 'voide'

try {
  await sendMessage('Generate code')
}
catch (error) {
  if (error instanceof VoideError) {
    switch (error.code) {
      case 'RATE_LIMITED':
        console.log('Too many requests, waiting...')
        break
      case 'INVALID_API_KEY':
        console.log('Check your API key')
        break
      case 'CONTEXT_TOO_LONG':
        console.log('Conversation too long, clearing...')
        break
    }
  }
}
```

### Retry Logic

```ts
export default {
  anthropic: {
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoff: 'exponential',
      retryOn: ['rate_limited', 'server_error'],
    },
  },
}
```

## Rate Limiting

### Built-in Rate Limiting

voide includes rate limiting to avoid API errors:

```ts
export default {
  anthropic: {
    rateLimit: {
      requestsPerMinute: 50,
      tokensPerMinute: 100000,
    },
  },
}
```

### Usage Tracking

```ts
import { getUsage } from 'voide'

const usage = getUsage()
console.log(`Today: ${usage.today.tokens} tokens`)
console.log(`This month: ${usage.month.cost}`)
```

## Advanced Configuration

### Custom API Endpoint

For proxies or self-hosted models:

```ts
export default {
  anthropic: {
    baseUrl: 'https://your-proxy.com/v1',
    headers: {
      'X-Custom-Header': 'value',
    },
  },
}
```

### Request Hooks

Modify requests before sending:

```ts
export default {
  anthropic: {
    hooks: {
      beforeRequest: (request) => {
        // Add logging, modify request
        console.log('Sending:', request.messages.length, 'messages')
        return request
      },
      afterResponse: (response) => {
        // Process response
        trackUsage(response.usage)
        return response
      },
    },
  },
}
```

## Optimizing for Voice

### Response Length

Keep responses concise for voice:

```ts
export default {
  anthropic: {
    systemPrompt: `Keep responses under 200 words when possible.
For code, show only the essential parts.
Offer to elaborate if the user asks.`,
  },
}
```

### Response Format

Format for easy listening:

```ts
export default {
  anthropic: {
    systemPrompt: `Structure responses as:
1. Brief answer (1-2 sentences)
2. Code example if relevant
3. Offer to explain more

Avoid:
- Long paragraphs
- Multiple code blocks
- Excessive technical jargon`,
  },
}
```

## Next Steps

- [Code Generation](/features/code-generation) - Generate code with voice
- [Real-time Transcription](/features/real-time-transcription) - Voice input details
- [API Integration](/advanced/api-integration) - Advanced API usage
