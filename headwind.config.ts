export default {
  content: [
    './pages/**/*.stx',
    './components/**/*.stx',
  ],
  output: './public/dist/voide.css',
  minify: false,
  preflight: true,
  safelist: [
    'animate-pulse',
    'animate-bounce',
    'animate-fade-in',
    'animate-blink',
    'hidden',
    'flex',
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
