import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#daeaff',
          200: '#bdd8ff',
          300: '#90bdff',
          400: '#5c98ff',
          500: '#3b73f5',
          600: '#2451eb',
          700: '#1d3fd6',
          800: '#1e35ae',
          900: '#1e318a',
          950: '#161f54',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f7f8fc',
          subtle: '#f0f2f8',
          border: '#e3e7f0',
        },
        ink: {
          DEFAULT: '#0f1117',
          muted: '#4b5263',
          faint: '#8b93a8',
        },
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#0891b2',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
