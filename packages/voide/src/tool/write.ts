// Write file tool for Voide CLI

import { writeFile, mkdir, access } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import type { Tool, ToolContext, ToolResult } from './types'

export const writeTool: Tool = {
  name: 'write',
  description: 'Write content to a file. Creates the file if it does not exist, overwrites if it does. Creates parent directories automatically.',

  parameters: [
    {
      name: 'file_path',
      type: 'string',
      description: 'The absolute path to the file to write',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'The content to write to the file',
      required: true,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = args.file_path as string
    const content = args.content as string

    // Resolve to absolute path
    const absolutePath = resolve(context.workingDirectory, filePath)

    // Check write permission
    const permission = await context.permissions.check('write', absolutePath)
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Cannot write to this file'}`,
        isError: true,
      }
    }

    try {
      // Check if file exists
      let fileExists = false
      try {
        await access(absolutePath)
        fileExists = true
      }
      catch {
        fileExists = false
      }

      // Create parent directories if needed
      const dir = dirname(absolutePath)
      await mkdir(dir, { recursive: true })

      // Write the file
      await writeFile(absolutePath, content, 'utf-8')

      const lines = content.split('\n').length
      const bytes = Buffer.byteLength(content, 'utf-8')

      return {
        output: `${fileExists ? 'Updated' : 'Created'} file: ${absolutePath}\n${lines} lines, ${formatBytes(bytes)}`,
        title: `Write: ${filePath}`,
        metadata: {
          path: absolutePath,
          lines,
          bytes,
          created: !fileExists,
        },
      }
    }
    catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'EACCES') {
        return {
          output: `Error: Permission denied: ${absolutePath}`,
          isError: true,
        }
      }
      if (err.code === 'EISDIR') {
        return {
          output: `Error: "${absolutePath}" is a directory`,
          isError: true,
        }
      }
      return {
        output: `Error writing file: ${err.message}`,
        isError: true,
      }
    }
  },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
