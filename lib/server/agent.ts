/**
 * Claude Agent SDK Integration
 * Handles AI agent queries with streaming responses
 */
import { query, type Query } from '@anthropic-ai/claude-agent-sdk'

// Store reference to current query for cancellation
let currentQuery: Query | null = null

/**
 * Cancel the currently running query
 */
export async function cancelCurrentQuery(): Promise<boolean> {
  if (currentQuery) {
    try {
      await currentQuery.interrupt()
      console.log('[Agent] Query interrupted')
      currentQuery = null
      return true
    } catch (error) {
      console.error('[Agent] Failed to interrupt:', error)
      return false
    }
  }
  return false
}

export interface AgentOptions {
  prompt: string
  cwd?: string
  allowedTools?: string[]
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
  sessionId?: string  // Resume from existing session
}

export interface StreamMessage {
  type: 'chunk' | 'tool' | 'done' | 'error' | 'session'
  text?: string
  tool?: string
  input?: unknown
  subtype?: string
  error?: string
  sessionId?: string  // Session ID for continuation
}

/**
 * Run a query using Claude Agent SDK and yield streaming messages
 */
export async function* runAgentQuery(options: AgentOptions): AsyncGenerator<StreamMessage> {
  const {
    prompt,
    cwd = process.cwd(),
    allowedTools = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch', 'Task', 'TodoWrite', 'NotebookEdit'],
    permissionMode = 'acceptEdits',
    sessionId
  } = options

  console.log('[Agent] Starting query with sessionId:', sessionId || 'NEW SESSION')

  // Enhance prompt with directory context (only for new sessions)
  const enhancedPrompt = sessionId
    ? prompt  // Resuming - no need to repeat context
    : `You are working in the directory: ${cwd}

All file operations should be relative to or within this directory. When reading, editing, or creating files, use paths relative to this working directory.

User request: ${prompt}`

  try {
    let capturedSessionId: string | undefined

    // Create query and store reference for cancellation
    currentQuery = query({
      prompt: enhancedPrompt,
      options: {
        cwd,
        allowedTools,
        permissionMode,
        ...(sessionId && { resume: sessionId })
      }
    })

    for await (const message of currentQuery) {
      const msg = message as any

      // Capture session ID from system init message
      if (message.type === 'system' && msg.subtype === 'init' && msg.session_id && !capturedSessionId) {
        capturedSessionId = msg.session_id
        console.log('[Agent] Session ID:', capturedSessionId)
        yield { type: 'session', sessionId: capturedSessionId }
      }

      console.log('[Agent] Message type:', message.type, 'has content:', !!msg.message?.content)

      if (message.type === 'assistant') {
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if ('text' in block && block.text) {
              console.log('[Agent] Yielding text chunk:', block.text.substring(0, 50))
              yield { type: 'chunk', text: block.text }
            } else if ('name' in block) {
              console.log('[Agent] Yielding tool:', block.name)
              yield {
                type: 'tool',
                tool: block.name,
                input: 'input' in block ? block.input : undefined
              }
            }
          }
        }
      } else if (message.type === 'result') {
        console.log('[Agent] Result received, subtype:', message.subtype)
        yield { type: 'done', subtype: message.subtype }
      }
    }
    console.log('[Agent] Query loop finished')
  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  } finally {
    currentQuery = null
  }
}

/**
 * Simple query that returns the full response (non-streaming)
 */
export async function runAgentQueryFull(options: AgentOptions): Promise<string> {
  let fullText = ''

  for await (const message of runAgentQuery(options)) {
    if (message.type === 'chunk' && message.text) {
      fullText += message.text
    }
  }

  return fullText
}
