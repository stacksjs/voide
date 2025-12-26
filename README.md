# Voide

Voice-controlled AI code assistant built with [STX](https://github.com/stacksjs/stx).

## Features

- Voice input with Web Speech API
- Multiple AI drivers (Claude CLI, Claude API, OpenAI, Ollama)
- Git integration (commit, push)
- GitHub account connection
- Native desktop support via Craft
- Reactive state management with stores

## Getting Started

```bash
# Install dependencies
bun install

# Build stores and CSS
bun run build:all

# Start development server
bun run dev
```

## Architecture

### Stores

Voide uses a reactive store pattern for state management:

- **appStore** - Application state (recording, processing, repo path)
- **chatStore** - Chat messages and history
- **settingsStore** - API keys, GitHub connection, preferences
- **uiStore** - Modal visibility, UI state

### Composables

Browser API utilities available via `VoideStores`:

| Category | Composables |
|----------|-------------|
| Storage | `useStorage`, `useLocalStorage`, `useSessionStorage` |
| Cookies | `useCookie`, `getCookie`, `setCookie` |
| Clipboard | `useClipboard`, `copyToClipboard` |
| Media | `useMediaQuery`, `usePreferredDark`, `useIsMobile` |
| Network | `useNetwork`, `useOnline` |
| Window | `useWindowSize`, `useScroll`, `useVisibility`, `useTitle` |
| Geolocation | `useGeolocation`, `getCurrentPosition` |
| Input | `useMouse`, `usePointer`, `useKeyboard`, `useHotkey` |
| Observers | `useIntersectionObserver`, `useResizeObserver`, `useMutationObserver` |
| Data | `useFetch`, `useAsyncData` |
| UI | `useFullscreen`, `useNotification`, `useShare` |
| Permissions | `usePermission`, `usePermissions` |
| Device | `useBattery`, `useDeviceOrientation`, `useDeviceMotion` |
| Speech | `useSpeechRecognition`, `useSpeechSynthesis` |
| Communication | `useWebSocket`, `useBroadcastChannel`, `useEventSource` |
| Idle | `useIdle`, `useIdleState`, `useAutoLogout` |
| Selection | `useTextSelection`, `useCopySelection` |
| Screen | `useWakeLock`, `useEyeDropper` |

### Components

- `header.stx` - App header with repo input, driver selector, settings
- `terminal.stx` - Chat output with message rendering
- `input-bar.stx` - Voice button, text input, action buttons
- `modals.stx` - GitHub and settings modals

## Styling

Uses [Headwind](https://github.com/stacksjs/headwind) with a Monokai Pro color theme:

```
monokai-bg, monokai-bg-dark, monokai-fg
monokai-pink, monokai-orange, monokai-yellow
monokai-green, monokai-cyan, monokai-purple
monokai-gray, monokai-border
```

## Scripts

```bash
bun run dev          # Start dev server
bun run build:all    # Build stores + CSS
bun run build:stores # Build stores only
bun run build:css    # Build CSS only
```

## License

MIT
