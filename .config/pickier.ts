import type { PickierConfig } from 'pickier'

const config: PickierConfig = {
  lint: {
    extensions: ['ts', 'js', 'json', 'md'],
  },

  format: {
    extensions: ['ts', 'js', 'json', 'md'],
    indent: 2,
    quotes: 'single',
    semi: false,
    trailingComma: true,
  },

  rules: {
    'no-console': 'off',
  },

  pluginRules: {
    // Disable style rules that trigger false positives in template strings
    'style/brace-style': 'off',
    'style/max-statements-per-line': 'off',
    'style/indent': 'off',
    'indent': 'off',
    // Disable false positives on regex patterns
    'regexp/no-unused-capturing-group': 'off',
    // Allow top-level await (supported in Bun)
    'ts/no-top-level-await': 'off',
    // Disable quote warnings (generated code may have different quote styles)
    'quotes': 'off',
    'style/quotes': 'off',
  },

  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/public/**',
    '**/.git/**',
    '**/lib/build.ts',
  ],
}

export default config
