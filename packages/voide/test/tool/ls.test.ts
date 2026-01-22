// ls Tool Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { lsTool } from '../../src/tool/ls'
import { createTempDir, cleanupTempDir, createFile, createMockToolContext } from '../utils/helpers'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

describe('lsTool', () => {
  let tempDir: string
  let context: ReturnType<typeof createMockToolContext>

  beforeEach(async () => {
    tempDir = await createTempDir('ls-test')
    context = createMockToolContext({ projectPath: tempDir })

    // Create test files and directories
    await createFile(join(tempDir, 'file1.txt'), 'content1')
    await createFile(join(tempDir, 'file2.ts'), 'export const x = 1')
    await createFile(join(tempDir, '.hidden'), 'hidden content')
    await mkdir(join(tempDir, 'subdir'), { recursive: true })
    await createFile(join(tempDir, 'subdir', 'nested.txt'), 'nested content')
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  describe('metadata', () => {
    test('should have correct name', () => {
      expect(lsTool.name).toBe('ls')
    })

    test('should have description', () => {
      expect(lsTool.description).toBeTruthy()
      expect(lsTool.description.length).toBeGreaterThan(10)
    })

    test('should have parameters', () => {
      expect(lsTool.parameters.length).toBeGreaterThan(0)
      expect(lsTool.parameters.some(p => p.name === 'path')).toBe(true)
      expect(lsTool.parameters.some(p => p.name === 'all')).toBe(true)
      expect(lsTool.parameters.some(p => p.name === 'recursive')).toBe(true)
    })
  })

  describe('execute', () => {
    test('should list directory contents', async () => {
      const result = await lsTool.execute({ path: tempDir }, context)

      expect(result.isError).toBeFalsy()
      expect(result.output).toContain('file1.txt')
      expect(result.output).toContain('file2.ts')
      expect(result.output).toContain('subdir')
    })

    test('should hide hidden files by default', async () => {
      const result = await lsTool.execute({ path: tempDir }, context)

      expect(result.output).not.toContain('.hidden')
    })

    test('should show hidden files with all=true', async () => {
      const result = await lsTool.execute({ path: tempDir, all: true }, context)

      expect(result.output).toContain('.hidden')
    })

    test('should show long format by default', async () => {
      const result = await lsTool.execute({ path: tempDir, long: true }, context)

      // Long format includes permissions and size
      expect(result.output).toMatch(/[drwx-]+/)
      expect(result.output).toContain('Total:')
    })

    test('should show short format', async () => {
      const result = await lsTool.execute({ path: tempDir, long: false }, context)

      // Short format is just names with indicators
      expect(result.output).toContain('subdir/')
      expect(result.output).not.toContain('Total:')
    })

    test('should list recursively', async () => {
      const result = await lsTool.execute({ path: tempDir, recursive: true }, context)

      expect(result.output).toContain('nested.txt')
    })

    test('should respect depth limit', async () => {
      // Create deeper nesting
      await mkdir(join(tempDir, 'a', 'b', 'c'), { recursive: true })
      await createFile(join(tempDir, 'a', 'b', 'c', 'deep.txt'), 'deep')

      const result = await lsTool.execute({
        path: tempDir,
        recursive: true,
        depth: 1,
      }, context)

      // Should not show deeply nested files
      expect(result.output).not.toContain('deep.txt')
    })

    test('should filter by pattern', async () => {
      const result = await lsTool.execute({
        path: tempDir,
        pattern: '*.ts',
      }, context)

      expect(result.output).toContain('file2.ts')
      expect(result.output).not.toContain('file1.txt')
    })

    test('should handle non-existent directory', async () => {
      const result = await lsTool.execute({
        path: join(tempDir, 'nonexistent'),
      }, context)

      expect(result.isError).toBe(true)
      expect(result.output).toContain('Error')
    })

    test('should use cwd as default path', async () => {
      const originalCwd = process.cwd()
      process.chdir(tempDir)

      try {
        const result = await lsTool.execute({}, context)
        expect(result.output).toContain('file1.txt')
      }
      finally {
        process.chdir(originalCwd)
      }
    })

    test('should sort directories first', async () => {
      const result = await lsTool.execute({ path: tempDir }, context)
      const lines = result.output.split('\n')

      // Find index of subdir and file1.txt in long format
      const subdirIndex = lines.findIndex(l => l.includes('subdir/'))
      const fileIndex = lines.findIndex(l => l.includes('file1.txt'))

      expect(subdirIndex).toBeLessThan(fileIndex)
    })

    test('should show file sizes', async () => {
      const result = await lsTool.execute({ path: tempDir, long: true }, context)

      // Should contain size information
      expect(result.output).toMatch(/\d+(\.\d+)?[BKMGT]/)
    })

    test('should show modification dates', async () => {
      const result = await lsTool.execute({ path: tempDir, long: true }, context)

      // Should contain date information (e.g., "Jan 22" or similar)
      expect(result.output).toMatch(/[A-Z][a-z]{2}\s+\d+/)
    })
  })
})
