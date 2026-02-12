#!/usr/bin/env bun
// Voide CLI - Voice AI Code Assistant
// Entry point for the CLI application

import { cli } from '@stacksjs/clapp'
import { registerCommands } from '../src/cli/commands'

const VERSION = '0.0.1'

async function main(): Promise<void> {
  // Create CLI instance
  const voide = cli('voide')
    .version(VERSION)
    .help()
    .verbose()
    .debug()
    .quiet()
    .force()
    .dryRun()

  // Handle signals for graceful shutdown
  voide.handleSignals(async () => {
    console.log('\nCleaning up...')
  })

  // Register all commands
  await registerCommands(voide)

  // Parse and execute
  await voide.parse()
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
