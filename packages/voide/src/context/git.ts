// Git Context loader for Voide CLI
// Provides git status, branch info, recent commits

import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { join } from 'node:path'

export interface GitContext {
  isRepo: boolean
  branch?: string
  status?: GitStatus
  recentCommits?: GitCommit[]
  remotes?: GitRemote[]
  rootPath?: string
}

export interface GitStatus {
  staged: string[]
  modified: string[]
  untracked: string[]
  deleted: string[]
  clean: boolean
}

export interface GitCommit {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

export interface GitRemote {
  name: string
  url: string
  type: 'fetch' | 'push'
}

/**
 * Execute a git command and return output
 */
async function gitCommand(args: string[], cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim())
      }
      else {
        resolve(null)
      }
    })

    proc.on('error', () => {
      resolve(null)
    })
  })
}

/**
 * Check if directory is a git repository
 */
export async function isGitRepo(path: string): Promise<boolean> {
  try {
    await access(join(path, '.git'))
    return true
  }
  catch {
    // Check if we're in a subdirectory of a repo
    const result = await gitCommand(['rev-parse', '--git-dir'], path)
    return result !== null
  }
}

/**
 * Get the root path of the git repository
 */
export async function getGitRoot(path: string): Promise<string | null> {
  return gitCommand(['rev-parse', '--show-toplevel'], path)
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(path: string): Promise<string | null> {
  return gitCommand(['branch', '--show-current'], path)
}

/**
 * Get git status
 */
export async function getGitStatus(path: string): Promise<GitStatus | null> {
  const output = await gitCommand(['status', '--porcelain'], path)
  if (output === null) return null

  const status: GitStatus = {
    staged: [],
    modified: [],
    untracked: [],
    deleted: [],
    clean: true,
  }

  if (!output) {
    return status
  }

  const lines = output.split('\n').filter(Boolean)
  status.clean = lines.length === 0

  for (const line of lines) {
    const indexStatus = line[0]
    const workTreeStatus = line[1]
    const file = line.slice(3)

    // Staged changes
    if (indexStatus === 'A' || indexStatus === 'M' || indexStatus === 'D' || indexStatus === 'R') {
      status.staged.push(file)
    }

    // Working tree changes
    if (workTreeStatus === 'M') {
      status.modified.push(file)
    }
    else if (workTreeStatus === 'D') {
      status.deleted.push(file)
    }
    else if (indexStatus === '?' && workTreeStatus === '?') {
      status.untracked.push(file)
    }
  }

  return status
}

/**
 * Get recent commits
 */
export async function getRecentCommits(path: string, count = 5): Promise<GitCommit[]> {
  const format = '%H|%h|%s|%an|%ar'
  const output = await gitCommand(
    ['log', `-${count}`, `--format=${format}`, '--no-merges'],
    path,
  )

  if (!output) return []

  return output.split('\n').filter(Boolean).map(line => {
    const [hash, shortHash, message, author, date] = line.split('|')
    return { hash, shortHash, message, author, date }
  })
}

/**
 * Get git remotes
 */
export async function getRemotes(path: string): Promise<GitRemote[]> {
  const output = await gitCommand(['remote', '-v'], path)
  if (!output) return []

  const remotes: GitRemote[] = []
  const lines = output.split('\n').filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/)
    if (match) {
      remotes.push({
        name: match[1],
        url: match[2],
        type: match[3] as 'fetch' | 'push',
      })
    }
  }

  return remotes
}

/**
 * Get diff for staged changes
 */
export async function getStagedDiff(path: string): Promise<string | null> {
  return gitCommand(['diff', '--cached', '--stat'], path)
}

/**
 * Get diff for unstaged changes
 */
export async function getUnstagedDiff(path: string): Promise<string | null> {
  return gitCommand(['diff', '--stat'], path)
}

/**
 * Load full git context
 */
export async function loadGitContext(projectPath: string): Promise<GitContext> {
  const isRepo = await isGitRepo(projectPath)

  if (!isRepo) {
    return { isRepo: false }
  }

  const [rootPath, branch, status, recentCommits, remotes] = await Promise.all([
    getGitRoot(projectPath),
    getCurrentBranch(projectPath),
    getGitStatus(projectPath),
    getRecentCommits(projectPath),
    getRemotes(projectPath),
  ])

  return {
    isRepo: true,
    rootPath: rootPath || undefined,
    branch: branch || undefined,
    status: status || undefined,
    recentCommits,
    remotes,
  }
}

/**
 * Format git context for system prompt
 */
export function formatGitContext(context: GitContext): string {
  if (!context.isRepo) {
    return 'This directory is not a git repository.'
  }

  const parts: string[] = ['## Git Context']

  if (context.branch) {
    parts.push(`Current branch: ${context.branch}`)
  }

  if (context.status) {
    if (context.status.clean) {
      parts.push('Status: Clean (no changes)')
    }
    else {
      const changes: string[] = []
      if (context.status.staged.length > 0) {
        changes.push(`${context.status.staged.length} staged`)
      }
      if (context.status.modified.length > 0) {
        changes.push(`${context.status.modified.length} modified`)
      }
      if (context.status.untracked.length > 0) {
        changes.push(`${context.status.untracked.length} untracked`)
      }
      if (context.status.deleted.length > 0) {
        changes.push(`${context.status.deleted.length} deleted`)
      }
      parts.push(`Status: ${changes.join(', ')}`)
    }
  }

  if (context.recentCommits && context.recentCommits.length > 0) {
    parts.push('\nRecent commits:')
    for (const commit of context.recentCommits.slice(0, 5)) {
      parts.push(`  ${commit.shortHash} ${commit.message}`)
    }
  }

  return parts.join('\n')
}
