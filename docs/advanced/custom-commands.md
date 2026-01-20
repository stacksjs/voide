# Custom Commands

voide's command system is fully extensible, allowing you to create custom voice commands for any action. This guide covers creating, registering, and managing custom commands.

## Command Structure

### Basic Command

```ts
import type { VoideCommand } from 'voide'

const myCommand: VoideCommand = {
  // Command name (for reference)
  name: 'my-command',

  // Trigger phrases
  triggers: ['do something', 'execute action'],

  // Command handler
  handler: async (context) => {
    console.log('Command executed!')
    console.log('Transcript:', context.transcript)
  },
}
```

### Command Context

```ts
interface CommandContext {
  // Current transcript
  transcript: string

  // Transcript after removing trigger
  remainingText: string

  // Confidence score (0-1)
  confidence: number

  // Trigger phrase that matched
  matchedTrigger: string

  // Current conversation
  conversation: Message[]

  // App state
  state: AppState

  // Utility functions
  send: (message: string) => Promise<void>
  clear: () => void
  speak: (text: string) => void
}
```

## Registering Commands

### In Configuration

```ts
// voide.config.ts
export default {
  commands: {
    custom: [
      {
        name: 'format-code',
        triggers: ['format code', 'prettify', 'format this'],
        handler: async (ctx) => {
          await formatCurrentCode()
        },
      },
      {
        name: 'save-snippet',
        triggers: ['save snippet', 'save this code'],
        handler: async (ctx) => {
          await saveToSnippets(ctx.remainingText)
        },
      },
    ],
  },
}
```

### At Runtime

```ts
import { registerCommand } from 'voide'

registerCommand({
  name: 'quick-test',
  triggers: ['run tests', 'test this'],
  handler: async (ctx) => {
    await runTests()
  },
})
```

## Command Patterns

### Parameterized Commands

```ts
const gotoCommand: VoideCommand = {
  name: 'goto',
  // Use regex for patterns
  triggers: [
    /go to line (\d+)/i,
    /jump to line (\d+)/i,
  ],
  handler: async (ctx) => {
    const match = ctx.matchedTrigger.match(/(\d+)/)
    if (match) {
      const lineNumber = parseInt(match[1])
      await gotoLine(lineNumber)
    }
  },
}
```

### Dynamic Parameters

```ts
const createCommand: VoideCommand = {
  name: 'create',
  triggers: [
    /create (a |an )?(\w+) (called |named )?(\w+)/i,
  ],
  handler: async (ctx) => {
    const match = ctx.matchedTrigger.match(
      /create (?:a |an )?(\w+) (?:called |named )?(\w+)/i
    )
    if (match) {
      const [, type, name] = match
      await createEntity(type, name)
      ctx.speak(`Created ${type} named ${name}`)
    }
  },
}

// Usage: "Create a function called validate"
// Usage: "Create an interface named User"
```

### Confirmation Commands

```ts
const deleteCommand: VoideCommand = {
  name: 'delete',
  triggers: ['delete file', 'remove file'],
  handler: async (ctx) => {
    ctx.speak('Are you sure you want to delete? Say yes or no.')

    // Wait for confirmation
    const confirmed = await ctx.waitForConfirmation({
      yes: ['yes', 'confirm', 'do it'],
      no: ['no', 'cancel', 'nevermind'],
      timeout: 5000,
    })

    if (confirmed) {
      await deleteCurrentFile()
      ctx.speak('File deleted')
    }
    else {
      ctx.speak('Cancelled')
    }
  },
}
```

## Command Categories

### Navigation Commands

```ts
const navigationCommands: VoideCommand[] = [
  {
    name: 'goto-top',
    triggers: ['go to top', 'scroll to top'],
    handler: () => scrollToTop(),
  },
  {
    name: 'goto-bottom',
    triggers: ['go to bottom', 'scroll to bottom'],
    handler: () => scrollToBottom(),
  },
  {
    name: 'next-message',
    triggers: ['next message', 'go down'],
    handler: () => navigateMessage(1),
  },
  {
    name: 'previous-message',
    triggers: ['previous message', 'go up'],
    handler: () => navigateMessage(-1),
  },
]
```

### Code Commands

```ts
const codeCommands: VoideCommand[] = [
  {
    name: 'copy-code',
    triggers: ['copy code', 'copy that', 'copy the code'],
    handler: async (ctx) => {
      const lastCode = findLastCodeBlock(ctx.conversation)
      if (lastCode) {
        await copyToClipboard(lastCode)
        ctx.speak('Code copied')
      }
    },
  },
  {
    name: 'run-code',
    triggers: ['run code', 'execute code', 'run this'],
    handler: async (ctx) => {
      const code = findLastCodeBlock(ctx.conversation)
      if (code) {
        const result = await executeCode(code)
        ctx.speak(`Result: ${result}`)
      }
    },
  },
  {
    name: 'explain-code',
    triggers: ['explain code', 'what does this do'],
    handler: async (ctx) => {
      const code = findLastCodeBlock(ctx.conversation)
      if (code) {
        await ctx.send(`Explain this code:\n\`\`\`\n${code}\n\`\`\``)
      }
    },
  },
]
```

### Session Commands

```ts
const sessionCommands: VoideCommand[] = [
  {
    name: 'save-session',
    triggers: ['save session', 'save conversation'],
    handler: async (ctx) => {
      const filename = `session-${Date.now()}.json`
      await saveSession(ctx.conversation, filename)
      ctx.speak(`Session saved as ${filename}`)
    },
  },
  {
    name: 'load-session',
    triggers: [/load session (.+)/i],
    handler: async (ctx) => {
      const match = ctx.matchedTrigger.match(/load session (.+)/i)
      if (match) {
        await loadSession(match[1])
        ctx.speak('Session loaded')
      }
    },
  },
  {
    name: 'export-chat',
    triggers: ['export chat', 'download conversation'],
    handler: async (ctx) => {
      const markdown = formatAsMarkdown(ctx.conversation)
      await downloadFile(markdown, 'conversation.md')
    },
  },
]
```

## Command Hooks

### Before/After Hooks

```ts
const commandWithHooks: VoideCommand = {
  name: 'important-action',
  triggers: ['do important thing'],

  // Run before handler
  before: async (ctx) => {
    console.log('About to execute important action')
    // Return false to cancel
    return true
  },

  handler: async (ctx) => {
    await doImportantThing()
  },

  // Run after handler
  after: async (ctx, result) => {
    console.log('Action completed:', result)
  },
}
```

### Global Hooks

```ts
import { onCommand, onCommandError } from 'voide'

// Log all commands
onCommand((command, ctx) => {
  console.log(`Command: ${command.name}`)
  console.log(`Trigger: ${ctx.matchedTrigger}`)
})

// Handle errors
onCommandError((error, command, ctx) => {
  console.error(`Error in ${command.name}:`, error)
  ctx.speak('Sorry, something went wrong')
})
```

## Command Groups

### Creating Groups

```ts
import { createCommandGroup } from 'voide'

const gitCommands = createCommandGroup({
  name: 'git',
  prefix: 'git', // Optional: all triggers start with this

  commands: [
    {
      name: 'status',
      triggers: ['status', 'show status'],
      handler: () => runGitCommand('status'),
    },
    {
      name: 'commit',
      triggers: [/commit (.+)/i],
      handler: (ctx) => {
        const message = ctx.remainingText
        runGitCommand(`commit -m "${message}"`)
      },
    },
    {
      name: 'push',
      triggers: ['push', 'push changes'],
      handler: () => runGitCommand('push'),
    },
  ],
})

// Usage:
// "git status"
// "git commit fixed the bug"
// "git push"
```

### Enabling/Disabling Groups

```ts
import { enableCommandGroup, disableCommandGroup } from 'voide'

// Disable git commands
disableCommandGroup('git')

// Re-enable
enableCommandGroup('git')
```

## Command Priority

### Setting Priority

```ts
const highPriorityCommand: VoideCommand = {
  name: 'emergency-stop',
  triggers: ['stop everything', 'emergency stop'],
  priority: 100, // Higher = checked first
  handler: async () => {
    await stopAllProcesses()
  },
}

const normalCommand: VoideCommand = {
  name: 'stop-music',
  triggers: ['stop'],
  priority: 50, // Default priority
  handler: () => stopMusic(),
}
```

### Priority Levels

```ts
// Suggested priority levels
const PRIORITY = {
  CRITICAL: 100, // Emergency commands
  HIGH: 75, // Important commands
  NORMAL: 50, // Default
  LOW: 25, // Fallback commands
  BACKGROUND: 0, // Catch-all commands
}
```

## Overriding Built-in Commands

### Replacing Commands

```ts
export default {
  commands: {
    // Override built-in send command
    send: {
      triggers: ['send', 'go', 'submit', 'execute'],
      handler: async (ctx) => {
        // Custom send logic
        const enhanced = await enhancePrompt(ctx.transcript)
        await defaultSend(enhanced)
      },
    },
  },
}
```

### Extending Commands

```ts
import { getBuiltinCommand, extendCommand } from 'voide'

const originalSend = getBuiltinCommand('send')

extendCommand('send', {
  before: async (ctx) => {
    // Add timestamp to all messages
    ctx.transcript = `[${new Date().toISOString()}] ${ctx.transcript}`
    return true
  },
})
```

## Testing Commands

### Unit Testing

```ts
import { testCommand, createMockContext } from 'voide/testing'

describe('My Command', () => {
  it('should execute correctly', async () => {
    const ctx = createMockContext({
      transcript: 'do something important',
    })

    const result = await testCommand(myCommand, ctx)

    expect(result.executed).toBe(true)
    expect(result.error).toBeUndefined()
  })
})
```

### Integration Testing

```ts
import { createTestApp } from 'voide/testing'

describe('Command Integration', () => {
  it('should handle full flow', async () => {
    const app = await createTestApp({
      commands: [myCommand],
    })

    // Simulate voice input
    await app.simulateVoice('do something')

    expect(app.lastAction).toBe('something-done')
  })
})
```

## Best Practices

### Naming Conventions

- Use descriptive, action-oriented names
- Keep triggers natural and conversational
- Provide multiple trigger variations

### Error Handling

```ts
const robustCommand: VoideCommand = {
  name: 'safe-command',
  triggers: ['do risky thing'],
  handler: async (ctx) => {
    try {
      await riskyOperation()
      ctx.speak('Done!')
    }
    catch (error) {
      ctx.speak('Failed to complete. Try again?')
      console.error(error)
    }
  },
}
```

### User Feedback

```ts
const feedbackCommand: VoideCommand = {
  name: 'long-operation',
  triggers: ['process files'],
  handler: async (ctx) => {
    ctx.speak('Processing files. This may take a moment.')

    const progress = createProgressReporter()
    progress.on('update', (p) => {
      if (p % 25 === 0) {
        ctx.speak(`${p} percent complete`)
      }
    })

    await processFiles(progress)
    ctx.speak('All files processed.')
  },
}
```

## Next Steps

- [Configuration](/advanced/configuration) - Configure commands globally
- [API Integration](/advanced/api-integration) - Integrate with external APIs
- [Performance](/advanced/performance) - Optimize command execution
