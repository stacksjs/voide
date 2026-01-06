/**
 * Claude Agent SDK Integration
 * Handles AI agent queries with streaming responses
 */
import { query } from '@anthropic-ai/claude-agent-sdk'

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

  // Enhance prompt with directory context (only for new sessions)
  const enhancedPrompt = sessionId
    ? prompt  // Resuming - no need to repeat context
    : `You are working in the directory: ${cwd}

All file operations should be relative to or within this directory. When reading, editing, or creating files, use paths relative to this working directory.

User request: ${prompt}`

  try {
    let capturedSessionId: string | undefined

    for await (const message of query({
      prompt: enhancedPrompt,
      options: {
        cwd,
        allowedTools,
        permissionMode,
        ...(sessionId && { resume: sessionId })
      }
    })) {
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
