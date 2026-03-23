// Build script for Voide CLI
// Uses Bun to build and bundle

import { resolve, dirname, join } from 'node:path'
import { mkdir, rm, readdir, copyFile } from 'node:fs/promises'

const ROOT = dirname(new URL(import.meta.url).pathname)
const SRC = join(ROOT, 'src')
const DIST = join(ROOT, 'dist')

async function build() {
  // eslint-disable-next-line no-console
  console.log('Building Voide CLI...')

  // Clean dist
  try {
    await rm(DIST, { recursive: true })
  }
  catch {
    // Ignore if doesn't exist
  }
  await mkdir(DIST, { recursive: true })

  // Build with Bun
  const result = await Bun.build({
    entrypoints: [join(SRC, 'index.ts')],
    outdir: DIST,
    target: 'bun',
    format: 'esm',
    sourcemap: 'external',
    minify: false,
    splitting: true,
    external: [
      '@stacksjs/clapp',
      'bunfig',
      'ts-error-handling',
    ],
  })

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('Build failed:')
    for (const log of result.logs) {
      // eslint-disable-next-line no-console
      console.error(log)
    }
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log('Build output:')
  for (const output of result.outputs) {
    // eslint-disable-next-line no-console
    console.log(`  ${output.path}`)
  }

  // Generate type declarations
  // eslint-disable-next-line no-console
  console.log('\nGenerating type declarations...')

  const proc = Bun.spawn(['bun', 'x', 'tsc', '--emitDeclarationOnly', '--declaration', '--outDir', DIST], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  await proc.exited

  if (proc.exitCode !== 0) {
    // eslint-disable-next-line no-console
    console.warn('Warning: Type generation had issues, but build continues.')
  }

  // eslint-disable-next-line no-console
  console.log('\nBuild complete!')
}

build().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Build error:', error)
  process.exit(1)
})
