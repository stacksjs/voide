// Bash tool for Voide CLI
// Execute shell commands with safety checks

import { spawn } from 'node:child_process'
import type { Tool, ToolContext, ToolResult } from './types'

// Commands that are considered dangerous without explicit confirmation
const DANGEROUS_PATTERNS = [
  /rm\s+(-rf?|--force|--recursive)/i,
  /rm\s+-[a-z]*r[a-z]*f/i,
  /git\s+(push\s+--force|reset\s+--hard|clean\s+-f)/i,
  /chmod\s+-R\s+777/i,
  /:(){ :|:& };:/,  // Fork bomb
  />\s*\/dev\/sd[a-z]/,  // Writing to disk
  /mkfs/i,
  /dd\s+.*of=/i,
  /curl\s+.*\|\s*(ba)?sh/i,  // Piped execution
  /wget\s+.*\|\s*(ba)?sh/i,
]

// Environment variables to never pass through
const SENSITIVE_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'GITHUB_TOKEN',
  'NPM_TOKEN',
  'SSH_AUTH_SOCK',
]

export const bashTool: Tool = {
  name: 'bash',
  description: 'Execute a shell command. Use for git operations, npm/bun commands, and other terminal operations. Avoid using for file operations (use read, write, edit, glob instead).',

  parameters: [
    {
      name: 'command',
      type: 'string',
      description: 'The shell command to execute',
      required: true,
    },
    {
      name: 'description',
      type: 'string',
      description: 'Brief description of what this command does (for audit logging)',
      required: false,
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Timeout in milliseconds (default: 120000, max: 600000)',
      required: false,
      default: 120000,
    },
  ],

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const command = args.command as string
    const description = args.description as string | undefined
    const timeout = Math.min((args.timeout as number) || 120000, 600000)

    // Check bash permission
    const permission = await context.permissions.checkBash(command)
    if (!permission.allowed) {
      return {
        output: `Permission denied: ${permission.reason || 'Cannot execute this command'}`,
        isError: true,
      }
    }

    // Check for dangerous commands
    const dangerousMatch = DANGEROUS_PATTERNS.find(p => p.test(command))
    if (dangerousMatch) {
      context.log(`⚠️  Potentially dangerous command detected: ${command}`)
      const confirmed = await context.ask(
        `This command may be destructive:\n${command}\n\nAre you sure you want to run it?`,
        { type: 'confirm' },
      )
      if (confirmed !== 'yes' && confirmed !== 'true') {
        return {
          output: 'Command cancelled by user',
          isError: false,
        }
      }
    }

    // Build clean environment
    const cleanEnv: Record<string, string> = {}
    for (const [key, value] of Object.entries(process.env)) {
      if (value && !SENSITIVE_ENV_VARS.includes(key)) {
        cleanEnv[key] = value
      }
    }

    try {
      const result = await executeCommand(command, {
        cwd: context.workingDirectory,
        env: cleanEnv,
        timeout,
        signal: context.signal,
      })

      // Truncate output if too long
      let output = result.stdout
      if (result.stderr) {
        output += output ? '\n\n[stderr]\n' + result.stderr : result.stderr
      }

      if (output.length > 30000) {
        output = output.slice(0, 30000) + '\n\n... [output truncated]'
      }

      const title = description || `Bash: ${command.slice(0, 50)}${command.length > 50 ? '...' : ''}`

      if (result.exitCode !== 0) {
        return {
          output: `Command exited with code ${result.exitCode}\n\n${output}`,
          title,
          metadata: {
            exitCode: result.exitCode,
            command,
          },
          isError: true,
        }
      }

      return {
        output: output || '(no output)',
        title,
        metadata: {
          exitCode: result.exitCode,
          command,
        },
      }
    }
    catch (error) {
      const err = error as Error
      if (err.name === 'AbortError') {
        return {
          output: 'Command was cancelled',
          isError: true,
        }
      }
      if (err.message.includes('timeout')) {
        return {
          output: `Command timed out after ${timeout / 1000} seconds`,
          isError: true,
        }
      }
      return {
        output: `Error executing command: ${err.message}`,
        isError: true,
      }
    }
  },
}

interface ExecuteOptions {
  cwd: string
  env: Record<string, string>
  timeout: number
  signal?: AbortSignal
}

interface ExecuteResult {
  stdout: string
  stderr: string
  exitCode: number
}

async function executeCommand(command: string, options: ExecuteOptions): Promise<ExecuteResult> {
  return new Promise((resolve, reject) => {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
    const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command]

    const proc = spawn(shell, shellArgs, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    // Handle timeout
    const timeoutId = setTimeout(() => {
      killed = true
      proc.kill('SIGTERM')
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL')
        }
      }, 5000)
    }, options.timeout)

    // Handle abort signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        killed = true
        proc.kill('SIGTERM')
      })
    }

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (exitCode) => {
      clearTimeout(timeoutId)

      if (killed && !exitCode) {
        reject(new Error('Command was killed (timeout or abort)'))
        return
      }

      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode || 0,
      })
    })

    proc.on('error', (err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
  })
}
