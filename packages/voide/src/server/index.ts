// Server Mode for Voide CLI
// HTTP and WebSocket API for programmatic access

import { EventEmitter } from 'node:events'

export interface ServerOptions {
  /** Port to listen on */
  port?: number
  /** Host to bind to */
  host?: string
  /** Enable WebSocket support */
  websocket?: boolean
  /** CORS origins */
  cors?: string[]
  /** API key for authentication */
  apiKey?: string
}

export interface ServerRequest {
  id: string
  method: string
  path: string
  headers: Record<string, string>
  body?: unknown
  query?: Record<string, string>
}

export interface ServerResponse {
  status: number
  headers?: Record<string, string>
  body?: unknown
}

export interface WebSocketMessage {
  type: 'message' | 'tool_call' | 'tool_result' | 'stream' | 'error' | 'complete'
  sessionId?: string
  data: unknown
  timestamp: number
}

/**
 * Voide API Server
 */
export class VoideServer extends EventEmitter {
  private server?: unknown // Bun.Server
  private options: Required<ServerOptions>
  private sessions: Map<string, WebSocketConnection> = new Map()
  private isRunning = false

  constructor(options: ServerOptions = {}) {
    super()
    this.options = {
      port: options.port || 3456,
      host: options.host || 'localhost',
      websocket: options.websocket ?? true,
      cors: options.cors || ['*'],
      apiKey: options.apiKey || '',
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.isRunning) return

    const { port, host, websocket, cors, apiKey } = this.options

    const fetchHandler = async (req: Request, server: { upgrade: (req: Request, options?: unknown) => boolean }) => {
      const url = new URL(req.url)

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return this.corsResponse(cors)
      }

      // Check API key if configured
      if (apiKey) {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
          return this.jsonResponse({ error: 'Unauthorized' }, 401)
        }
      }

      // WebSocket upgrade
      if (websocket && url.pathname === '/ws') {
        const upgraded = server.upgrade(req, {
          data: { sessionId: url.searchParams.get('session') },
        })
        if (upgraded) return undefined
        return this.jsonResponse({ error: 'WebSocket upgrade failed' }, 400)
      }

      // Route to handlers
      return this.handleRequest(req, url)
    }

    const wsHandler = {
      open: (ws: unknown) => {
        const conn = new WebSocketConnection(ws)
        const sessionId = ((ws as { data?: { sessionId?: string } }).data as { sessionId?: string })?.sessionId
        if (sessionId) {
          this.sessions.set(sessionId, conn)
        }
        this.emit('ws:connect', { ws, sessionId })
      },

      message: (ws: unknown, message: string | Buffer) => {
        try {
          const data = JSON.parse(message.toString())
          this.emit('ws:message', { ws, data })
          this.handleWebSocketMessage(ws, data)
        }
        catch {
          (ws as { send: (data: string) => void }).send(JSON.stringify({
            type: 'error',
            data: { error: 'Invalid JSON' },
            timestamp: Date.now(),
          }))
        }
      },

      close: (ws: unknown) => {
        const sessionId = ((ws as { data?: { sessionId?: string } }).data as { sessionId?: string })?.sessionId
        if (sessionId) {
          this.sessions.delete(sessionId)
        }
        this.emit('ws:disconnect', { ws, sessionId })
      },
    }

    // Create server config - type assertion to bypass strict Bun typing
    if (websocket) {
      this.server = Bun.serve({
        port,
        hostname: host,
        fetch: fetchHandler as Parameters<typeof Bun.serve>[0]['fetch'],
        websocket: wsHandler,
      } as Parameters<typeof Bun.serve>[0])
    }
    else {
      this.server = Bun.serve({
        port,
        hostname: host,
        fetch: fetchHandler as Parameters<typeof Bun.serve>[0]['fetch'],
      } as Parameters<typeof Bun.serve>[0])
    }

    this.isRunning = true
    this.emit('started', { port, host })
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (!this.isRunning || !this.server) return

    ;(this.server as { stop: () => void }).stop()
    this.server = undefined
    this.isRunning = false
    this.sessions.clear()

    this.emit('stopped')
  }

  /**
   * Handle HTTP request
   */
  private async handleRequest(req: Request, url: URL): Promise<Response> {
    const path = url.pathname
    const method = req.method

    // API Routes
    if (path === '/api/health' && method === 'GET') {
      return this.jsonResponse({ status: 'ok', timestamp: Date.now() })
    }

    if (path === '/api/sessions' && method === 'GET') {
      return this.handleListSessions()
    }

    if (path === '/api/sessions' && method === 'POST') {
      const body = await req.json() as { projectPath?: string }
      return this.handleCreateSession(body)
    }

    if (path.startsWith('/api/sessions/') && method === 'GET') {
      const sessionId = path.split('/')[3]
      return this.handleGetSession(sessionId)
    }

    if (path.startsWith('/api/sessions/') && path.endsWith('/messages') && method === 'POST') {
      const sessionId = path.split('/')[3]
      const body = await req.json() as { content: string; images?: string[] }
      return this.handleSendMessage(sessionId, body)
    }

    if (path === '/api/chat' && method === 'POST') {
      const body = await req.json() as { message: string; sessionId?: string; stream?: boolean }
      return this.handleChat(body, req)
    }

    if (path === '/api/tools' && method === 'GET') {
      return this.handleListTools()
    }

    if (path === '/api/stats' && method === 'GET') {
      return this.handleGetStats()
    }

    return this.jsonResponse({ error: 'Not found' }, 404)
  }

  /**
   * Handle list sessions
   */
  private async handleListSessions(): Promise<Response> {
    const { getSessionStore } = await import('../session/store')
    const store = getSessionStore()
    const sessions = await store.list()

    return this.jsonResponse({
      sessions: sessions.map(s => ({
        id: s.id,
        projectPath: s.projectPath,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messageCount,
      })),
    })
  }

  /**
   * Handle create session
   */
  private async handleCreateSession(body: { projectPath?: string }): Promise<Response> {
    const { createSession } = await import('../session')
    const session = await createSession(body.projectPath || process.cwd())

    return this.jsonResponse({
      id: session.id,
      projectPath: session.projectPath,
      createdAt: session.createdAt,
    }, 201)
  }

  /**
   * Handle get session
   */
  private async handleGetSession(sessionId: string): Promise<Response> {
    const { getSessionStore } = await import('../session/store')
    const store = getSessionStore()
    const session = await store.get(sessionId)

    if (!session) {
      return this.jsonResponse({ error: 'Session not found' }, 404)
    }

    return this.jsonResponse({ session })
  }

  /**
   * Handle send message
   */
  private async handleSendMessage(
    sessionId: string,
    body: { content: string; images?: string[] },
  ): Promise<Response> {
    // This would integrate with the agent system
    // For now, return a placeholder
    this.emit('message', { sessionId, content: body.content, images: body.images })

    return this.jsonResponse({
      status: 'processing',
      sessionId,
      messageId: `msg-${Date.now()}`,
    }, 202)
  }

  /**
   * Handle chat endpoint (simple request/response)
   */
  private async handleChat(
    body: { message: string; sessionId?: string; stream?: boolean },
    req: Request,
  ): Promise<Response> {
    // Streaming response
    if (body.stream) {
      return this.handleStreamingChat(body, req)
    }

    // This would integrate with the provider
    this.emit('chat', { message: body.message, sessionId: body.sessionId })

    return this.jsonResponse({
      status: 'processing',
      message: 'Use WebSocket or streaming for real-time responses',
    })
  }

  /**
   * Handle streaming chat
   */
  private handleStreamingChat(
    body: { message: string; sessionId?: string },
    _req: Request,
  ): Response {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start: async (controller) => {
        // Emit event for processing
        this.emit('chat:stream', {
          message: body.message,
          sessionId: body.sessionId,
          controller,
        })

        // Send initial event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'start',
          timestamp: Date.now(),
        })}\n\n`))

        // The actual streaming would be handled by event listeners
        // For demo, send a completion after a delay
        setTimeout(() => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            timestamp: Date.now(),
          })}\n\n`))
          controller.close()
        }, 100)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...this.corsHeaders(),
      },
    })
  }

  /**
   * Handle list tools
   */
  private async handleListTools(): Promise<Response> {
    const { getAllTools } = await import('../tool')
    const tools = getAllTools()

    return this.jsonResponse({
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    })
  }

  /**
   * Handle get stats
   */
  private async handleGetStats(): Promise<Response> {
    const { loadStats } = await import('../stats')
    const stats = await loadStats()

    return this.jsonResponse({ stats })
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(ws: unknown, data: WebSocketMessage): void {
    switch (data.type) {
      case 'message':
        this.emit('ws:userMessage', { ws, data })
        break
      case 'tool_call':
        this.emit('ws:toolCall', { ws, data })
        break
      default:
        // Unknown message type
        break
    }
  }

  /**
   * Broadcast to all WebSocket connections
   */
  broadcast(message: WebSocketMessage): void {
    const json = JSON.stringify(message)
    for (const conn of this.sessions.values()) {
      conn.send(json)
    }
  }

  /**
   * Send to specific session
   */
  sendToSession(sessionId: string, message: WebSocketMessage): void {
    const conn = this.sessions.get(sessionId)
    if (conn) {
      conn.send(JSON.stringify(message))
    }
  }

  /**
   * Create JSON response
   */
  private jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...this.corsHeaders(),
      },
    })
  }

  /**
   * Create CORS response
   */
  private corsResponse(origins: string[]): Response {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origins.join(', '),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  /**
   * Get CORS headers
   */
  private corsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': this.options.cors.join(', '),
    }
  }

  /**
   * Get server address
   */
  get address(): string {
    return `http://${this.options.host}:${this.options.port}`
  }

  /**
   * Check if running
   */
  get running(): boolean {
    return this.isRunning
  }
}

/**
 * WebSocket connection wrapper
 */
class WebSocketConnection {
  private ws: unknown

  constructor(ws: unknown) {
    this.ws = ws
  }

  send(data: string): void {
    ;(this.ws as { send: (data: string) => void }).send(data)
  }

  close(): void {
    ;(this.ws as { close: () => void }).close()
  }
}

/**
 * Create server instance
 */
export function createServer(options: ServerOptions = {}): VoideServer {
  return new VoideServer(options)
}

/**
 * Start server with default options
 */
export async function startServer(options: ServerOptions = {}): Promise<VoideServer> {
  const server = createServer(options)
  await server.start()
  return server
}

/**
 * API client for connecting to a Voide server
 */
export class VoideClient {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  /**
   * Make API request
   */
  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error((error as { error: string }).error || `HTTP ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Check server health
   */
  async health(): Promise<{ status: string; timestamp: number }> {
    return this.request('/api/health')
  }

  /**
   * List sessions
   */
  async listSessions(): Promise<{ sessions: Array<{
    id: string
    projectPath: string
    createdAt: number
    updatedAt: number
    messageCount: number
  }> }> {
    return this.request('/api/sessions')
  }

  /**
   * Create session
   */
  async createSession(projectPath?: string): Promise<{
    id: string
    projectPath: string
    createdAt: number
  }> {
    return this.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ projectPath }),
    })
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<{ session: unknown }> {
    return this.request(`/api/sessions/${sessionId}`)
  }

  /**
   * Send message
   */
  async sendMessage(
    sessionId: string,
    content: string,
    images?: string[],
  ): Promise<{ status: string; sessionId: string; messageId: string }> {
    return this.request(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, images }),
    })
  }

  /**
   * List tools
   */
  async listTools(): Promise<{ tools: Array<{
    name: string
    description: string
    parameters: unknown[]
  }> }> {
    return this.request('/api/tools')
  }

  /**
   * Get stats
   */
  async getStats(): Promise<{ stats: unknown }> {
    return this.request('/api/stats')
  }

  /**
   * Connect via WebSocket
   */
  connectWebSocket(sessionId?: string): WebSocket {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') +
      `/ws${sessionId ? `?session=${sessionId}` : ''}`
    return new WebSocket(wsUrl)
  }
}

/**
 * Create API client
 */
export function createClient(baseUrl: string, apiKey?: string): VoideClient {
  return new VoideClient(baseUrl, apiKey)
}
