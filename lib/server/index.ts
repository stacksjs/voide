/**
 * Voide Backend Server
 * Handles AI agent requests and repository operations
 */
import { runAgentQuery, cancelCurrentQuery } from './agent'

const PORT = 3008

// Simple git operations
async function getRepoInfo(path: string) {
  const proc = Bun.spawn(['git', 'rev-parse', '--show-toplevel'], { cwd: path, stdout: 'pipe', stderr: 'pipe' })
  const output = await new Response(proc.stdout).text()
  const repoPath = output.trim()

  if (!repoPath) {
    throw new Error('Not a git repository')
  }

  const branchProc = Bun.spawn(['git', 'branch', '--show-current'], { cwd: repoPath, stdout: 'pipe' })
  const branch = (await new Response(branchProc.stdout).text()).trim() || 'main'

  return {
    path: repoPath,
    name: repoPath.split('/').pop() || 'repo',
    branch
  }
}

async function hasChanges(cwd: string): Promise<boolean> {
  const proc = Bun.spawn(['git', 'status', '--porcelain'], { cwd, stdout: 'pipe' })
  const output = await new Response(proc.stdout).text()
  return output.trim().length > 0
}

async function commitChanges(cwd: string, message?: string): Promise<string> {
  // Stage all changes
  await Bun.spawn(['git', 'add', '-A'], { cwd }).exited

  // Commit
  const commitMsg = message || 'Changes made by Voide AI Assistant'
  const proc = Bun.spawn(['git', 'commit', '-m', commitMsg], { cwd, stdout: 'pipe', stderr: 'pipe' })
  await proc.exited

  // Get commit hash
  const hashProc = Bun.spawn(['git', 'rev-parse', '--short', 'HEAD'], { cwd, stdout: 'pipe' })
  const hash = (await new Response(hashProc.stdout).text()).trim()

  return hash
}

async function pushChanges(cwd: string): Promise<void> {
  const proc = Bun.spawn(['git', 'push'], { cwd, stdout: 'pipe', stderr: 'pipe' })
  await proc.exited
}

// Request handlers
const server = Bun.serve({
  port: PORT,
  idleTimeout: 255, // Max timeout for long-running agent queries

  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    try {
      // Health check
      if (path === '/voide/state') {
        return Response.json({ status: 'ok', version: '1.0.0' }, { headers })
      }

      // Repository operations
      if (path === '/voide/repo' && req.method === 'POST') {
        const body = await req.json() as { input: string }
        const repo = await getRepoInfo(body.input)
        return Response.json({ success: true, data: { repo } }, { headers })
      }

      // Validate repository path exists
      if (path === '/voide/repo/validate' && req.method === 'POST') {
        const body = await req.json() as { path: string }
        const pathToCheck = body.path

        if (!pathToCheck) {
          return Response.json({ valid: false, error: 'No path provided' }, { headers })
        }

        try {
          const file = Bun.file(pathToCheck)
          const exists = await file.exists()

          if (!exists) {
            return Response.json({ valid: false, error: 'Path does not exist' }, { headers })
          }

          // Check if it's a directory by trying to read it as a git repo or just checking stat
          const stat = await Bun.spawn(['test', '-d', pathToCheck]).exited
          const isDirectory = stat === 0

          if (!isDirectory) {
            return Response.json({ valid: false, error: 'Path is not a directory' }, { headers })
          }

          return Response.json({ valid: true }, { headers })
        } catch (error) {
          return Response.json({ valid: false, error: 'Path validation failed' }, { headers })
        }
      }

      // Streaming agent query
      if (path === '/voide/process/stream' && req.method === 'POST') {
        const body = await req.json() as { command: string; repository: string; sessionId?: string }
        console.log('[Server] Received sessionId:', body.sessionId || 'none')

        // Track changes before query to detect new changes
        const hadChangesBefore = await hasChanges(body.repository)
        let usedEditTools = false

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            let lastActivity = Date.now()

            // Send keepalive pings every 30 seconds to prevent timeout
            const keepaliveInterval = setInterval(() => {
              if (Date.now() - lastActivity > 25000) {
                controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`))
              }
            }, 30000)

            try {
              for await (const message of runAgentQuery({
                prompt: body.command,
                cwd: body.repository,
                sessionId: body.sessionId,  // Resume from existing session
                allowedTools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch', 'Task', 'TodoWrite', 'NotebookEdit'],
                permissionMode: 'acceptEdits'
              })) {
                lastActivity = Date.now()

                if (message.type === 'session') {
                  // Send session ID to client for future continuations
                  controller.enqueue(encoder.encode(`event: session\ndata: ${JSON.stringify({ sessionId: message.sessionId })}\n\n`))
                } else if (message.type === 'chunk') {
                  controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text: message.text })}\n\n`))
                } else if (message.type === 'tool') {
                  // Track if file-modifying tools were used
                  if (['Edit', 'Write', 'Bash'].includes(message.tool || '')) {
                    usedEditTools = true
                  }
                  controller.enqueue(encoder.encode(`event: tool\ndata: ${JSON.stringify({ tool: message.tool, input: message.input })}\n\n`))
                } else if (message.type === 'done') {
                  // Only report new changes if edit tools were used
                  const hasChangesNow = usedEditTools ? await hasChanges(body.repository) : false
                  const madeNewChanges = usedEditTools && hasChangesNow && !hadChangesBefore
                  controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ subtype: message.subtype, hasChanges: madeNewChanges })}\n\n`))
                } else if (message.type === 'error') {
                  controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message.error })}\n\n`))
                }
              }
            } finally {
              clearInterval(keepaliveInterval)
            }

            controller.close()
          }
        })

        return new Response(stream, {
          headers: {
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        })
      }

      // Commit changes
      if (path === '/voide/commit' && req.method === 'POST') {
        const body = await req.json() as { cwd: string; message?: string }
        const hash = await commitChanges(body.cwd, body.message)
        return Response.json({ success: true, hash }, { headers })
      }

      // Push changes
      if (path === '/voide/push' && req.method === 'POST') {
        const body = await req.json() as { cwd: string }
        await pushChanges(body.cwd)
        return Response.json({ success: true }, { headers })
      }

      // Cancel current query
      if (path === '/voide/cancel' && req.method === 'POST') {
        const cancelled = await cancelCurrentQuery()
        return Response.json({ success: cancelled }, { headers })
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers })

    } catch (error) {
      console.error('Server error:', error)
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500, headers }
      )
    }
  }
})

console.log(`[Voide Server] Running on http://localhost:${PORT}`)
