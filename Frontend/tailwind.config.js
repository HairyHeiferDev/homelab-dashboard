//** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(34, 211, 238, 0.4), inset 0 0 15px rgba(34, 211, 238, 0.1)',
        'neon-emerald': '0 0 15px rgba(52, 211, 153, 0.4), inset 0 0 15px rgba(52, 211, 153, 0.1)',
        'neon-amber': '0 0 15px rgba(251, 191, 36, 0.4), inset 0 0 15px rgba(251, 191, 36, 0.1)',
      },
      keyframes: {
        neonPulse: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))' },
          '50%': { opacity: '0.4', filter: 'drop-shadow(0 0 2px rgba(34, 211, 238, 0.2))' },
        }
      },
      animation: {
        'neon-pulse': 'neonPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}