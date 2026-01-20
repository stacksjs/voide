# Introduction

voide is a Voice AI Code Assistant that enables developers to interact with AI-powered coding tools using natural voice commands. Built with Claude integration, voide transforms how you write, edit, and navigate code.

## What is voide?

voide is a hands-free coding assistant that combines:

- Real-time speech recognition for natural voice input
- AI-powered code generation and editing via Claude
- Intelligent voice commands for common operations
- Text-to-speech feedback for a complete voice-first experience

Whether you're debugging, writing documentation, or exploring new codebases, voide lets you keep your hands on the keyboard while communicating naturally with your AI assistant.

## Key Features

### Natural Voice Interaction

Speak naturally to your AI assistant without remembering complex commands:

```
"Create a function that validates email addresses"
"Explain what this code does"
"Add error handling to the fetch request"
"Refactor this to use async/await"
```

### Real-Time Transcription

See your words appear as you speak with low-latency transcription:

- Continuous speech recognition
- Automatic punctuation conversion
- Support for technical terms and code vocabulary
- Multi-language support

### Smart Voice Commands

Built-in commands for common operations:

| Command | Action |
|---------|--------|
| "Send" / "Go" | Submit your current prompt |
| "Reset" | Clear the current input |
| "Oops" | Delete the last word |
| "Cancel" | Stop the current AI response |
| "Repeat" | Hear the last response again |
| "Quiet" | Stop text-to-speech |
| "Clear chat" | Start a new conversation |

### Claude AI Integration

Powered by Anthropic's Claude for intelligent code assistance:

```
You: "Write a TypeScript function to debounce API calls"

Claude: Here's a TypeScript debounce function:

const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
```

## Why Voice Coding?

### Reduce Physical Strain

Extended typing sessions can lead to repetitive strain injuries. Voice input lets you rest your hands while staying productive.

### Think Out Loud

Verbalizing your thoughts can help clarify problems and solutions. voide captures your thought process directly.

### Accessibility

Voice interfaces make coding more accessible to developers with mobility impairments or those who prefer alternative input methods.

### Multitasking

Review code on one screen while dictating changes without switching contexts or reaching for the keyboard.

## Quick Start

Get started with voide in minutes:

```bash
# Install voide
bun add voide

# Set up your Anthropic API key
export ANTHROPIC_API_KEY=your-api-key

# Start voide
bun run voide
```

Once running, simply speak to interact:

```
"Hello, voide"
> Hello! I'm ready to help you code. What would you like to work on?

"Create a React component for a todo list"
> Here's a React todo list component...
```

## Architecture Overview

voide consists of several integrated components:

```
                    +------------------+
                    |   Microphone     |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | Speech Recognition|
                    | (Web Speech API)  |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | Voice Commands   |
                    | Detection        |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |  Claude AI       |
                    |  Integration     |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | Text-to-Speech   |
                    +------------------+
```

## Browser Support

voide uses the Web Speech API for voice recognition:

| Browser | Support |
|---------|---------|
| Chrome | Full Support |
| Edge | Full Support |
| Safari | Partial Support |
| Firefox | Limited Support |

For best results, use Chrome or Edge with a quality microphone.

## Next Steps

- [Installation](/install) - Set up voide on your system
- [Usage Guide](/usage) - Learn the basics
- [Voice Commands](/features/voice-commands) - Master voice commands
- [Configuration](/config) - Customize voide
