// GitHub Integration for Voide CLI
// PR, Issue, and Actions management

import { spawn } from 'node:child_process'

export interface GitHubConfig {
  token?: string
  owner?: string
  repo?: string
}

export interface PullRequest {
  number: number
  title: string
  body: string
  state: 'open' | 'closed' | 'merged'
  author: string
  branch: string
  baseBranch: string
  url: string
  createdAt: string
  updatedAt: string
  labels: string[]
  reviewers: string[]
  isDraft: boolean
  mergeable: boolean | null
  additions: number
  deletions: number
  changedFiles: number
}

export interface Issue {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  author: string
  url: string
  createdAt: string
  updatedAt: string
  labels: string[]
  assignees: string[]
  comments: number
}

export interface WorkflowRun {
  id: number
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null
  branch: string
  event: string
  url: string
  createdAt: string
}

export interface Comment {
  id: number
  body: string
  author: string
  createdAt: string
  updatedAt: string
}

/**
 * GitHub client using gh CLI
 */
export class GitHubClient {
  private config: GitHubConfig

  constructor(config: GitHubConfig = {}) {
    this.config = config
  }

  /**
   * Execute gh command
   */
  private async gh(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env }
      if (this.config.token) {
        env.GH_TOKEN = this.config.token
      }

      const proc = spawn('gh', args, { env })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim())
        }
        else {
          reject(new Error(stderr.trim() || `gh exited with code ${code}`))
        }
      })

      proc.on('error', (error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('GitHub CLI (gh) not installed. Install from https://cli.github.com'))
        }
        else {
          reject(error)
        }
      })
    })
  }

  /**
   * Get repository info
   */
  async getRepo(): Promise<{ owner: string; repo: string; url: string }> {
    const result = await this.gh(['repo', 'view', '--json', 'owner,name,url'])
    const data = JSON.parse(result) as { owner: { login: string }; name: string; url: string }
    return {
      owner: data.owner.login,
      repo: data.name,
      url: data.url,
    }
  }

  // ==================== Pull Requests ====================

  /**
   * List pull requests
   */
  async listPRs(options: {
    state?: 'open' | 'closed' | 'merged' | 'all'
    limit?: number
    author?: string
    label?: string
  } = {}): Promise<PullRequest[]> {
    const args = ['pr', 'list', '--json',
      'number,title,body,state,author,headRefName,baseRefName,url,createdAt,updatedAt,labels,reviewRequests,isDraft,mergeable,additions,deletions,changedFiles',
    ]

    if (options.state && options.state !== 'all') args.push('--state', options.state)
    if (options.limit) args.push('--limit', String(options.limit))
    if (options.author) args.push('--author', options.author)
    if (options.label) args.push('--label', options.label)

    const result = await this.gh(args)
    const data = JSON.parse(result) as Array<{
      number: number
      title: string
      body: string
      state: string
      author: { login: string }
      headRefName: string
      baseRefName: string
      url: string
      createdAt: string
      updatedAt: string
      labels: Array<{ name: string }>
      reviewRequests: Array<{ login?: string; name?: string }>
      isDraft: boolean
      mergeable: string
      additions: number
      deletions: number
      changedFiles: number
    }>

    return data.map(pr => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state as 'open' | 'closed' | 'merged',
      author: pr.author.login,
      branch: pr.headRefName,
      baseBranch: pr.baseRefName,
      url: pr.url,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      labels: pr.labels.map(l => l.name),
      reviewers: pr.reviewRequests.map(r => r.login || r.name || ''),
      isDraft: pr.isDraft,
      mergeable: pr.mergeable === 'MERGEABLE' ? true : pr.mergeable === 'CONFLICTING' ? false : null,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
    }))
  }

  /**
   * Get a specific pull request
   */
  async getPR(number: number): Promise<PullRequest> {
    const result = await this.gh(['pr', 'view', String(number), '--json',
      'number,title,body,state,author,headRefName,baseRefName,url,createdAt,updatedAt,labels,reviewRequests,isDraft,mergeable,additions,deletions,changedFiles',
    ])

    const pr = JSON.parse(result) as {
      number: number
      title: string
      body: string
      state: string
      author: { login: string }
      headRefName: string
      baseRefName: string
      url: string
      createdAt: string
      updatedAt: string
      labels: Array<{ name: string }>
      reviewRequests: Array<{ login?: string; name?: string }>
      isDraft: boolean
      mergeable: string
      additions: number
      deletions: number
      changedFiles: number
    }

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state as 'open' | 'closed' | 'merged',
      author: pr.author.login,
      branch: pr.headRefName,
      baseBranch: pr.baseRefName,
      url: pr.url,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      labels: pr.labels.map(l => l.name),
      reviewers: pr.reviewRequests.map(r => r.login || r.name || ''),
      isDraft: pr.isDraft,
      mergeable: pr.mergeable === 'MERGEABLE' ? true : pr.mergeable === 'CONFLICTING' ? false : null,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
    }
  }

  /**
   * Checkout a pull request
   */
  async checkoutPR(number: number): Promise<void> {
    await this.gh(['pr', 'checkout', String(number)])
  }

  /**
   * Get PR diff
   */
  async getPRDiff(number: number): Promise<string> {
    return this.gh(['pr', 'diff', String(number)])
  }

  /**
   * Get PR comments
   */
  async getPRComments(number: number): Promise<Comment[]> {
    const result = await this.gh(['pr', 'view', String(number), '--json', 'comments'])
    const data = JSON.parse(result) as {
      comments: Array<{
        id: number
        body: string
        author: { login: string }
        createdAt: string
        updatedAt: string
      }>
    }

    return data.comments.map(c => ({
      id: c.id,
      body: c.body,
      author: c.author.login,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  }

  /**
   * Create a pull request
   */
  async createPR(options: {
    title: string
    body?: string
    base?: string
    head?: string
    draft?: boolean
  }): Promise<PullRequest> {
    const args = ['pr', 'create', '--title', options.title]

    if (options.body) args.push('--body', options.body)
    if (options.base) args.push('--base', options.base)
    if (options.head) args.push('--head', options.head)
    if (options.draft) args.push('--draft')

    const url = await this.gh(args)
    const number = Number.parseInt(url.split('/').pop()!, 10)
    return this.getPR(number)
  }

  /**
   * Comment on a PR
   */
  async commentOnPR(number: number, body: string): Promise<void> {
    await this.gh(['pr', 'comment', String(number), '--body', body])
  }

  /**
   * Merge a PR
   */
  async mergePR(number: number, options: {
    method?: 'merge' | 'squash' | 'rebase'
    deleteAfter?: boolean
  } = {}): Promise<void> {
    const args = ['pr', 'merge', String(number)]

    if (options.method === 'squash') args.push('--squash')
    else if (options.method === 'rebase') args.push('--rebase')
    else args.push('--merge')

    if (options.deleteAfter) args.push('--delete-branch')

    await this.gh(args)
  }

  // ==================== Issues ====================

  /**
   * List issues
   */
  async listIssues(options: {
    state?: 'open' | 'closed' | 'all'
    limit?: number
    author?: string
    assignee?: string
    label?: string
  } = {}): Promise<Issue[]> {
    const args = ['issue', 'list', '--json',
      'number,title,body,state,author,url,createdAt,updatedAt,labels,assignees,comments',
    ]

    if (options.state && options.state !== 'all') args.push('--state', options.state)
    if (options.limit) args.push('--limit', String(options.limit))
    if (options.author) args.push('--author', options.author)
    if (options.assignee) args.push('--assignee', options.assignee)
    if (options.label) args.push('--label', options.label)

    const result = await this.gh(args)
    const data = JSON.parse(result) as Array<{
      number: number
      title: string
      body: string
      state: string
      author: { login: string }
      url: string
      createdAt: string
      updatedAt: string
      labels: Array<{ name: string }>
      assignees: Array<{ login: string }>
      comments: Array<unknown>
    }>

    return data.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      author: issue.author.login,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      labels: issue.labels.map(l => l.name),
      assignees: issue.assignees.map(a => a.login),
      comments: issue.comments.length,
    }))
  }

  /**
   * Get a specific issue
   */
  async getIssue(number: number): Promise<Issue> {
    const result = await this.gh(['issue', 'view', String(number), '--json',
      'number,title,body,state,author,url,createdAt,updatedAt,labels,assignees,comments',
    ])

    const issue = JSON.parse(result) as {
      number: number
      title: string
      body: string
      state: string
      author: { login: string }
      url: string
      createdAt: string
      updatedAt: string
      labels: Array<{ name: string }>
      assignees: Array<{ login: string }>
      comments: Array<unknown>
    }

    return {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      author: issue.author.login,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      labels: issue.labels.map(l => l.name),
      assignees: issue.assignees.map(a => a.login),
      comments: issue.comments.length,
    }
  }

  /**
   * Create an issue
   */
  async createIssue(options: {
    title: string
    body?: string
    labels?: string[]
    assignees?: string[]
  }): Promise<Issue> {
    const args = ['issue', 'create', '--title', options.title]

    if (options.body) args.push('--body', options.body)
    if (options.labels) args.push('--label', options.labels.join(','))
    if (options.assignees) args.push('--assignee', options.assignees.join(','))

    const url = await this.gh(args)
    const number = Number.parseInt(url.split('/').pop()!, 10)
    return this.getIssue(number)
  }

  /**
   * Comment on an issue
   */
  async commentOnIssue(number: number, body: string): Promise<void> {
    await this.gh(['issue', 'comment', String(number), '--body', body])
  }

  /**
   * Close an issue
   */
  async closeIssue(number: number): Promise<void> {
    await this.gh(['issue', 'close', String(number)])
  }

  // ==================== Actions/Workflows ====================

  /**
   * List workflow runs
   */
  async listWorkflowRuns(options: {
    workflow?: string
    branch?: string
    limit?: number
  } = {}): Promise<WorkflowRun[]> {
    const args = ['run', 'list', '--json',
      'databaseId,name,status,conclusion,headBranch,event,url,createdAt',
    ]

    if (options.workflow) args.push('--workflow', options.workflow)
    if (options.branch) args.push('--branch', options.branch)
    if (options.limit) args.push('--limit', String(options.limit))

    const result = await this.gh(args)
    const data = JSON.parse(result) as Array<{
      databaseId: number
      name: string
      status: string
      conclusion: string | null
      headBranch: string
      event: string
      url: string
      createdAt: string
    }>

    return data.map(run => ({
      id: run.databaseId,
      name: run.name,
      status: run.status as 'queued' | 'in_progress' | 'completed',
      conclusion: run.conclusion as 'success' | 'failure' | 'cancelled' | 'skipped' | null,
      branch: run.headBranch,
      event: run.event,
      url: run.url,
      createdAt: run.createdAt,
    }))
  }

  /**
   * View workflow run logs
   */
  async getWorkflowLogs(runId: number): Promise<string> {
    return this.gh(['run', 'view', String(runId), '--log'])
  }

  /**
   * Rerun a failed workflow
   */
  async rerunWorkflow(runId: number): Promise<void> {
    await this.gh(['run', 'rerun', String(runId)])
  }

  /**
   * Cancel a workflow run
   */
  async cancelWorkflow(runId: number): Promise<void> {
    await this.gh(['run', 'cancel', String(runId)])
  }

  // ==================== Utility ====================

  /**
   * Check if gh is installed and authenticated
   */
  async checkAuth(): Promise<boolean> {
    try {
      await this.gh(['auth', 'status'])
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Login to GitHub
   */
  async login(): Promise<void> {
    await this.gh(['auth', 'login'])
  }

  /**
   * Format PR for display
   */
  formatPR(pr: PullRequest): string {
    const lines: string[] = []
    lines.push(`#${pr.number}: ${pr.title}`)
    lines.push(`  State: ${pr.state}${pr.isDraft ? ' (draft)' : ''}`)
    lines.push(`  Branch: ${pr.branch} → ${pr.baseBranch}`)
    lines.push(`  Author: ${pr.author}`)
    lines.push(`  Changes: +${pr.additions} -${pr.deletions} (${pr.changedFiles} files)`)
    if (pr.labels.length > 0) {
      lines.push(`  Labels: ${pr.labels.join(', ')}`)
    }
    lines.push(`  URL: ${pr.url}`)
    return lines.join('\n')
  }

  /**
   * Format issue for display
   */
  formatIssue(issue: Issue): string {
    const lines: string[] = []
    lines.push(`#${issue.number}: ${issue.title}`)
    lines.push(`  State: ${issue.state}`)
    lines.push(`  Author: ${issue.author}`)
    if (issue.assignees.length > 0) {
      lines.push(`  Assignees: ${issue.assignees.join(', ')}`)
    }
    if (issue.labels.length > 0) {
      lines.push(`  Labels: ${issue.labels.join(', ')}`)
    }
    lines.push(`  Comments: ${issue.comments}`)
    lines.push(`  URL: ${issue.url}`)
    return lines.join('\n')
  }
}

/**
 * Create GitHub client
 */
export function createGitHubClient(config: GitHubConfig = {}): GitHubClient {
  return new GitHubClient(config)
}

/**
 * Get GitHub client with default config
 */
let defaultClient: GitHubClient | null = null

export function getGitHubClient(): GitHubClient {
  if (!defaultClient) {
    defaultClient = new GitHubClient()
  }
  return defaultClient
}
