import type { BunPressConfig } from 'bunpress'

export default {
  title: 'voide',
  description: 'Voice AI Code Assistant',
  lang: 'en-US',
  base: '/voide/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/voide/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#5c6bc0' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'voide Documentation' }],
    ['meta', { property: 'og:description', content: 'Voice AI Code Assistant powered by Claude' }],
    ['meta', { property: 'og:url', content: 'https://voide.sh/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'voide Documentation' }],
    ['meta', { name: 'twitter:description', content: 'Voice AI Code Assistant powered by Claude' }],
    ['meta', { name: 'keywords', content: 'voice, ai, code, assistant, claude' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'voide',

    nav: [
      { text: 'Guide', link: '/intro' },
      { text: 'Features', link: '/features/voice-commands' },
      { text: 'Advanced', link: '/advanced/configuration' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/stacksjs/voide' },
          { text: 'Changelog', link: 'https://github.com/stacksjs/voide/blob/main/CHANGELOG.md' },
          { text: 'Contributing', link: 'https://github.com/stacksjs/voide/blob/main/CONTRIBUTING.md' },
        ],
      },
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/intro' },
            { text: 'Installation', link: '/install' },
            { text: 'Usage', link: '/usage' },
            { text: 'Configuration', link: '/config' },
          ],
        },
        {
          text: 'Features',
          items: [
            { text: 'Voice Commands', link: '/features/voice-commands' },
            { text: 'AI Integration', link: '/features/ai-integration' },
            { text: 'Code Generation', link: '/features/code-generation' },
            { text: 'Real-time Transcription', link: '/features/real-time-transcription' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Configuration', link: '/advanced/configuration' },
            { text: 'Custom Commands', link: '/advanced/custom-commands' },
            { text: 'Performance', link: '/advanced/performance' },
            { text: 'API Integration', link: '/advanced/api-integration' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/stacksjs/voide' },
      { icon: 'discord', link: 'https://discord.gg/stacksjs' },
    ],

    editLink: {
      pattern: 'https://github.com/stacksjs/voide/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2024-present Stacks.js Contributors',
    },

    search: {
      provider: 'local',
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },
  },
} satisfies BunPressConfig
