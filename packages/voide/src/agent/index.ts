// Agent system for Voide CLI
// Driver-based architecture with config integration

import type { ResolvedVoideConfig, AgentConfig } from '../config/types'
import type { Provider } from '../provider/types'
import type { Session } from '../session/types'
import type { PermissionChecker } from '../tool/types'
import { getAgentConfig, getEnabledTools } from '../config/loader'
import { getProvider } from '../provider'
import { createPermissionChecker, denyAllPermissions } from '../permission'
import { SessionProcessor, createProcessor, type ProcessorEvent } from '../session/processor'
import { getSessionStore } from '../session/store'

/**
 * Agent instance that handles conversations
 */
export interface Agent {
  readonly name: string
  readonly config: AgentConfig
  readonly provider: Provider
  readonly permissions: PermissionChecker
  readonly tools: string[]

  // Process a user message
  process(userMessage: string, options?: AgentProcessOptions): Promise<AgentResult>

  // Start a new session
  startSession(projectPath: string): Promise<Session>

  // Resume an existing session
  resumeSession(sessionId: string): Promise<Session | null>

  // Get current session
  getSession(): Session | null
}

export interface AgentProcessOptions {
  onEvent?: (event: ProcessorEvent) => void
  signal?: AbortSignal
}

export interface AgentResult {
  success: boolean
  response?: string
  error?: string
  toolsCalled?: Array<{ name: string, output: string }>
}

/**
 * Create an agent from config
 */
export function createAgent(
  config: ResolvedVoideConfig,
  agentName?: string,
  askCallback?: (question: string) => Promise<boolean>,
): Agent {
  const name = agentName || config.agents.default
  const agentConfig = getAgentConfig(config, name)

  if (!agentConfig) {
    throw new Error(`Unknown agent: ${name}. Available agents: build, explore, plan`)
  }

  // Get provider
  const providerName = config.providers.default
  const provider = getProvider(providerName as any, config.providers[providerName as keyof typeof config.providers] as any)

  // Get permissions
  const permissions = createPermissionChecker(config, askCallback)

  // Get tools
  const enabledTools = getEnabledTools(config)
  const agentTools = agentConfig.tools || enabledTools
  const tools = agentTools.filter(t => enabledTools.includes(t))

  // Create session store
  const store = getSessionStore()

  let currentSession: Session | null = null

  return {
    name,
    config: agentConfig,
    provider,
    permissions,
    tools,

    async process(userMessage: string, options?: AgentProcessOptions): Promise<AgentResult> {
      if (!currentSession) {
        throw new Error('No active session. Call startSession() first.')
      }

      const processor = createProcessor({
        provider,
        session: currentSession,
        tools,
        systemPrompt: buildSystemPrompt(agentConfig, config),
        model: agentConfig.model || config.providers.anthropic?.model,
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens,
        permissions,
        onEvent: options?.onEvent,
        signal: options?.signal,
      })

      try {
        const message = await processor.process(userMessage)

        // Extract text response
        let response = ''
        const toolsCalled: Array<{ name: string, output: string }> = []

        for (const content of message.content) {
          if (content.type === 'text') {
            response += content.text
          }
          else if (content.type === 'tool_use') {
            // Find corresponding result
            const resultMsg = currentSession.messages.find(m =>
              m.content.some(c =>
                c.type === 'tool_result' && c.toolUseId === content.id,
              ),
            )
            if (resultMsg) {
              const result = resultMsg.content.find(c =>
                c.type === 'tool_result' && c.toolUseId === content.id,
              )
              if (result && result.type === 'tool_result') {
                toolsCalled.push({ name: content.name, output: result.output })
              }
            }
          }
        }

        return {
          success: true,
          response: response.trim(),
          toolsCalled,
        }
      }
      catch (error) {
        return {
          success: false,
          error: (error as Error).message,
        }
      }
    },

    async startSession(projectPath: string): Promise<Session> {
      currentSession = await store.create(projectPath)
      return currentSession
    },

    async resumeSession(sessionId: string): Promise<Session | null> {
      currentSession = await store.get(sessionId)
      return currentSession
    },

    getSession(): Session | null {
      return currentSession
    },
  }
}

/**
 * Build system prompt from agent config
 */
function buildSystemPrompt(agentConfig: AgentConfig, config: ResolvedVoideConfig): string {
  const parts: string[] = []

  // Agent-specific prompt
  if (agentConfig.systemPrompt) {
    parts.push(agentConfig.systemPrompt)
  }
  else {
    // Default prompt
    parts.push(`You are Voide, an AI coding assistant. You help developers write, debug, and understand code.

Key behaviors:
- Be concise and direct. Avoid unnecessary preamble.
- When editing code, use precise, minimal changes.
- Always read files before editing them.
- Use appropriate tools for tasks.
- Be careful with destructive operations.`)
  }

  // Add custom instructions from config
  if (config.instructions) {
    parts.push('\n\n## Custom Instructions\n' + config.instructions)
  }

  // Add agent-specific context
  parts.push(`\n\nCurrent date: ${new Date().toISOString().split('T')[0]}`)
  parts.push(`Agent mode: ${agentConfig.name || 'default'}`)

  if (agentConfig.tools) {
    parts.push(`Available tools: ${agentConfig.tools.join(', ')}`)
  }

  return parts.join('\n')
}

/**
 * Get available agent names
 */
export function getAvailableAgents(config: ResolvedVoideConfig): string[] {
  const agents: string[] = ['build', 'explore', 'plan']
  agents.push(...Object.keys(config.agents.custom))
  return agents
}

/**
 * Create a read-only agent (explore mode)
 */
export function createExploreAgent(
  config: ResolvedVoideConfig,
  askCallback?: (question: string) => Promise<boolean>,
): Agent {
  // Override with read-only permissions
  const exploreConfig = { ...config }
  exploreConfig.agents = {
    ...config.agents,
    default: 'explore',
  }

  const agent = createAgent(exploreConfig, 'explore', askCallback)

  // Override permissions to be read-only
  return {
    ...agent,
    permissions: denyAllPermissions,
  }
}
