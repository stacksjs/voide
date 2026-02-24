# @voide/cli

Voice AI Code Assistant CLI. A terminal-based interface for interacting with AI coding agents, featuring voice input, multi-provider support, tool execution, and session management.

## Installation

```bash
bun add @voide/cli
# or
npm install @voide/cli
```

## Usage

```bash
# Run directly
voide

# Or via bun
bun run voide
```

### Programmatic usage

```ts
import {
  loadConfig,
  getProvider,
  registerTool,
  getAllTools,
} from '@voide/cli'

// Load configuration
const config = await loadConfig()

// Get an AI provider
const provider = getProvider('anthropic')

// Register custom tools
registerTool({ name: 'my-tool', ... })
```

## Features

- Voice input and transcription
- Multi-provider AI support (Anthropic and more)
- Built-in tools: read, write, edit, glob, grep, bash
- MCP (Model Context Protocol) integration
- Session management with history
- GitHub integration
- LSP support
- Permission system for tool execution
- OAuth authentication
- TUI interface with theming
- Cross-platform compiled binaries (Linux x64/arm64, macOS x64/arm64)

## License

MIT
