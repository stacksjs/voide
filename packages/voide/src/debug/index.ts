// Debug Commands for Voide CLI
// Provides debugging and diagnostic utilities

import { join } from 'node:path'
import { homedir, platform, release, arch, cpus, totalmem, freemem } from 'node:os'
import { readdir, readFile, stat, rm, writeFile, mkdir } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { VERSION } from '../index'

const VOIDE_DIR = join(homedir(), '.voide')
const LOGS_DIR = join(VOIDE_DIR, 'logs')
const CACHE_DIR = join(VOIDE_DIR, 'cache')

export interface DebugInfo {
  voide: {
    version: string
    configPath: string
    logsPath: string
    cachePath: string
  }
  system: {
    platform: string
    release: string
    arch: string
    cpus: number
    totalMemory: string
    freeMemory: string
    nodeVersion: string
    bunVersion?: string
  }
  environment: {
    shell: string
    term: string
    editor?: string
    cwd: string
    home: string
  }
  providers: {
    configured: string[]
    missing: string[]
  }
}

export interface DoctorCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  fix?: string
}

// Get comprehensive debug info
export async function getDebugInfo(): Promise<DebugInfo> {
  // Get bun version if available
  let bunVersion: string | undefined
  try {
    bunVersion = execSync('bun --version', { encoding: 'utf-8' }).trim()
  }
  catch {
    // Bun not available
  }

  // Check which providers are configured
  const providerEnvVars: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    azure: 'AZURE_OPENAI_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    groq: 'GROQ_API_KEY',
    together: 'TOGETHER_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    perplexity: 'PERPLEXITY_API_KEY',
    xai: 'XAI_API_KEY',
  }

  const configured: string[] = []
  const missing: string[] = []

  for (const [provider, envVar] of Object.entries(providerEnvVars)) {
    if (process.env[envVar]) {
      configured.push(provider)
    }
    else {
      missing.push(provider)
    }
  }

  return {
    voide: {
      version: VERSION,
      configPath: VOIDE_DIR,
      logsPath: LOGS_DIR,
      cachePath: CACHE_DIR,
    },
    system: {
      platform: platform(),
      release: release(),
      arch: arch(),
      cpus: cpus().length,
      totalMemory: formatBytes(totalmem()),
      freeMemory: formatBytes(freemem()),
      nodeVersion: process.version,
      bunVersion,
    },
    environment: {
      shell: process.env.SHELL || 'unknown',
      term: process.env.TERM || 'unknown',
      editor: process.env.EDITOR || process.env.VISUAL,
      cwd: process.cwd(),
      home: homedir(),
    },
    providers: {
      configured,
      missing,
    },
  }
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${units[i]}`
}

// Format debug info for display
export function formatDebugInfo(info: DebugInfo): string {
  const lines: string[] = [
    '## Voide Debug Information',
    '',
    '### Voide',
    `Version:     ${info.voide.version}`,
    `Config:      ${info.voide.configPath}`,
    `Logs:        ${info.voide.logsPath}`,
    `Cache:       ${info.voide.cachePath}`,
    '',
    '### System',
    `Platform:    ${info.system.platform}`,
    `Release:     ${info.system.release}`,
    `Arch:        ${info.system.arch}`,
    `CPUs:        ${info.system.cpus}`,
    `Memory:      ${info.system.freeMemory} / ${info.system.totalMemory}`,
    `Node:        ${info.system.nodeVersion}`,
  ]

  if (info.system.bunVersion) {
    lines.push(`Bun:         ${info.system.bunVersion}`)
  }

  lines.push(
    '',
    '### Environment',
    `Shell:       ${info.environment.shell}`,
    `Terminal:    ${info.environment.term}`,
    `Editor:      ${info.environment.editor || 'not set'}`,
    `CWD:         ${info.environment.cwd}`,
    '',
    '### Providers',
    `Configured:  ${info.providers.configured.join(', ') || 'none'}`,
    `Missing:     ${info.providers.missing.join(', ') || 'none'}`,
  )

  return lines.join('\n')
}

// Run doctor checks
export async function runDoctor(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = []

  // Check 1: Bun installed
  try {
    execSync('bun --version', { stdio: 'ignore' })
    checks.push({
      name: 'Bun runtime',
      status: 'pass',
      message: 'Bun is installed',
    })
  }
  catch {
    checks.push({
      name: 'Bun runtime',
      status: 'warn',
      message: 'Bun not found, falling back to Node',
      fix: 'Install Bun: curl -fsSL https://bun.sh/install | bash',
    })
  }

  // Check 2: Config directory writable
  try {
    await mkdir(VOIDE_DIR, { recursive: true })
    const testFile = join(VOIDE_DIR, '.write-test')
    await writeFile(testFile, 'test', 'utf-8')
    await rm(testFile)
    checks.push({
      name: 'Config directory',
      status: 'pass',
      message: `${VOIDE_DIR} is writable`,
    })
  }
  catch {
    checks.push({
      name: 'Config directory',
      status: 'fail',
      message: `Cannot write to ${VOIDE_DIR}`,
      fix: `Check permissions: chmod 755 ${VOIDE_DIR}`,
    })
  }

  // Check 3: At least one provider configured
  const providerEnvVars = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'AZURE_OPENAI_API_KEY',
  ]

  const hasProvider = providerEnvVars.some(v => process.env[v])
  if (hasProvider) {
    checks.push({
      name: 'API key',
      status: 'pass',
      message: 'At least one API key is configured',
    })
  }
  else {
    checks.push({
      name: 'API key',
      status: 'fail',
      message: 'No API keys configured',
      fix: 'Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable',
    })
  }

  // Check 4: Git available
  try {
    execSync('git --version', { stdio: 'ignore' })
    checks.push({
      name: 'Git',
      status: 'pass',
      message: 'Git is installed',
    })
  }
  catch {
    checks.push({
      name: 'Git',
      status: 'warn',
      message: 'Git not found',
      fix: 'Install Git for version control features',
    })
  }

  // Check 5: Network connectivity
  try {
    await fetch('https://api.anthropic.com', { method: 'HEAD' })
    checks.push({
      name: 'Network',
      status: 'pass',
      message: 'Can reach Anthropic API',
    })
  }
  catch {
    checks.push({
      name: 'Network',
      status: 'warn',
      message: 'Cannot reach Anthropic API',
      fix: 'Check internet connection or proxy settings',
    })
  }

  // Check 6: Disk space
  try {
    const stats = await stat(homedir())
    // Simple check - can we stat home dir
    checks.push({
      name: 'Disk space',
      status: 'pass',
      message: 'Disk is accessible',
    })
  }
  catch {
    checks.push({
      name: 'Disk space',
      status: 'fail',
      message: 'Cannot access home directory',
    })
  }

  return checks
}

// Format doctor results
export function formatDoctorResults(checks: DoctorCheck[]): string {
  const lines: string[] = ['## Voide Doctor', '']

  const passed = checks.filter(c => c.status === 'pass').length
  const warned = checks.filter(c => c.status === 'warn').length
  const failed = checks.filter(c => c.status === 'fail').length

  for (const check of checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗'
    const color = check.status === 'pass' ? '\x1b[32m' : check.status === 'warn' ? '\x1b[33m' : '\x1b[31m'
    const reset = '\x1b[0m'

    lines.push(`${color}${icon}${reset} ${check.name}: ${check.message}`)
    if (check.fix) {
      lines.push(`    Fix: ${check.fix}`)
    }
  }

  lines.push('')
  lines.push(`Summary: ${passed} passed, ${warned} warnings, ${failed} failed`)

  return lines.join('\n')
}

// Get logs
export async function getLogs(options: {
  lines?: number
  level?: 'error' | 'warn' | 'info' | 'debug'
  since?: Date
} = {}): Promise<string[]> {
  const lines = options.lines || 100
  const logs: string[] = []

  try {
    const files = await readdir(LOGS_DIR)
    const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse()

    for (const file of logFiles) {
      if (logs.length >= lines) break

      const content = await readFile(join(LOGS_DIR, file), 'utf-8')
      const fileLines = content.split('\n').filter(Boolean)

      for (const line of fileLines.reverse()) {
        if (logs.length >= lines) break

        // Filter by level if specified
        if (options.level) {
          const levelMatch = line.match(/\[(ERROR|WARN|INFO|DEBUG)\]/)
          if (levelMatch && levelMatch[1].toLowerCase() !== options.level) {
            continue
          }
        }

        // Filter by date if specified
        if (options.since) {
          const dateMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}T[\d:]+)/)
          if (dateMatch) {
            const logDate = new Date(dateMatch[1])
            if (logDate < options.since) {
              continue
            }
          }
        }

        logs.unshift(line)
      }
    }
  }
  catch {
    // No logs directory
  }

  return logs
}

// Write to log
export async function log(
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await mkdir(LOGS_DIR, { recursive: true })

    const date = new Date()
    const dateStr = date.toISOString().split('T')[0]
    const logFile = join(LOGS_DIR, `${dateStr}.log`)

    const timestamp = date.toISOString()
    const levelStr = level.toUpperCase().padEnd(5)
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    const line = `[${timestamp}] [${levelStr}] ${message}${dataStr}\n`

    await writeFile(logFile, line, { flag: 'a' })
  }
  catch {
    // Ignore logging errors
  }
}

// Clear cache and logs
export async function clearCache(options: {
  cache?: boolean
  logs?: boolean
  sessions?: boolean
  all?: boolean
} = { cache: true }): Promise<{ cleared: string[]; errors: string[] }> {
  const cleared: string[] = []
  const errors: string[] = []

  const clearAll = options.all

  // Clear cache
  if (clearAll || options.cache) {
    try {
      await rm(CACHE_DIR, { recursive: true, force: true })
      cleared.push('cache')
    }
    catch (error) {
      errors.push(`cache: ${(error as Error).message}`)
    }
  }

  // Clear logs
  if (clearAll || options.logs) {
    try {
      await rm(LOGS_DIR, { recursive: true, force: true })
      cleared.push('logs')
    }
    catch (error) {
      errors.push(`logs: ${(error as Error).message}`)
    }
  }

  // Clear sessions
  if (clearAll || options.sessions) {
    try {
      await rm(join(VOIDE_DIR, 'sessions'), { recursive: true, force: true })
      cleared.push('sessions')
    }
    catch (error) {
      errors.push(`sessions: ${(error as Error).message}`)
    }
  }

  return { cleared, errors }
}

// Get cache stats
export async function getCacheStats(): Promise<{
  totalSize: number
  files: number
  breakdown: Record<string, { size: number; files: number }>
}> {
  const breakdown: Record<string, { size: number; files: number }> = {}
  let totalSize = 0
  let totalFiles = 0

  const dirs = ['cache', 'sessions', 'logs', 'themes', 'commands']

  for (const dir of dirs) {
    const dirPath = join(VOIDE_DIR, dir)
    let size = 0
    let files = 0

    try {
      const entries = await readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile()) {
          const stats = await stat(join(dirPath, entry.name))
          size += stats.size
          files++
        }
      }
    }
    catch {
      // Directory doesn't exist
    }

    breakdown[dir] = { size, files }
    totalSize += size
    totalFiles += files
  }

  return { totalSize, files: totalFiles, breakdown }
}

// Format cache stats
export function formatCacheStats(stats: Awaited<ReturnType<typeof getCacheStats>>): string {
  const lines: string[] = [
    '## Cache Statistics',
    '',
    `Total size: ${formatBytes(stats.totalSize)}`,
    `Total files: ${stats.files}`,
    '',
    'Breakdown:',
  ]

  for (const [dir, info] of Object.entries(stats.breakdown)) {
    if (info.files > 0) {
      lines.push(`  ${dir}: ${formatBytes(info.size)} (${info.files} files)`)
    }
  }

  return lines.join('\n')
}

// Export debug dump (for bug reports)
export async function exportDebugDump(): Promise<string> {
  const info = await getDebugInfo()
  const checks = await runDoctor()
  const cacheStats = await getCacheStats()
  const logs = await getLogs({ lines: 50, level: 'error' })

  const dump = {
    timestamp: new Date().toISOString(),
    debugInfo: info,
    doctorChecks: checks,
    cacheStats,
    recentErrors: logs,
  }

  return JSON.stringify(dump, null, 2)
}
