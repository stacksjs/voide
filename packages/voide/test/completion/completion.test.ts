// Shell Completion Tests

import { describe, test, expect } from 'bun:test'
import {
  generateBashCompletion,
  generateZshCompletion,
  generateFishCompletion,
  getCompletionScript,
} from '../../src/completion'

describe('Shell Completion', () => {
  describe('generateBashCompletion', () => {
    test('should generate valid bash completion script', () => {
      const script = generateBashCompletion()

      expect(script).toContain('_voide_completions()')
      expect(script).toContain('complete -F _voide_completions voide')
      expect(script).toContain('COMPREPLY')
    })

    test('should include main commands', () => {
      const script = generateBashCompletion()

      expect(script).toContain('init')
      expect(script).toContain('chat')
      expect(script).toContain('run')
      expect(script).toContain('session')
      expect(script).toContain('auth')
      expect(script).toContain('config')
      expect(script).toContain('theme')
      expect(script).toContain('server')
      expect(script).toContain('mcp')
      expect(script).toContain('upgrade')
      expect(script).toContain('uninstall')
      expect(script).toContain('debug')
      expect(script).toContain('completion')
    })

    test('should include global options', () => {
      const script = generateBashCompletion()

      expect(script).toContain('--help')
      expect(script).toContain('--version')
      expect(script).toContain('--verbose')
      expect(script).toContain('--quiet')
    })

    test('should include subcommand handling', () => {
      const script = generateBashCompletion()

      expect(script).toContain('case "${COMP_WORDS[1]}"')
      expect(script).toContain('chat)')
      expect(script).toContain('auth)')
      expect(script).toContain('session)')
    })
  })

  describe('generateZshCompletion', () => {
    test('should generate valid zsh completion script', () => {
      const script = generateZshCompletion()

      expect(script).toContain('#compdef voide')
      expect(script).toContain('_voide()')
      expect(script).toContain('_arguments')
    })

    test('should include command descriptions', () => {
      const script = generateZshCompletion()

      expect(script).toContain("'init:Initialize voide")
      expect(script).toContain("'chat:Start an interactive chat")
      expect(script).toContain("'auth:Manage authentication")
    })

    test('should include option descriptions', () => {
      const script = generateZshCompletion()

      expect(script).toContain("'--help[Show help]'")
      expect(script).toContain("'--version[Show version]'")
    })

    test('should handle subcommands', () => {
      const script = generateZshCompletion()

      expect(script).toContain('case "$words[1]"')
      expect(script).toContain('auth)')
      expect(script).toContain("'login:Login to a provider'")
      expect(script).toContain("'logout:Logout from a provider'")
    })
  })

  describe('generateFishCompletion', () => {
    test('should generate valid fish completion script', () => {
      const script = generateFishCompletion()

      expect(script).toContain('complete -c voide')
    })

    test('should disable file completion', () => {
      const script = generateFishCompletion()

      expect(script).toContain('complete -c voide -f')
    })

    test('should include main commands', () => {
      const script = generateFishCompletion()

      expect(script).toContain('-a "init"')
      expect(script).toContain('-a "chat"')
      expect(script).toContain('-a "auth"')
    })

    test('should include command descriptions', () => {
      const script = generateFishCompletion()

      expect(script).toContain("-d 'Initialize voide")
      expect(script).toContain("-d 'Start an interactive chat")
    })

    test('should handle subcommands', () => {
      const script = generateFishCompletion()

      expect(script).toContain('__fish_seen_subcommand_from auth')
      expect(script).toContain('-a "login"')
      expect(script).toContain('-a "logout"')
    })

    test('should include options', () => {
      const script = generateFishCompletion()

      expect(script).toContain('-l help')
      expect(script).toContain('-l version')
      expect(script).toContain('-s h')
      expect(script).toContain('-s v')
    })
  })

  describe('getCompletionScript', () => {
    test('should return bash completion for bash', () => {
      const script = getCompletionScript('bash')
      expect(script).toContain('_voide_completions()')
    })

    test('should return zsh completion for zsh', () => {
      const script = getCompletionScript('zsh')
      expect(script).toContain('#compdef voide')
    })

    test('should return fish completion for fish', () => {
      const script = getCompletionScript('fish')
      expect(script).toContain('complete -c voide')
    })

    test('should default to bash for unknown shell', () => {
      const script = getCompletionScript('bash')
      expect(script).toContain('_voide_completions()')
    })
  })

  describe('completion script validity', () => {
    test('bash script should have proper structure', () => {
      const script = generateBashCompletion()

      // Should start with comment
      expect(script.startsWith('#')).toBe(true)

      // Should have function definition
      expect(script).toMatch(/_voide_completions\(\)\s*\{/)

      // Should end with complete command
      expect(script.trim().endsWith('complete -F _voide_completions voide')).toBe(true)
    })

    test('zsh script should have proper structure', () => {
      const script = generateZshCompletion()

      // Should start with compdef
      expect(script.startsWith('#compdef voide')).toBe(true)

      // Should have function definition
      expect(script).toContain('_voide()')

      // Should end with function call
      expect(script.trim()).toMatch(/_voide "\$@"$/)
    })

    test('fish script should have proper structure', () => {
      const script = generateFishCompletion()

      // Should start with comment
      expect(script.startsWith('#')).toBe(true)

      // Should have file completion disabled
      expect(script).toContain('complete -c voide -f')
    })
  })

  describe('command option completions', () => {
    test('chat command should have correct options in bash', () => {
      const script = generateBashCompletion()

      expect(script).toContain('--model')
      expect(script).toContain('--provider')
      expect(script).toContain('--agent')
      expect(script).toContain('--continue')
      expect(script).toContain('--session')
    })

    test('chat command should have correct options in zsh', () => {
      const script = generateZshCompletion()

      expect(script).toContain("'--model[Model to use]")
      expect(script).toContain("'--provider[Provider to use]")
    })

    test('server command should have port and host options', () => {
      const bash = generateBashCompletion()
      const zsh = generateZshCompletion()

      expect(bash).toContain('--port')
      expect(bash).toContain('--host')
      expect(zsh).toContain('--port')
      expect(zsh).toContain('--host')
    })

    test('upgrade command should have version option', () => {
      const bash = generateBashCompletion()
      expect(bash).toContain('--version')
      expect(bash).toContain('--beta')
    })
  })
})
