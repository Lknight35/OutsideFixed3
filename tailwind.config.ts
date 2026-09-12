import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f9f5ff',
          100: '#f3ebff',
          200: '#e7d5ff',
          300: '#d4b5ff',
          400: '#bb7fff',
          500: '#9d4edd',
          600: '#7b2cbf',
          700: '#5a189a',
          800: '#3c096c',
          900: '#10002b',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
