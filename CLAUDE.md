# Voide - Claude Code Guidelines

## Code Style

- **No semicolons in JS/TS** - Do not use semicolons at the end of JavaScript/TypeScript statements
- **CSS still requires semicolons** - Keep semicolons in `<style>` blocks and `.css` files
- Use single quotes for strings
- Use 2-space indentation
- Use TypeScript for all `.ts` files
- Use `.stx` files for components (Stacks component format)

## Project Structure

- `components/` - UI components (.stx files)
- `lib/` - Core library code
- `lib/stores/` - State management stores
- `server/` - Backend API server
- `public/` - Static assets

## State Management

- Uses a custom reactive store system (`lib/store.ts`)
- Stores: `appStore`, `chatStore`, `settingsStore`, `uiStore`
- Stores are available via `window.__STX_STORES__` in client scripts

## Per-Session Isolation

- Each chat has its own `repoPath` and `sessionId`
- Processing state is tracked per-chat via `processingChatId`
- When switching chats, restore the chat's `repoPath` to `appStore`
