/**
 * Head management composables - useHead, useSeoMeta, applyHead
 * Similar to Nuxt's useHead and useSeoMeta APIs
 */

// ============================================================================
// Types
// ============================================================================

export interface HeadMeta {
  name?: string
  property?: string
  content: string
  [key: string]: string | undefined
}

export interface HeadLink {
  rel: string
  href: string
  type?: string
  as?: string
  crossorigin?: string
  [key: string]: string | undefined
}

export interface HeadScript {
  src?: string
  content?: string
  async?: boolean
  defer?: boolean
  type?: string
  [key: string]: string | boolean | undefined
}

export interface HeadStyle {
  content: string
  type?: string
  [key: string]: string | undefined
}

export interface HeadConfig {
  title?: string
  titleTemplate?: string | ((title: string) => string)
  meta?: HeadMeta[]
  link?: HeadLink[]
  script?: HeadScript[]
  style?: HeadStyle[]
  htmlAttrs?: Record<string, string>
  bodyAttrs?: Record<string, string>
}

export interface SeoMetaConfig {
  // Basic
  title?: string
  description?: string
  author?: string
  keywords?: string | string[]
  robots?: string
  canonical?: string

  // Open Graph
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogUrl?: string
  ogType?: string
  ogSiteName?: string
  ogLocale?: string

  // Twitter
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitterSite?: string
  twitterCreator?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string

  // Article metadata
  articleAuthor?: string
  articlePublishedTime?: string
  articleModifiedTime?: string
  articleSection?: string
  articleTags?: string[]
}

// ============================================================================
// State
// ============================================================================

let headConfig: HeadConfig = {}
const headSubscribers = new Set<(config: HeadConfig) => void>()

// ============================================================================
// useHead
// ============================================================================

/**
 * Configure document head elements
 * @example
 * useHead({
 *   title: 'My Page',
 *   titleTemplate: '%s | My Site',
 *   meta: [{ name: 'description', content: 'Page description' }],
 *   link: [{ rel: 'canonical', href: 'https://example.com' }]
 * })
 */
export function useHead(config: HeadConfig): void {
  // Merge with existing config
  headConfig = {
    ...headConfig,
    ...config,
    meta: [...(headConfig.meta || []), ...(config.meta || [])],
    link: [...(headConfig.link || []), ...(config.link || [])],
    script: [...(headConfig.script || []), ...(config.script || [])],
    style: [...(headConfig.style || []), ...(config.style || [])],
    htmlAttrs: { ...(headConfig.htmlAttrs || {}), ...(config.htmlAttrs || {}) },
    bodyAttrs: { ...(headConfig.bodyAttrs || {}), ...(config.bodyAttrs || {}) },
  }

  // Notify subscribers
  for (const cb of headSubscribers) {
    try { cb(headConfig) } catch {}
  }

  // Auto-apply in browser
  if (typeof window !== 'undefined') {
    applyHead()
  }
}

/**
 * Get the current head configuration
 */
export function getHeadConfig(): HeadConfig {
  return { ...headConfig }
}

/**
 * Subscribe to head configuration changes
 */
export function subscribeHead(callback: (config: HeadConfig) => void): () => void {
  headSubscribers.add(callback)
  return () => headSubscribers.delete(callback)
}

/**
 * Reset head configuration
 */
export function resetHead(): void {
  headConfig = {}
  for (const cb of headSubscribers) {
    try { cb(headConfig) } catch {}
  }
}

// ============================================================================
// useSeoMeta
// ============================================================================

/**
 * Simplified SEO meta tags configuration
 * Automatically generates Open Graph and Twitter meta tags
 * @example
 * useSeoMeta({
 *   title: 'Blog Post',
 *   description: 'An amazing article',
 *   ogImage: '/og.png',
 *   twitterCard: 'summary_large_image'
 * })
 */
export function useSeoMeta(config: SeoMetaConfig): void {
  const meta: HeadMeta[] = []

  // Basic meta tags
  if (config.description) {
    meta.push({ name: 'description', content: config.description })
  }
  if (config.author) {
    meta.push({ name: 'author', content: config.author })
  }
  if (config.keywords) {
    const keywords = Array.isArray(config.keywords) ? config.keywords.join(', ') : config.keywords
    meta.push({ name: 'keywords', content: keywords })
  }
  if (config.robots) {
    meta.push({ name: 'robots', content: config.robots })
  }

  // Open Graph tags (with fallbacks)
  const ogTitle = config.ogTitle || config.title
  const ogDescription = config.ogDescription || config.description
  const ogImage = config.ogImage
  const ogUrl = config.ogUrl || config.canonical

  if (ogTitle) {
    meta.push({ property: 'og:title', content: ogTitle })
  }
  if (ogDescription) {
    meta.push({ property: 'og:description', content: ogDescription })
  }
  if (ogImage) {
    meta.push({ property: 'og:image', content: ogImage })
  }
  if (ogUrl) {
    meta.push({ property: 'og:url', content: ogUrl })
  }
  if (config.ogType) {
    meta.push({ property: 'og:type', content: config.ogType })
  }
  if (config.ogSiteName) {
    meta.push({ property: 'og:site_name', content: config.ogSiteName })
  }
  if (config.ogLocale) {
    meta.push({ property: 'og:locale', content: config.ogLocale })
  }

  // Twitter tags (with fallbacks from OG)
  const twitterTitle = config.twitterTitle || ogTitle
  const twitterDescription = config.twitterDescription || ogDescription
  const twitterImage = config.twitterImage || ogImage

  if (config.twitterCard) {
    meta.push({ name: 'twitter:card', content: config.twitterCard })
  }
  if (config.twitterSite) {
    meta.push({ name: 'twitter:site', content: config.twitterSite })
  }
  if (config.twitterCreator) {
    meta.push({ name: 'twitter:creator', content: config.twitterCreator })
  }
  if (twitterTitle) {
    meta.push({ name: 'twitter:title', content: twitterTitle })
  }
  if (twitterDescription) {
    meta.push({ name: 'twitter:description', content: twitterDescription })
  }
  if (twitterImage) {
    meta.push({ name: 'twitter:image', content: twitterImage })
  }

  // Article metadata
  if (config.articleAuthor) {
    meta.push({ property: 'article:author', content: config.articleAuthor })
  }
  if (config.articlePublishedTime) {
    meta.push({ property: 'article:published_time', content: config.articlePublishedTime })
  }
  if (config.articleModifiedTime) {
    meta.push({ property: 'article:modified_time', content: config.articleModifiedTime })
  }
  if (config.articleSection) {
    meta.push({ property: 'article:section', content: config.articleSection })
  }
  if (config.articleTags) {
    for (const tag of config.articleTags) {
      meta.push({ property: 'article:tag', content: tag })
    }
  }

  // Build link array for canonical
  const link: HeadLink[] = []
  if (config.canonical) {
    link.push({ rel: 'canonical', href: config.canonical })
  }

  // Apply via useHead
  useHead({
    title: config.title,
    meta,
    link,
  })
}

// ============================================================================
// applyHead
// ============================================================================

/**
 * Apply the current head configuration to the DOM
 * Called automatically by useHead in browser context
 */
export function applyHead(): void {
  if (typeof document === 'undefined') return

  const config = headConfig

  // Apply title
  if (config.title) {
    let title = config.title
    if (config.titleTemplate) {
      title = typeof config.titleTemplate === 'function'
        ? config.titleTemplate(config.title)
        : config.titleTemplate.replace('%s', config.title)
    }
    document.title = title
  }

  // Apply meta tags
  if (config.meta) {
    for (const meta of config.meta) {
      const selector = meta.name
        ? `meta[name="${meta.name}"]`
        : meta.property
          ? `meta[property="${meta.property}"]`
          : null

      if (!selector) continue

      let element = document.head.querySelector(selector)
      if (!element) {
        element = document.createElement('meta')
        if (meta.name) element.setAttribute('name', meta.name)
        if (meta.property) element.setAttribute('property', meta.property)
        document.head.appendChild(element)
      }
      element.setAttribute('content', meta.content)
    }
  }

  // Apply link tags
  if (config.link) {
    for (const link of config.link) {
      const selector = `link[rel="${link.rel}"][href="${link.href}"]`
      let element = document.head.querySelector(selector)

      if (!element) {
        element = document.createElement('link')
        element.setAttribute('rel', link.rel)
        element.setAttribute('href', link.href)
        if (link.type) element.setAttribute('type', link.type)
        if (link.as) element.setAttribute('as', link.as)
        if (link.crossorigin) element.setAttribute('crossorigin', link.crossorigin)
        document.head.appendChild(element)
      }
    }
  }

  // Apply script tags
  if (config.script) {
    for (const script of config.script) {
      if (script.src) {
        const selector = `script[src="${script.src}"]`
        if (document.querySelector(selector)) continue

        const element = document.createElement('script')
        element.src = script.src
        if (script.async) element.async = true
        if (script.defer) element.defer = true
        if (script.type) element.type = script.type
        document.head.appendChild(element)
      } else if (script.content) {
        const element = document.createElement('script')
        element.textContent = script.content
        if (script.type) element.type = script.type
        document.head.appendChild(element)
      }
    }
  }

  // Apply style tags
  if (config.style) {
    for (const style of config.style) {
      const element = document.createElement('style')
      element.textContent = style.content
      if (style.type) element.type = style.type
      document.head.appendChild(element)
    }
  }

  // Apply html attributes
  if (config.htmlAttrs) {
    for (const [key, value] of Object.entries(config.htmlAttrs)) {
      document.documentElement.setAttribute(key, value)
    }
  }

  // Apply body attributes
  if (config.bodyAttrs) {
    for (const [key, value] of Object.entries(config.bodyAttrs)) {
      document.body.setAttribute(key, value)
    }
  }
}

// ============================================================================
// Template directive helpers (for STX templates)
// ============================================================================

/**
 * Set page title (for @title directive)
 */
export function setTitle(title: string, template?: string | ((title: string) => string)): void {
  useHead({ title, titleTemplate: template })
}

/**
 * Add meta tag (for @meta directive)
 */
export function setMeta(nameOrProperty: string, content: string): void {
  const isProperty = nameOrProperty.startsWith('og:') ||
                     nameOrProperty.startsWith('article:') ||
                     nameOrProperty.startsWith('fb:')

  const meta: HeadMeta = isProperty
    ? { property: nameOrProperty, content }
    : { name: nameOrProperty, content }

  useHead({ meta: [meta] })
}
