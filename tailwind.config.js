export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0b1120',
        panel: '#111827',
        accent: '#38bdf8',
        accentSoft: '#0f172a'
      },
      boxShadow: {
        soft: '0 20px 50px rgba(0, 0, 0, 0.25)'
      }
    }
  },
  plugins: []
};
