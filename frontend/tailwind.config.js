/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-bg': '#18181b',
        'slate-panel': '#1e293b',
        'alert-red': '#ef4444',
        'alert-amber': '#f59e0b',
        'amber-500': '#f59e0b',
      },
    },
  },
  plugins: [],
}
