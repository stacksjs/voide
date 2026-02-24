# voide (app)

Voice AI Code Assistant -- web application frontend. Built with Stacks (stx) and powered by the Anthropic Claude Agent SDK.

## Installation

```bash
bun install
```

## Usage

```bash
# Start dev server and backend together
bun run start

# Or run individually
bun run dev      # Frontend dev server
bun run server   # Backend API server

# Build for production
bun run build

# Lint and format
bun run lint
bun run format
```

## Features

- Voice-powered AI code assistant interface
- Reactive state management via custom store system (`appStore`, `chatStore`, `settingsStore`, `uiStore`)
- Per-session chat isolation with independent repo paths
- Stacks component architecture (`.stx` files)
- Crosswind CSS styling
- Integration with `@anthropic-ai/claude-agent-sdk`

## License

MIT
