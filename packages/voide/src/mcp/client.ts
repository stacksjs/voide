// MCP Client implementation for Voide CLI
// Connects to MCP servers via stdio or HTTP

import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type {
  McpServerConfig,
  McpServer,
  McpTool,
  McpResource,
  JsonRpcRequest,
  JsonRpcResponse,
  McpInitializeParams,
  McpInitializeResult,
  McpToolsListResult,
  McpResourcesListResult,
  McpToolCallParams,
  McpToolCallResult,
} from './types'

const PROTOCOL_VERSION = '2024-11-05'

export class McpClient extends EventEmitter {
  private servers = new Map<string, McpServerInstance>()

  /**
   * Connect to an MCP server
   */
  async connect(name: string, config: McpServerConfig): Promise<McpServer> {
    if (this.servers.has(name)) {
      throw new Error(`Server ${name} is already connected`)
    }

    const instance = new McpServerInstance(name, config)
    this.servers.set(name, instance)

    try {
      await instance.connect()
      await instance.initialize()

      const server = instance.getServerInfo()
      this.emit('server:connected', server)
      return server
    }
    catch (error) {
      this.servers.delete(name)
      throw error
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(name: string): Promise<void> {
    const instance = this.servers.get(name)
    if (!instance) return

    await instance.disconnect()
    this.servers.delete(name)
    this.emit('server:disconnected', name)
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    for (const name of this.servers.keys()) {
      await this.disconnect(name)
    }
  }

  /**
   * Get all connected servers
   */
  getServers(): McpServer[] {
    return Array.from(this.servers.values()).map(s => s.getServerInfo())
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): McpTool[] {
    const tools: McpTool[] = []
    for (const instance of this.servers.values()) {
      tools.push(...instance.getServerInfo().tools)
    }
    return tools
  }

  /**
   * Get all resources from all connected servers
   */
  getAllResources(): McpResource[] {
    const resources: McpResource[] = []
    for (const instance of this.servers.values()) {
      resources.push(...instance.getServerInfo().resources)
    }
    return resources
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<McpToolCallResult> {
    const instance = this.servers.get(serverName)
    if (!instance) {
      throw new Error(`Server ${serverName} is not connected`)
    }

    return instance.callTool(toolName, args)
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverName: string, uri: string): Promise<string> {
    const instance = this.servers.get(serverName)
    if (!instance) {
      throw new Error(`Server ${serverName} is not connected`)
    }

    return instance.readResource(uri)
  }
}

class McpServerInstance {
  private name: string
  private config: McpServerConfig
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }>()
  private tools: McpTool[] = []
  private resources: McpResource[] = []
  private status: McpServer['status'] = 'disconnected'
  private error?: string
  private buffer = ''

  constructor(name: string, config: McpServerConfig) {
    this.name = name
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.config.transport === 'http' || this.config.transport === 'sse') {
      // HTTP/SSE transport not implemented yet
      throw new Error('HTTP/SSE transport not yet supported')
    }

    // stdio transport
    this.status = 'connecting'

    return new Promise((resolve, reject) => {
      this.process = spawn(this.config.command, this.config.args || [], {
        cwd: this.config.cwd,
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      this.process.stdout?.on('data', (data) => {
        this.handleData(data.toString())
      })

      this.process.stderr?.on('data', (data) => {
        console.error(`[MCP ${this.name}] stderr:`, data.toString())
      })

      this.process.on('error', (error) => {
        this.status = 'error'
        this.error = error.message
        reject(error)
      })

      this.process.on('close', (code) => {
        this.status = 'disconnected'
        if (code !== 0) {
          this.error = `Process exited with code ${code}`
        }
      })

      // Give it a moment to start
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve()
        }
      }, 100)
    })
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    this.status = 'disconnected'
  }

  async initialize(): Promise<void> {
    const params: McpInitializeParams = {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: true,
        resources: true,
      },
      clientInfo: {
        name: 'voide',
        version: '0.0.1',
      },
    }

    const result = await this.sendRequest<McpInitializeResult>('initialize', params)

    // Send initialized notification
    this.sendNotification('notifications/initialized', {})

    this.status = 'connected'

    // Fetch tools and resources
    await this.refreshTools()
    await this.refreshResources()
  }

  async refreshTools(): Promise<void> {
    try {
      const result = await this.sendRequest<McpToolsListResult>('tools/list', {})
      this.tools = result.tools.map(t => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema,
        serverName: this.name,
      }))
    }
    catch {
      this.tools = []
    }
  }

  async refreshResources(): Promise<void> {
    try {
      const result = await this.sendRequest<McpResourcesListResult>('resources/list', {})
      this.resources = result.resources.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
        serverName: this.name,
      }))
    }
    catch {
      this.resources = []
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolCallResult> {
    const params: McpToolCallParams = {
      name,
      arguments: args,
    }

    return this.sendRequest<McpToolCallResult>('tools/call', params)
  }

  async readResource(uri: string): Promise<string> {
    const result = await this.sendRequest<{ contents: Array<{ text?: string, blob?: string }> }>('resources/read', { uri })

    if (result.contents.length === 0) {
      throw new Error('Resource not found')
    }

    const content = result.contents[0]
    if (content.text) {
      return content.text
    }
    if (content.blob) {
      return Buffer.from(content.blob, 'base64').toString('utf-8')
    }

    throw new Error('Resource has no content')
  }

  getServerInfo(): McpServer {
    return {
      name: this.name,
      config: this.config,
      status: this.status,
      tools: this.tools,
      resources: this.resources,
      error: this.error,
    }
  }

  private async sendRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = ++this.requestId
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      const message = JSON.stringify(request) + '\n'
      this.process?.stdin?.write(message)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request ${method} timed out`))
        }
      }, 30000)
    })
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    }

    const message = JSON.stringify(notification) + '\n'
    this.process?.stdin?.write(message)
  }

  private handleData(data: string): void {
    this.buffer += data

    // Process complete lines
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const message = JSON.parse(line) as JsonRpcResponse
        this.handleMessage(message)
      }
      catch {
        // Ignore parse errors
      }
    }
  }

  private handleMessage(message: JsonRpcResponse): void {
    if (message.id !== undefined) {
      // Response to a request
      const pending = this.pendingRequests.get(message.id)
      if (pending) {
        this.pendingRequests.delete(message.id)

        if (message.error) {
          pending.reject(new Error(message.error.message))
        }
        else {
          pending.resolve(message.result)
        }
      }
    }
    // TODO: Handle notifications
  }
}

// Singleton client
let mcpClient: McpClient | null = null

export function getMcpClient(): McpClient {
  if (!mcpClient) {
    mcpClient = new McpClient()
  }
  return mcpClient
}
