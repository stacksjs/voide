// Session processor for Voide CLI
// Handles the conversation loop with LLM and tool execution

import type { Session, Message, MessageContent, TokenUsage } from './types'
import type { Provider, ChatMessage, ChatEvent, ContentBlockStartEvent, ContentBlockDeltaEvent } from '../provider/types'
import type { Tool, ToolContext, PermissionChecker, ToolResult } from '../tool/types'
import { createMessage, textContent, toolUseContent, toolResultContent, getSessionStore } from './store'
import { getTool, getToolsForLLM } from '../tool'
import { createToolResultMessage } from '../provider/anthropic'

export interface ProcessorOptions {
  provider: Provider
  session: Session
  tools?: string[]
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  maxTurns?: number
  permissions: PermissionChecker
  onEvent?: (event: ProcessorEvent) => void
  signal?: AbortSignal
}

export type ProcessorEvent =
  | { type: 'message:start'; messageId: string }
  | { type: 'text:delta'; text: string }
  | { type: 'text:done'; text: string }
  | { type: 'tool:start'; toolId: string; toolName: string; input: Record<string, unknown> }
  | { type: 'tool:done'; toolId: string; output: string; isError: boolean }
  | { type: 'message:done'; message: Message }
  | { type: 'turn:done'; turn: number }
  | { type: 'error'; error: string }

export class SessionProcessor {
  private provider: Provider
  private session: Session
  private toolNames: string[]
  private systemPrompt: string
  private model: string | undefined
  private temperature: number | undefined
  private maxTokens: number
  private maxTurns: number
  private permissions: PermissionChecker
  private onEvent: (event: ProcessorEvent) => void
  private signal: AbortSignal | undefined
  private store = getSessionStore()

  constructor(options: ProcessorOptions) {
    this.provider = options.provider
    this.session = options.session
    this.toolNames = options.tools || ['read', 'write', 'edit', 'glob', 'grep', 'bash']
    this.systemPrompt = options.systemPrompt || getDefaultSystemPrompt()
    this.model = options.model
    this.temperature = options.temperature
    this.maxTokens = options.maxTokens || 8192
    this.maxTurns = options.maxTurns || 50
    this.permissions = options.permissions
    this.onEvent = options.onEvent || (() => {})
    this.signal = options.signal
  }

  async process(userMessage: string): Promise<Message> {
    // Add user message to session
    const userMsg = createMessage('user', [textContent(userMessage)])
    this.session.messages.push(userMsg)
    await this.store.update(this.session)

    // Run conversation loop
    let turn = 0
    let lastAssistantMessage: Message | undefined

    while (turn < this.maxTurns) {
      // Check for abort
      if (this.signal?.aborted) {
        throw new Error('Processing was cancelled')
      }

      // Get response from LLM
      const assistantMessage = await this.getResponse()
      lastAssistantMessage = assistantMessage

      // Check for tool calls
      const toolCalls = assistantMessage.content.filter(c => c.type === 'tool_use')

      if (toolCalls.length === 0) {
        // No tool calls, we're done
        this.onEvent({ type: 'turn:done', turn: turn + 1 })
        break
      }

      // Execute tools
      const toolResults: MessageContent[] = []

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'tool_use') continue

        this.onEvent({
          type: 'tool:start',
          toolId: toolCall.id,
          toolName: toolCall.name,
          input: toolCall.input,
        })

        const result = await this.executeTool(toolCall.id, toolCall.name, toolCall.input)

        toolResults.push(toolResultContent(toolCall.id, result.output, result.isError))

        this.onEvent({
          type: 'tool:done',
          toolId: toolCall.id,
          output: result.output,
          isError: result.isError || false,
        })
      }

      // Add tool results as user message (Anthropic format)
      const toolResultMsg = createMessage('user', toolResults)
      this.session.messages.push(toolResultMsg)
      await this.store.update(this.session)

      turn++
      this.onEvent({ type: 'turn:done', turn })

      // Check for doom loop (same tool called repeatedly)
      if (this.detectDoomLoop(turn)) {
        const errorContent = textContent('⚠️ Detected repetitive tool calls. Stopping to prevent infinite loop.')
        const errorMsg = createMessage('assistant', [errorContent])
        this.session.messages.push(errorMsg)
        await this.store.update(this.session)
        return errorMsg
      }
    }

    if (!lastAssistantMessage) {
      throw new Error('No response generated')
    }

    return lastAssistantMessage
  }

  private async getResponse(): Promise<Message> {
    const messageId = generateId()
    this.onEvent({ type: 'message:start', messageId })

    // Convert session messages to chat format
    const chatMessages = this.convertMessages()

    // Stream response from provider
    const content: MessageContent[] = []
    let currentText = ''
    let currentToolId = ''
    let currentToolName = ''
    let currentToolInput = ''
    let usage: TokenUsage | undefined

    const stream = this.provider.chat({
      messages: chatMessages,
      model: this.model,
      systemPrompt: this.systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      tools: getToolsForLLM(this.toolNames) as any,
      signal: this.signal,
    })

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start': {
          const blockEvent = event as ContentBlockStartEvent
          if (blockEvent.content_block.type === 'text') {
            currentText = ''
          }
          else if (blockEvent.content_block.type === 'tool_use') {
            currentToolId = blockEvent.content_block.id
            currentToolName = blockEvent.content_block.name
            currentToolInput = ''
          }
          break
        }

        case 'content_block_delta': {
          const deltaEvent = event as ContentBlockDeltaEvent
          if (deltaEvent.delta.type === 'text_delta') {
            currentText += deltaEvent.delta.text
            this.onEvent({ type: 'text:delta', text: deltaEvent.delta.text })
          }
          else if (deltaEvent.delta.type === 'input_json_delta') {
            currentToolInput += deltaEvent.delta.partial_json
          }
          break
        }

        case 'content_block_stop': {
          if (currentText) {
            content.push(textContent(currentText))
            this.onEvent({ type: 'text:done', text: currentText })
            currentText = ''
          }
          if (currentToolId) {
            let input: Record<string, unknown> = {}
            try {
              input = JSON.parse(currentToolInput || '{}')
            }
            catch {
              // Invalid JSON, keep empty
            }
            content.push(toolUseContent(currentToolId, currentToolName, input))
            currentToolId = ''
            currentToolName = ''
            currentToolInput = ''
          }
          break
        }

        case 'message_delta': {
          if ('usage' in event && event.usage) {
            usage = {
              inputTokens: 0, // Not provided in delta
              outputTokens: event.usage.output_tokens,
            }
          }
          break
        }

        case 'error': {
          this.onEvent({ type: 'error', error: event.error.message })
          content.push({ type: 'error', message: event.error.message })
          break
        }
      }
    }

    // Create and save assistant message
    const message = createMessage('assistant', content)
    message.id = messageId
    message.model = this.model
    message.usage = usage

    this.session.messages.push(message)
    await this.store.update(this.session)

    this.onEvent({ type: 'message:done', message })
    return message
  }

  private convertMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []

    for (const msg of this.session.messages) {
      if (msg.role === 'system') continue // System goes in system param

      const content: any[] = []

      for (const c of msg.content) {
        switch (c.type) {
          case 'text':
            content.push({ type: 'text', text: c.text })
            break
          case 'tool_use':
            content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.input })
            break
          case 'tool_result':
            content.push({ type: 'tool_result', tool_use_id: c.toolUseId, content: c.output, is_error: c.isError })
            break
        }
      }

      if (content.length > 0) {
        messages.push({ role: msg.role, content })
      }
    }

    return messages
  }

  private async executeTool(toolId: string, toolName: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = getTool(toolName)
    if (!tool) {
      return {
        output: `Unknown tool: ${toolName}`,
        isError: true,
      }
    }

    const context: ToolContext = {
      sessionId: this.session.id,
      messageId: toolId,
      workingDirectory: this.session.projectPath,
      signal: this.signal || new AbortController().signal,
      permissions: this.permissions,
      ask: async (question, options) => {
        // For now, auto-deny interactive questions in CLI mode
        // This should be hooked up to clapp prompts
        console.log(`Tool asking: ${question}`)
        return 'no'
      },
      log: (message) => {
        // Log to event stream
        this.onEvent({ type: 'text:delta', text: `\n${message}\n` })
      },
    }

    try {
      return await tool.execute(input, context)
    }
    catch (error) {
      return {
        output: `Error executing tool: ${(error as Error).message}`,
        isError: true,
      }
    }
  }

  private detectDoomLoop(turn: number): boolean {
    if (turn < 5) return false

    // Check last 5 messages for repetitive patterns
    const recentMessages = this.session.messages.slice(-10)
    const toolCalls: string[] = []

    for (const msg of recentMessages) {
      for (const c of msg.content) {
        if (c.type === 'tool_use') {
          toolCalls.push(`${c.name}:${JSON.stringify(c.input)}`)
        }
      }
    }

    // Check for repeated exact same call
    if (toolCalls.length >= 4) {
      const last = toolCalls[toolCalls.length - 1]
      const repetitions = toolCalls.filter(c => c === last).length
      if (repetitions >= 3) return true
    }

    return false
  }
}

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${timestamp}-${random}`
}

function getDefaultSystemPrompt(): string {
  return `You are Voide, an AI coding assistant. You help developers write, debug, and understand code.

Key behaviors:
- Be concise and direct. Avoid unnecessary preamble.
- When editing code, use precise, minimal changes. Don't rewrite entire files.
- Always read files before editing them to understand the context.
- Use the appropriate tools for the task: glob for finding files, grep for searching content, read for viewing files.
- For file operations, prefer specialized tools over bash commands.
- Be careful with bash commands - avoid destructive operations without confirmation.
- When you encounter errors, explain what went wrong and how to fix it.

Current date: ${new Date().toISOString().split('T')[0]}
`
}

// Factory function
export function createProcessor(options: ProcessorOptions): SessionProcessor {
  return new SessionProcessor(options)
}
