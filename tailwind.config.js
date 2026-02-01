/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#010d1e',
        'dark-surface': '#0a1929',
        'dark-card': '#0f2744',
        'dark-border': '#1e3a5f',
        'accent-blue': '#1c6cff',
        'accent-green': '#00cc4b',
        'accent-orange': '#ff9900',
      }
    },
  },
  plugins: [],
}
