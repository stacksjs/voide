// Shell Completion for Voide CLI
// Generates completion scripts for bash and zsh

import { join } from 'node:path'
import { homedir } from 'node:os'
import { writeFile, appendFile, readFile, mkdir } from 'node:fs/promises'

const VOIDE_DIR = join(homedir(), '.voide')

// Command definitions for completion
export interface CompletionCommand {
  name: string
  description: string
  subcommands?: CompletionCommand[]
  options?: CompletionOption[]
  args?: CompletionArg[]
}

export interface CompletionOption {
  name: string
  short?: string
  description: string
  takesValue?: boolean
  values?: string[]
}

export interface CompletionArg {
  name: string
  description: string
  values?: string[] | (() => string[])
}

// Voide CLI commands definition
const VOIDE_COMMANDS: CompletionCommand[] = [
  {
    name: 'voide',
    description: 'AI-powered code assistant',
    subcommands: [
      {
        name: 'init',
        description: 'Initialize voide in current directory',
        options: [
          { name: '--force', short: '-f', description: 'Overwrite existing config' },
          { name: '--template', short: '-t', description: 'Use template', takesValue: true, values: ['default', 'minimal', 'full'] },
        ],
      },
      {
        name: 'chat',
        description: 'Start an interactive chat session',
        options: [
          { name: '--model', short: '-m', description: 'Model to use', takesValue: true },
          { name: '--provider', short: '-p', description: 'Provider to use', takesValue: true },
          { name: '--agent', short: '-a', description: 'Agent mode', takesValue: true, values: ['build', 'explore', 'plan', 'minimal'] },
          { name: '--continue', short: '-c', description: 'Continue last session' },
          { name: '--session', short: '-s', description: 'Resume specific session', takesValue: true },
        ],
      },
      {
        name: 'run',
        description: 'Run a single prompt',
        options: [
          { name: '--model', short: '-m', description: 'Model to use', takesValue: true },
          { name: '--output', short: '-o', description: 'Output file', takesValue: true },
          { name: '--json', short: '-j', description: 'Output as JSON' },
        ],
      },
      {
        name: 'session',
        description: 'Manage sessions',
        subcommands: [
          { name: 'list', description: 'List all sessions' },
          { name: 'show', description: 'Show session details' },
          { name: 'delete', description: 'Delete a session' },
          { name: 'export', description: 'Export a session' },
          { name: 'import', description: 'Import a session' },
        ],
      },
      {
        name: 'auth',
        description: 'Manage authentication',
        subcommands: [
          { name: 'login', description: 'Login to a provider' },
          { name: 'logout', description: 'Logout from a provider' },
          { name: 'status', description: 'Show auth status' },
          { name: 'list', description: 'List configured providers' },
        ],
      },
      {
        name: 'config',
        description: 'Manage configuration',
        subcommands: [
          { name: 'init', description: 'Initialize config file' },
          { name: 'get', description: 'Get a config value' },
          { name: 'set', description: 'Set a config value' },
          { name: 'edit', description: 'Open config in editor' },
          { name: 'path', description: 'Show config file path' },
        ],
      },
      {
        name: 'theme',
        description: 'Manage themes',
        subcommands: [
          { name: 'list', description: 'List available themes' },
          { name: 'set', description: 'Set active theme' },
          { name: 'preview', description: 'Preview a theme' },
          { name: 'create', description: 'Create a new theme' },
        ],
      },
      {
        name: 'server',
        description: 'Run as server',
        options: [
          { name: '--port', short: '-p', description: 'Port number', takesValue: true },
          { name: '--host', short: '-h', description: 'Host address', takesValue: true },
          { name: '--cors', description: 'Enable CORS' },
        ],
      },
      {
        name: 'mcp',
        description: 'MCP server management',
        subcommands: [
          { name: 'list', description: 'List MCP servers' },
          { name: 'add', description: 'Add an MCP server' },
          { name: 'remove', description: 'Remove an MCP server' },
          { name: 'test', description: 'Test MCP server connection' },
        ],
      },
      {
        name: 'upgrade',
        description: 'Upgrade voide to latest version',
        options: [
          { name: '--version', short: '-v', description: 'Specific version', takesValue: true },
          { name: '--beta', description: 'Include beta versions' },
        ],
      },
      {
        name: 'uninstall',
        description: 'Uninstall voide',
        options: [
          { name: '--keep-config', description: 'Keep configuration files' },
          { name: '--force', short: '-f', description: 'Skip confirmation' },
        ],
      },
      {
        name: 'debug',
        description: 'Debug utilities',
        subcommands: [
          { name: 'info', description: 'Show debug info' },
          { name: 'logs', description: 'Show logs' },
          { name: 'clear', description: 'Clear cache and logs' },
          { name: 'doctor', description: 'Check for issues' },
        ],
      },
      {
        name: 'completion',
        description: 'Generate shell completion',
        subcommands: [
          { name: 'bash', description: 'Generate bash completion' },
          { name: 'zsh', description: 'Generate zsh completion' },
          { name: 'fish', description: 'Generate fish completion' },
          { name: 'install', description: 'Install completion for current shell' },
        ],
      },
    ],
    options: [
      { name: '--help', short: '-h', description: 'Show help' },
      { name: '--version', short: '-v', description: 'Show version' },
      { name: '--verbose', description: 'Verbose output' },
      { name: '--quiet', short: '-q', description: 'Quiet output' },
      { name: '--no-color', description: 'Disable colors' },
    ],
  },
]

// Generate bash completion script
export function generateBashCompletion(): string {
  const lines: string[] = [
    '# Voide CLI bash completion',
    '# Generated automatically - do not edit',
    '',
    '_voide_completions() {',
    '    local cur prev words cword',
    '    _init_completion || return',
    '',
    '    local commands="init chat run session auth config theme server mcp upgrade uninstall debug completion"',
    '    local global_opts="--help -h --version -v --verbose --quiet -q --no-color"',
    '',
    '    # Handle subcommands',
    '    case "${COMP_WORDS[1]}" in',
  ]

  const voideCmd = VOIDE_COMMANDS[0]
  for (const subcmd of voideCmd.subcommands || []) {
    lines.push(`        ${subcmd.name})`)

    if (subcmd.subcommands && subcmd.subcommands.length > 0) {
      const subCmdNames = subcmd.subcommands.map(c => c.name).join(' ')
      lines.push(`            if [[ \${cword} -eq 2 ]]; then`)
      lines.push(`                COMPREPLY=($(compgen -W "${subCmdNames}" -- "\${cur}"))`)
      lines.push(`                return`)
      lines.push(`            fi`)
    }

    if (subcmd.options && subcmd.options.length > 0) {
      const opts = subcmd.options.map(o => o.short ? `${o.name} ${o.short}` : o.name).join(' ')
      lines.push(`            COMPREPLY=($(compgen -W "${opts}" -- "\${cur}"))`)
    }
    else {
      lines.push(`            COMPREPLY=()`)
    }

    lines.push('            return')
    lines.push('            ;;')
  }

  lines.push('    esac')
  lines.push('')
  lines.push('    # Top-level completion')
  lines.push('    if [[ ${cword} -eq 1 ]]; then')
  lines.push('        COMPREPLY=($(compgen -W "${commands} ${global_opts}" -- "${cur}"))')
  lines.push('    fi')
  lines.push('}')
  lines.push('')
  lines.push('complete -F _voide_completions voide')
  lines.push('')

  return lines.join('\n')
}

// Generate zsh completion script
export function generateZshCompletion(): string {
  const lines: string[] = [
    '#compdef voide',
    '# Voide CLI zsh completion',
    '# Generated automatically - do not edit',
    '',
    '_voide() {',
    '    local -a commands',
    '    local -a global_opts',
    '',
    '    commands=(',
  ]

  const voideCmd = VOIDE_COMMANDS[0]
  for (const subcmd of voideCmd.subcommands || []) {
    lines.push(`        '${subcmd.name}:${subcmd.description}'`)
  }

  lines.push('    )')
  lines.push('')
  lines.push('    global_opts=(')

  for (const opt of voideCmd.options || []) {
    const short = opt.short ? `'${opt.short}[${opt.description}]'` : ''
    lines.push(`        '${opt.name}[${opt.description}]'`)
    if (short) lines.push(`        ${short}`)
  }

  lines.push('    )')
  lines.push('')
  lines.push('    _arguments -C \\')
  lines.push('        "1: :->cmd" \\')
  lines.push('        "*::arg:->args"')
  lines.push('')
  lines.push('    case "$state" in')
  lines.push('        cmd)')
  lines.push('            _describe "command" commands')
  lines.push('            _describe "option" global_opts')
  lines.push('            ;;')
  lines.push('        args)')
  lines.push('            case "$words[1]" in')

  for (const subcmd of voideCmd.subcommands || []) {
    lines.push(`                ${subcmd.name})`)

    if (subcmd.subcommands && subcmd.subcommands.length > 0) {
      lines.push('                    local -a subcmds')
      lines.push('                    subcmds=(')
      for (const sub of subcmd.subcommands) {
        lines.push(`                        '${sub.name}:${sub.description}'`)
      }
      lines.push('                    )')
      lines.push('                    _describe "subcommand" subcmds')
    }

    if (subcmd.options && subcmd.options.length > 0) {
      lines.push('                    _arguments \\')
      const optArgs = subcmd.options.map(o => {
        const val = o.takesValue ? ':value:' : ''
        return `                        '${o.name}[${o.description}]${val}'`
      })
      lines.push(optArgs.join(' \\\n'))
    }

    lines.push('                    ;;')
  }

  lines.push('            esac')
  lines.push('            ;;')
  lines.push('    esac')
  lines.push('}')
  lines.push('')
  lines.push('_voide "$@"')
  lines.push('')

  return lines.join('\n')
}

// Generate fish completion script
export function generateFishCompletion(): string {
  const lines: string[] = [
    '# Voide CLI fish completion',
    '# Generated automatically - do not edit',
    '',
    '# Disable file completion by default',
    'complete -c voide -f',
    '',
    '# Global options',
  ]

  const voideCmd = VOIDE_COMMANDS[0]
  for (const opt of voideCmd.options || []) {
    const short = opt.short ? `-s ${opt.short.replace('-', '')}` : ''
    const long = `-l ${opt.name.replace('--', '')}`
    lines.push(`complete -c voide ${short} ${long} -d '${opt.description}'`)
  }

  lines.push('')
  lines.push('# Commands')

  for (const subcmd of voideCmd.subcommands || []) {
    lines.push(`complete -c voide -n "__fish_use_subcommand" -a "${subcmd.name}" -d '${subcmd.description}'`)
  }

  lines.push('')
  lines.push('# Subcommands')

  for (const subcmd of voideCmd.subcommands || []) {
    if (subcmd.subcommands && subcmd.subcommands.length > 0) {
      for (const sub of subcmd.subcommands) {
        lines.push(`complete -c voide -n "__fish_seen_subcommand_from ${subcmd.name}" -a "${sub.name}" -d '${sub.description}'`)
      }
    }

    if (subcmd.options && subcmd.options.length > 0) {
      for (const opt of subcmd.options) {
        const short = opt.short ? `-s ${opt.short.replace('-', '')}` : ''
        const long = `-l ${opt.name.replace('--', '')}`
        lines.push(`complete -c voide -n "__fish_seen_subcommand_from ${subcmd.name}" ${short} ${long} -d '${opt.description}'`)
      }
    }
  }

  lines.push('')

  return lines.join('\n')
}

// Install completion for current shell
export async function installCompletion(): Promise<{ shell: string; path: string; instructions: string }> {
  const shell = process.env.SHELL || '/bin/bash'
  const shellName = shell.split('/').pop() || 'bash'

  let content: string
  let targetPath: string
  let instructions: string

  switch (shellName) {
    case 'zsh': {
      content = generateZshCompletion()
      const zshCompDir = join(homedir(), '.zsh', 'completions')
      await mkdir(zshCompDir, { recursive: true })
      targetPath = join(zshCompDir, '_voide')
      await writeFile(targetPath, content, 'utf-8')

      instructions = `
Zsh completion installed to ${targetPath}

Add this to your ~/.zshrc:
  fpath=(~/.zsh/completions $fpath)
  autoload -Uz compinit && compinit

Then restart your shell or run:
  source ~/.zshrc
`
      break
    }

    case 'fish': {
      content = generateFishCompletion()
      const fishCompDir = join(homedir(), '.config', 'fish', 'completions')
      await mkdir(fishCompDir, { recursive: true })
      targetPath = join(fishCompDir, 'voide.fish')
      await writeFile(targetPath, content, 'utf-8')

      instructions = `
Fish completion installed to ${targetPath}

Completions will be available in new fish sessions.
`
      break
    }

    default: {
      // bash
      content = generateBashCompletion()
      targetPath = join(VOIDE_DIR, 'voide-completion.bash')
      await mkdir(VOIDE_DIR, { recursive: true })
      await writeFile(targetPath, content, 'utf-8')

      // Try to add to .bashrc
      const bashrc = join(homedir(), '.bashrc')
      const sourceLine = `\n# Voide CLI completion\n[ -f "${targetPath}" ] && source "${targetPath}"\n`

      try {
        const bashrcContent = await readFile(bashrc, 'utf-8')
        if (!bashrcContent.includes('voide-completion.bash')) {
          await appendFile(bashrc, sourceLine, 'utf-8')
        }
      }
      catch {
        // .bashrc doesn't exist, create it
        await writeFile(bashrc, sourceLine, 'utf-8')
      }

      instructions = `
Bash completion installed to ${targetPath}
Added source line to ~/.bashrc

Restart your shell or run:
  source ~/.bashrc
`
      break
    }
  }

  return { shell: shellName, path: targetPath, instructions }
}

// Get completion script content
export function getCompletionScript(shell: 'bash' | 'zsh' | 'fish'): string {
  switch (shell) {
    case 'zsh':
      return generateZshCompletion()
    case 'fish':
      return generateFishCompletion()
    default:
      return generateBashCompletion()
  }
}

// Print completion script to stdout
export function printCompletionScript(shell: 'bash' | 'zsh' | 'fish'): void {
  console.log(getCompletionScript(shell))
}
