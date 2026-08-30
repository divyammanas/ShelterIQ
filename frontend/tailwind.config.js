/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          950: '#09090b',
        }
      },
      borderRadius: {
        xl: '12px',
        md: '8px',
        sm: '4px',
      }
    },
  },
  plugins: [],
}
