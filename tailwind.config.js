/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odisha: {
          dark: '#1e3a8a',
          primary: '#2563eb',
          secondary: '#d97706',
          accent: '#059669',
          light: '#f0fdf4',
          sand: '#fef3c7'
        }
      }
    },
  },
  plugins: [],
}

