#!/usr/bin/env bun
/**
 * Build CSS with Headwind
 */
import { build, defaultConfig } from '@stacksjs/headwind'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

console.log('Building CSS with Headwind...')

const outputPath = resolve(import.meta.dir, '../public/dist/voide.css')

const config = {
  ...defaultConfig,
  content: [
    resolve(import.meta.dir, '../pages/**/*.stx'),
    resolve(import.meta.dir, '../components/**/*.stx'),
  ],
  output: outputPath,
  minify: false,
  safelist: [
    'animate-pulse',
    'animate-bounce',
    'animate-fade-in',
  ],
}

try {
  // Ensure output directory exists
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Build CSS using Headwind API
  const result = await build(config)

  // Write CSS file
  writeFileSync(outputPath, result.css)

  const sizeKB = (result.css.length / 1024).toFixed(2)
  console.log(`CSS built: ${result.classes.size} classes in ${result.duration.toFixed(1)}ms`)
  console.log(`Output: ${sizeKB} KB -> public/dist/voide.css`)
} catch (error) {
  console.error('Failed to build CSS:', error)
  // Don't exit with error - CSS is optional for development
  console.log('Continuing without CSS build...')
}
