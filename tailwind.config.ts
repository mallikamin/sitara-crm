import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a56db',
        'primary-dark': '#1e429f',
        'primary-light': '#3f83f8',
        secondary: '#047857',
        'secondary-dark': '#065f46',
        danger: '#dc2626',
        'danger-dark': '#991b1b',
        warning: '#f59e0b',
        'warning-dark': '#d97706',
        success: '#10b981',
        'success-dark': '#059669',
      }
    },
  },
  plugins: [],
}
export default config