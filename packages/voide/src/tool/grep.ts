// Grep tool for Voide CLI
// Search for patterns in files using regex

import { resolve } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import type { Tool, ToolContext, ToolResult } from './types'

export const grepTool: Tool = {
  name: 'grep',
  description: 'Search for a pattern in files. Supports regex patterns and glob file filters. Returns matching lines with file paths and line numbers.',

  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: 'The regex pattern to search for (e.g., "function\\s+\\w+", "TODO:")',
      required: true,
    },
    {
      name: 'path',
      type: 'string',
      description: 'File or directory to search in. Defaults to current working directory.',
      required: false,
    },
    {
      name: 'glob',
      type: 'string',
      description: 'Glob pattern to filter files (e.g., "*.ts", "**/*.{js,ts}")',
      required: false,
    },
    {
      name: 'case_insensitive',
      type: 'boolean',
      description: 'Perform case-insensitive search',
      required: false,
      default: false,
    },
    {
      name: 'context',
      type: 'number',
      description: 'Number of context lines to show before and after matches',
      required: false,
      default: 0,
    },
    {
      name: 'max_matches',
      type: 'number',
      description: 'Maximum number of matches to return',
      required: false,
      default: 100,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = args.pattern as string
    const searchPath = args.path ? resolve(context.workingDirectory, args.path as string) : context.workingDirectory
    const globPattern = (args.glob as string) || '**/*'
    const caseInsensitive = (args.case_insensitive as boolean) || false
    const contextLines = (args.context as number) || 0
    const maxMatches = (args.max_matches as number) || 100

    // Check read permission
    const permission = await context.permissions.check('read', searchPath)
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Cannot search this path'}`,
        isError: true,
      }
    }

    try {
      // Compile regex
      const flags = caseInsensitive ? 'gi' : 'g'
      let regex: RegExp
      try {
        regex = new RegExp(pattern, flags)
      }
      catch (e) {
        return {
          output: `Invalid regex pattern: ${(e as Error).message}`,
          isError: true,
        }
      }

      // Check if path is a file or directory
      const stats = await stat(searchPath)

      const matches: Array<{
        file: string
        line: number
        content: string
        context?: { before: string[], after: string[] }
      }> = []

      if (stats.isFile()) {
        // Search single file
        await searchFile(searchPath, regex, matches, maxMatches, contextLines)
      }
      else {
        // Search directory with glob
        const glob = new Bun.Glob(globPattern)

        for await (const file of glob.scan({ cwd: searchPath, onlyFiles: true })) {
          if (matches.length >= maxMatches) break

          const fullPath = resolve(searchPath, file)

          // Skip binary files
          if (isBinaryPath(file)) continue

          await searchFile(fullPath, regex, matches, maxMatches, contextLines, file)
        }
      }

      if (matches.length === 0) {
        return {
          output: `No matches found for pattern: ${pattern}`,
          title: `Grep: ${pattern}`,
          metadata: {
            pattern,
            searchPath,
            count: 0,
          },
        }
      }

      // Format output
      const output = formatMatches(matches, contextLines > 0)
      const truncated = matches.length >= maxMatches

      return {
        output: truncated
          ? `Found ${maxMatches}+ matches (showing first ${maxMatches}):\n\n${output}`
          : `Found ${matches.length} match${matches.length > 1 ? 'es' : ''}:\n\n${output}`,
        title: `Grep: ${pattern}`,
        metadata: {
          pattern,
          searchPath,
          count: matches.length,
          truncated,
        },
      }
    }
    catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        return {
          output: `Error: Path not found: ${searchPath}`,
          isError: true,
        }
      }
      return {
        output: `Error searching: ${err.message}`,
        isError: true,
      }
    }
  },
}

async function searchFile(
  filePath: string,
  regex: RegExp,
  matches: Array<{ file: string, line: number, content: string, context?: { before: string[], after: string[] } }>,
  maxMatches: number,
  contextLines: number,
  displayPath?: string,
): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
      const line = lines[i]
      regex.lastIndex = 0 // Reset regex state

      if (regex.test(line)) {
        const match: {
          file: string
          line: number
          content: string
          context?: { before: string[], after: string[] }
        } = {
          file: displayPath || filePath,
          line: i + 1,
          content: line.slice(0, 500), // Truncate long lines
        }

        if (contextLines > 0) {
          match.context = {
            before: lines.slice(Math.max(0, i - contextLines), i),
            after: lines.slice(i + 1, Math.min(lines.length, i + 1 + contextLines)),
          }
        }

        matches.push(match)
      }
    }
  }
  catch {
    // Skip files that can't be read
  }
}

function formatMatches(
  matches: Array<{ file: string, line: number, content: string, context?: { before: string[], after: string[] } }>,
  showContext: boolean,
): string {
  if (showContext) {
    return matches.map(m => {
      let result = ''
      if (m.context?.before.length) {
        result += m.context.before.map((l, i) => `${m.file}:${m.line - m.context!.before.length + i}-  ${l}`).join('\n') + '\n'
      }
      result += `${m.file}:${m.line}:  ${m.content}`
      if (m.context?.after.length) {
        result += '\n' + m.context.after.map((l, i) => `${m.file}:${m.line + 1 + i}-  ${l}`).join('\n')
      }
      return result
    }).join('\n--\n')
  }

  return matches.map(m => `${m.file}:${m.line}:${m.content}`).join('\n')
}

function isBinaryPath(path: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.woff', '.woff2', '.ttf', '.eot',
    '.lock', '.bin',
  ]
  return binaryExtensions.some(ext => path.toLowerCase().endsWith(ext))
}
