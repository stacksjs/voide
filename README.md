# Voide

Voice-controlled AI code assistant built with [STX](https://github.com/stacksjs/stx).

## Features

- Voice input with Web Speech API
- Multiple AI drivers (Claude CLI, Claude API, OpenAI, Ollama)
- Git integration (commit, push)
- GitHub account connection
- Native desktop support via Craft
- Reactive state management with stores
- Vue-like Single File Components (SFC)

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

Voide uses STX Single File Components with Vue-like syntax.

### Component Structure

Components live in `components/` and are auto-imported using PascalCase:

```html
<!-- pages/index.stx -->
@layout('default')

@section('content')
<VoideHeader />

<main class="flex-1 flex flex-col">
  <VoideTerminal />
  <VoideInputBar />
</main>

<VoideFooter />
<VoideModals />
@endsection
```

### SFC Anatomy

Components use three sections: `<script server>`, `<template>`, and `<script client>`:

```html
<!-- components/MyComponent.stx -->
<script server>
// Server-side only - extracted for SSR, stripped from output
const title = props.title || 'Default Title'
const count = props.count || 0
</script>

<template>
  <div class="card">
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <slot />
  </div>
</template>

<script client>
// Client-side only - preserved for browser execution
(() => {
  console.log('Component mounted');
})();
</script>
```

### Passing Props

Pass data to components via attributes:

```html
<!-- String prop -->
<VoideHeader title="My App" />

<!-- Expression prop with :binding -->
<Card :count="items.length" />

<!-- Mustache interpolation -->
<Message text="{{ userName }}" />
```

### Slots

Use `<slot />` to inject content into components:

```html
<!-- Parent -->
<Card title="Welcome">
  <p>This content goes into the slot!</p>
</Card>

<!-- Card component -->
<template>
  <div class="card">
    <h2>{{ props.title }}</h2>
    <slot />
  </div>
</template>
```

### Client Scripts with Stores

Components can subscribe to reactive stores:

```html
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

### Two-Way Binding (x-element)

For simple reactive forms, use x-element directives:

```html
<div x-data="{ message: '', count: 0 }">
  <input x-model="message" placeholder="Type here..." />
  <p>You typed: <span x-text="message"></span></p>

  <button @click="count++">Increment</button>
  <span x-text="count"></span>
</div>
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

| Component | Description |
|-----------|-------------|
| `VoideHeader` | App header with repo input, driver selector, settings |
| `VoideTerminal` | Chat output with message rendering |
| `VoideInputBar` | Voice button, text input, action buttons |
| `VoideFooter` | Application footer |
| `VoideModals` | GitHub and settings modals |

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
