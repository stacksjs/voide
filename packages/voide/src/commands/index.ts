// Custom Commands for Voide CLI
// Allows users to define custom commands in .voide/command/

import { join, basename, extname } from 'node:path'
import { homedir } from 'node:os'
import { readdir, readFile, stat, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'

// Command locations
const GLOBAL_COMMANDS_DIR = join(homedir(), '.voide', 'commands')

export interface CommandDefinition {
  name: string
  description: string
  usage?: string
  examples?: string[]
  args?: CommandArg[]
  type: 'script' | 'prompt' | 'alias'
  path: string
  source: 'global' | 'project'
}

export interface CommandArg {
  name: string
  description: string
  required: boolean
  default?: string
}

export interface CommandResult {
  success: boolean
  output: string
  exitCode?: number
  error?: string
}

// Parse command frontmatter from script files
function parseCommandFrontmatter(content: string): Partial<CommandDefinition> {
  const frontmatterMatch = content.match(/^#\s*---\s*\n([\s\S]*?)\n#\s*---/m)
  if (!frontmatterMatch) {
    // Try alternative formats
    const jsonMatch = content.match(/^#\s*voide:\s*({[\s\S]*?})/m)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      }
      catch {
        return {}
      }
    }
    return {}
  }

  const frontmatter = frontmatterMatch[1]
  const result: Partial<CommandDefinition> = {}

  // Parse YAML-like frontmatter
  const lines = frontmatter.split('\n')
  for (const line of lines) {
    const match = line.match(/^#\s*(\w+):\s*(.+)$/)
    if (match) {
      const [, key, value] = match
      if (key === 'name') result.name = value.trim()
      if (key === 'description') result.description = value.trim()
      if (key === 'usage') result.usage = value.trim()
      if (key === 'type') result.type = value.trim() as CommandDefinition['type']
    }
  }

  return result
}

// Parse prompt command (markdown file with frontmatter)
async function parsePromptCommand(path: string): Promise<Partial<CommandDefinition>> {
  const content = await readFile(path, 'utf-8')

  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return {}

  const result: Partial<CommandDefinition> = { type: 'prompt' }
  const lines = frontmatterMatch[1].split('\n')

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const [, key, value] = match
      if (key === 'name') result.name = value.trim()
      if (key === 'description') result.description = value.trim()
      if (key === 'usage') result.usage = value.trim()
    }
  }

  return result
}

// Parse alias command (simple text file)
async function parseAliasCommand(path: string): Promise<Partial<CommandDefinition>> {
  const content = await readFile(path, 'utf-8')
  const lines = content.trim().split('\n')

  const result: Partial<CommandDefinition> = { type: 'alias' }

  // First line is the aliased command
  // Optional comment lines before can provide metadata
  for (const line of lines) {
    if (line.startsWith('# description:')) {
      result.description = line.slice(14).trim()
    }
    else if (line.startsWith('# name:')) {
      result.name = line.slice(7).trim()
    }
  }

  return result
}

// Load commands from a directory
async function loadCommandsFromDir(
  dir: string,
  source: 'global' | 'project',
): Promise<CommandDefinition[]> {
  const commands: CommandDefinition[] = []

  try {
    const files = await readdir(dir)

    for (const file of files) {
      const path = join(dir, file)
      const stats = await stat(path)

      if (stats.isDirectory()) continue

      const ext = extname(file).toLowerCase()
      const name = basename(file, ext)

      let def: Partial<CommandDefinition> = {}

      // Handle different file types
      if (ext === '.sh' || ext === '.bash') {
        const content = await readFile(path, 'utf-8')
        def = parseCommandFrontmatter(content)
        def.type = 'script'
      }
      else if (ext === '.ts' || ext === '.js') {
        const content = await readFile(path, 'utf-8')
        def = parseCommandFrontmatter(content)
        def.type = 'script'
      }
      else if (ext === '.md') {
        def = await parsePromptCommand(path)
      }
      else if (ext === '.alias' || ext === '.txt') {
        def = await parseAliasCommand(path)
      }
      else {
        // Unknown type, try to treat as script
        def.type = 'script'
      }

      commands.push({
        name: def.name || name,
        description: def.description || `Custom command: ${name}`,
        usage: def.usage,
        examples: def.examples,
        args: def.args,
        type: def.type || 'script',
        path,
        source,
      })
    }
  }
  catch {
    // Directory doesn't exist or can't be read
  }

  return commands
}

// Command loader class
export class CommandLoader {
  private projectPath: string
  private commands: Map<string, CommandDefinition> = new Map()
  private loaded = false

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath
  }

  // Load all commands
  async load(): Promise<void> {
    this.commands.clear()

    // Load global commands
    const globalCommands = await loadCommandsFromDir(GLOBAL_COMMANDS_DIR, 'global')
    for (const cmd of globalCommands) {
      this.commands.set(cmd.name, cmd)
    }

    // Load project commands (override global)
    const projectDir = join(this.projectPath, '.voide', 'commands')
    const projectCommands = await loadCommandsFromDir(projectDir, 'project')
    for (const cmd of projectCommands) {
      this.commands.set(cmd.name, cmd)
    }

    this.loaded = true
  }

  // Get a command by name
  async get(name: string): Promise<CommandDefinition | undefined> {
    if (!this.loaded) await this.load()
    return this.commands.get(name)
  }

  // Get all commands
  async getAll(): Promise<CommandDefinition[]> {
    if (!this.loaded) await this.load()
    return Array.from(this.commands.values())
  }

  // Check if a command exists
  async has(name: string): Promise<boolean> {
    if (!this.loaded) await this.load()
    return this.commands.has(name)
  }

  // Execute a command
  async execute(name: string, args: string[] = []): Promise<CommandResult> {
    const cmd = await this.get(name)
    if (!cmd) {
      return {
        success: false,
        output: '',
        error: `Command not found: ${name}`,
      }
    }

    switch (cmd.type) {
      case 'script':
        return this.executeScript(cmd, args)
      case 'alias':
        return this.executeAlias(cmd, args)
      case 'prompt':
        return this.getPrompt(cmd, args)
      default:
        return {
          success: false,
          output: '',
          error: `Unknown command type: ${cmd.type}`,
        }
    }
  }

  // Execute a script command
  private async executeScript(cmd: CommandDefinition, args: string[]): Promise<CommandResult> {
    return new Promise((resolve) => {
      const ext = extname(cmd.path).toLowerCase()

      let command: string
      let cmdArgs: string[]

      if (ext === '.sh' || ext === '.bash') {
        command = 'bash'
        cmdArgs = [cmd.path, ...args]
      }
      else if (ext === '.ts') {
        command = 'bun'
        cmdArgs = ['run', cmd.path, ...args]
      }
      else if (ext === '.js') {
        command = 'node'
        cmdArgs = [cmd.path, ...args]
      }
      else {
        // Try to execute directly
        command = cmd.path
        cmdArgs = args
      }

      const proc = spawn(command, cmdArgs, {
        cwd: this.projectPath,
        env: { ...process.env, VOIDE_PROJECT: this.projectPath },
        shell: process.platform === 'win32',
      })

      let output = ''
      let errorOutput = ''

      proc.stdout?.on('data', (data) => {
        output += data.toString()
      })

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output || errorOutput,
          exitCode: code ?? undefined,
          error: code !== 0 ? errorOutput : undefined,
        })
      })

      proc.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message,
        })
      })
    })
  }

  // Execute an alias command
  private async executeAlias(cmd: CommandDefinition, args: string[]): Promise<CommandResult> {
    const content = await readFile(cmd.path, 'utf-8')
    const lines = content.trim().split('\n').filter(l => !l.startsWith('#') && l.trim())

    if (lines.length === 0) {
      return {
        success: false,
        output: '',
        error: 'Empty alias file',
      }
    }

    // Replace $1, $2, etc. with args
    let aliasedCmd = lines[0]
    for (let i = 0; i < args.length; i++) {
      aliasedCmd = aliasedCmd.replace(new RegExp(`\\$${i + 1}`, 'g'), args[i])
    }

    return new Promise((resolve) => {
      const proc = spawn(aliasedCmd, [], {
        cwd: this.projectPath,
        shell: true,
        env: { ...process.env, VOIDE_PROJECT: this.projectPath },
      })

      let output = ''
      let errorOutput = ''

      proc.stdout?.on('data', (data) => {
        output += data.toString()
      })

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output || errorOutput,
          exitCode: code ?? undefined,
          error: code !== 0 ? errorOutput : undefined,
        })
      })

      proc.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message,
        })
      })
    })
  }

  // Get prompt content from a prompt command
  private async getPrompt(cmd: CommandDefinition, args: string[]): Promise<CommandResult> {
    const content = await readFile(cmd.path, 'utf-8')

    // Remove frontmatter
    let prompt = content.replace(/^---\n[\s\S]*?\n---\n?/, '')

    // Replace placeholders
    for (let i = 0; i < args.length; i++) {
      prompt = prompt.replace(new RegExp(`\\{\\{\\s*\\$${i + 1}\\s*\\}\\}`, 'g'), args[i])
      prompt = prompt.replace(new RegExp(`\\{\\{\\s*arg${i + 1}\\s*\\}\\}`, 'g'), args[i])
    }

    return {
      success: true,
      output: prompt.trim(),
    }
  }

  // Format command list for display
  formatList(): string {
    const commands = Array.from(this.commands.values())

    if (commands.length === 0) {
      return 'No custom commands found.'
    }

    const lines: string[] = ['## Custom Commands', '']

    const bySource: Record<string, CommandDefinition[]> = {
      project: [],
      global: [],
    }

    for (const cmd of commands) {
      bySource[cmd.source].push(cmd)
    }

    if (bySource.project.length > 0) {
      lines.push('**Project Commands:**')
      for (const cmd of bySource.project) {
        lines.push(`  /${cmd.name} - ${cmd.description}`)
      }
      lines.push('')
    }

    if (bySource.global.length > 0) {
      lines.push('**Global Commands:**')
      for (const cmd of bySource.global) {
        lines.push(`  /${cmd.name} - ${cmd.description}`)
      }
    }

    return lines.join('\n')
  }

  // Format command help for display
  formatHelp(name: string): string {
    const cmd = this.commands.get(name)
    if (!cmd) return `Command not found: ${name}`

    const lines: string[] = [
      `## /${cmd.name}`,
      '',
      cmd.description,
      '',
      `Type: ${cmd.type}`,
      `Source: ${cmd.source}`,
    ]

    if (cmd.usage) {
      lines.push('', '**Usage:**', `  ${cmd.usage}`)
    }

    if (cmd.examples && cmd.examples.length > 0) {
      lines.push('', '**Examples:**')
      for (const ex of cmd.examples) {
        lines.push(`  ${ex}`)
      }
    }

    if (cmd.args && cmd.args.length > 0) {
      lines.push('', '**Arguments:**')
      for (const arg of cmd.args) {
        const req = arg.required ? '(required)' : '(optional)'
        const def = arg.default ? ` [default: ${arg.default}]` : ''
        lines.push(`  ${arg.name} ${req}${def}`)
        lines.push(`    ${arg.description}`)
      }
    }

    return lines.join('\n')
  }
}

// Create commands directory
export async function initCommandsDir(projectPath?: string): Promise<string> {
  const dir = projectPath
    ? join(projectPath, '.voide', 'commands')
    : GLOBAL_COMMANDS_DIR

  await mkdir(dir, { recursive: true })
  return dir
}

// Create a new command template
export async function createCommandTemplate(
  name: string,
  type: 'script' | 'prompt' | 'alias',
  projectPath?: string,
): Promise<string> {
  const dir = await initCommandsDir(projectPath)

  let filename: string
  let content: string

  switch (type) {
    case 'script':
      filename = `${name}.sh`
      content = `#!/bin/bash
# ---
# name: ${name}
# description: Custom command description
# usage: /${name} [args]
# ---

# Your command script here
echo "Running ${name}..."
`
      break

    case 'prompt':
      filename = `${name}.md`
      content = `---
name: ${name}
description: Custom prompt template
usage: /${name} [topic]
---

You are an assistant helping with {{ $1 }}.

Please provide helpful information about the topic.
`
      break

    case 'alias':
      filename = `${name}.alias`
      content = `# name: ${name}
# description: Alias for another command
echo "Hello from ${name}!" && ls -la
`
      break
  }

  const path = join(dir, filename)
  await writeFile(path, content, 'utf-8')

  return path
}

// Singleton loader
let commandLoader: CommandLoader | null = null

export function getCommandLoader(projectPath?: string): CommandLoader {
  if (!commandLoader || (projectPath && commandLoader['projectPath'] !== projectPath)) {
    commandLoader = new CommandLoader(projectPath)
  }
  return commandLoader
}
