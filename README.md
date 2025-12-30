# Voide

Voice-controlled AI code assistant built with [STX](https://github.com/stacksjs/stx).

## Features

- Voice input with Web Speech API
- Multiple AI drivers (Claude CLI, Claude API, OpenAI, Ollama)
- Git integration (commit, push)
- GitHub account connection
- Native desktop support via Craft
- Reactive state management with stores
- Single File Components (SFC) with Vue-style component syntax

## Getting Started

```bash
# Install dependencies
bun install

# Build stores and CSS
bun run build:all

# Start development server
bun run dev
```

## Single File Components (SFC)

Voide uses STX Single File Components with Vue-style syntax for a clean, modular architecture.

### Component Structure

Components live in `components/` and are used with PascalCase tags:

```html
<!-- pages/index.stx -->
<VoideHeader />

<main class="flex-1 flex flex-col">
  <VoideTerminal />
  <VoideInputBar />
</main>

<VoideFooter />
<VoideModals />
```

Component files use kebab-case naming:
- `<VoideHeader />` → `components/voide-header.stx`
- `<VoideInputBar />` → `components/voide-input-bar.stx`

### Client Scripts

Components can include client-side JavaScript that runs in the browser:

```html
<!-- components/my-component.stx -->
<div id="myElement">Content</div>

<script client>
(() => {
  function init() {
    const stores = window.VoideStores;
    if (!stores) {
      setTimeout(init, 10);
      return;
    }

    // Subscribe to store changes
    stores.appStore.subscribe((state) => {
      const el = document.getElementById('myElement');
      if (el) {
        el.textContent = state.transcript;
      }
    });
  }

  init();
})();
</script>
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

All components are in `components/` and use the SFC pattern:

- `voide-header.stx` - App header with repo input, driver selector, settings
- `voide-terminal.stx` - Chat output with message rendering
- `voide-input-bar.stx` - Voice button, text input, action buttons
- `voide-footer.stx` - Application footer
- `voide-modals.stx` - GitHub and settings modals

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
