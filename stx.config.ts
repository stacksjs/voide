import type { StxConfig } from '@stacksjs/stx'

const config: StxConfig = {
  // Directory configuration
  pagesDir: 'pages',
  componentsDir: 'components',
  publicDir: 'public',
  partialsDir: 'partials',

  // Caching
  cache: process.env.NODE_ENV === 'production',
  cachePath: '.stx/cache',

  // Debug mode
  debug: process.env.NODE_ENV !== 'production',

  // Accessibility
  a11y: {
    enabled: true,
    level: 'AA',
  },

  // SEO configuration
  seo: {
    enabled: true,
    socialPreview: true,
    defaultConfig: {
      title: 'Voide - Voice AI Code Assistant',
      description: 'An AI-powered voice coding assistant',
    },
  },

  // Animation support
  animation: {
    enabled: true,
    defaultDuration: 200,
    defaultEase: 'ease-out',
  },

  // Streaming for large responses
  streaming: {
    enabled: true,
    bufferSize: 1024 * 16,
    strategy: 'auto',
  },
}

export default config
