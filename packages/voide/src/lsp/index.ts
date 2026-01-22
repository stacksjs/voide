// LSP (Language Server Protocol) Integration for Voide CLI
// Provides real-time code diagnostics and language features

import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'

export interface LspServerConfig {
  /** Language ID */
  language: string
  /** Command to start the server */
  command: string
  /** Arguments */
  args?: string[]
  /** Root path patterns */
  rootPatterns?: string[]
  /** File extensions */
  extensions?: string[]
  /** Environment variables */
  env?: Record<string, string>
}

export interface LspDiagnostic {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  source?: string
  code?: string | number
}

export interface LspLocation {
  file: string
  line: number
  column: number
}

export interface LspSymbol {
  name: string
  kind: string
  location: LspLocation
  containerName?: string
}

export interface LspHover {
  contents: string
  range?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
}

// Default LSP server configurations
const DEFAULT_LSP_CONFIGS: LspServerConfig[] = [
  {
    language: 'typescript',
    command: 'typescript-language-server',
    args: ['--stdio'],
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    rootPatterns: ['tsconfig.json', 'jsconfig.json', 'package.json'],
  },
  {
    language: 'python',
    command: 'pylsp',
    args: [],
    extensions: ['.py'],
    rootPatterns: ['pyproject.toml', 'setup.py', 'requirements.txt'],
  },
  {
    language: 'rust',
    command: 'rust-analyzer',
    args: [],
    extensions: ['.rs'],
    rootPatterns: ['Cargo.toml'],
  },
  {
    language: 'go',
    command: 'gopls',
    args: [],
    extensions: ['.go'],
    rootPatterns: ['go.mod', 'go.sum'],
  },
  {
    language: 'json',
    command: 'vscode-json-language-server',
    args: ['--stdio'],
    extensions: ['.json', '.jsonc'],
    rootPatterns: [],
  },
  {
    language: 'yaml',
    command: 'yaml-language-server',
    args: ['--stdio'],
    extensions: ['.yaml', '.yml'],
    rootPatterns: [],
  },
  {
    language: 'html',
    command: 'vscode-html-language-server',
    args: ['--stdio'],
    extensions: ['.html', '.htm'],
    rootPatterns: [],
  },
  {
    language: 'css',
    command: 'vscode-css-language-server',
    args: ['--stdio'],
    extensions: ['.css', '.scss', '.less'],
    rootPatterns: [],
  },
]

/**
 * LSP Client for a single language server
 */
class LspClient extends EventEmitter {
  private process: ChildProcess | null = null
  private config: LspServerConfig
  private rootPath: string
  private requestId = 0
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }>()
  private buffer = ''
  private initialized = false
  private diagnostics = new Map<string, LspDiagnostic[]>()

  constructor(config: LspServerConfig, rootPath: string) {
    super()
    this.config = config
    this.rootPath = rootPath
  }

  /**
   * Start the language server
   */
  async start(): Promise<void> {
    if (this.process) return

    this.process = spawn(this.config.command, this.config.args || [], {
      cwd: this.rootPath,
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.process.stdout?.on('data', (data) => {
      this.handleData(data.toString())
    })

    this.process.stderr?.on('data', (data) => {
      this.emit('log', { level: 'error', message: data.toString() })
    })

    this.process.on('close', (code) => {
      this.emit('close', { code })
      this.process = null
      this.initialized = false
    })

    this.process.on('error', (error) => {
      this.emit('error', error)
    })

    // Initialize the server
    await this.initialize()
  }

  /**
   * Stop the language server
   */
  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
      this.initialized = false
    }
  }

  /**
   * Initialize the LSP connection
   */
  private async initialize(): Promise<void> {
    const result = await this.sendRequest('initialize', {
      processId: process.pid,
      rootPath: this.rootPath,
      rootUri: `file://${this.rootPath}`,
      capabilities: {
        textDocument: {
          synchronization: {
            didSave: true,
            didOpen: true,
            didClose: true,
          },
          publishDiagnostics: {
            relatedInformation: true,
          },
          hover: {
            contentFormat: ['markdown', 'plaintext'],
          },
          definition: {},
          references: {},
          documentSymbol: {},
          completion: {
            completionItem: {
              snippetSupport: true,
            },
          },
        },
        workspace: {
          workspaceFolders: true,
        },
      },
      workspaceFolders: [{
        uri: `file://${this.rootPath}`,
        name: this.rootPath.split('/').pop() || 'workspace',
      }],
    })

    // Send initialized notification
    this.sendNotification('initialized', {})
    this.initialized = true
    this.emit('initialized', result)
  }

  /**
   * Open a document
   */
  async openDocument(filePath: string): Promise<void> {
    if (!this.initialized) return

    const content = await readFile(filePath, 'utf-8')
    const languageId = this.getLanguageId(filePath)

    this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: `file://${filePath}`,
        languageId,
        version: 1,
        text: content,
      },
    })
  }

  /**
   * Close a document
   */
  closeDocument(filePath: string): void {
    if (!this.initialized) return

    this.sendNotification('textDocument/didClose', {
      textDocument: {
        uri: `file://${filePath}`,
      },
    })
  }

  /**
   * Update document content
   */
  updateDocument(filePath: string, content: string, version: number): void {
    if (!this.initialized) return

    this.sendNotification('textDocument/didChange', {
      textDocument: {
        uri: `file://${filePath}`,
        version,
      },
      contentChanges: [{ text: content }],
    })
  }

  /**
   * Get diagnostics for a file
   */
  getDiagnostics(filePath: string): LspDiagnostic[] {
    return this.diagnostics.get(filePath) || []
  }

  /**
   * Get all diagnostics
   */
  getAllDiagnostics(): Map<string, LspDiagnostic[]> {
    return new Map(this.diagnostics)
  }

  /**
   * Get hover information
   */
  async getHover(filePath: string, line: number, column: number): Promise<LspHover | null> {
    if (!this.initialized) return null

    try {
      const result = await this.sendRequest('textDocument/hover', {
        textDocument: { uri: `file://${filePath}` },
        position: { line, character: column },
      }) as { contents?: unknown; range?: unknown } | null

      if (!result || !result.contents) return null

      let contents = ''
      if (typeof result.contents === 'string') {
        contents = result.contents
      }
      else if (Array.isArray(result.contents)) {
        contents = result.contents.map(c =>
          typeof c === 'string' ? c : (c as { value?: string }).value || '',
        ).join('\n')
      }
      else if (typeof result.contents === 'object') {
        contents = (result.contents as { value?: string }).value || ''
      }

      return { contents }
    }
    catch {
      return null
    }
  }

  /**
   * Go to definition
   */
  async getDefinition(filePath: string, line: number, column: number): Promise<LspLocation[]> {
    if (!this.initialized) return []

    try {
      const result = await this.sendRequest('textDocument/definition', {
        textDocument: { uri: `file://${filePath}` },
        position: { line, character: column },
      })

      return this.parseLocations(result)
    }
    catch {
      return []
    }
  }

  /**
   * Find references
   */
  async getReferences(filePath: string, line: number, column: number): Promise<LspLocation[]> {
    if (!this.initialized) return []

    try {
      const result = await this.sendRequest('textDocument/references', {
        textDocument: { uri: `file://${filePath}` },
        position: { line, character: column },
        context: { includeDeclaration: true },
      })

      return this.parseLocations(result)
    }
    catch {
      return []
    }
  }

  /**
   * Get document symbols
   */
  async getSymbols(filePath: string): Promise<LspSymbol[]> {
    if (!this.initialized) return []

    try {
      const result = await this.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri: `file://${filePath}` },
      }) as Array<{
        name: string
        kind: number
        location?: { uri: string; range: { start: { line: number; character: number } } }
        range?: { start: { line: number; character: number } }
        containerName?: string
      }> | null

      if (!result) return []

      return result.map(s => ({
        name: s.name,
        kind: this.symbolKindToString(s.kind),
        location: {
          file: s.location?.uri?.replace('file://', '') || filePath,
          line: s.location?.range?.start?.line ?? s.range?.start?.line ?? 0,
          column: s.location?.range?.start?.character ?? s.range?.start?.character ?? 0,
        },
        containerName: s.containerName,
      }))
    }
    catch {
      return []
    }
  }

  /**
   * Parse location results
   */
  private parseLocations(result: unknown): LspLocation[] {
    if (!result) return []

    const locations: LspLocation[] = []
    const items = Array.isArray(result) ? result : [result]

    for (const item of items) {
      const loc = item as {
        uri?: string
        range?: { start?: { line?: number; character?: number } }
        targetUri?: string
        targetRange?: { start?: { line?: number; character?: number } }
      }

      const uri = loc.uri || loc.targetUri
      const range = loc.range || loc.targetRange

      if (uri && range?.start) {
        locations.push({
          file: uri.replace('file://', ''),
          line: range.start.line || 0,
          column: range.start.character || 0,
        })
      }
    }

    return locations
  }

  /**
   * Handle incoming data from server
   */
  private handleData(data: string): void {
    this.buffer += data

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) break

      const header = this.buffer.slice(0, headerEnd)
      const contentLengthMatch = header.match(/Content-Length: (\d+)/)
      if (!contentLengthMatch) {
        this.buffer = this.buffer.slice(headerEnd + 4)
        continue
      }

      const contentLength = Number.parseInt(contentLengthMatch[1], 10)
      const messageStart = headerEnd + 4
      const messageEnd = messageStart + contentLength

      if (this.buffer.length < messageEnd) break

      const message = this.buffer.slice(messageStart, messageEnd)
      this.buffer = this.buffer.slice(messageEnd)

      try {
        const json = JSON.parse(message)
        this.handleMessage(json)
      }
      catch {
        // Invalid JSON
      }
    }
  }

  /**
   * Handle a parsed message
   */
  private handleMessage(message: {
    id?: number
    method?: string
    params?: unknown
    result?: unknown
    error?: { message: string }
  }): void {
    // Response to a request
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)

      if (message.error) {
        pending.reject(new Error(message.error.message))
      }
      else {
        pending.resolve(message.result)
      }
      return
    }

    // Notification from server
    if (message.method) {
      this.handleNotification(message.method, message.params)
    }
  }

  /**
   * Handle a server notification
   */
  private handleNotification(method: string, params: unknown): void {
    if (method === 'textDocument/publishDiagnostics') {
      const diagnosticsParams = params as {
        uri: string
        diagnostics: Array<{
          range: { start: { line: number; character: number }; end: { line: number; character: number } }
          severity?: number
          message: string
          source?: string
          code?: string | number
        }>
      }

      const filePath = diagnosticsParams.uri.replace('file://', '')
      const diagnostics: LspDiagnostic[] = diagnosticsParams.diagnostics.map(d => ({
        file: filePath,
        line: d.range.start.line,
        column: d.range.start.character,
        endLine: d.range.end.line,
        endColumn: d.range.end.character,
        severity: this.severityToString(d.severity),
        message: d.message,
        source: d.source,
        code: d.code,
      }))

      this.diagnostics.set(filePath, diagnostics)
      this.emit('diagnostics', { file: filePath, diagnostics })
    }
    else if (method === 'window/logMessage' || method === 'window/showMessage') {
      const logParams = params as { type: number; message: string }
      this.emit('log', {
        level: logParams.type <= 1 ? 'error' : logParams.type === 2 ? 'warning' : 'info',
        message: logParams.message,
      })
    }
  }

  /**
   * Send a request to the server
   */
  private sendRequest(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('Server not running'))
        return
      }

      const id = ++this.requestId
      const message = JSON.stringify({ jsonrpc: '2.0', id, method, params })
      const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`

      this.pendingRequests.set(id, { resolve, reject })
      this.process.stdin.write(content)

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request ${method} timed out`))
        }
      }, 30000)
    })
  }

  /**
   * Send a notification to the server
   */
  private sendNotification(method: string, params: unknown): void {
    if (!this.process?.stdin) return

    const message = JSON.stringify({ jsonrpc: '2.0', method, params })
    const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`
    this.process.stdin.write(content)
  }

  /**
   * Get language ID from file path
   */
  private getLanguageId(filePath: string): string {
    const ext = extname(filePath).toLowerCase()
    const mapping: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.py': 'python',
      '.rs': 'rust',
      '.go': 'go',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
    }
    return mapping[ext] || 'plaintext'
  }

  /**
   * Convert severity number to string
   */
  private severityToString(severity?: number): 'error' | 'warning' | 'info' | 'hint' {
    switch (severity) {
      case 1: return 'error'
      case 2: return 'warning'
      case 3: return 'info'
      case 4: return 'hint'
      default: return 'error'
    }
  }

  /**
   * Convert symbol kind number to string
   */
  private symbolKindToString(kind: number): string {
    const kinds: Record<number, string> = {
      1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package',
      5: 'Class', 6: 'Method', 7: 'Property', 8: 'Field',
      9: 'Constructor', 10: 'Enum', 11: 'Interface', 12: 'Function',
      13: 'Variable', 14: 'Constant', 15: 'String', 16: 'Number',
      17: 'Boolean', 18: 'Array', 19: 'Object', 20: 'Key',
      21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event',
      25: 'Operator', 26: 'TypeParameter',
    }
    return kinds[kind] || 'Unknown'
  }

  get language(): string {
    return this.config.language
  }

  get isInitialized(): boolean {
    return this.initialized
  }
}

/**
 * LSP Manager for handling multiple language servers
 */
export class LspManager extends EventEmitter {
  private clients = new Map<string, LspClient>()
  private rootPath: string
  private configs: LspServerConfig[]

  constructor(rootPath: string, configs?: LspServerConfig[]) {
    super()
    this.rootPath = rootPath
    this.configs = configs || DEFAULT_LSP_CONFIGS
  }

  /**
   * Start a language server for a specific language
   */
  async startServer(language: string): Promise<LspClient | null> {
    if (this.clients.has(language)) {
      return this.clients.get(language)!
    }

    const config = this.configs.find(c => c.language === language)
    if (!config) return null

    const client = new LspClient(config, this.rootPath)

    client.on('diagnostics', (event) => {
      this.emit('diagnostics', { language, ...event })
    })

    client.on('log', (event) => {
      this.emit('log', { language, ...event })
    })

    client.on('error', (error) => {
      this.emit('error', { language, error })
    })

    try {
      await client.start()
      this.clients.set(language, client)
      this.emit('serverStarted', { language })
      return client
    }
    catch (error) {
      this.emit('error', { language, error })
      return null
    }
  }

  /**
   * Stop a language server
   */
  stopServer(language: string): void {
    const client = this.clients.get(language)
    if (client) {
      client.stop()
      this.clients.delete(language)
      this.emit('serverStopped', { language })
    }
  }

  /**
   * Stop all language servers
   */
  stopAll(): void {
    for (const [language, client] of this.clients) {
      client.stop()
      this.emit('serverStopped', { language })
    }
    this.clients.clear()
  }

  /**
   * Get client for a file
   */
  getClientForFile(filePath: string): LspClient | null {
    const ext = extname(filePath).toLowerCase()

    for (const config of this.configs) {
      if (config.extensions?.includes(ext)) {
        return this.clients.get(config.language) || null
      }
    }

    return null
  }

  /**
   * Start server for a file if not already running
   */
  async ensureServerForFile(filePath: string): Promise<LspClient | null> {
    const ext = extname(filePath).toLowerCase()

    for (const config of this.configs) {
      if (config.extensions?.includes(ext)) {
        return this.startServer(config.language)
      }
    }

    return null
  }

  /**
   * Get all diagnostics from all servers
   */
  getAllDiagnostics(): LspDiagnostic[] {
    const all: LspDiagnostic[] = []
    for (const client of this.clients.values()) {
      for (const diagnostics of client.getAllDiagnostics().values()) {
        all.push(...diagnostics)
      }
    }
    return all
  }

  /**
   * Get diagnostics for a file
   */
  getDiagnostics(filePath: string): LspDiagnostic[] {
    const client = this.getClientForFile(filePath)
    return client?.getDiagnostics(filePath) || []
  }

  /**
   * Format diagnostics for display
   */
  formatDiagnostics(diagnostics: LspDiagnostic[]): string {
    if (diagnostics.length === 0) return 'No diagnostics'

    const byFile = new Map<string, LspDiagnostic[]>()
    for (const d of diagnostics) {
      const list = byFile.get(d.file) || []
      list.push(d)
      byFile.set(d.file, list)
    }

    const lines: string[] = []
    for (const [file, fileDiagnostics] of byFile) {
      lines.push(`\n${file}:`)
      for (const d of fileDiagnostics) {
        const icon = d.severity === 'error' ? '✗' : d.severity === 'warning' ? '⚠' : 'ℹ'
        lines.push(`  ${icon} ${d.line + 1}:${d.column + 1} ${d.message}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Get available language servers
   */
  getAvailableServers(): string[] {
    return this.configs.map(c => c.language)
  }

  /**
   * Get running servers
   */
  getRunningServers(): string[] {
    return Array.from(this.clients.keys())
  }
}

/**
 * Create LSP manager for a project
 */
export function createLspManager(
  rootPath: string,
  configs?: LspServerConfig[],
): LspManager {
  return new LspManager(rootPath, configs)
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  const extensions = new Set<string>()
  for (const config of DEFAULT_LSP_CONFIGS) {
    for (const ext of config.extensions || []) {
      extensions.add(ext)
    }
  }
  return Array.from(extensions)
}

export { LspClient }
