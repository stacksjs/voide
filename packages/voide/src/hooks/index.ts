// Hooks system for Voide CLI
// Allows user-defined hooks for various events

import { spawn } from 'node:child_process'
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

export type HookType =
  | 'session:start'
  | 'session:end'
  | 'message:before'
  | 'message:after'
  | 'tool:before'
  | 'tool:after'
  | 'error'

export interface HookConfig {
  type: HookType
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  timeout?: number
  async?: boolean
}

export interface HooksConfig {
  hooks?: HookConfig[]
}

export interface HookContext {
  type: HookType
  sessionId?: string
  messageId?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolOutput?: string
  error?: string
  projectPath: string
}

// Load hooks from config file
const HOOKS_FILE_PATHS = [
  '.voide/hooks.json',
  '.voide/hooks.ts',
  '.claude/hooks.json',
]

let loadedHooks: HookConfig[] | null = null

/**
 * Load hooks from project directory
 */
export async function loadHooks(projectPath: string): Promise<HookConfig[]> {
  if (loadedHooks) return loadedHooks

  // Try project hooks first
  for (const file of HOOKS_FILE_PATHS) {
    const filePath = join(projectPath, file)
    try {
      await access(filePath)
      const content = await readFile(filePath, 'utf-8')

      if (file.endsWith('.ts')) {
        // For TS files, we'd need to import them
        // For now, just parse as JSON
        const config = JSON.parse(content) as HooksConfig
        loadedHooks = config.hooks || []
        return loadedHooks
      }

      const config = JSON.parse(content) as HooksConfig
      loadedHooks = config.hooks || []
      return loadedHooks
    }
    catch {
      // File doesn't exist or can't be parsed
    }
  }

  // Try global hooks
  const globalHooksPath = join(homedir(), '.voide', 'hooks.json')
  try {
    const content = await readFile(globalHooksPath, 'utf-8')
    const config = JSON.parse(content) as HooksConfig
    loadedHooks = config.hooks || []
    return loadedHooks
  }
  catch {
    // No global hooks
  }

  loadedHooks = []
  return loadedHooks
}

/**
 * Clear cached hooks
 */
export function clearHooksCache(): void {
  loadedHooks = null
}

/**
 * Run hooks for a specific event type
 */
export async function runHooks(
  projectPath: string,
  context: HookContext,
): Promise<HookResult[]> {
  const hooks = await loadHooks(projectPath)
  const matchingHooks = hooks.filter(h => h.type === context.type)

  const results: HookResult[] = []

  for (const hook of matchingHooks) {
    const result = await runHook(hook, context)
    results.push(result)

    // If sync hook failed, stop execution
    if (!hook.async && !result.success) {
      break
    }
  }

  return results
}

export interface HookResult {
  hook: HookConfig
  success: boolean
  output?: string
  error?: string
  duration: number
}

/**
 * Run a single hook
 */
async function runHook(hook: HookConfig, context: HookContext): Promise<HookResult> {
  const startTime = Date.now()

  return new Promise((resolve) => {
    const timeout = hook.timeout || 30000

    // Build environment with context
    const env = {
      ...process.env,
      ...hook.env,
      VOIDE_HOOK_TYPE: context.type,
      VOIDE_PROJECT_PATH: context.projectPath,
      VOIDE_SESSION_ID: context.sessionId || '',
      VOIDE_MESSAGE_ID: context.messageId || '',
      VOIDE_TOOL_NAME: context.toolName || '',
      VOIDE_TOOL_INPUT: context.toolInput ? JSON.stringify(context.toolInput) : '',
      VOIDE_TOOL_OUTPUT: context.toolOutput || '',
      VOIDE_ERROR: context.error || '',
    }

    const proc = spawn(hook.command, hook.args || [], {
      cwd: hook.cwd || context.projectPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    const timeoutId = setTimeout(() => {
      proc.kill()
      resolve({
        hook,
        success: false,
        error: `Hook timed out after ${timeout}ms`,
        duration: Date.now() - startTime,
      })
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timeoutId)
      resolve({
        hook,
        success: code === 0,
        output: stdout.trim(),
        error: code !== 0 ? stderr.trim() || `Exit code: ${code}` : undefined,
        duration: Date.now() - startTime,
      })
    })

    proc.on('error', (error) => {
      clearTimeout(timeoutId)
      resolve({
        hook,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      })
    })
  })
}

/**
 * Create a hook runner for a specific project
 */
export function createHookRunner(projectPath: string) {
  return {
    async runSessionStart(sessionId: string): Promise<HookResult[]> {
      return runHooks(projectPath, {
        type: 'session:start',
        sessionId,
        projectPath,
      })
    },

    async runSessionEnd(sessionId: string): Promise<HookResult[]> {
      return runHooks(projectPath, {
        type: 'session:end',
        sessionId,
        projectPath,
      })
    },

    async runMessageBefore(sessionId: string, messageId: string): Promise<HookResult[]> {
      return runHooks(projectPath, {
        type: 'message:before',
        sessionId,
        messageId,
        projectPath,
      })
    },

    async runMessageAfter(sessionId: string, messageId: string): Promise<HookResult[]> {
      return runHooks(projectPath, {
        type: 'message:after',
        sessionId,
        messageId,
        projectPath,
      })
    },

    async runToolBefore(
      sessionId: string,
      toolName: string,
      toolInput: Record<string, unknown>,
    ): Promise<HookResult[]> {
      return runHooks(projectPath, {
        type: 'tool:before',
        sessionId,
        toolName,
        toolInput,
        projectPath,
      })
    },

    async runToolAfter(
      sessionId: string,
      toolName: string,
      toolOutput: string,
    ): Promise<HookResult[]> {
      return runHooks(projectPath, {
        type: 'tool:after',
        sessionId,
        toolName,
        toolOutput,
        projectPath,
      })
    },

    async runError(sessionId: string, error: string): Promise<HookResult[]> {
      return runHooks(projectPath, {
        type: 'error',
        sessionId,
        error,
        projectPath,
      })
    },
  }
}
