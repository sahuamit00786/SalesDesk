import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'sans-serif'],
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
          DEFAULT: '#5B21B6',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#5B21B6',
          600: '#5B21B6',
          700: '#4C1D95',
          800: '#3B1578',
          900: '#2E1065',
          950: '#1E1040',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#F9F7FC',
          subtle: '#EDE9FE',
          border: 'var(--surface-border, #E5DFF0)',
          field: '#5B21B6',
        },
        ink: {
          DEFAULT: '#0f1117',
          muted: '#4b5263',
          faint: '#8b93a8',
        },
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#5B21B6',
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
      fontSize: {
        'display': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'heading': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'subheading': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'body': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '400' }],
      },
      backgroundImage: {
        'lf-grid':
          'linear-gradient(rgba(147,51,234,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(147,51,234,0.08) 1px, transparent 1px)',
        'lf-page':
          'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(167,139,250,0.22), transparent 55%), linear-gradient(180deg, #faf5ff 0%, #ffffff 42%, #ffffff 100%)',
        'lf-cta-mesh':
          'radial-gradient(ellipse 100% 80% at 20% 0%, rgba(147,51,234,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 100%, rgba(124,58,237,0.12), transparent 45%)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
