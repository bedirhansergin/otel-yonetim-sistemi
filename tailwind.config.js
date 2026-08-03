export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#070b14',
        panel: '#0f1420',
        accent: '#38bdf8',
        accentSoft: '#0f172a',
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
