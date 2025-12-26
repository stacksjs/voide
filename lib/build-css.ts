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
    'animate-blink',
    'hidden',
    'flex',
    'block',
    // Hover states
    'hover:opacity-80',
    'hover:border-monokai-pink',
    'hover:border-monokai-gray',
    'hover:bg-monokai-cyan/90',
    'hover:bg-monokai-green/90',
    'hover:text-monokai-cyan/80',
    // Disabled states
    'disabled:opacity-40',
    'disabled:cursor-not-allowed',
    // Transitions
    'transition-all',
    'transition-colors',
    'transition-opacity',
  ],
  theme: {
    ...defaultConfig.theme,
    extend: {
      ...defaultConfig.theme?.extend,
      colors: {
        ...defaultConfig.theme?.extend?.colors,
        monokai: {
          bg: '#2d2a2e',
          'bg-dark': '#221f22',
          fg: '#fcfcfa',
          pink: '#ff6188',
          orange: '#fc9867',
          yellow: '#ffd866',
          green: '#a9dc76',
          cyan: '#78dce8',
          purple: '#ab9df2',
          gray: '#727072',
          border: '#403e41',
        },
      },
    },
  },
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
