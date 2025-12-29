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
    resolve(import.meta.dir, '../partials/**/*.stx'),
  ],
  output: outputPath,
  minify: false,
  safelist: [
    // Animations
    'animate-pulse',
    'animate-bounce',
    'animate-fade-in',
    'animate-blink',
    // Display
    'hidden',
    'flex',
    'block',
    'none',
    // Monokai backgrounds
    'bg-monokai-bg',
    'bg-monokai-bg-dark',
    'bg-monokai-fg',
    'bg-monokai-pink',
    'bg-monokai-orange',
    'bg-monokai-yellow',
    'bg-monokai-green',
    'bg-monokai-cyan',
    'bg-monokai-purple',
    'bg-monokai-gray',
    'bg-monokai-border',
    'bg-monokai-pink/10',
    'bg-monokai-green/10',
    'bg-monokai-yellow/10',
    'bg-monokai-cyan/10',
    'bg-monokai-purple/10',
    // Monokai text colors
    'text-monokai-bg',
    'text-monokai-bg-dark',
    'text-monokai-fg',
    'text-monokai-fg/50',
    'text-monokai-fg/60',
    'text-monokai-fg/80',
    'text-monokai-pink',
    'text-monokai-orange',
    'text-monokai-yellow',
    'text-monokai-green',
    'text-monokai-cyan',
    'text-monokai-purple',
    'text-monokai-gray',
    'text-transparent',
    // Monokai borders
    'border-monokai-bg',
    'border-monokai-bg-dark',
    'border-monokai-fg',
    'border-monokai-pink',
    'border-monokai-pink/25',
    'border-monokai-orange',
    'border-monokai-yellow',
    'border-monokai-yellow/25',
    'border-monokai-green',
    'border-monokai-green/25',
    'border-monokai-cyan',
    'border-monokai-cyan/25',
    'border-monokai-purple',
    'border-monokai-purple/25',
    'border-monokai-gray',
    'border-monokai-border',
    'border-monokai-border/40',
    // Gradients
    'from-monokai-purple',
    'from-monokai-cyan',
    'from-monokai-fg',
    'from-monokai-fg/60',
    'to-monokai-purple',
    'to-monokai-cyan',
    'to-monokai-fg',
    'to-monokai-fg/60',
    'bg-gradient-to-r',
    'bg-clip-text',
    // Shadows
    'shadow-monokai-purple/25',
    'shadow-monokai-green/25',
    'shadow-monokai-cyan/25',
    // Placeholder
    'placeholder-monokai-gray',
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

  // Monokai color utilities (Headwind doesn't generate custom theme colors)
  const monokaiUtilities = `
/* Monokai Pro Color Utilities */
:root {
  --monokai-bg: #2d2a2e;
  --monokai-bg-dark: #221f22;
  --monokai-fg: #fcfcfa;
  --monokai-pink: #ff6188;
  --monokai-orange: #fc9867;
  --monokai-yellow: #ffd866;
  --monokai-green: #a9dc76;
  --monokai-cyan: #78dce8;
  --monokai-purple: #ab9df2;
  --monokai-gray: #727072;
  --monokai-border: #403e41;
}

/* Background colors */
.bg-monokai-bg { background-color: var(--monokai-bg); }
.bg-monokai-bg-dark { background-color: var(--monokai-bg-dark); }
.bg-monokai-fg { background-color: var(--monokai-fg); }
.bg-monokai-pink { background-color: var(--monokai-pink); }
.bg-monokai-orange { background-color: var(--monokai-orange); }
.bg-monokai-yellow { background-color: var(--monokai-yellow); }
.bg-monokai-green { background-color: var(--monokai-green); }
.bg-monokai-cyan { background-color: var(--monokai-cyan); }
.bg-monokai-purple { background-color: var(--monokai-purple); }
.bg-monokai-gray { background-color: var(--monokai-gray); }
.bg-monokai-border { background-color: var(--monokai-border); }

/* Background with opacity */
.bg-monokai-pink\\/10 { background-color: rgba(255, 97, 136, 0.1); }
.bg-monokai-green\\/10 { background-color: rgba(169, 220, 118, 0.1); }
.bg-monokai-yellow\\/10 { background-color: rgba(255, 216, 102, 0.1); }
.bg-monokai-cyan\\/10 { background-color: rgba(120, 220, 232, 0.1); }
.bg-monokai-purple\\/10 { background-color: rgba(171, 157, 242, 0.1); }

/* Text colors */
.text-monokai-bg { color: var(--monokai-bg); }
.text-monokai-bg-dark { color: var(--monokai-bg-dark); }
.text-monokai-fg { color: var(--monokai-fg); }
.text-monokai-pink { color: var(--monokai-pink); }
.text-monokai-orange { color: var(--monokai-orange); }
.text-monokai-yellow { color: var(--monokai-yellow); }
.text-monokai-green { color: var(--monokai-green); }
.text-monokai-cyan { color: var(--monokai-cyan); }
.text-monokai-purple { color: var(--monokai-purple); }
.text-monokai-gray { color: var(--monokai-gray); }
.text-monokai-border { color: var(--monokai-border); }

/* Text with opacity */
.text-monokai-fg\\/50 { color: rgba(252, 252, 250, 0.5); }
.text-monokai-fg\\/60 { color: rgba(252, 252, 250, 0.6); }
.text-monokai-fg\\/80 { color: rgba(252, 252, 250, 0.8); }

/* Border colors */
.border-monokai-bg { border-color: var(--monokai-bg); }
.border-monokai-bg-dark { border-color: var(--monokai-bg-dark); }
.border-monokai-fg { border-color: var(--monokai-fg); }
.border-monokai-pink { border-color: var(--monokai-pink); }
.border-monokai-orange { border-color: var(--monokai-orange); }
.border-monokai-yellow { border-color: var(--monokai-yellow); }
.border-monokai-green { border-color: var(--monokai-green); }
.border-monokai-cyan { border-color: var(--monokai-cyan); }
.border-monokai-purple { border-color: var(--monokai-purple); }
.border-monokai-gray { border-color: var(--monokai-gray); }
.border-monokai-border { border-color: var(--monokai-border); }

/* Border with opacity */
.border-monokai-pink\\/25 { border-color: rgba(255, 97, 136, 0.25); }
.border-monokai-green\\/25 { border-color: rgba(169, 220, 118, 0.25); }
.border-monokai-yellow\\/25 { border-color: rgba(255, 216, 102, 0.25); }
.border-monokai-cyan\\/25 { border-color: rgba(120, 220, 232, 0.25); }
.border-monokai-purple\\/25 { border-color: rgba(171, 157, 242, 0.25); }
.border-monokai-border\\/40 { border-color: rgba(64, 62, 65, 0.4); }

/* Placeholder colors */
.placeholder-monokai-gray::placeholder { color: var(--monokai-gray); }

/* Gradient stops */
.from-monokai-purple { --hw-gradient-from: var(--monokai-purple); --hw-gradient-to: transparent; --hw-gradient-stops: var(--hw-gradient-from), var(--hw-gradient-to); }
.from-monokai-cyan { --hw-gradient-from: var(--monokai-cyan); --hw-gradient-to: transparent; --hw-gradient-stops: var(--hw-gradient-from), var(--hw-gradient-to); }
.from-monokai-fg { --hw-gradient-from: var(--monokai-fg); --hw-gradient-to: transparent; --hw-gradient-stops: var(--hw-gradient-from), var(--hw-gradient-to); }
.to-monokai-purple { --hw-gradient-to: var(--monokai-purple); --hw-gradient-stops: var(--hw-gradient-from), var(--hw-gradient-to); }
.to-monokai-cyan { --hw-gradient-to: var(--monokai-cyan); --hw-gradient-stops: var(--hw-gradient-from), var(--hw-gradient-to); }
.to-monokai-fg { --hw-gradient-to: var(--monokai-fg); --hw-gradient-stops: var(--hw-gradient-from), var(--hw-gradient-to); }
.to-monokai-fg\\/60 { --hw-gradient-to: rgba(252, 252, 250, 0.6); --hw-gradient-stops: var(--hw-gradient-from), var(--hw-gradient-to); }

/* Shadow utilities with Monokai colors */
.shadow-lg.shadow-monokai-purple\\/25 { box-shadow: 0 10px 15px -3px rgba(171, 157, 242, 0.25), 0 4px 6px -4px rgba(171, 157, 242, 0.25); }
.shadow-lg.shadow-monokai-green\\/25 { box-shadow: 0 10px 15px -3px rgba(169, 220, 118, 0.25), 0 4px 6px -4px rgba(169, 220, 118, 0.25); }
.shadow-lg.shadow-monokai-cyan\\/25 { box-shadow: 0 10px 15px -3px rgba(120, 220, 232, 0.25), 0 4px 6px -4px rgba(120, 220, 232, 0.25); }
.shadow-2xl { box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }

/* Hover states */
.hover\\:border-monokai-pink:hover { border-color: var(--monokai-pink); }
.hover\\:border-monokai-gray:hover { border-color: var(--monokai-gray); }
.hover\\:bg-monokai-cyan\\/90:hover { background-color: rgba(120, 220, 232, 0.9); }
.hover\\:bg-monokai-green\\/90:hover { background-color: rgba(169, 220, 118, 0.9); }
`

  // Write CSS file with Monokai utilities appended
  writeFileSync(outputPath, result.css + monokaiUtilities)

  const sizeKB = (result.css.length / 1024).toFixed(2)
  console.log(`CSS built: ${result.classes.size} classes in ${result.duration.toFixed(1)}ms`)
  console.log(`Output: ${sizeKB} KB -> public/dist/voide.css`)
} catch (error) {
  console.error('Failed to build CSS:', error)
  // Don't exit with error - CSS is optional for development
  console.log('Continuing without CSS build...')
}
