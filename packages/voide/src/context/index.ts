// Context system exports for Voide CLI

export * from './instructions'
export * from './git'
export * from './skills'

import { loadProjectInstructions, formatInstructions } from './instructions'
import { loadGitContext, formatGitContext } from './git'
import { loadSkills, formatAutoLoadSkills, getAutoLoadSkills } from './skills'

export interface FullContext {
  instructions?: string
  gitContext?: string
  skills?: string
  projectPath: string
}

/**
 * Load full project context for system prompt
 */
export async function loadFullContext(projectPath: string): Promise<FullContext> {
  const context: FullContext = { projectPath }

  // Load all context in parallel
  const [instructions, gitCtx, skills] = await Promise.all([
    loadProjectInstructions(projectPath),
    loadGitContext(projectPath),
    loadSkills(projectPath),
  ])

  if (instructions) {
    context.instructions = formatInstructions(instructions)
  }

  if (gitCtx.isRepo) {
    context.gitContext = formatGitContext(gitCtx)
  }

  const autoLoadSkills = getAutoLoadSkills(skills)
  if (autoLoadSkills.length > 0) {
    context.skills = formatAutoLoadSkills(skills)
  }

  return context
}

/**
 * Format full context for system prompt
 */
export function formatFullContext(context: FullContext): string {
  const parts: string[] = []

  if (context.instructions) {
    parts.push(context.instructions)
  }

  if (context.gitContext) {
    parts.push(context.gitContext)
  }

  if (context.skills) {
    parts.push(context.skills)
  }

  return parts.join('\n\n')
}
