// Edit file tool for Voide CLI
// Performs exact string replacements in files

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool, ToolContext, ToolResult } from './types'

export const editTool: Tool = {
  name: 'edit',
  description: 'Perform an exact string replacement in a file. The old_string must match exactly (including whitespace and indentation). Use replace_all to replace all occurrences.',

  parameters: [
    {
      name: 'file_path',
      type: 'string',
      description: 'The absolute path to the file to edit',
      required: true,
    },
    {
      name: 'old_string',
      type: 'string',
      description: 'The exact text to replace (must be unique in the file unless using replace_all)',
      required: true,
    },
    {
      name: 'new_string',
      type: 'string',
      description: 'The text to replace it with',
      required: true,
    },
    {
      name: 'replace_all',
      type: 'boolean',
      description: 'Replace all occurrences of old_string (default: false)',
      required: false,
      default: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const filePath = args.file_path as string
    const oldString = args.old_string as string
    const newString = args.new_string as string
    const replaceAll = (args.replace_all as boolean) || false

    // Resolve to absolute path
    const absolutePath = resolve(context.workingDirectory, filePath)

    // Check edit permission
    const permission = await context.permissions.check('edit', absolutePath)
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Cannot edit this file'}`,
        isError: true,
      }
    }

    if (oldString === newString) {
      return {
        output: 'Error: old_string and new_string are identical. No changes needed.',
        isError: true,
      }
    }

    try {
      // Read the file
      const content = await readFile(absolutePath, 'utf-8')

      // Check if old_string exists
      if (!content.includes(oldString)) {
        // Provide helpful error message
        const lines = content.split('\n')
        const preview = lines.slice(0, 10).map((l, i) => `${i + 1}: ${l}`).join('\n')

        return {
          output: `Error: Could not find the specified text in the file.\n\nSearched for:\n${oldString.slice(0, 200)}${oldString.length > 200 ? '...' : ''}\n\nFile preview (first 10 lines):\n${preview}`,
          isError: true,
        }
      }

      // Count occurrences
      const occurrences = content.split(oldString).length - 1

      if (occurrences > 1 && !replaceAll) {
        return {
          output: `Error: Found ${occurrences} occurrences of the text. Either:\n1. Provide more context in old_string to make it unique\n2. Use replace_all: true to replace all occurrences`,
          isError: true,
        }
      }

      // Perform replacement
      let newContent: string
      let replacementCount: number

      if (replaceAll) {
        newContent = content.split(oldString).join(newString)
        replacementCount = occurrences
      }
      else {
        newContent = content.replace(oldString, newString)
        replacementCount = 1
      }

      // Write the file
      await writeFile(absolutePath, newContent, 'utf-8')

      // Calculate diff preview
      const oldLines = oldString.split('\n').length
      const newLines = newString.split('\n').length
      const lineDiff = newLines - oldLines

      let output = `Edited ${absolutePath}\n`
      output += `Replaced ${replacementCount} occurrence${replacementCount > 1 ? 's' : ''}\n`
      output += `Lines: ${oldLines} → ${newLines} (${lineDiff >= 0 ? '+' : ''}${lineDiff})`

      return {
        output,
        title: `Edit: ${filePath}`,
        metadata: {
          path: absolutePath,
          replacements: replacementCount,
          oldLines,
          newLines,
          lineDiff,
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
        output: `Error editing file: ${err.message}`,
        isError: true,
      }
    }
  },
}
