# Usage

This guide covers how to effectively use voide for voice-driven coding assistance.

## Getting Started

### Starting voide

```sh
# Start the development server
bun run dev

# Or start in production mode
bun run start
```

Open your browser to `http://localhost:3000` to access the voide interface.

### Interface Overview

The voide interface consists of:

- **Chat Panel**: Shows conversation history with Claude
- **Input Area**: Displays your transcribed speech
- **Microphone Button**: Toggle voice recording
- **Settings Panel**: Configure voice and AI settings

## Voice Input

### Activating the Microphone

Click the microphone button or use the keyboard shortcut:

- **macOS**: `Cmd + Shift + M`
- **Windows/Linux**: `Ctrl + Shift + M`

The microphone indicator shows recording status:
- Grey: Microphone off
- Red: Recording active
- Pulsing: Processing speech

### Speaking Naturally

voide uses continuous speech recognition. Speak naturally as you would to a colleague:

```
"Create a function that takes an array of numbers
and returns the sum of all even numbers"
```

Your speech is transcribed in real-time and appears in the input area.

### Spoken Punctuation

voide automatically converts spoken punctuation:

| Say | Result |
|-----|--------|
| "period" | `.` |
| "comma" | `,` |
| "question mark" | `?` |
| "exclamation mark" | `!` |
| "colon" | `:` |
| "semicolon" | `;` |
| "quote" / "end quote" | `"` |
| "open paren" / "close paren" | `()` |
| "open bracket" / "close bracket" | `[]` |
| "open brace" / "close brace" | `{}` |
| "new line" | line break |

Example:
```
"function add open paren a comma b close paren return a plus b"
```
Becomes:
```
function add(a, b) return a + b
```

## Basic Voice Commands

### Submitting Prompts

Say "send", "go", or "submit" to send your prompt to Claude:

```
"Write a hello world function in Python send"
```

This sends: "Write a hello world function in Python"

### Editing Input

**Undo last word:**
```
"Create a function that oops method that validates email"
```
Result: "Create a method that validates email"

**Clear input:**
```
"Reset"
```
Clears the entire input field.

### Controlling Responses

**Stop Claude mid-response:**
```
"Cancel"
```

**Repeat last response:**
```
"Repeat"
```

**Stop text-to-speech:**
```
"Quiet" or "Shut up"
```

### Managing Conversations

**Start new conversation:**
```
"Clear chat" or "New chat"
```

**Pause voice input:**
```
"Stop" or "Pause"
```

## Coding with voide

### Code Generation

Ask Claude to generate code naturally:

```
"Create a TypeScript interface for a user with
name, email, and optional phone number"
```

Claude responds:
```typescript
interface User {
  name: string
  email: string
  phone?: string
}
```

### Code Explanation

Ask about existing code:

```
"Explain what this regex does: slash caret
open bracket a dash z close bracket plus dollar slash"
```

### Refactoring

Request code improvements:

```
"Refactor this callback-based function to use async await"
```

### Debugging

Describe issues for debugging help:

```
"My fetch request returns undefined even though
the API returns data. What might be wrong?"
```

## Working with Context

### Providing Context

Give Claude context about your project:

```
"I'm working on a React app with TypeScript.
Create a custom hook for form validation"
```

### Multi-Turn Conversations

Build on previous responses:

```
You: "Create a function to validate passwords"
Claude: [provides function]
You: "Add a check for special characters"
Claude: [updates function]
You: "Now add TypeScript types"
Claude: [adds types]
```

### Code References

Reference code by describing it:

```
"In the function we just created, add error handling
for null inputs"
```

## Text-to-Speech

### Enabling TTS

voide can read Claude's responses aloud:

1. Open Settings
2. Enable "Text-to-Speech"
3. Adjust voice and speed

### Controlling Playback

| Command | Action |
|---------|--------|
| "Quiet" | Stop current speech |
| "Repeat" | Replay last response |
| "Pause" | Pause TTS (resume with "Continue") |

### TTS Settings

```ts
// Configure TTS in settings
{
  tts: {
    enabled: true,
    voice: 'en-US-Neural2-J', // Voice ID
    rate: 1.0, // Speech rate (0.5-2.0)
    pitch: 1.0, // Voice pitch (0.5-2.0)
    volume: 0.8, // Volume (0-1)
  }
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + M` | Toggle microphone |
| `Cmd/Ctrl + Enter` | Send message |
| `Escape` | Cancel current operation |
| `Cmd/Ctrl + K` | Clear chat |
| `Cmd/Ctrl + /` | Open settings |

## Tips for Effective Use

### Speak Clearly

- Use a quality microphone
- Minimize background noise
- Speak at a moderate pace
- Enunciate technical terms

### Be Specific

Instead of:
```
"Make it better"
```

Say:
```
"Improve the error handling by catching
specific exceptions and logging them"
```

### Use Incremental Requests

Break complex tasks into steps:

```
1. "Create a basic Express server"
2. "Add a route for user registration"
3. "Add validation for the registration data"
4. "Add error handling middleware"
```

### Review Before Sending

Watch the transcription before saying "send" to catch errors:

```
"Create a function to parse JSON send"
                                   ↑
            Wait for transcription before "send"
```

## Handling Errors

### Transcription Errors

If voide misheard you:
- Say "oops" to delete the last word
- Say "reset" to start over
- Type corrections in the input field

### API Errors

If Claude doesn't respond:
- Check your internet connection
- Verify your API key is valid
- Check API rate limits

### Recognition Failures

If speech isn't recognized:
- Check microphone permissions
- Ensure you're in Chrome or Edge
- Speak closer to the microphone

## Next Steps

- [Voice Commands](/features/voice-commands) - Complete command reference
- [AI Integration](/features/ai-integration) - Advanced AI features
- [Configuration](/config) - Customize voide settings
