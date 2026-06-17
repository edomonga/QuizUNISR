import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: 'rgb(32, 44, 71)',
          50: 'rgb(240, 242, 247)',
          100: 'rgb(210, 217, 232)',
          200: 'rgb(150, 167, 200)',
          300: 'rgb(90, 117, 168)',
          400: 'rgb(60, 80, 120)',
          500: 'rgb(32, 44, 71)',
          600: 'rgb(24, 33, 53)',
          700: 'rgb(16, 22, 36)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
export default config
