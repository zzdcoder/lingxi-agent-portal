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
        surface: {
          50: '#f8f7fa',
          100: '#f0eff4',
          200: '#e2e0e9',
          300: '#cbc8d8',
          400: '#b0aac2',
          500: '#958ca8',
          600: '#7d7391',
          700: '#675e78',
          800: '#564f63',
          900: '#4a4455',
          950: '#0f0e13',
        },
        primary: {
          50: '#f5f0ff',
          100: '#ede4ff',
          200: '#decdff',
          300: '#c7a6ff',
          400: '#af73ff',
          500: '#9a3bff',
          600: '#8a1fff',
          700: '#7b0ef2',
          800: '#670ec6',
          900: '#5510a1',
          950: '#36096e',
        },
        accent: {
          50: '#eefbff',
          100: '#d6f5ff',
          200: '#b5efff',
          300: '#83e6ff',
          400: '#48d6ff',
          500: '#1ebeff',
          600: '#06a2f0',
          700: '#0582cc',
          800: '#0a6ba7',
          900: '#0f5a87',
          950: '#0b3752',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'typing': 'typing 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        typing: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
