// Skill System for Voide CLI
// Loads skills from .voide/skills/*.md

import { readFile, readdir, access } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'

export interface Skill {
  name: string
  description?: string
  content: string
  source: string
  triggers?: string[]
  autoLoad?: boolean
}

export interface SkillFrontmatter {
  name?: string
  description?: string
  triggers?: string[]
  autoLoad?: boolean
}

const SKILL_DIRECTORIES = [
  '.voide/skills',
  '.claude/skills',
  '.voide/commands',
  '.claude/commands',
]

/**
 * Parse frontmatter from markdown
 */
function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter, body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterStr = match[1]
  const body = match[2]

  // Simple YAML parsing (key: value)
  const frontmatter: SkillFrontmatter = {}
  const lines = frontmatterStr.split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    // Handle arrays (simple format: [a, b, c])
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1)
      const items = value.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      if (key === 'triggers') {
        frontmatter.triggers = items
      }
    }
    else if (key === 'name') {
      frontmatter.name = value.replace(/^["']|["']$/g, '')
    }
    else if (key === 'description') {
      frontmatter.description = value.replace(/^["']|["']$/g, '')
    }
    else if (key === 'autoLoad') {
      frontmatter.autoLoad = value === 'true'
    }
  }

  return { frontmatter, body }
}

/**
 * Load a single skill file
 */
async function loadSkillFile(filePath: string): Promise<Skill | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    const name = frontmatter.name || basename(filePath, '.md')

    return {
      name,
      description: frontmatter.description,
      content: body.trim(),
      source: filePath,
      triggers: frontmatter.triggers,
      autoLoad: frontmatter.autoLoad,
    }
  }
  catch {
    return null
  }
}

/**
 * Load skills from a directory
 */
async function loadSkillsFromDirectory(dirPath: string): Promise<Skill[]> {
  const skills: Skill[] = []

  try {
    await access(dirPath)
    const files = await readdir(dirPath)

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      const skill = await loadSkillFile(join(dirPath, file))
      if (skill) {
        skills.push(skill)
      }
    }
  }
  catch {
    // Directory doesn't exist
  }

  return skills
}

/**
 * Load all skills for a project
 */
export async function loadSkills(projectPath: string): Promise<Skill[]> {
  const allSkills: Skill[] = []

  // Load from project directories
  for (const dir of SKILL_DIRECTORIES) {
    const skills = await loadSkillsFromDirectory(join(projectPath, dir))
    allSkills.push(...skills)
  }

  // Load from global directory
  const globalSkillsDir = join(homedir(), '.voide', 'skills')
  const globalSkills = await loadSkillsFromDirectory(globalSkillsDir)
  allSkills.push(...globalSkills)

  return allSkills
}

/**
 * Get auto-load skills (included in every conversation)
 */
export function getAutoLoadSkills(skills: Skill[]): Skill[] {
  return skills.filter(s => s.autoLoad)
}

/**
 * Find skill by trigger
 */
export function findSkillByTrigger(skills: Skill[], trigger: string): Skill | null {
  const lowerTrigger = trigger.toLowerCase()

  for (const skill of skills) {
    if (skill.triggers) {
      for (const t of skill.triggers) {
        if (t.toLowerCase() === lowerTrigger) {
          return skill
        }
      }
    }

    // Also match by name
    if (skill.name.toLowerCase() === lowerTrigger) {
      return skill
    }
  }

  return null
}

/**
 * Format skills for system prompt
 */
export function formatSkillsForPrompt(skills: Skill[]): string {
  if (skills.length === 0) return ''

  const parts = ['## Available Skills']

  for (const skill of skills) {
    parts.push(`\n### ${skill.name}`)
    if (skill.description) {
      parts.push(skill.description)
    }
    if (skill.triggers && skill.triggers.length > 0) {
      parts.push(`Triggers: ${skill.triggers.join(', ')}`)
    }
    parts.push('')
    parts.push(skill.content)
  }

  return parts.join('\n')
}

/**
 * Format auto-load skills for system prompt
 */
export function formatAutoLoadSkills(skills: Skill[]): string {
  const autoLoad = getAutoLoadSkills(skills)
  if (autoLoad.length === 0) return ''

  const parts = ['## Project Skills']

  for (const skill of autoLoad) {
    parts.push('')
    parts.push(skill.content)
  }

  return parts.join('\n')
}
