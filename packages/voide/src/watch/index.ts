// Watch/Attach Mode for Voide CLI
// Watches for file changes and can attach to running sessions

import { watch, type FSWatcher } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import { EventEmitter } from 'node:events'

export interface WatchOptions {
  /** Directories/files to watch */
  paths?: string[]
  /** File extensions to watch (e.g., ['.ts', '.js']) */
  extensions?: string[]
  /** Patterns to ignore (glob-like) */
  ignore?: string[]
  /** Debounce delay in ms */
  debounce?: number
  /** Whether to watch subdirectories */
  recursive?: boolean
}

export interface WatchEvent {
  type: 'change' | 'rename' | 'create' | 'delete'
  path: string
  relativePath: string
  timestamp: number
}

export interface AttachOptions {
  /** Session ID to attach to */
  sessionId: string
  /** Project path */
  projectPath: string
  /** Whether to sync file changes */
  syncChanges?: boolean
  /** Callback for session events */
  onEvent?: (event: AttachEvent) => void
}

export interface AttachEvent {
  type: 'message' | 'tool_call' | 'tool_result' | 'error' | 'complete'
  data: unknown
  timestamp: number
}

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  '.voide',
  'dist',
  'build',
  '.cache',
  'coverage',
  '*.log',
]

const DEFAULT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.vue', '.svelte', '.stx',
  '.json', '.yaml', '.yml',
  '.md', '.txt',
  '.css', '.scss', '.less',
  '.html',
]

/**
 * File watcher for project changes
 */
export class FileWatcher extends EventEmitter {
  private watchers: FSWatcher[] = []
  private options: Required<WatchOptions>
  private projectPath: string
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private isRunning = false

  constructor(projectPath: string, options: WatchOptions = {}) {
    super()
    this.projectPath = projectPath
    this.options = {
      paths: options.paths || ['.'],
      extensions: options.extensions || DEFAULT_EXTENSIONS,
      ignore: options.ignore || DEFAULT_IGNORE,
      debounce: options.debounce || 100,
      recursive: options.recursive ?? true,
    }
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    for (const watchPath of this.options.paths) {
      const fullPath = join(this.projectPath, watchPath)

      try {
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          await this.watchDirectory(fullPath)
        }
        else {
          this.watchFile(fullPath)
        }
      }
      catch {
        // Path doesn't exist, skip
      }
    }

    this.emit('started', { paths: this.options.paths })
  }

  /**
   * Stop watching
   */
  stop(): void {
    this.isRunning = false

    for (const watcher of this.watchers) {
      watcher.close()
    }
    this.watchers = []

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    this.emit('stopped')
  }

  /**
   * Watch a directory recursively
   */
  private async watchDirectory(dirPath: string): Promise<void> {
    if (!this.isRunning) return

    // Check if directory should be ignored
    const relativePath = relative(this.projectPath, dirPath)
    if (this.shouldIgnore(relativePath)) return

    try {
      const watcher = watch(dirPath, { recursive: this.options.recursive }, (eventType, filename) => {
        if (!filename) return

        const fullPath = join(dirPath, filename)
        const relPath = relative(this.projectPath, fullPath)

        // Check ignore patterns
        if (this.shouldIgnore(relPath)) return

        // Check extension filter
        const ext = extname(filename)
        if (ext && !this.options.extensions.includes(ext)) return

        // Debounce the event
        this.debounceEvent(relPath, eventType as 'change' | 'rename')
      })

      this.watchers.push(watcher)

      // If not using recursive, manually watch subdirectories
      if (!this.options.recursive) {
        const entries = await readdir(dirPath, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await this.watchDirectory(join(dirPath, entry.name))
          }
        }
      }
    }
    catch {
      // Directory can't be watched
    }
  }

  /**
   * Watch a single file
   */
  private watchFile(filePath: string): void {
    if (!this.isRunning) return

    const relativePath = relative(this.projectPath, filePath)
    if (this.shouldIgnore(relativePath)) return

    try {
      const watcher = watch(filePath, (eventType) => {
        this.debounceEvent(relativePath, eventType as 'change' | 'rename')
      })

      this.watchers.push(watcher)
    }
    catch {
      // File can't be watched
    }
  }

  /**
   * Debounce events for a file
   */
  private debounceEvent(path: string, eventType: 'change' | 'rename'): void {
    const existing = this.debounceTimers.get(path)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(path)

      // Determine actual event type
      let type: WatchEvent['type'] = eventType === 'change' ? 'change' : 'rename'

      // Try to determine if it's a create or delete
      if (eventType === 'rename') {
        try {
          await stat(join(this.projectPath, path))
          type = 'create'
        }
        catch {
          type = 'delete'
        }
      }

      const event: WatchEvent = {
        type,
        path: join(this.projectPath, path),
        relativePath: path,
        timestamp: Date.now(),
      }

      this.emit('change', event)
    }, this.options.debounce)

    this.debounceTimers.set(path, timer)
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(relativePath: string): boolean {
    const parts = relativePath.split(/[/\\]/)

    for (const ignore of this.options.ignore) {
      // Exact match
      if (parts.includes(ignore)) return true

      // Wildcard pattern
      if (ignore.includes('*')) {
        const regex = new RegExp(
          '^' + ignore.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        )
        if (regex.test(relativePath) || parts.some(p => regex.test(p))) {
          return true
        }
      }
    }

    return false
  }
}

/**
 * Session attacher for connecting to running sessions
 */
export class SessionAttacher extends EventEmitter {
  private sessionId: string
  private projectPath: string
  private options: AttachOptions
  private isAttached = false
  private pollInterval?: NodeJS.Timeout

  constructor(options: AttachOptions) {
    super()
    this.sessionId = options.sessionId
    this.projectPath = options.projectPath
    this.options = options
  }

  /**
   * Attach to a running session
   */
  async attach(): Promise<void> {
    if (this.isAttached) return
    this.isAttached = true

    // Start polling for session updates
    this.pollInterval = setInterval(() => {
      this.pollSession()
    }, 500)

    this.emit('attached', { sessionId: this.sessionId })
  }

  /**
   * Detach from the session
   */
  detach(): void {
    this.isAttached = false

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = undefined
    }

    this.emit('detached', { sessionId: this.sessionId })
  }

  /**
   * Send a message to the attached session
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.isAttached) {
      throw new Error('Not attached to a session')
    }

    // This would integrate with the session manager
    // For now, emit an event
    this.emit('send', { content, timestamp: Date.now() })
  }

  /**
   * Poll the session for updates
   */
  private async pollSession(): Promise<void> {
    if (!this.isAttached) return

    // This would check the session store for new messages
    // For now, it's a placeholder
    // Implementation would integrate with session store
  }
}

/**
 * Combined watch + attach mode
 */
export class WatchAttachMode extends EventEmitter {
  private watcher: FileWatcher
  private attacher?: SessionAttacher
  private projectPath: string
  private isRunning = false
  private pendingChanges: WatchEvent[] = []

  constructor(projectPath: string, options: WatchOptions = {}) {
    super()
    this.projectPath = projectPath
    this.watcher = new FileWatcher(projectPath, options)

    // Forward watcher events
    this.watcher.on('change', (event: WatchEvent) => {
      this.handleFileChange(event)
    })

    this.watcher.on('started', () => {
      this.emit('watch:started')
    })

    this.watcher.on('stopped', () => {
      this.emit('watch:stopped')
    })
  }

  /**
   * Start watch mode
   */
  async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    await this.watcher.start()
    this.emit('started')
  }

  /**
   * Stop watch mode
   */
  stop(): void {
    this.isRunning = false
    this.watcher.stop()

    if (this.attacher) {
      this.attacher.detach()
      this.attacher = undefined
    }

    this.emit('stopped')
  }

  /**
   * Attach to a session
   */
  async attachToSession(sessionId: string): Promise<void> {
    if (this.attacher) {
      this.attacher.detach()
    }

    this.attacher = new SessionAttacher({
      sessionId,
      projectPath: this.projectPath,
      syncChanges: true,
    })

    // Forward attacher events
    this.attacher.on('attached', () => {
      this.emit('session:attached', { sessionId })
    })

    this.attacher.on('detached', () => {
      this.emit('session:detached', { sessionId })
    })

    await this.attacher.attach()
  }

  /**
   * Detach from current session
   */
  detachFromSession(): void {
    if (this.attacher) {
      this.attacher.detach()
      this.attacher = undefined
    }
  }

  /**
   * Handle a file change event
   */
  private handleFileChange(event: WatchEvent): void {
    this.pendingChanges.push(event)
    this.emit('file:change', event)

    // If attached to a session, notify it of changes
    if (this.attacher) {
      this.emit('session:fileChange', {
        sessionId: this.attacher['sessionId'],
        event,
      })
    }
  }

  /**
   * Get pending changes since last check
   */
  getPendingChanges(): WatchEvent[] {
    const changes = [...this.pendingChanges]
    this.pendingChanges = []
    return changes
  }

  /**
   * Check if watching
   */
  get watching(): boolean {
    return this.isRunning
  }

  /**
   * Check if attached
   */
  get attached(): boolean {
    return this.attacher !== undefined
  }
}

/**
 * Create a watch mode instance
 */
export function createWatchMode(
  projectPath: string,
  options: WatchOptions = {},
): WatchAttachMode {
  return new WatchAttachMode(projectPath, options)
}

/**
 * Quick start watch mode
 */
export async function startWatchMode(
  projectPath: string,
  options: WatchOptions = {},
  onChange?: (event: WatchEvent) => void,
): Promise<WatchAttachMode> {
  const mode = createWatchMode(projectPath, options)

  if (onChange) {
    mode.on('file:change', onChange)
  }

  await mode.start()
  return mode
}
