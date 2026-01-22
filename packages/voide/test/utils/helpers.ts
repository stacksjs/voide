// Test Utilities and Helpers for Voide CLI Tests

import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'

// Create a unique temporary directory for tests
export async function createTempDir(prefix = 'voide-test'): Promise<string> {
  const id = randomBytes(8).toString('hex')
  const dir = join(tmpdir(), `${prefix}-${id}`)
  await mkdir(dir, { recursive: true })
  return dir
}

// Clean up a temporary directory
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true })
  }
  catch {
    // Ignore cleanup errors
  }
}

// Create a file with content
export async function createFile(path: string, content: string): Promise<void> {
  const dir = join(path, '..')
  await mkdir(dir, { recursive: true })
  await writeFile(path, content, 'utf-8')
}

// Read file content
export async function readFileContent(path: string): Promise<string> {
  return readFile(path, 'utf-8')
}

// Create a mock project directory structure
export async function createMockProject(baseDir: string): Promise<{
  root: string
  srcDir: string
  configFile: string
}> {
  const root = baseDir
  const srcDir = join(root, 'src')
  const configFile = join(root, 'voide.config.ts')

  await mkdir(srcDir, { recursive: true })
  await mkdir(join(root, '.voide'), { recursive: true })

  // Create basic files
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    type: 'module',
  }, null, 2), 'utf-8')

  await writeFile(configFile, `
export default {
  provider: {
    name: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
  tools: {
    enabled: ['read', 'write', 'edit', 'glob', 'grep', 'bash'],
  },
}
`, 'utf-8')

  await writeFile(join(srcDir, 'index.ts'), `
export function hello(name: string): string {
  return \`Hello, \${name}!\`
}
`, 'utf-8')

  await writeFile(join(srcDir, 'utils.ts'), `
export function add(a: number, b: number): number {
  return a + b
}

export function multiply(a: number, b: number): number {
  return a * b
}
`, 'utf-8')

  return { root, srcDir, configFile }
}

// Mock fetch for API testing
export function createMockFetch(responses: Map<string, { status: number; body: unknown }>): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()

    for (const [pattern, response] of responses) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response('Not Found', { status: 404 })
  }
}

// Create a mock streaming response
export function createStreamingResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  let index = 0

  const stream = new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index++
      }
      else {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

// Mock tool context
export interface MockToolContext {
  projectPath: string
  sessionId: string
  askCallback?: (question: string) => Promise<boolean>
  permissionChecker?: (type: string, details: string) => Promise<boolean>
}

export function createMockToolContext(overrides: Partial<MockToolContext> = {}): MockToolContext {
  return {
    projectPath: process.cwd(),
    sessionId: 'test-session-' + randomBytes(4).toString('hex'),
    askCallback: async () => true,
    permissionChecker: async () => true,
    ...overrides,
  }
}

// Wait for a condition with timeout
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (await condition()) return
    await sleep(interval)
  }

  throw new Error('Condition not met within timeout')
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate random string
export function randomString(length = 10): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// Compare objects (ignoring undefined values)
export function objectsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Mock environment variables for testing
export function withEnv(vars: Record<string, string>, fn: () => Promise<void> | void): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const original: Record<string, string | undefined> = {}

    // Save and set
    for (const [key, value] of Object.entries(vars)) {
      original[key] = process.env[key]
      process.env[key] = value
    }

    try {
      await fn()
      resolve()
    }
    catch (error) {
      reject(error)
    }
    finally {
      // Restore
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) {
          delete process.env[key]
        }
        else {
          process.env[key] = value
        }
      }
    }
  })
}

// Assert helper that throws descriptive errors
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

// Assert that a function throws
export async function assertThrows(
  fn: () => Promise<unknown> | unknown,
  errorType?: new (...args: unknown[]) => Error,
  messagePattern?: RegExp,
): Promise<void> {
  let threw = false
  let error: unknown

  try {
    await fn()
  }
  catch (e) {
    threw = true
    error = e
  }

  if (!threw) {
    throw new Error('Expected function to throw, but it did not')
  }

  if (errorType && !(error instanceof errorType)) {
    throw new Error(`Expected error of type ${errorType.name}, got ${(error as Error).constructor.name}`)
  }

  if (messagePattern && error instanceof Error && !messagePattern.test(error.message)) {
    throw new Error(`Error message "${error.message}" does not match pattern ${messagePattern}`)
  }
}

// Create mock SSE stream for LLM responses
export function createMockLLMStream(events: Array<{ type: string; data: unknown }>): Response {
  const encoder = new TextEncoder()
  let index = 0

  const stream = new ReadableStream({
    async pull(controller) {
      if (index < events.length) {
        const event = events[index]
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
        controller.enqueue(encoder.encode(data))
        index++
      }
      else {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

// Capture console output
export function captureConsole(): {
  logs: string[]
  errors: string[]
  restore: () => void
} {
  const logs: string[] = []
  const errors: string[] = []
  const originalLog = console.log
  const originalError = console.error

  console.log = (...args: unknown[]) => {
    logs.push(args.map(a => String(a)).join(' '))
  }

  console.error = (...args: unknown[]) => {
    errors.push(args.map(a => String(a)).join(' '))
  }

  return {
    logs,
    errors,
    restore: () => {
      console.log = originalLog
      console.error = originalError
    },
  }
}
