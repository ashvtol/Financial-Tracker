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
        'dark-card': '#1c1c1e',
        'dark-border': '#3a3a3c',
        // Copilot Money iOS-inspired colors
        'copilot-blue': '#0263c5',
        'copilot-teal': '#00a67d',
        'copilot-orange': '#ff9500',
        'copilot-purple': '#af52de',
        'copilot-indigo': '#5856d6',
        'copilot-red': '#ff3b30',
        'copilot-green': '#34c759',
        'copilot-pink': '#ff6482',
        // iOS system colors
        'ios-blue': '#007aff',
        'ios-gray': '#8e8e93',
        'ios-gray-2': '#636366',
        'ios-gray-3': '#48484a',
        'ios-gray-4': '#3a3a3c',
        'ios-gray-5': '#2c2c2e',
        'ios-gray-6': '#1c1c1e',
      },
      boxShadow: {
        'copilot': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'copilot-hover': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'copilot-tooltip': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'copilot': '12px',
      }
    },
  },
  plugins: [],
}
