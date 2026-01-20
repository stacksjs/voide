# Voice Commands

voide includes a powerful voice command system that lets you control the application and edit your input using natural speech. This guide covers all built-in commands and how to customize them.

## Command Overview

Voice commands are special phrases that trigger actions instead of being sent to Claude. They're detected at the end of your speech or as standalone phrases.

### How Commands Work

1. Speak your prompt or command
2. voide detects if your speech ends with a command
3. If a command is detected, the action is executed
4. Otherwise, the transcript is added to your input

```
"Create a function that validates emails send"
                                         ↑
                          Command detected, prompt is sent

"Write some documentation"
         ↑
         No command, text is added to input
```

## Built-in Commands

### Submission Commands

| Command | Aliases | Action |
|---------|---------|--------|
| **Send** | "go", "submit" | Send current input to Claude |

Example:
```
"Write a function to sort an array send"
```
Sends: "Write a function to sort an array"

### Editing Commands

| Command | Action |
|---------|--------|
| **Reset** | Clear all input |
| **Oops** | Delete the last word |

Examples:
```
"Create a class reset"
→ Input is cleared

"Create a function oops method that returns"
→ "Create a method that returns"
```

### Response Control

| Command | Aliases | Action |
|---------|---------|--------|
| **Cancel** | - | Stop Claude's current response |
| **Repeat** | "say again", "repeat that" | Replay the last response |
| **Quiet** | "shut up", "be quiet", "silence", "stop talking" | Stop text-to-speech |

### Session Control

| Command | Aliases | Action |
|---------|---------|--------|
| **Stop** | "pause" | Turn off the microphone |
| **Clear chat** | "new chat" | Start a new conversation |

## Spoken Punctuation

voide automatically converts spoken punctuation to symbols:

### Basic Punctuation

| Say | Result |
|-----|--------|
| "period" or "full stop" | `.` |
| "comma" | `,` |
| "question mark" | `?` |
| "exclamation mark" or "exclamation point" | `!` |
| "colon" | `:` |
| "semicolon" or "semi colon" | `;` |
| "ellipsis" or "dot dot dot" | `...` |

### Quotes

| Say | Result |
|-----|--------|
| "quote" or "open quote" | `"` |
| "end quote" or "close quote" | `"` |
| "single quote" or "apostrophe" | `'` |

### Brackets and Parentheses

| Say | Result |
|-----|--------|
| "open paren" or "left paren" | `(` |
| "close paren" or "right paren" | `)` |
| "open bracket" or "left bracket" | `[` |
| "close bracket" or "right bracket" | `]` |
| "open brace" or "left brace" or "open curly" | `{` |
| "close brace" or "right brace" or "close curly" | `}` |

### Special Characters

| Say | Result |
|-----|--------|
| "hyphen" or "dash" | `-` |
| "underscore" | `_` |
| "slash" or "forward slash" | `/` |
| "backslash" or "back slash" | `\` |
| "pipe" | `|` |
| "ampersand" | `&` |
| "at sign" | `@` |
| "hash" or "hashtag" or "pound sign" | `#` |
| "asterisk" or "star" | `*` |
| "percent" or "percent sign" | `%` |
| "caret" | `^` |
| "tilde" | `~` |
| "backtick" or "grave" | `` ` `` |

### Operators

| Say | Result |
|-----|--------|
| "equals" or "equal sign" | `=` |
| "less than" | `<` |
| "greater than" | `>` |

### Whitespace

| Say | Result |
|-----|--------|
| "new line" or "newline" | Line break |

## Practical Examples

### Writing Code

```
"function add open paren a comma b close paren open brace
return a plus b semicolon
close brace"
```
Result:
```javascript
function add(a, b) {
return a + b;
}
```

### Writing Documentation

```
"This function takes two parameters colon
new line hyphen a colon the first number
new line hyphen b colon the second number"
```
Result:
```
This function takes two parameters:
- a: the first number
- b: the second number
```

### Editing Mistakes

```
"Create a funtion oops function that validates"
```
Result: "Create a function that validates"

### Complex Workflow

```
You: "Write a TypeScript interface for a user with
      name comma email comma and optional phone send"

Claude: [provides interface]

You: "Add a created at timestamp field send"

Claude: [updates interface]

You: "Clear chat"

[Conversation cleared]
```

## Command Detection

### Position Sensitivity

Commands are detected at the end of utterances:

```
"Send an email to the user"     → NOT a command (send is in middle)
"Write a function send"         → IS a command (send at end)
"Send"                          → IS a command (standalone)
```

### Timing

Commands are processed after a brief pause in speech:

```
[Speaking] "Create a function..."
[Pause]
[Speaking] "...send"
[Pause detected, command processed]
```

### Confidence Threshold

Commands must meet a minimum confidence level:

```ts
// Configuration
voice: {
  commandConfidence: 0.8, // 80% confidence required
}
```

## Command API

### Detecting Commands

```ts
import { detectVoiceCommand } from 'voide'

const result = detectVoiceCommand('create a function send')
console.log(result)
// {
//   type: 'send',
//   transcript: 'create a function'
// }
```

### Available Types

```ts
type VoiceCommandType =
  | 'reset'      // Clear input
  | 'oops'       // Delete last word
  | 'send'       // Submit prompt
  | 'stop'       // Stop recording
  | 'cancel'     // Cancel response
  | 'repeat'     // Repeat response
  | 'quiet'      // Stop TTS
  | 'clear_chat' // Clear conversation
  | 'none'       // No command detected
```

### Command Handler

```ts
import { useVoiceCommands } from 'voide'

const commands = useVoiceCommands()

// Process transcript
const result = commands.detect(transcript)

switch (result.type) {
  case 'send':
    submitPrompt(result.transcript)
    break
  case 'oops':
    updateInput(result.transcript)
    break
  case 'reset':
    clearInput()
    break
  // ... handle other commands
}
```

## Customizing Commands

### Adding Aliases

```ts
// voide.config.ts
export default {
  commands: {
    send: ['send', 'go', 'submit', 'execute', 'run'],
    reset: ['reset', 'clear', 'start over', 'begin again'],
    undo: ['oops', 'undo', 'whoops', 'my bad'],
  },
}
```

### Disabling Commands

```ts
export default {
  commands: {
    disabled: ['quiet', 'clear_chat'],
  },
}
```

### Custom Punctuation

```ts
export default {
  punctuation: {
    custom: [
      { spoken: 'arrow function', symbol: '=>' },
      { spoken: 'triple equals', symbol: '===' },
      { spoken: 'not equals', symbol: '!==' },
      { spoken: 'spread operator', symbol: '...' },
      { spoken: 'optional chain', symbol: '?.' },
      { spoken: 'null coalesce', symbol: '??' },
    ],
  },
}
```

## Tips for Effective Commands

### Speak Clearly

Commands work best when spoken clearly:
- Pause briefly before the command
- Enunciate the command word
- Wait for the action before continuing

### Use Shortcuts

For frequent actions, use the shortest trigger:
- "Go" instead of "submit"
- "Reset" instead of "clear everything"

### Combine with Keyboard

Use voice for content, keyboard for quick edits:
- Voice: Dictate your prompt
- Keyboard: Fix typos
- Voice: "Send"

## Next Steps

- [AI Integration](/features/ai-integration) - Configure Claude integration
- [Real-time Transcription](/features/real-time-transcription) - Speech recognition details
- [Custom Commands](/advanced/custom-commands) - Create custom commands
