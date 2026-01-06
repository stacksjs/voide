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
}

export interface StreamMessage {
  type: 'chunk' | 'tool' | 'done' | 'error'
  text?: string
  tool?: string
  input?: unknown
  subtype?: string
  error?: string
}

/**
 * Run a query using Claude Agent SDK and yield streaming messages
 */
export async function* runAgentQuery(options: AgentOptions): AsyncGenerator<StreamMessage> {
  const {
    prompt,
    cwd = process.cwd(),
    allowedTools = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch', 'Task', 'TodoWrite', 'NotebookEdit'],
    permissionMode = 'acceptEdits'
  } = options

  // Enhance prompt with directory context
  const enhancedPrompt = `You are working in the directory: ${cwd}

All file operations should be relative to or within this directory. When reading, editing, or creating files, use paths relative to this working directory.

User request: ${prompt}`

  try {
    for await (const message of query({
      prompt: enhancedPrompt,
      options: {
        cwd,
        allowedTools,
        permissionMode
      }
    })) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if ('text' in block && block.text) {
            yield { type: 'chunk', text: block.text }
          } else if ('name' in block) {
            yield {
              type: 'tool',
              tool: block.name,
              input: 'input' in block ? block.input : undefined
            }
          }
        }
      } else if (message.type === 'result') {
        yield { type: 'done', subtype: message.subtype }
      }
    }
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
