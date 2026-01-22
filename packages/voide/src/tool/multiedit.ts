// Multi-Edit tool for Voide CLI
// Applies multiple edits across multiple files in a single operation

import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import type { Tool, ToolContext, ToolResult } from './types'

interface FileEdit {
  file: string
  edits: SingleEdit[]
}

interface SingleEdit {
  old_string: string
  new_string: string
  replace_all?: boolean
}

interface EditResult {
  file: string
  success: boolean
  message: string
  replacements: number
}

export const multieditTool: Tool = {
  name: 'multiedit',
  description: 'Apply multiple string replacements across multiple files in a single operation. More efficient than multiple edit calls.',

  parameters: [
    {
      name: 'edits',
      type: 'array',
      description: 'Array of file edits. Each item has "file" (path) and "edits" (array of {old_string, new_string, replace_all?})',
      required: true,
    },
    {
      name: 'dry_run',
      type: 'boolean',
      description: 'If true, only validate edits without applying them',
      required: false,
      default: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const editsInput = args.edits as FileEdit[]
    const dryRun = (args.dry_run as boolean) || false

    if (!Array.isArray(editsInput) || editsInput.length === 0) {
      return {
        output: 'Error: edits must be a non-empty array',
        isError: true,
      }
    }

    // Validate structure
    for (const fileEdit of editsInput) {
      if (!fileEdit.file || !Array.isArray(fileEdit.edits)) {
        return {
          output: 'Error: Each edit must have "file" (string) and "edits" (array)',
          isError: true,
        }
      }
    }

    // Check permissions for all files
    for (const fileEdit of editsInput) {
      const filePath = resolve(context.workingDirectory, fileEdit.file)
      const permission = await context.permissions.check('edit', filePath)
      if (!permission.allowed) {
        return {
          output: `Permission denied for ${fileEdit.file}: ${permission.reason}`,
          isError: true,
        }
      }
    }

    const results: EditResult[] = []
    let totalReplacements = 0
    let successCount = 0
    let failCount = 0

    for (const fileEdit of editsInput) {
      const filePath = resolve(context.workingDirectory, fileEdit.file)
      const result = await applyFileEdits(filePath, fileEdit.edits, dryRun)
      results.push({ file: fileEdit.file, ...result })

      if (result.success) {
        successCount++
        totalReplacements += result.replacements
      }
      else {
        failCount++
      }
    }

    // Format output
    const output = results.map(r => {
      if (r.success) {
        return `✓ ${r.file}: ${r.message} (${r.replacements} replacement${r.replacements !== 1 ? 's' : ''})`
      }
      return `✗ ${r.file}: ${r.message}`
    }).join('\n')

    const prefix = dryRun ? '[Dry Run] ' : ''
    const status = failCount === 0 ? 'Success' : `Partial (${failCount} failed)`

    return {
      output: `${prefix}${status}: ${successCount}/${editsInput.length} files\n\n${output}`,
      title: `MultiEdit: ${editsInput.length} files`,
      metadata: {
        successCount,
        failCount,
        totalReplacements,
        dryRun,
      },
      isError: failCount > 0,
    }
  },
}

async function applyFileEdits(
  filePath: string,
  edits: SingleEdit[],
  dryRun: boolean,
): Promise<{ success: boolean, message: string, replacements: number }> {
  // Read file
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  }
  catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') {
      return { success: false, message: 'File not found', replacements: 0 }
    }
    return { success: false, message: err.message, replacements: 0 }
  }

  let totalReplacements = 0
  let newContent = content

  // Apply each edit
  for (const edit of edits) {
    if (!edit.old_string) {
      return { success: false, message: 'Missing old_string in edit', replacements: 0 }
    }

    if (edit.old_string === edit.new_string) {
      continue // Skip no-op edits
    }

    if (!newContent.includes(edit.old_string)) {
      return {
        success: false,
        message: `String not found: "${edit.old_string.slice(0, 50)}${edit.old_string.length > 50 ? '...' : ''}"`,
        replacements: 0,
      }
    }

    const occurrences = newContent.split(edit.old_string).length - 1

    if (occurrences > 1 && !edit.replace_all) {
      return {
        success: false,
        message: `Found ${occurrences} occurrences. Use replace_all: true or make old_string unique.`,
        replacements: 0,
      }
    }

    if (edit.replace_all) {
      newContent = newContent.split(edit.old_string).join(edit.new_string)
      totalReplacements += occurrences
    }
    else {
      newContent = newContent.replace(edit.old_string, edit.new_string)
      totalReplacements += 1
    }
  }

  if (dryRun) {
    return { success: true, message: 'Would apply edits', replacements: totalReplacements }
  }

  // Write file
  try {
    await writeFile(filePath, newContent, 'utf-8')
    return { success: true, message: 'Applied edits', replacements: totalReplacements }
  }
  catch (error) {
    return { success: false, message: (error as Error).message, replacements: 0 }
  }
}
