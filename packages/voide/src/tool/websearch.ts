// WebSearch tool for Voide CLI
// Searches the web using DuckDuckGo (no API key required)

import type { Tool, ToolContext, ToolResult } from './types'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * Search using DuckDuckGo HTML (no API required)
 */
async function searchDuckDuckGo(query: string, maxResults = 10): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query)
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Voide/1.0)',
      'Accept': 'text/html',
    },
  })

  if (!response.ok) {
    throw new Error(`Search failed: HTTP ${response.status}`)
  }

  const html = await response.text()
  const results: SearchResult[] = []

  // Parse DuckDuckGo HTML results
  // Match result blocks
  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi

  let match
  while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
    let resultUrl = match[1]

    // DuckDuckGo wraps URLs, extract the actual URL
    if (resultUrl.includes('uddg=')) {
      const uddgMatch = resultUrl.match(/uddg=([^&]+)/)
      if (uddgMatch) {
        resultUrl = decodeURIComponent(uddgMatch[1])
      }
    }

    results.push({
      title: decodeHTMLEntities(match[2].trim()),
      url: resultUrl,
      snippet: decodeHTMLEntities(match[3].trim()),
    })
  }

  // Fallback: simpler regex if the above doesn't work
  if (results.length === 0) {
    const simpleRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*class="[^"]*result[^"]*"[^>]*>([^<]+)<\/a>/gi

    while ((match = simpleRegex.exec(html)) !== null && results.length < maxResults) {
      const resultUrl = match[1]
      if (!resultUrl.includes('duckduckgo.com')) {
        results.push({
          title: decodeHTMLEntities(match[2].trim()),
          url: resultUrl,
          snippet: '',
        })
      }
    }
  }

  return results
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

export const websearchTool: Tool = {
  name: 'websearch',
  description: 'Search the web for information. Returns a list of relevant results with titles, URLs, and snippets.',

  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'The search query',
      required: true,
    },
    {
      name: 'max_results',
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
      required: false,
      default: 10,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const query = args.query as string
    const maxResults = (args.max_results as number) || 10

    // Check web permission
    const permission = await context.permissions.check('web')
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Web search is not allowed'}`,
        isError: true,
      }
    }

    if (!query.trim()) {
      return {
        output: 'Error: Search query cannot be empty',
        isError: true,
      }
    }

    try {
      const results = await searchDuckDuckGo(query, maxResults)

      if (results.length === 0) {
        return {
          output: `No results found for: ${query}`,
          title: `WebSearch: ${query}`,
          metadata: { query, resultCount: 0 },
        }
      }

      // Format results
      const output = results.map((r, i) => {
        let result = `${i + 1}. **${r.title}**\n   ${r.url}`
        if (r.snippet) {
          result += `\n   ${r.snippet}`
        }
        return result
      }).join('\n\n')

      return {
        output: `Search results for "${query}":\n\n${output}`,
        title: `WebSearch: ${query}`,
        metadata: {
          query,
          resultCount: results.length,
          results,
        },
      }
    }
    catch (error) {
      return {
        output: `Search failed: ${(error as Error).message}`,
        isError: true,
      }
    }
  },
}
