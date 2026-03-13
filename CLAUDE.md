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

---

## Linting

- Use **pickier** for linting — never use eslint directly
- Run `bunx --bun pickier .` to lint, `bunx --bun pickier . --fix` to auto-fix
- When fixing unused variable warnings, prefer `// eslint-disable-next-line` comments over prefixing with `_`

## Frontend

- Use **stx** for templating — never write vanilla JS (`var`, `document.*`, `window.*`) in stx templates
- Use **crosswind** as the default CSS framework which enables standard Tailwind-like utility classes
- stx `<script>` tags should only contain stx-compatible code (signals, composables, directives)

## Dependencies

- **buddy-bot** handles dependency updates — not renovatebot
- **better-dx** provides shared dev tooling as peer dependencies — do not install its peers (e.g., `typescript`, `pickier`, `bun-plugin-dtsx`) separately if `better-dx` is already in `package.json`
- If `better-dx` is in `package.json`, ensure `bunfig.toml` includes `linker = "hoisted"`
