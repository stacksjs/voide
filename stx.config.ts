import type { StxConfig } from '@stacksjs/stx'

const config: StxConfig = {
  pagesDir: 'pages',
  componentsDir: 'components',
  publicDir: 'public',
  cache: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV !== 'production',
}

export default config
