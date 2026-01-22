// Apply Patch tool for Voide CLI
// Applies unified diff patches to files

import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import type { Tool, ToolContext, ToolResult } from './types'

interface PatchHunk {
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
  lines: string[]
}

interface FilePatch {
  oldPath: string
  newPath: string
  hunks: PatchHunk[]
  isNew: boolean
  isDeleted: boolean
}

/**
 * Parse a unified diff patch
 */
function parsePatch(patch: string): FilePatch[] {
  const files: FilePatch[] = []
  const lines = patch.split('\n')
  let i = 0

  while (i < lines.length) {
    // Look for file header
    if (lines[i].startsWith('--- ') && i + 1 < lines.length && lines[i + 1].startsWith('+++ ')) {
      const oldPath = lines[i].slice(4).split('\t')[0].replace(/^a\//, '')
      const newPath = lines[i + 1].slice(4).split('\t')[0].replace(/^b\//, '')
      i += 2

      const filePatch: FilePatch = {
        oldPath,
        newPath,
        hunks: [],
        isNew: oldPath === '/dev/null',
        isDeleted: newPath === '/dev/null',
      }

      // Parse hunks
      while (i < lines.length && !lines[i].startsWith('--- ')) {
        if (lines[i].startsWith('@@ ')) {
          const hunkMatch = lines[i].match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
          if (hunkMatch) {
            const hunk: PatchHunk = {
              oldStart: parseInt(hunkMatch[1], 10),
              oldCount: parseInt(hunkMatch[2] || '1', 10),
              newStart: parseInt(hunkMatch[3], 10),
              newCount: parseInt(hunkMatch[4] || '1', 10),
              lines: [],
            }

            i++

            // Collect hunk lines
            while (i < lines.length &&
                   !lines[i].startsWith('@@ ') &&
                   !lines[i].startsWith('--- ') &&
                   !lines[i].startsWith('diff ')) {
              hunk.lines.push(lines[i])
              i++
            }

            filePatch.hunks.push(hunk)
          }
          else {
            i++
          }
        }
        else {
          i++
        }
      }

      files.push(filePatch)
    }
    else {
      i++
    }
  }

  return files
}

/**
 * Apply a single hunk to file content
 */
function applyHunk(lines: string[], hunk: PatchHunk): string[] | null {
  const result = [...lines]
  let lineIndex = hunk.oldStart - 1 // 0-indexed

  // Verify context matches
  for (const patchLine of hunk.lines) {
    if (patchLine.startsWith(' ') || patchLine.startsWith('-')) {
      const expectedContent = patchLine.slice(1)
      if (lineIndex >= result.length || result[lineIndex] !== expectedContent) {
        // Context doesn't match, try to find it nearby
        const searchStart = Math.max(0, lineIndex - 3)
        const searchEnd = Math.min(result.length, lineIndex + 3)
        let found = false

        for (let j = searchStart; j < searchEnd; j++) {
          if (result[j] === expectedContent) {
            lineIndex = j
            found = true
            break
          }
        }

        if (!found) {
          return null // Can't apply hunk
        }
      }
      lineIndex++
    }
    else if (patchLine.startsWith('+')) {
      // Addition line, skip in verification
    }
  }

  // Apply the hunk
  lineIndex = hunk.oldStart - 1
  const newLines: string[] = []
  let resultIndex = 0

  // Copy lines before hunk
  while (resultIndex < lineIndex) {
    newLines.push(result[resultIndex])
    resultIndex++
  }

  // Apply hunk changes
  for (const patchLine of hunk.lines) {
    if (patchLine.startsWith(' ')) {
      // Context line - keep it
      newLines.push(result[resultIndex])
      resultIndex++
    }
    else if (patchLine.startsWith('-')) {
      // Deleted line - skip it
      resultIndex++
    }
    else if (patchLine.startsWith('+')) {
      // Added line - insert it
      newLines.push(patchLine.slice(1))
    }
    // Ignore other lines (like "\ No newline at end of file")
  }

  // Copy remaining lines
  while (resultIndex < result.length) {
    newLines.push(result[resultIndex])
    resultIndex++
  }

  return newLines
}

/**
 * Apply a patch to a file
 */
async function applyFilePatch(
  filePatch: FilePatch,
  workingDir: string,
): Promise<{ success: boolean, message: string }> {
  const targetPath = resolve(workingDir, filePatch.newPath)

  if (filePatch.isDeleted) {
    // TODO: Implement file deletion
    return { success: false, message: 'File deletion not supported' }
  }

  let content: string
  let lines: string[]

  if (filePatch.isNew) {
    // New file
    lines = []
  }
  else {
    // Existing file
    try {
      content = await readFile(resolve(workingDir, filePatch.oldPath), 'utf-8')
      lines = content.split('\n')
    }
    catch {
      return { success: false, message: `File not found: ${filePatch.oldPath}` }
    }
  }

  // Apply hunks in reverse order to preserve line numbers
  const sortedHunks = [...filePatch.hunks].sort((a, b) => b.oldStart - a.oldStart)

  for (const hunk of sortedHunks) {
    const result = applyHunk(lines, hunk)
    if (result === null) {
      return {
        success: false,
        message: `Failed to apply hunk at line ${hunk.oldStart}`,
      }
    }
    lines = result
  }

  // Write result
  try {
    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, lines.join('\n'), 'utf-8')
    return { success: true, message: `Applied patch to ${filePatch.newPath}` }
  }
  catch (error) {
    return { success: false, message: `Failed to write: ${(error as Error).message}` }
  }
}

export const patchTool: Tool = {
  name: 'apply_patch',
  description: 'Apply a unified diff patch to files. Useful for making multiple related changes at once.',

  parameters: [
    {
      name: 'patch',
      type: 'string',
      description: 'The unified diff patch content to apply',
      required: true,
    },
    {
      name: 'dry_run',
      type: 'boolean',
      description: 'If true, only validate the patch without applying it',
      required: false,
      default: false,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const patch = args.patch as string
    const dryRun = (args.dry_run as boolean) || false

    if (!patch.trim()) {
      return {
        output: 'Error: Patch content cannot be empty',
        isError: true,
      }
    }

    // Parse the patch
    const filePatchs = parsePatch(patch)

    if (filePatchs.length === 0) {
      return {
        output: 'Error: No valid patches found in input',
        isError: true,
      }
    }

    // Check permissions for all files
    for (const fp of filePatchs) {
      const targetPath = resolve(context.workingDirectory, fp.newPath)
      const permission = await context.permissions.check('edit', targetPath)
      if (!permission.allowed) {
        return {
          output: `Permission denied for ${fp.newPath}: ${permission.reason}`,
          isError: true,
        }
      }
    }

    if (dryRun) {
      const files = filePatchs.map(fp => {
        if (fp.isNew) return `  + ${fp.newPath} (new file)`
        if (fp.isDeleted) return `  - ${fp.oldPath} (deleted)`
        return `  M ${fp.newPath} (${fp.hunks.length} hunks)`
      }).join('\n')

      return {
        output: `Dry run - would apply patches to:\n${files}`,
        title: 'Apply Patch (dry run)',
        metadata: { fileCount: filePatchs.length, dryRun: true },
      }
    }

    // Apply patches
    const results: string[] = []
    let successCount = 0
    let failCount = 0

    for (const fp of filePatchs) {
      const result = await applyFilePatch(fp, context.workingDirectory)
      results.push(result.message)
      if (result.success) {
        successCount++
      }
      else {
        failCount++
      }
    }

    const status = failCount === 0 ? 'Success' : `Partial (${failCount} failed)`

    return {
      output: `${status}: Applied ${successCount}/${filePatchs.length} patches\n\n${results.join('\n')}`,
      title: 'Apply Patch',
      metadata: { successCount, failCount, total: filePatchs.length },
      isError: failCount > 0,
    }
  },
}
