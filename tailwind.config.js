/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ghana-gold': '#FFD700',
        'charcoal': '#1a1a1a',
        'deep-black': '#0a0a0a',
      },
    },
  },
  plugins: [],
}
