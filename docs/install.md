# Installation

This guide covers all the ways to install and set up voide for development or production use.

## Prerequisites

Before installing voide, ensure you have:

- **Bun** (v1.0 or later) or Node.js (v18 or later)
- **A modern browser** (Chrome or Edge recommended)
- **A microphone** for voice input
- **Anthropic API key** for Claude integration

## Package Installation

::: code-group

```sh [bun]
# Install as a dependency
bun add voide

# Or install globally
bun add -g voide
```

```sh [npm]
# Install as a dependency
npm install voide

# Or install globally
npm install -g voide
```

```sh [pnpm]
# Install as a dependency
pnpm add voide

# Or install globally
pnpm add -g voide
```

```sh [yarn]
# Install as a dependency
yarn add voide

# Or install globally
yarn global add voide
```

:::

## API Key Setup

voide requires an Anthropic API key to communicate with Claude.

### Getting an API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key

### Configuring the API Key

::: code-group

```sh [Environment Variable]
# Add to your shell profile (.bashrc, .zshrc, etc.)
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Or create a .env file in your project
echo "ANTHROPIC_API_KEY=sk-ant-api03-xxxxx" > .env
```

```ts [Configuration File]
// voide.config.ts
export default {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    // Or hardcode (not recommended for production)
    // apiKey: 'sk-ant-api03-xxxxx',
  },
}
```

:::

## Browser Setup

### Microphone Permissions

voide requires microphone access for voice recognition:

1. When prompted, click "Allow" to grant microphone access
2. For Chrome: Settings > Privacy > Site Settings > Microphone
3. For Edge: Settings > Site permissions > Microphone

### HTTPS Requirement

Web Speech API requires a secure context:

- **Development**: `localhost` works without HTTPS
- **Production**: Must be served over HTTPS

## Development Setup

### Clone and Install

```sh
# Clone the repository
git clone https://github.com/stacksjs/voide.git
cd voide

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start development server
bun run dev
```

### Project Structure

```
voide/
├── components/        # UI components
├── lib/
│   ├── composables/  # Vue composables
│   │   ├── use-audio-recorder.ts
│   │   ├── use-voice-commands.ts
│   │   └── ...
│   ├── stores/       # State management
│   └── server/       # Backend server
├── pages/            # Application pages
├── public/           # Static assets
└── voide.config.ts   # Configuration
```

## Server Setup

voide can run as a standalone server:

```sh
# Start the server
bun run server

# Server starts on http://localhost:3000
```

### Server Configuration

```ts
// server.config.ts
export default {
  port: 3000,
  host: 'localhost',

  // CORS settings
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 60000,
    max: 100,
  },
}
```

## Docker Installation

### Using Docker

```dockerfile
# Dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application
COPY . .

# Build application
RUN bun run build

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "run", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  voide:
    build: .
    ports:
      - '3000:3000'
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./data:/app/data
```

```sh
# Start with Docker Compose
docker-compose up -d
```

## Verifying Installation

### Check Installation

```sh
# Verify voide is installed
voide --version

# Check system requirements
voide doctor
```

### Test Voice Recognition

```sh
# Start voide
voide

# In the browser, click the microphone button
# Speak: "Hello, voide"
# You should see your words transcribed
```

### Test AI Integration

```sh
# With voide running, speak:
# "What's 2 plus 2?"
# Claude should respond with "4"
```

## Troubleshooting

### Microphone Not Working

```sh
# Check if browser has microphone permission
# Chrome: chrome://settings/content/microphone
# Edge: edge://settings/content/microphone

# Test microphone in system settings
# macOS: System Preferences > Sound > Input
# Windows: Settings > System > Sound > Input
```

### API Key Issues

```sh
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Test API key directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Speech Recognition Not Starting

- Ensure you're using Chrome or Edge
- Check that you're on `localhost` or HTTPS
- Clear browser cache and reload
- Check browser console for errors

## Next Steps

- [Usage Guide](/usage) - Learn how to use voide
- [Voice Commands](/features/voice-commands) - Master voice commands
- [Configuration](/config) - Customize your setup
