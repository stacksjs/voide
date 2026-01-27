export default {
  content: [
    './pages/**/*.stx',
    './components/**/*.stx',
  ],
  // Don't output to file - let STX inject CSS inline
  // The build-css.ts script outputs to public/dist/voide.css with custom utilities
  output: '',
  minify: false,
  preflight: true,
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
    extend: {
      colors: {
        // Monokai Pro palette
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
