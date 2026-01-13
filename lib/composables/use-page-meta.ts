/**
 * Page metadata composables - definePageMeta
 * Similar to Nuxt's definePageMeta API for page-level configuration
 */

import { useHead, useSeoMeta } from './use-head'

// ============================================================================
// Types
// ============================================================================

export interface PageMeta {
  // SEO & Head
  title?: string
  description?: string

  // Layout
  layout?: string | false

  // Middleware
  middleware?: string | string[]

  // Route options
  path?: string
  alias?: string | string[]
  redirect?: string | { name: string } | ((to: { path: string }) => string)
  name?: string

  // Component behavior
  keepAlive?: boolean | { include?: string | RegExp | Array<string | RegExp>; exclude?: string | RegExp | Array<string | RegExp>; max?: number }
  scrollToTop?: boolean | ((to: { path: string }, from: { path: string }) => boolean)

  // Page transitions
  pageTransition?: boolean | string | { name?: string; mode?: 'in-out' | 'out-in' | 'default'; duration?: number }
  layoutTransition?: boolean | string | { name?: string; mode?: 'in-out' | 'out-in' | 'default'; duration?: number }

  // Auth
  auth?: boolean | 'guest' | string

  // Custom data
  [key: string]: unknown
}

export interface PageMetaContext {
  route: {
    path: string
    params: Record<string, string>
    query: Record<string, string>
  }
}

// ============================================================================
// State
// ============================================================================

let currentPageMeta: PageMeta = {}
const pageMetaSubscribers = new Set<(meta: PageMeta) => void>()

// ============================================================================
// definePageMeta
// ============================================================================

/**
 * Define page-level configuration (Nuxt-style)
 * @example
 * definePageMeta({
 *   title: 'Dashboard',
 *   description: 'User dashboard page',
 *   layout: 'admin',
 *   middleware: ['auth', 'admin'],
 *   keepAlive: true
 * })
 */
export function definePageMeta(meta: PageMeta): void {
  currentPageMeta = { ...meta }

  // Apply title and description to head
  if (meta.title || meta.description) {
    useSeoMeta({
      title: meta.title,
      description: meta.description,
    })
  }

  // Notify subscribers
  for (const cb of pageMetaSubscribers) {
    try { cb(currentPageMeta) } catch {}
  }
}

/**
 * Get the current page metadata
 */
export function getPageMeta(): PageMeta {
  return { ...currentPageMeta }
}

/**
 * Subscribe to page metadata changes
 */
export function subscribePageMeta(callback: (meta: PageMeta) => void): () => void {
  pageMetaSubscribers.add(callback)
  return () => pageMetaSubscribers.delete(callback)
}

/**
 * Reset page metadata
 */
export function resetPageMeta(): void {
  currentPageMeta = {}
  for (const cb of pageMetaSubscribers) {
    try { cb(currentPageMeta) } catch {}
  }
}

// ============================================================================
// Middleware helpers
// ============================================================================

export type MiddlewareFn = (context: PageMetaContext) => void | boolean | Promise<void | boolean> | string | { redirect: string }

const middlewareRegistry = new Map<string, MiddlewareFn>()

/**
 * Register a named middleware
 * @example
 * registerMiddleware('auth', (ctx) => {
 *   if (!isAuthenticated()) return { redirect: '/login' }
 * })
 */
export function registerMiddleware(name: string, fn: MiddlewareFn): void {
  middlewareRegistry.set(name, fn)
}

/**
 * Get a registered middleware by name
 */
export function getMiddleware(name: string): MiddlewareFn | undefined {
  return middlewareRegistry.get(name)
}

/**
 * Execute middleware chain for current page
 */
export async function executeMiddleware(context: PageMetaContext): Promise<{ redirect?: string; blocked?: boolean }> {
  const meta = currentPageMeta
  if (!meta.middleware) return {}

  const middlewareNames = Array.isArray(meta.middleware) ? meta.middleware : [meta.middleware]

  for (const name of middlewareNames) {
    const fn = middlewareRegistry.get(name)
    if (!fn) {
      console.warn(`Middleware "${name}" not found`)
      continue
    }

    try {
      const result = await fn(context)

      if (result === false) {
        return { blocked: true }
      }

      if (typeof result === 'string') {
        return { redirect: result }
      }

      if (result && typeof result === 'object' && 'redirect' in result) {
        return { redirect: result.redirect }
      }
    } catch (err) {
      console.error(`Middleware "${name}" error:`, err)
      return { blocked: true }
    }
  }

  return {}
}

// ============================================================================
// Layout helpers
// ============================================================================

let currentLayout: string | false = 'default'
const layoutSubscribers = new Set<(layout: string | false) => void>()

/**
 * Get the current layout name
 */
export function getCurrentLayout(): string | false {
  return currentPageMeta.layout ?? currentLayout
}

/**
 * Set the default layout
 */
export function setDefaultLayout(layout: string): void {
  currentLayout = layout
}

/**
 * Subscribe to layout changes
 */
export function subscribeLayout(callback: (layout: string | false) => void): () => void {
  layoutSubscribers.add(callback)
  return () => layoutSubscribers.delete(callback)
}

// ============================================================================
// Route helpers
// ============================================================================

/**
 * Check if current page requires authentication
 */
export function requiresAuth(): boolean | string {
  const meta = currentPageMeta
  if (meta.auth === undefined) return false
  if (meta.auth === true) return true
  if (meta.auth === 'guest') return 'guest'
  return meta.auth
}

/**
 * Check if keep-alive is enabled for current page
 */
export function isKeepAliveEnabled(): boolean | { include?: string | RegExp | Array<string | RegExp>; exclude?: string | RegExp | Array<string | RegExp>; max?: number } {
  const meta = currentPageMeta
  if (!meta.keepAlive) return false
  if (meta.keepAlive === true) return true
  return meta.keepAlive
}

/**
 * Get page transition configuration
 */
export function getPageTransition(): { name: string; mode: string; duration: number } | null {
  const meta = currentPageMeta
  if (!meta.pageTransition) return null

  if (meta.pageTransition === true) {
    return { name: 'page', mode: 'default', duration: 300 }
  }

  if (typeof meta.pageTransition === 'string') {
    return { name: meta.pageTransition, mode: 'default', duration: 300 }
  }

  return {
    name: meta.pageTransition.name || 'page',
    mode: meta.pageTransition.mode || 'default',
    duration: meta.pageTransition.duration || 300,
  }
}
