// Custom Commands Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  CommandLoader,
  getCommandLoader,
  initCommandsDir,
  createCommandTemplate,
} from '../../src/commands'
import { createTempDir, cleanupTempDir } from '../utils/helpers'
import { join } from 'node:path'
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'

describe('CommandLoader', () => {
  let tempDir: string
  let loader: CommandLoader

  beforeEach(async () => {
    tempDir = await createTempDir('commands-test')
    loader = new CommandLoader(tempDir)
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  describe('load', () => {
    test('should load commands from project directory', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'test.sh'), `#!/bin/bash
# ---
# name: test
# description: Test command
# ---
echo "Hello"
`)

      await loader.load()
      const commands = await loader.getAll()

      expect(commands.some(c => c.name === 'test')).toBe(true)
    })

    test('should parse script frontmatter', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'build.sh'), `#!/bin/bash
# ---
# name: build
# description: Build the project
# usage: /build [target]
# ---
echo "Building..."
`)

      await loader.load()
      const cmd = await loader.get('build')

      expect(cmd).toBeDefined()
      expect(cmd?.name).toBe('build')
      expect(cmd?.description).toBe('Build the project')
      expect(cmd?.type).toBe('script')
    })

    test('should parse JSON frontmatter', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'deploy.sh'), `#!/bin/bash
# voide: {"name": "deploy", "description": "Deploy to production"}
echo "Deploying..."
`)

      await loader.load()
      const cmd = await loader.get('deploy')

      expect(cmd).toBeDefined()
      expect(cmd?.name).toBe('deploy')
      expect(cmd?.description).toBe('Deploy to production')
    })

    test('should load prompt commands', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'review.md'), `---
name: review
description: Code review prompt
---

Please review the following code for best practices and potential issues.
`)

      await loader.load()
      const cmd = await loader.get('review')

      expect(cmd).toBeDefined()
      expect(cmd?.type).toBe('prompt')
      expect(cmd?.description).toBe('Code review prompt')
    })

    test('should load alias commands', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'status.alias'), `# name: status
# description: Show git status
git status --short
`)

      await loader.load()
      const cmd = await loader.get('status')

      expect(cmd).toBeDefined()
      expect(cmd?.type).toBe('alias')
    })

    test('should handle TypeScript commands', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'analyze.ts'), `// ---
// name: analyze
// description: Analyze codebase
// ---
console.log("Analyzing...")
`)

      await loader.load()
      const cmd = await loader.get('analyze')

      expect(cmd).toBeDefined()
      expect(cmd?.type).toBe('script')
    })

    test('should use filename as fallback name', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'unnamed.sh'), `#!/bin/bash
echo "Hello"
`)

      await loader.load()
      const cmd = await loader.get('unnamed')

      expect(cmd).toBeDefined()
      expect(cmd?.name).toBe('unnamed')
    })
  })

  describe('get', () => {
    test('should return command by name', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })
      await writeFile(join(commandsDir, 'test.sh'), 'echo test')

      const cmd = await loader.get('test')
      expect(cmd).toBeDefined()
    })

    test('should return undefined for non-existent command', async () => {
      const cmd = await loader.get('nonexistent')
      expect(cmd).toBeUndefined()
    })
  })

  describe('getAll', () => {
    test('should return all commands', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'cmd1.sh'), 'echo 1')
      await writeFile(join(commandsDir, 'cmd2.sh'), 'echo 2')
      await writeFile(join(commandsDir, 'cmd3.sh'), 'echo 3')

      const commands = await loader.getAll()
      expect(commands.length).toBe(3)
    })
  })

  describe('has', () => {
    test('should return true for existing command', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })
      await writeFile(join(commandsDir, 'exists.sh'), 'echo test')

      const exists = await loader.has('exists')
      expect(exists).toBe(true)
    })

    test('should return false for non-existent command', async () => {
      const exists = await loader.has('nonexistent')
      expect(exists).toBe(false)
    })
  })

  describe('execute', () => {
    test('should execute script command', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'hello.sh'), `#!/bin/bash
echo "Hello World"
`)

      const result = await loader.execute('hello')

      expect(result.success).toBe(true)
      expect(result.output).toContain('Hello World')
    })

    test('should pass arguments to script', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'greet.sh'), `#!/bin/bash
echo "Hello $1"
`)

      const result = await loader.execute('greet', ['World'])

      expect(result.success).toBe(true)
      expect(result.output).toContain('Hello World')
    })

    test('should handle script failure', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'fail.sh'), `#!/bin/bash
exit 1
`)

      const result = await loader.execute('fail')

      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
    })

    test('should execute alias command', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'ls-alias.alias'), `echo "listing files"`)

      const result = await loader.execute('ls-alias')

      expect(result.success).toBe(true)
      expect(result.output).toContain('listing files')
    })

    test('should substitute alias arguments', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'echo-alias.alias'), `echo "Arg: $1"`)

      const result = await loader.execute('echo-alias', ['test'])

      expect(result.success).toBe(true)
      expect(result.output).toContain('Arg: test')
    })

    test('should return prompt content for prompt command', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'prompt.md'), `---
name: prompt
description: Test prompt
---

This is the prompt content.
`)

      const result = await loader.execute('prompt')

      expect(result.success).toBe(true)
      expect(result.output).toContain('This is the prompt content')
    })

    test('should substitute prompt placeholders', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'template.md'), `---
name: template
description: Template prompt
---

Topic: {{ $1 }}
Detail: {{ arg2 }}
`)

      const result = await loader.execute('template', ['TypeScript', 'advanced'])

      expect(result.success).toBe(true)
      expect(result.output).toContain('Topic: TypeScript')
      expect(result.output).toContain('Detail: advanced')
    })

    test('should return error for non-existent command', async () => {
      const result = await loader.execute('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('formatList', () => {
    test('should format empty list', async () => {
      await loader.load()
      const formatted = loader.formatList()

      expect(formatted).toContain('No custom commands')
    })

    test('should format command list', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'test.sh'), `# ---
# name: test
# description: Test command
# ---
echo test
`)

      await loader.load()
      const formatted = loader.formatList()

      expect(formatted).toContain('Custom Commands')
      expect(formatted).toContain('test')
      expect(formatted).toContain('Test command')
    })

    test('should group by source', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })
      await writeFile(join(commandsDir, 'local.sh'), 'echo local')

      await loader.load()
      const formatted = loader.formatList()

      expect(formatted).toContain('Project Commands')
    })
  })

  describe('formatHelp', () => {
    test('should format command help', async () => {
      const commandsDir = join(tempDir, '.voide', 'commands')
      await mkdir(commandsDir, { recursive: true })

      await writeFile(join(commandsDir, 'help-test.sh'), `# ---
# name: help-test
# description: A helpful command
# usage: /help-test [options]
# ---
echo test
`)

      await loader.load()
      const formatted = loader.formatHelp('help-test')

      expect(formatted).toContain('help-test')
      expect(formatted).toContain('A helpful command')
      expect(formatted).toContain('Usage')
      expect(formatted).toContain('/help-test [options]')
      expect(formatted).toContain('Type: script')
    })

    test('should return error for non-existent command', async () => {
      await loader.load()
      const formatted = loader.formatHelp('nonexistent')

      expect(formatted).toContain('not found')
    })
  })
})

describe('initCommandsDir', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('commands-init-test')
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  test('should create project commands directory', async () => {
    const dir = await initCommandsDir(tempDir)

    expect(dir).toBe(join(tempDir, '.voide', 'commands'))
  })
})

describe('createCommandTemplate', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await createTempDir('template-test')
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  test('should create script template', async () => {
    const path = await createCommandTemplate('test', 'script', tempDir)

    expect(path).toContain('test.sh')

    const content = await readFile(path, 'utf-8')
    expect(content).toContain('#!/bin/bash')
    expect(content).toContain('name: test')
    expect(content).toContain('description:')
  })

  test('should create prompt template', async () => {
    const path = await createCommandTemplate('review', 'prompt', tempDir)

    expect(path).toContain('review.md')

    const content = await readFile(path, 'utf-8')
    expect(content).toContain('---')
    expect(content).toContain('name: review')
    expect(content).toContain('{{ $1 }}')
  })

  test('should create alias template', async () => {
    const path = await createCommandTemplate('quick', 'alias', tempDir)

    expect(path).toContain('quick.alias')

    const content = await readFile(path, 'utf-8')
    expect(content).toContain('# name: quick')
    expect(content).toContain('# description:')
  })
})

describe('getCommandLoader', () => {
  test('should return singleton for same path', () => {
    const loader1 = getCommandLoader('/test/path')
    const loader2 = getCommandLoader('/test/path')

    expect(loader1).toBe(loader2)
  })

  test('should return new instance for different path', () => {
    const loader1 = getCommandLoader('/path/1')
    const loader2 = getCommandLoader('/path/2')

    // Different paths should give different loaders
    expect(loader1).not.toBe(loader2)
  })
})
