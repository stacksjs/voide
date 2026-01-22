// Project Instructions loader for Voide CLI
// Auto-loads CLAUDE.md, VOIDE.md, .voide/instructions.md

import { readFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'

const INSTRUCTION_FILES = [
  'VOIDE.md',
  'CLAUDE.md',
  '.voide/instructions.md',
  '.voide/INSTRUCTIONS.md',
  '.claude/instructions.md',
  '.claude/CLAUDE.md',
]

export interface ProjectInstructions {
  content: string
  source: string
  projectPath: string
}

/**
 * Load project instructions from known locations
 */
export async function loadProjectInstructions(projectPath: string): Promise<ProjectInstructions | null> {
  for (const file of INSTRUCTION_FILES) {
    const filePath = join(projectPath, file)
    try {
      await access(filePath)
      const content = await readFile(filePath, 'utf-8')
      return {
        content: content.trim(),
        source: file,
        projectPath,
      }
    }
    catch {
      // File doesn't exist, continue
    }
  }

  // Try parent directories (up to 5 levels)
  let currentPath = projectPath
  for (let i = 0; i < 5; i++) {
    const parentPath = dirname(currentPath)
    if (parentPath === currentPath) break // Reached root

    for (const file of INSTRUCTION_FILES) {
      const filePath = join(parentPath, file)
      try {
        await access(filePath)
        const content = await readFile(filePath, 'utf-8')
        return {
          content: content.trim(),
          source: `../${file}`,
          projectPath: parentPath,
        }
      }
      catch {
        // Continue
      }
    }
    currentPath = parentPath
  }

  return null
}

/**
 * Format instructions for system prompt
 */
export function formatInstructions(instructions: ProjectInstructions): string {
  return `## Project Instructions (from ${instructions.source})

${instructions.content}
`
}

/**
 * Load and format all project context
 */
export async function loadProjectContext(projectPath: string): Promise<string> {
  const parts: string[] = []

  // Load instructions
  const instructions = await loadProjectInstructions(projectPath)
  if (instructions) {
    parts.push(formatInstructions(instructions))
  }

  return parts.join('\n\n')
}
