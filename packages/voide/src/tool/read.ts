// Read file tool for Voide CLI

import { readFile, stat } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import type { Tool, ToolContext, ToolResult } from './types'

export const readTool: Tool = {
  name: 'read',
  description: 'Read the contents of a file. Returns the file content with line numbers. Supports text files, images (returns base64), and handles binary files gracefully.',

  parameters: [
    {
      name: 'file_path',
      type: 'string',
      description: 'The absolute path to the file to read',
      required: true,
    },
    {
      name: 'offset',
      type: 'number',
      description: 'Line number to start reading from (1-indexed). Only provide if the file is too large.',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of lines to read. Only provide if the file is too large.',
      required: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = args.file_path as string
    const offset = (args.offset as number) || 1
    const limit = (args.limit as number) || 2000

    // Resolve to absolute path
    const absolutePath = resolve(context.workingDirectory, filePath)

    // Check read permission
    const permission = await context.permissions.check('read', absolutePath)
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Cannot read this file'}`,
        isError: true,
      }
    }

    try {
      // Check if file exists and get stats
      const stats = await stat(absolutePath)

      if (stats.isDirectory()) {
        return {
          output: `Error: "${absolutePath}" is a directory. Use the glob or bash tool to list directory contents.`,
          isError: true,
        }
      }

      // Check for binary/image files
      const ext = extname(absolutePath).toLowerCase()
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']
      const binaryExtensions = ['.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib']

      if (imageExtensions.includes(ext)) {
        const content = await readFile(absolutePath)
        const base64 = content.toString('base64')
        const mimeType = getMimeType(ext)
        return {
          output: `[Image file: ${absolutePath}]\nType: ${mimeType}\nSize: ${formatBytes(stats.size)}\nBase64 data available for processing.`,
          title: `Read image: ${filePath}`,
          metadata: {
            type: 'image',
            mimeType,
            size: stats.size,
            base64: base64.slice(0, 100) + '...', // Truncate for metadata
          },
        }
      }

      if (binaryExtensions.includes(ext)) {
        return {
          output: `[Binary file: ${absolutePath}]\nSize: ${formatBytes(stats.size)}\nBinary files cannot be displayed as text.`,
          title: `Binary file: ${filePath}`,
          metadata: {
            type: 'binary',
            size: stats.size,
          },
        }
      }

      // Read text file
      const content = await readFile(absolutePath, 'utf-8')
      const lines = content.split('\n')
      const totalLines = lines.length

      // Apply offset and limit
      const startLine = Math.max(1, offset) - 1
      const endLine = Math.min(totalLines, startLine + limit)
      const selectedLines = lines.slice(startLine, endLine)

      // Format with line numbers (like cat -n)
      const maxLineNumWidth = String(endLine).length
      const numberedLines = selectedLines.map((line, i) => {
        const lineNum = String(startLine + i + 1).padStart(maxLineNumWidth, ' ')
        // Truncate very long lines
        const truncatedLine = line.length > 2000 ? line.slice(0, 2000) + '...' : line
        return `${lineNum}\t${truncatedLine}`
      })

      let output = numberedLines.join('\n')

      // Add header if not showing all lines
      if (startLine > 0 || endLine < totalLines) {
        output = `[Showing lines ${startLine + 1}-${endLine} of ${totalLines}]\n\n${output}`
      }

      return {
        output,
        title: `Read: ${filePath}`,
        metadata: {
          totalLines,
          startLine: startLine + 1,
          endLine,
          truncated: endLine < totalLines,
        },
      }
    }
    catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        return {
          output: `Error: File not found: ${absolutePath}`,
          isError: true,
        }
      }
      if (err.code === 'EACCES') {
        return {
          output: `Error: Permission denied: ${absolutePath}`,
          isError: true,
        }
      }
      return {
        output: `Error reading file: ${err.message}`,
        isError: true,
      }
    }
  },
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
