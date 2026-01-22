// Context Compaction for Voide CLI
// Summarizes long conversations to fit within context limits

import type { Message, MessageContent, TextContent } from './types'

export interface CompactionOptions {
  /** Maximum messages before compaction triggers */
  threshold?: number
  /** Number of recent messages to keep unchanged */
  keepRecent?: number
  /** Whether to keep all tool calls/results */
  keepToolCalls?: boolean
}

export interface CompactionResult {
  messages: Message[]
  compacted: boolean
  originalCount: number
  newCount: number
  summaryAdded: boolean
}

/**
 * Compact messages by summarizing older ones
 */
export async function compactMessages(
  messages: Message[],
  options: CompactionOptions = {},
  summarizer?: (text: string) => Promise<string>,
): Promise<CompactionResult> {
  const threshold = options.threshold || 50
  const keepRecent = options.keepRecent || 10
  const keepToolCalls = options.keepToolCalls ?? true

  if (messages.length <= threshold) {
    return {
      messages,
      compacted: false,
      originalCount: messages.length,
      newCount: messages.length,
      summaryAdded: false,
    }
  }

  // Split messages into old and recent
  const oldMessages = messages.slice(0, -keepRecent)
  const recentMessages = messages.slice(-keepRecent)

  // Extract important content from old messages
  const importantContent = extractImportantContent(oldMessages, keepToolCalls)

  // Create summary
  let summary: string
  if (summarizer) {
    summary = await summarizer(importantContent)
  }
  else {
    summary = createBasicSummary(oldMessages, importantContent)
  }

  // Create compacted message
  const compactedMessage: Message = {
    id: `compacted-${Date.now()}`,
    role: 'system',
    content: [{
      type: 'text',
      text: `[Conversation Summary]\n\n${summary}\n\n[End of Summary - Recent messages follow]`,
    }],
    timestamp: Date.now(),
    metadata: {
      isCompaction: true,
      originalMessageCount: oldMessages.length,
    },
  }

  const newMessages = [compactedMessage, ...recentMessages]

  return {
    messages: newMessages,
    compacted: true,
    originalCount: messages.length,
    newCount: newMessages.length,
    summaryAdded: true,
  }
}

/**
 * Extract important content from messages
 */
function extractImportantContent(messages: Message[], keepToolCalls: boolean): string {
  const parts: string[] = []

  for (const message of messages) {
    const role = message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'System'

    for (const content of message.content) {
      if (content.type === 'text') {
        // Keep text content but truncate very long ones
        const text = content.text.length > 500
          ? content.text.slice(0, 500) + '...'
          : content.text
        parts.push(`${role}: ${text}`)
      }
      else if (content.type === 'tool_use' && keepToolCalls) {
        parts.push(`${role} used tool: ${content.name}`)
      }
      else if (content.type === 'tool_result' && keepToolCalls) {
        const output = content.output.length > 200
          ? content.output.slice(0, 200) + '...'
          : content.output
        parts.push(`Tool result: ${output}`)
      }
    }
  }

  return parts.join('\n\n')
}

/**
 * Create a basic summary without LLM
 */
function createBasicSummary(messages: Message[], content: string): string {
  // Count various aspects
  let userMessages = 0
  let assistantMessages = 0
  let toolCalls = 0
  const toolsUsed = new Set<string>()
  const filesReferenced = new Set<string>()

  for (const message of messages) {
    if (message.role === 'user') userMessages++
    if (message.role === 'assistant') assistantMessages++

    for (const c of message.content) {
      if (c.type === 'tool_use') {
        toolCalls++
        toolsUsed.add(c.name)
      }
      // Try to extract file references
      if (c.type === 'text') {
        const fileMatches = c.text.match(/(?:\/[\w./]+\.\w+)|(?:[\w-]+\.\w{2,4})/g)
        if (fileMatches) {
          for (const match of fileMatches.slice(0, 10)) {
            filesReferenced.add(match)
          }
        }
      }
    }
  }

  const parts: string[] = []

  parts.push(`Previous conversation: ${userMessages} user messages, ${assistantMessages} assistant responses`)

  if (toolCalls > 0) {
    parts.push(`Tools used: ${Array.from(toolsUsed).join(', ')} (${toolCalls} total calls)`)
  }

  if (filesReferenced.size > 0) {
    parts.push(`Files referenced: ${Array.from(filesReferenced).slice(0, 5).join(', ')}${filesReferenced.size > 5 ? '...' : ''}`)
  }

  // Add truncated content
  const truncatedContent = content.length > 2000
    ? content.slice(0, 2000) + '\n...(truncated)'
    : content

  parts.push('\nKey points from conversation:')
  parts.push(truncatedContent)

  return parts.join('\n')
}

/**
 * Estimate token count for messages
 */
export function estimateTokens(messages: Message[]): number {
  let chars = 0

  for (const message of messages) {
    for (const content of message.content) {
      if (content.type === 'text') {
        chars += content.text.length
      }
      else if (content.type === 'tool_use') {
        chars += content.name.length + JSON.stringify(content.input).length
      }
      else if (content.type === 'tool_result') {
        chars += content.output.length
      }
    }
  }

  // Rough estimate: ~4 characters per token
  return Math.ceil(chars / 4)
}

/**
 * Check if compaction is needed
 */
export function needsCompaction(
  messages: Message[],
  options: CompactionOptions = {},
): boolean {
  const threshold = options.threshold || 50
  return messages.length > threshold
}

/**
 * Get compaction stats
 */
export function getCompactionStats(messages: Message[]): {
  messageCount: number
  estimatedTokens: number
  hasCompaction: boolean
  compactionIndex: number
} {
  const hasCompaction = messages.some(m =>
    m.metadata?.isCompaction === true,
  )
  const compactionIndex = messages.findIndex(m =>
    m.metadata?.isCompaction === true,
  )

  return {
    messageCount: messages.length,
    estimatedTokens: estimateTokens(messages),
    hasCompaction,
    compactionIndex,
  }
}
