import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        lf: {
          ink: '#0b1120',
          muted: '#475569',
          faint: '#94a3b8',
          surface: '#ffffff',
          subtle: '#f8fafc',
          line: 'rgba(124, 58, 237, 0.12)',
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
          },
          glow: '#38bdf8',
        },
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
      keyframes: {
        'lf-marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'lf-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'lf-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'lf-spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'lf-pulse-glow': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'lf-marquee': 'lf-marquee 45s linear infinite',
        'lf-float': 'lf-float 5s ease-in-out infinite',
        'lf-shimmer': 'lf-shimmer 3s linear infinite',
        'lf-spin-slow': 'lf-spin-slow 18s linear infinite',
        'lf-pulse-glow': 'lf-pulse-glow 4s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.22s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      backgroundImage: {
        'lf-grid':
          'linear-gradient(rgba(124,58,246,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.07) 1px, transparent 1px)',
        'lf-page':
          'radial-gradient(ellipse 120% 80% at 50% -30%, rgba(167,139,250,0.35), transparent 55%), radial-gradient(ellipse 80% 60% at 100% 20%, rgba(244,114,182,0.12), transparent 50%), radial-gradient(ellipse 70% 50% at 0% 80%, rgba(56,189,248,0.12), transparent 45%), linear-gradient(180deg, #faf5ff 0%, #ffffff 38%, #f8fafc 100%)',
        'lf-cta-mesh':
          'radial-gradient(ellipse 100% 80% at 20% 0%, rgba(168,85,247,0.45), transparent 55%), radial-gradient(ellipse 80% 70% at 100% 30%, rgba(34,211,238,0.22), transparent 50%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(217,70,239,0.2), transparent 45%)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
