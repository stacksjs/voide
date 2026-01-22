// GitHub Integration Tests

import { describe, test, expect, beforeEach, mock } from 'bun:test'
import {
  GitHubClient,
  createGitHubClient,
  getGitHubClient,
  type PullRequest,
  type Issue,
  type WorkflowRun,
} from '../../src/github'

describe('GitHubClient', () => {
  let client: GitHubClient

  beforeEach(() => {
    client = new GitHubClient()
  })

  describe('constructor', () => {
    test('should create instance without config', () => {
      const c = new GitHubClient()
      expect(c).toBeInstanceOf(GitHubClient)
    })

    test('should accept token config', () => {
      const c = new GitHubClient({ token: 'test-token' })
      expect(c).toBeInstanceOf(GitHubClient)
    })

    test('should accept full config', () => {
      const c = new GitHubClient({
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo',
      })
      expect(c).toBeInstanceOf(GitHubClient)
    })
  })

  describe('formatPR', () => {
    test('should format pull request', () => {
      const pr: PullRequest = {
        number: 123,
        title: 'Add new feature',
        body: 'Description',
        state: 'open',
        author: 'testuser',
        branch: 'feature-branch',
        baseBranch: 'main',
        url: 'https://github.com/owner/repo/pull/123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        labels: ['enhancement'],
        reviewers: ['reviewer1'],
        isDraft: false,
        mergeable: true,
        additions: 100,
        deletions: 50,
        changedFiles: 5,
      }

      const formatted = client.formatPR(pr)

      expect(formatted).toContain('#123')
      expect(formatted).toContain('Add new feature')
      expect(formatted).toContain('open')
      expect(formatted).toContain('feature-branch')
      expect(formatted).toContain('main')
      expect(formatted).toContain('testuser')
      expect(formatted).toContain('+100')
      expect(formatted).toContain('-50')
      expect(formatted).toContain('5 files')
      expect(formatted).toContain('enhancement')
    })

    test('should show draft status', () => {
      const pr: PullRequest = {
        number: 1,
        title: 'Draft PR',
        body: '',
        state: 'open',
        author: 'user',
        branch: 'feature',
        baseBranch: 'main',
        url: 'https://github.com/o/r/pull/1',
        createdAt: '',
        updatedAt: '',
        labels: [],
        reviewers: [],
        isDraft: true,
        mergeable: null,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      }

      const formatted = client.formatPR(pr)

      expect(formatted).toContain('draft')
    })

    test('should hide labels when empty', () => {
      const pr: PullRequest = {
        number: 1,
        title: 'PR',
        body: '',
        state: 'open',
        author: 'user',
        branch: 'feature',
        baseBranch: 'main',
        url: 'https://github.com/o/r/pull/1',
        createdAt: '',
        updatedAt: '',
        labels: [],
        reviewers: [],
        isDraft: false,
        mergeable: true,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      }

      const formatted = client.formatPR(pr)

      expect(formatted).not.toContain('Labels')
    })
  })

  describe('formatIssue', () => {
    test('should format issue', () => {
      const issue: Issue = {
        number: 456,
        title: 'Bug report',
        body: 'Description',
        state: 'open',
        author: 'reporter',
        url: 'https://github.com/owner/repo/issues/456',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        labels: ['bug', 'critical'],
        assignees: ['dev1', 'dev2'],
        comments: 5,
      }

      const formatted = client.formatIssue(issue)

      expect(formatted).toContain('#456')
      expect(formatted).toContain('Bug report')
      expect(formatted).toContain('open')
      expect(formatted).toContain('reporter')
      expect(formatted).toContain('dev1')
      expect(formatted).toContain('bug')
      expect(formatted).toContain('critical')
      expect(formatted).toContain('5')
    })

    test('should hide assignees when empty', () => {
      const issue: Issue = {
        number: 1,
        title: 'Issue',
        body: '',
        state: 'open',
        author: 'user',
        url: 'https://github.com/o/r/issues/1',
        createdAt: '',
        updatedAt: '',
        labels: [],
        assignees: [],
        comments: 0,
      }

      const formatted = client.formatIssue(issue)

      expect(formatted).not.toContain('Assignees')
    })

    test('should hide labels when empty', () => {
      const issue: Issue = {
        number: 1,
        title: 'Issue',
        body: '',
        state: 'open',
        author: 'user',
        url: 'https://github.com/o/r/issues/1',
        createdAt: '',
        updatedAt: '',
        labels: [],
        assignees: [],
        comments: 0,
      }

      const formatted = client.formatIssue(issue)

      expect(formatted).not.toContain('Labels')
    })
  })
})

describe('createGitHubClient', () => {
  test('should create GitHubClient instance', () => {
    const client = createGitHubClient()
    expect(client).toBeInstanceOf(GitHubClient)
  })

  test('should pass config to client', () => {
    const client = createGitHubClient({
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo',
    })
    expect(client).toBeInstanceOf(GitHubClient)
  })
})

describe('getGitHubClient', () => {
  test('should return singleton instance', () => {
    const c1 = getGitHubClient()
    const c2 = getGitHubClient()

    expect(c1).toBe(c2)
    expect(c1).toBeInstanceOf(GitHubClient)
  })
})

describe('PullRequest interface', () => {
  test('should have all required properties', () => {
    const pr: PullRequest = {
      number: 1,
      title: 'Test',
      body: 'Body',
      state: 'open',
      author: 'user',
      branch: 'feature',
      baseBranch: 'main',
      url: 'https://example.com',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      labels: [],
      reviewers: [],
      isDraft: false,
      mergeable: true,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    }

    expect(pr.number).toBe(1)
    expect(pr.title).toBe('Test')
    expect(pr.state).toBe('open')
  })

  test('should support all states', () => {
    const states: Array<'open' | 'closed' | 'merged'> = ['open', 'closed', 'merged']

    for (const state of states) {
      const pr: PullRequest = {
        number: 1,
        title: 'Test',
        body: '',
        state,
        author: 'user',
        branch: 'feature',
        baseBranch: 'main',
        url: '',
        createdAt: '',
        updatedAt: '',
        labels: [],
        reviewers: [],
        isDraft: false,
        mergeable: null,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      }

      expect(pr.state).toBe(state)
    }
  })

  test('should support nullable mergeable', () => {
    const pr: PullRequest = {
      number: 1,
      title: 'Test',
      body: '',
      state: 'open',
      author: 'user',
      branch: 'feature',
      baseBranch: 'main',
      url: '',
      createdAt: '',
      updatedAt: '',
      labels: [],
      reviewers: [],
      isDraft: false,
      mergeable: null,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    }

    expect(pr.mergeable).toBeNull()
  })
})

describe('Issue interface', () => {
  test('should have all required properties', () => {
    const issue: Issue = {
      number: 1,
      title: 'Test',
      body: 'Body',
      state: 'open',
      author: 'user',
      url: 'https://example.com',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      labels: [],
      assignees: [],
      comments: 0,
    }

    expect(issue.number).toBe(1)
    expect(issue.title).toBe('Test')
    expect(issue.state).toBe('open')
  })

  test('should support all states', () => {
    const states: Array<'open' | 'closed'> = ['open', 'closed']

    for (const state of states) {
      const issue: Issue = {
        number: 1,
        title: 'Test',
        body: '',
        state,
        author: 'user',
        url: '',
        createdAt: '',
        updatedAt: '',
        labels: [],
        assignees: [],
        comments: 0,
      }

      expect(issue.state).toBe(state)
    }
  })
})

describe('WorkflowRun interface', () => {
  test('should have all required properties', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
      branch: 'main',
      event: 'push',
      url: 'https://example.com',
      createdAt: '2024-01-01',
    }

    expect(run.id).toBe(123)
    expect(run.name).toBe('CI')
    expect(run.status).toBe('completed')
  })

  test('should support all statuses', () => {
    const statuses: Array<'queued' | 'in_progress' | 'completed'> = ['queued', 'in_progress', 'completed']

    for (const status of statuses) {
      const run: WorkflowRun = {
        id: 1,
        name: 'Test',
        status,
        conclusion: null,
        branch: 'main',
        event: 'push',
        url: '',
        createdAt: '',
      }

      expect(run.status).toBe(status)
    }
  })

  test('should support all conclusions', () => {
    const conclusions: Array<'success' | 'failure' | 'cancelled' | 'skipped' | null> = [
      'success', 'failure', 'cancelled', 'skipped', null,
    ]

    for (const conclusion of conclusions) {
      const run: WorkflowRun = {
        id: 1,
        name: 'Test',
        status: 'completed',
        conclusion,
        branch: 'main',
        event: 'push',
        url: '',
        createdAt: '',
      }

      expect(run.conclusion).toBe(conclusion)
    }
  })
})
