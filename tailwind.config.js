export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#080d1a',
        panel: '#141a2e',
        accent: '#38bdf8',
        accentSoft: '#111827',
        border: '#1e293b',
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        soft: '0 20px 50px rgba(0, 0, 0, 0.35)',
        card: '0 4px 24px rgba(0, 0, 0, 0.3)',
      }
    }
  },
  plugins: []
};
