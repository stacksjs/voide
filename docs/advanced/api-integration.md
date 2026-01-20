# API Integration

This guide covers advanced API integration patterns for voide, including custom providers, webhooks, and external service integration.

## Anthropic API

### Direct API Usage

```ts
import { createClient, sendMessage } from 'voide'

// Create a client instance
const client = createClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
})

// Send a message
const response = await sendMessage('Write a function', {
  client,
  maxTokens: 2048,
  temperature: 0.7,
})

console.log(response.content)
console.log(response.usage)
```

### Streaming API

```ts
import { streamMessage } from 'voide'

const stream = await streamMessage('Generate code', {
  onToken: (token) => {
    process.stdout.write(token)
  },
  onComplete: (response) => {
    console.log('\n\nComplete:', response.usage)
  },
})
```

### Custom Headers

```ts
export default {
  anthropic: {
    headers: {
      'X-Custom-Header': 'value',
      'X-Request-ID': () => generateRequestId(),
    },
  },
}
```

## Custom AI Providers

### Provider Interface

```ts
import type { AIProvider } from 'voide'

const customProvider: AIProvider = {
  name: 'custom-provider',

  async send(messages, options) {
    const response = await fetch('https://api.example.com/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        messages,
        model: options.model,
        max_tokens: options.maxTokens,
      }),
    })

    const data = await response.json()

    return {
      content: data.content,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    }
  },

  async *stream(messages, options) {
    const response = await fetch('https://api.example.com/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({ messages, stream: true }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      yield decoder.decode(value)
    }
  },
}

export default {
  provider: customProvider,
}
```

### OpenAI Compatible

```ts
import { createOpenAICompatibleProvider } from 'voide'

const openaiProvider = createOpenAICompatibleProvider({
  baseUrl: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo-preview',
})

export default {
  provider: openaiProvider,
}
```

### Local LLM

```ts
import { createOllamaProvider } from 'voide'

const ollamaProvider = createOllamaProvider({
  baseUrl: 'http://localhost:11434',
  model: 'codellama',
})

export default {
  provider: ollamaProvider,
}
```

## Webhooks

### Outgoing Webhooks

Send events to external services:

```ts
export default {
  webhooks: {
    outgoing: [
      {
        url: 'https://api.example.com/voide-events',
        events: ['message:sent', 'message:received', 'command:executed'],
        headers: {
          'Authorization': `Bearer ${process.env.WEBHOOK_SECRET}`,
        },
        // Retry configuration
        retry: {
          maxAttempts: 3,
          backoff: 'exponential',
        },
      },
    ],
  },
}
```

### Webhook Payload

```ts
interface WebhookPayload {
  event: string
  timestamp: string
  data: {
    // Event-specific data
    message?: Message
    command?: Command
    error?: Error
  }
  meta: {
    sessionId: string
    userId?: string
  }
}
```

### Incoming Webhooks

Receive commands from external services:

```ts
import { createWebhookHandler } from 'voide'

const handler = createWebhookHandler({
  secret: process.env.WEBHOOK_SECRET,

  onMessage: async (payload) => {
    // Handle incoming message
    await voide.send(payload.message)
  },

  onCommand: async (payload) => {
    // Handle incoming command
    await voide.executeCommand(payload.command)
  },
})

// Use with your HTTP server
app.post('/webhook', handler)
```

## External Services

### Slack Integration

```ts
import { SlackIntegration } from 'voide-integrations'

const slack = new SlackIntegration({
  token: process.env.SLACK_TOKEN,
  channel: '#voide-logs',
})

export default {
  integrations: [
    slack.createLogger({
      events: ['error', 'command:executed'],
    }),
  ],
}
```

### GitHub Integration

```ts
import { GitHubIntegration } from 'voide-integrations'

const github = new GitHubIntegration({
  token: process.env.GITHUB_TOKEN,
  repo: 'owner/repo',
})

// Create commands for GitHub operations
const githubCommands = [
  {
    name: 'create-issue',
    triggers: [/create issue (.+)/i],
    handler: async (ctx) => {
      const title = ctx.remainingText
      const issue = await github.createIssue({ title })
      ctx.speak(`Issue ${issue.number} created`)
    },
  },
  {
    name: 'create-pr',
    triggers: ['create pull request'],
    handler: async (ctx) => {
      const lastCode = findLastCodeBlock(ctx.conversation)
      const pr = await github.createPR({
        title: 'Voice-generated code',
        body: lastCode,
      })
      ctx.speak(`Pull request ${pr.number} created`)
    },
  },
]
```

### Database Integration

```ts
import { createDatabaseLogger } from 'voide'

const dbLogger = createDatabaseLogger({
  type: 'postgres',
  connectionString: process.env.DATABASE_URL,
  table: 'voide_logs',
})

export default {
  logging: {
    handlers: [dbLogger],
  },
}
```

## REST API

### Creating an API Server

```ts
import { createAPIServer } from 'voide'

const server = createAPIServer({
  port: 3001,
  auth: {
    type: 'bearer',
    token: process.env.API_TOKEN,
  },
})

// Endpoints:
// POST /api/message - Send a message
// GET /api/conversation - Get conversation history
// POST /api/command - Execute a command
// GET /api/status - Get status

server.start()
```

### API Client

```ts
import { VoideAPIClient } from 'voide'

const client = new VoideAPIClient({
  baseUrl: 'http://localhost:3001',
  token: process.env.API_TOKEN,
})

// Send a message
const response = await client.sendMessage('Generate code')

// Execute a command
await client.executeCommand('clear-chat')

// Get conversation
const conversation = await client.getConversation()
```

## WebSocket API

### WebSocket Server

```ts
import { createWebSocketServer } from 'voide'

const wss = createWebSocketServer({
  port: 3002,
  auth: async (token) => {
    return validateToken(token)
  },
})

wss.on('connection', (ws, user) => {
  // Handle real-time updates
  voide.on('message', (message) => {
    ws.send(JSON.stringify({ type: 'message', data: message }))
  })

  voide.on('voice:transcript', (transcript) => {
    ws.send(JSON.stringify({ type: 'transcript', data: transcript }))
  })
})
```

### WebSocket Client

```ts
import { VoideWebSocketClient } from 'voide'

const ws = new VoideWebSocketClient({
  url: 'ws://localhost:3002',
  token: process.env.WS_TOKEN,
})

ws.on('message', (message) => {
  console.log('New message:', message)
})

ws.on('transcript', (transcript) => {
  console.log('Voice:', transcript)
})

// Send commands
ws.send({ type: 'command', command: 'clear-chat' })
```

## Event System

### Event Types

```ts
type VoideEvent =
  | 'ready'
  | 'voice:start'
  | 'voice:end'
  | 'voice:transcript'
  | 'voice:error'
  | 'message:sending'
  | 'message:sent'
  | 'message:receiving'
  | 'message:received'
  | 'message:error'
  | 'command:detected'
  | 'command:executed'
  | 'command:error'
  | 'tts:start'
  | 'tts:end'
  | 'conversation:cleared'
  | 'settings:changed'
```

### Event Handlers

```ts
import { on, once, off } from 'voide'

// Listen to events
const unsubscribe = on('message:received', (message) => {
  console.log('Received:', message.content)
})

// Listen once
once('ready', () => {
  console.log('voide is ready')
})

// Remove listener
off('message:received', unsubscribe)
```

### Custom Events

```ts
import { emit, on } from 'voide'

// Define custom event
on('custom:event', (data) => {
  console.log('Custom event:', data)
})

// Emit custom event
emit('custom:event', { key: 'value' })
```

## Middleware

### Request Middleware

```ts
export default {
  middleware: {
    request: [
      // Add request ID
      async (request, next) => {
        request.headers['X-Request-ID'] = generateId()
        return next(request)
      },

      // Log requests
      async (request, next) => {
        console.log('Request:', request)
        const response = await next(request)
        console.log('Response:', response)
        return response
      },
    ],
  },
}
```

### Message Middleware

```ts
export default {
  middleware: {
    message: [
      // Add context
      async (message, next) => {
        return next({
          ...message,
          metadata: {
            ...message.metadata,
            timestamp: Date.now(),
          },
        })
      },

      // Filter content
      async (message, next) => {
        const filtered = filterSensitiveData(message.content)
        return next({ ...message, content: filtered })
      },
    ],
  },
}
```

## Rate Limiting

### Client-Side Rate Limiting

```ts
export default {
  rateLimit: {
    // Requests per minute
    requestsPerMinute: 20,

    // Tokens per minute
    tokensPerMinute: 50000,

    // Concurrent requests
    maxConcurrent: 2,

    // Queue excess requests
    queueExcess: true,
    maxQueueSize: 10,
  },
}
```

### Handling Rate Limits

```ts
import { onRateLimit } from 'voide'

onRateLimit((info) => {
  console.log(`Rate limited. Retry after ${info.retryAfter}ms`)
  showNotification('Please wait before sending more messages')
})
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
        await wait(error.retryAfter)
        break
      case 'INVALID_API_KEY':
        promptForApiKey()
        break
      case 'NETWORK_ERROR':
        showOfflineMessage()
        break
      case 'CONTEXT_TOO_LONG':
        await clearOldMessages()
        break
    }
  }
}
```

### Global Error Handler

```ts
import { onError } from 'voide'

onError((error, context) => {
  // Log error
  console.error('voide error:', error)

  // Report to error tracking
  errorTracker.capture(error, {
    context: context.type,
    user: context.userId,
  })

  // User notification
  showErrorNotification(error.message)
})
```

## Security

### API Key Security

```ts
export default {
  security: {
    // Never expose API key to client
    apiKeyLocation: 'server',

    // Proxy requests through your server
    proxyUrl: '/api/voide',

    // Encrypt stored data
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
    },
  },
}
```

### Request Signing

```ts
export default {
  security: {
    signing: {
      enabled: true,
      algorithm: 'hmac-sha256',
      secret: process.env.SIGNING_SECRET,
    },
  },
}
```

## Next Steps

- [Configuration](/advanced/configuration) - Full configuration reference
- [Custom Commands](/advanced/custom-commands) - Create API-powered commands
- [Performance](/advanced/performance) - Optimize API performance
