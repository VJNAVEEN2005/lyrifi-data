/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a0d',
        card: '#12141a',
        'card-muted': 'rgba(255, 255, 255, 0.04)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        accent: {
          red: '#ff2d55',
          glow: '#e63946',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-text': '0 0 25px rgba(255, 255, 255, 0.85), 0 0 50px rgba(255, 255, 255, 0.35)',
        'glow-art': '0 10px 40px -10px rgba(0, 0, 0, 0.7)',
        'pill-active': '0 0 16px rgba(255, 45, 85, 0.4)',
      }
    },
  },
  plugins: [],
}
