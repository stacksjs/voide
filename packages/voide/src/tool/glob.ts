// Glob tool for Voide CLI
// Fast file pattern matching using Bun's native glob

import { resolve, relative } from 'node:path'
import { stat } from 'node:fs/promises'
import type { Tool, ToolContext, ToolResult } from './types'

export const globTool: Tool = {
  name: 'glob',
  description: 'Find files matching a glob pattern. Supports patterns like "**/*.ts", "src/**/*.{js,ts}", etc. Returns file paths sorted by modification time.',

  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: 'The glob pattern to match files (e.g., "**/*.ts", "src/**/*.js")',
      required: true,
    },
    {
      name: 'path',
      type: 'string',
      description: 'The directory to search in. Defaults to current working directory.',
      required: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = args.pattern as string
    const searchPath = args.path ? resolve(context.workingDirectory, args.path as string) : context.workingDirectory

    // Check read permission
    const permission = await context.permissions.check('read', searchPath)
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Cannot search this directory'}`,
        isError: true,
      }
    }

    try {
      // Use Bun's glob
      const glob = new Bun.Glob(pattern)

      // Scan for files
      const files: Array<{ path: string, mtime: number }> = []
      const maxFiles = 1000 // Limit results

      for await (const file of glob.scan({ cwd: searchPath, onlyFiles: true })) {
        if (files.length >= maxFiles) break

        const fullPath = resolve(searchPath, file)
        try {
          const stats = await stat(fullPath)
          files.push({
            path: file,
            mtime: stats.mtimeMs,
          })
        }
        catch {
          // Skip files we can't stat
        }
      }

      if (files.length === 0) {
        return {
          output: `No files found matching pattern: ${pattern}\nSearch directory: ${searchPath}`,
          title: `Glob: ${pattern}`,
          metadata: {
            pattern,
            searchPath,
            count: 0,
          },
        }
      }

      // Sort by modification time (newest first)
      files.sort((a, b) => b.mtime - a.mtime)

      // Format output
      const output = files.map(f => f.path).join('\n')
      const truncated = files.length >= maxFiles

      return {
        output: truncated
          ? `Found ${files.length}+ files (showing first ${maxFiles}):\n\n${output}`
          : `Found ${files.length} file${files.length > 1 ? 's' : ''}:\n\n${output}`,
        title: `Glob: ${pattern}`,
        metadata: {
          pattern,
          searchPath,
          count: files.length,
          truncated,
        },
      }
    }
    catch (error) {
      const err = error as Error
      return {
        output: `Error searching for files: ${err.message}`,
        isError: true,
      }
    }
  },
}
