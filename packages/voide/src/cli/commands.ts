// CLI Commands for Voide
// Uses Clapp for command definitions

import type { CLI } from '@stacksjs/clapp'
import type { ResolvedVoideConfig } from '../config/types'
import { loadConfig, getConfigTemplate, getConfigPath } from '../config/loader'
import { createAgent, getAvailableAgents } from '../agent'
import { createTui } from '../tui'
import { getSessionStore } from '../session/store'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'

/**
 * Register all commands with the CLI
 */
export async function registerCommands(cli: CLI): Promise<void> {
  // Load config
  const config = await loadConfig()
  const tui = createTui(config)

  // Default command - interactive chat
  cli
    .command('[message...]', 'Start interactive chat or send a message')
    .option('-a, --agent <agent>', 'Agent to use (build, explore, plan)')
    .option('-p, --project <path>', 'Project directory')
    .option('-s, --session <id>', 'Resume a session')
    .option('-m, --model <model>', 'Model to use')
    .action(async (messages: string[], options: Record<string, unknown>) => {
      const message = messages.join(' ')
      const agentName = options.agent as string | undefined
      const projectPath = options.project ? resolve(options.project as string) : process.cwd()
      const sessionId = options.session as string | undefined

      await runChat(config, tui, {
        message,
        agentName,
        projectPath,
        sessionId,
        interactive: !message,
      })
    })

  // Chat command (alias for default)
  cli
    .command('chat [message...]', 'Start a chat session')
    .alias('c')
    .option('-a, --agent <agent>', 'Agent to use')
    .option('-p, --project <path>', 'Project directory')
    .option('-s, --session <id>', 'Resume a session')
    .action(async (messages: string[], options: Record<string, unknown>) => {
      const message = messages.join(' ')
      const agentName = options.agent as string | undefined
      const projectPath = options.project ? resolve(options.project as string) : process.cwd()
      const sessionId = options.session as string | undefined

      await runChat(config, tui, {
        message,
        agentName,
        projectPath,
        sessionId,
        interactive: true,
      })
    })

  // Run command - single message execution
  cli
    .command('run <message...>', 'Run a single message without interactive mode')
    .alias('r')
    .option('-a, --agent <agent>', 'Agent to use')
    .option('-p, --project <path>', 'Project directory')
    .option('-s, --session <id>', 'Session to continue')
    .action(async (messages: string[], options: Record<string, unknown>) => {
      const message = messages.join(' ')
      const agentName = options.agent as string | undefined
      const projectPath = options.project ? resolve(options.project as string) : process.cwd()
      const sessionId = options.session as string | undefined

      await runChat(config, tui, {
        message,
        agentName,
        projectPath,
        sessionId,
        interactive: false,
      })
    })

  // Agents command
  cli
    .command('agents', 'List available agents')
    .action(() => {
      console.log('\n' + tui.bold('Available Agents:'))
      const agents = getAvailableAgents(config)
      for (const name of agents) {
        const isDefault = name === config.agents.default
        const builtIn = config.agents.builtIn as Record<string, { description?: string } | undefined>
        const agentConfig = builtIn[name] || config.agents.custom[name]
        const desc = agentConfig?.description || ''
        console.log(`  ${tui.primary(name)}${isDefault ? tui.muted(' (default)') : ''} - ${desc}`)
      }
      console.log('')
    })

  // Sessions command
  cli
    .command('sessions', 'List recent sessions')
    .alias('ss')
    .option('-l, --limit <n>', 'Number of sessions to show', { default: 10 })
    .option('-p, --project <path>', 'Filter by project')
    .action(async (options: Record<string, unknown>) => {
      const store = getSessionStore()
      const limit = Number(options.limit) || 10
      const projectPath = options.project as string | undefined

      const sessions = await store.list(projectPath)
      const limited = sessions.slice(0, limit)

      if (limited.length === 0) {
        console.log('\n' + tui.muted('No sessions found.'))
        return
      }

      console.log('\n' + tui.bold('Recent Sessions:'))
      for (const session of limited) {
        const date = new Date(session.updatedAt).toLocaleString()
        console.log(`  ${tui.primary(session.id)} - ${session.title}`)
        console.log(`    ${tui.muted(date)} • ${session.messageCount} messages`)
      }
      console.log('')
    })

  // Session resume command
  cli
    .command('session:resume <id>', 'Resume a specific session')
    .alias('sr')
    .action(async (id: string) => {
      await runChat(config, tui, {
        sessionId: id,
        projectPath: process.cwd(),
        interactive: true,
      })
    })

  // Session delete command
  cli
    .command('session:delete <id>', 'Delete a session')
    .alias('sd')
    .action(async (id: string) => {
      const store = getSessionStore()
      await store.delete(id)
      tui.renderSuccess(`Session ${id} deleted`)
    })

  // Config command
  cli
    .command('config', 'Show current configuration')
    .action(() => {
      const configPath = getConfigPath()
      console.log('\n' + tui.bold('Configuration:'))
      console.log(`  ${tui.muted('Path:')} ${configPath || 'Using defaults'}`)
      console.log(`  ${tui.muted('Provider:')} ${config.providers.default}`)
      console.log(`  ${tui.muted('Default Agent:')} ${config.agents.default}`)
      console.log(`  ${tui.muted('Theme:')} ${config.tui.theme}`)
      console.log('')
    })

  // Config init command
  cli
    .command('config:init', 'Create a voide.config.ts file')
    .option('-f, --force', 'Overwrite existing config')
    .action(async (options: Record<string, unknown>) => {
      const configPath = resolve(process.cwd(), 'voide.config.ts')

      try {
        const { access } = await import('node:fs/promises')
        await access(configPath)
        if (!options.force) {
          tui.renderError('Config file already exists. Use --force to overwrite.')
          return
        }
      }
      catch {
        // File doesn't exist, good to proceed
      }

      const template = getConfigTemplate()
      await writeFile(configPath, template, 'utf-8')
      tui.renderSuccess(`Created ${configPath}`)
    })

  // Models command
  cli
    .command('models', 'List available models')
    .option('-p, --provider <provider>', 'Provider to list models for')
    .action(async (options: Record<string, unknown>) => {
      const { getProvider } = await import('../provider')
      const providerName = (options.provider as string) || config.providers.default
      const provider = getProvider(providerName as any)

      if (!provider.isConfigured()) {
        tui.renderError(`Provider ${providerName} is not configured. Set the API key.`)
        return
      }

      const models = await provider.listModels()
      console.log('\n' + tui.bold(`Models (${providerName}):`))
      for (const model of models) {
        console.log(`  ${tui.primary(model.id)}`)
        console.log(`    ${tui.muted('Context:')} ${(model.contextLength / 1000).toFixed(0)}K`)
        if (model.inputPrice) {
          console.log(`    ${tui.muted('Price:')} $${model.inputPrice}/M input, $${model.outputPrice}/M output`)
        }
      }
      console.log('')
    })
}

/**
 * Run chat mode
 */
async function runChat(
  config: ResolvedVoideConfig,
  tui: ReturnType<typeof createTui>,
  options: {
    message?: string
    agentName?: string
    projectPath: string
    sessionId?: string
    interactive: boolean
  },
): Promise<void> {
  const { confirm, text } = await import('@stacksjs/clapp')

  // Create agent
  const agent = createAgent(config, options.agentName, async (question) => {
    const result = await confirm({ message: question })
    return Boolean(result)
  })

  // Start or resume session
  if (options.sessionId) {
    const session = await agent.resumeSession(options.sessionId)
    if (!session) {
      tui.renderError(`Session not found: ${options.sessionId}`)
      return
    }
    tui.renderInfo(`Resumed session: ${options.sessionId}`)
  }
  else {
    await agent.startSession(options.projectPath)
  }

  // If a message was provided, process it
  if (options.message) {
    tui.renderUserMessage(options.message)

    const result = await agent.process(options.message, {
      onEvent: (event) => tui.handleEvent(event),
    })

    if (!result.success) {
      tui.renderError(result.error || 'Unknown error')
      return
    }
  }

  // Interactive mode
  if (options.interactive) {
    tui.renderHeader()

    while (true) {
      let input: string | symbol | undefined
      try {
        const result = await text({
          message: '',
          placeholder: 'Message...',
        })
        input = result as string | symbol | undefined
      }
      catch {
        // User cancelled (Ctrl+C)
        break
      }

      if (typeof input === 'symbol' || input === undefined) {
        break // User cancelled
      }

      const trimmed = (input as string).trim()

      // Handle commands
      if (trimmed.startsWith('/')) {
        const command = trimmed.slice(1).toLowerCase()

        if (command === 'exit' || command === 'quit' || command === 'q') {
          break
        }

        if (command === 'help' || command === 'h') {
          tui.renderHelp()
          continue
        }

        if (command === 'clear' || command === 'cls') {
          console.clear()
          tui.renderHeader()
          continue
        }

        if (command === 'session' || command === 's') {
          const session = agent.getSession()
          if (session) {
            tui.renderSessionInfo(session.id, session.projectPath, session.messages.length)
          }
          continue
        }

        if (command === 'new' || command === 'n') {
          await agent.startSession(options.projectPath)
          tui.renderSuccess('Started new session')
          continue
        }

        tui.renderError(`Unknown command: /${command}. Type /help for available commands.`)
        continue
      }

      if (!trimmed) {
        continue
      }

      // Process message
      tui.renderUserMessage(trimmed)

      const result = await agent.process(trimmed, {
        onEvent: (event) => tui.handleEvent(event),
      })

      if (!result.success) {
        tui.renderError(result.error || 'Unknown error')
      }
    }

    console.log('\n' + tui.muted('Goodbye!') + '\n')
  }
}
