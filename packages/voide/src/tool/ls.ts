// ls Tool - Directory listing for Voide CLI

import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { Tool, ToolContext, ToolResult } from './types'

export const lsTool: Tool = {
  name: 'ls',
  description: 'List directory contents with detailed information. Shows files, directories, sizes, and modification times.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Directory path to list. Defaults to current working directory.',
      required: false,
    },
    {
      name: 'all',
      type: 'boolean',
      description: 'Include hidden files (starting with .)',
      required: false,
      default: false,
    },
    {
      name: 'long',
      type: 'boolean',
      description: 'Use long listing format with details',
      required: false,
      default: true,
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'List subdirectories recursively',
      required: false,
      default: false,
    },
    {
      name: 'depth',
      type: 'number',
      description: 'Maximum depth for recursive listing',
      required: false,
      default: 3,
    },
    {
      name: 'pattern',
      type: 'string',
      description: 'Filter by glob pattern (e.g., "*.ts")',
      required: false,
    },
  ],

  async execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const dirPath = (args.path as string) || context.projectPath || process.cwd()
    const showAll = args.all as boolean ?? false
    const longFormat = args.long as boolean ?? true
    const recursive = args.recursive as boolean ?? false
    const maxDepth = args.depth as number ?? 3
    const pattern = args.pattern as string | undefined

    try {
      const entries = await listDirectory(dirPath, {
        showAll,
        longFormat,
        recursive,
        maxDepth,
        pattern,
        basePath: dirPath,
        currentDepth: 0,
      })

      if (entries.length === 0) {
        return {
          output: `Directory is empty: ${dirPath}`,
        }
      }

      const output = formatEntries(entries, longFormat, dirPath)

      return {
        output,
        title: `ls ${relative(process.cwd(), dirPath) || '.'}`,
      }
    }
    catch (error) {
      return {
        output: `Error listing directory: ${(error as Error).message}`,
        isError: true,
      }
    }
  },
}

interface DirEntry {
  name: string
  path: string
  relativePath: string
  isDirectory: boolean
  size: number
  modifiedAt: Date
  permissions?: string
}

interface ListOptions {
  showAll: boolean
  longFormat: boolean
  recursive: boolean
  maxDepth: number
  pattern?: string
  basePath: string
  currentDepth: number
}

async function listDirectory(
  dirPath: string,
  options: ListOptions,
): Promise<DirEntry[]> {
  const entries: DirEntry[] = []

  try {
    const items = await readdir(dirPath, { withFileTypes: true })

    for (const item of items) {
      // Skip hidden files unless showAll
      if (!options.showAll && item.name.startsWith('.')) {
        continue
      }

      // Apply pattern filter
      if (options.pattern) {
        const regex = globToRegex(options.pattern)
        if (!regex.test(item.name)) {
          continue
        }
      }

      const fullPath = join(dirPath, item.name)
      const relativePath = relative(options.basePath, fullPath)

      try {
        const stats = await stat(fullPath)

        entries.push({
          name: item.name,
          path: fullPath,
          relativePath,
          isDirectory: item.isDirectory(),
          size: stats.size,
          modifiedAt: stats.mtime,
          permissions: formatPermissions(stats.mode),
        })

        // Recursively list subdirectories
        if (
          options.recursive &&
          item.isDirectory() &&
          options.currentDepth < options.maxDepth
        ) {
          const subEntries = await listDirectory(fullPath, {
            ...options,
            currentDepth: options.currentDepth + 1,
          })
          entries.push(...subEntries)
        }
      }
      catch {
        // Skip files we can't stat
      }
    }

    // Sort: directories first, then alphabetically
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return entries
  }
  catch (error) {
    throw new Error(`Cannot read directory: ${(error as Error).message}`)
  }
}

function formatEntries(
  entries: DirEntry[],
  longFormat: boolean,
  basePath: string,
): string {
  if (!longFormat) {
    // Simple format: just names
    return entries.map(e => {
      const indicator = e.isDirectory ? '/' : ''
      return e.relativePath + indicator
    }).join('\n')
  }

  // Long format with details
  const lines: string[] = []

  // Calculate column widths
  const maxSizeWidth = Math.max(
    4,
    ...entries.map(e => formatSize(e.size).length),
  )

  for (const entry of entries) {
    const type = entry.isDirectory ? 'd' : '-'
    const perms = entry.permissions || 'rw-r--r--'
    const size = formatSize(entry.size).padStart(maxSizeWidth)
    const date = formatDate(entry.modifiedAt)
    const name = entry.relativePath + (entry.isDirectory ? '/' : '')

    lines.push(`${type}${perms}  ${size}  ${date}  ${name}`)
  }

  // Add summary
  const dirs = entries.filter(e => e.isDirectory).length
  const files = entries.length - dirs
  const totalSize = entries.reduce((sum, e) => sum + (e.isDirectory ? 0 : e.size), 0)

  lines.push('')
  lines.push(`Total: ${files} files, ${dirs} directories, ${formatSize(totalSize)}`)

  return lines.join('\n')
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / 1024 ** i

  return `${size.toFixed(i > 0 ? 1 : 0)}${units[i]}`
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const sixMonths = 180 * 24 * 60 * 60 * 1000

  const month = date.toLocaleString('en', { month: 'short' })
  const day = date.getDate().toString().padStart(2, ' ')

  if (diff < sixMonths) {
    const time = date.toLocaleString('en', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${month} ${day} ${time}`
  }
  else {
    const year = date.getFullYear()
    return `${month} ${day}  ${year}`
  }
}

function formatPermissions(mode: number): string {
  const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']
  const owner = perms[(mode >> 6) & 7]
  const group = perms[(mode >> 3) & 7]
  const other = perms[mode & 7]
  return `${owner}${group}${other}`
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}
