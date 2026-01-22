// WebFetch tool for Voide CLI
// Fetches content from URLs and processes it

import type { Tool, ToolContext, ToolResult } from './types'

// Simple HTML to text conversion
function htmlToText(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove HTML tags but keep content
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&mdash;/g, '—')
  text = text.replace(/&ndash;/g, '–')

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.trim()

  return text
}

// Extract title from HTML
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1].trim() : null
}

// Extract meta description
function extractDescription(html: string): string | null {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  if (match) return match[1].trim()

  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
  return ogMatch ? ogMatch[1].trim() : null
}

// URL cache with 15-minute TTL
const urlCache = new Map<string, { content: string, timestamp: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

function getCached(url: string): string | null {
  const cached = urlCache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content
  }
  return null
}

function setCache(url: string, content: string): void {
  urlCache.set(url, { content, timestamp: Date.now() })

  // Clean old entries
  for (const [key, value] of urlCache.entries()) {
    if (Date.now() - value.timestamp > CACHE_TTL) {
      urlCache.delete(key)
    }
  }
}

export const webfetchTool: Tool = {
  name: 'webfetch',
  description: 'Fetch content from a URL. Returns the page content as text. Useful for reading documentation, articles, and web pages.',

  parameters: [
    {
      name: 'url',
      type: 'string',
      description: 'The URL to fetch content from',
      required: true,
    },
    {
      name: 'selector',
      type: 'string',
      description: 'Optional CSS selector to extract specific content (e.g., "article", "main", ".content")',
      required: false,
    },
    {
      name: 'max_length',
      type: 'number',
      description: 'Maximum content length to return (default: 50000)',
      required: false,
      default: 50000,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    let url = args.url as string
    const selector = args.selector as string | undefined
    const maxLength = (args.max_length as number) || 50000

    // Check web permission
    const permission = await context.permissions.check('web', url)
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Cannot fetch this URL'}`,
        isError: true,
      }
    }

    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Upgrade HTTP to HTTPS
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://')
    }

    // Check cache
    const cacheKey = `${url}:${selector || ''}`
    const cached = getCached(cacheKey)
    if (cached) {
      return {
        output: cached,
        title: `WebFetch: ${url} (cached)`,
        metadata: { url, cached: true },
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Voide/1.0 (AI Assistant)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      // Check for redirect to different host
      const responseUrl = new URL(response.url)
      const requestUrl = new URL(url)
      if (responseUrl.host !== requestUrl.host) {
        return {
          output: `Redirected to different host: ${response.url}\nMake a new request to this URL if you want to fetch its content.`,
          title: `WebFetch: Redirect`,
          metadata: { url, redirectUrl: response.url },
        }
      }

      if (!response.ok) {
        return {
          output: `HTTP ${response.status}: ${response.statusText}`,
          isError: true,
        }
      }

      const contentType = response.headers.get('content-type') || ''
      const html = await response.text()

      // Extract metadata
      const title = extractTitle(html)
      const description = extractDescription(html)

      // Convert to text
      let text = htmlToText(html)

      // Add metadata header
      let output = ''
      if (title) {
        output += `# ${title}\n\n`
      }
      if (description) {
        output += `${description}\n\n---\n\n`
      }
      output += text

      // Truncate if needed
      if (output.length > maxLength) {
        output = output.slice(0, maxLength) + '\n\n[Content truncated...]'
      }

      // Cache result
      setCache(cacheKey, output)

      return {
        output,
        title: `WebFetch: ${title || url}`,
        metadata: {
          url,
          title,
          description,
          contentType,
          length: output.length,
        },
      }
    }
    catch (error) {
      const err = error as Error
      if (err.name === 'AbortError') {
        return {
          output: 'Request timed out after 30 seconds',
          isError: true,
        }
      }
      return {
        output: `Failed to fetch URL: ${err.message}`,
        isError: true,
      }
    }
  },
}
