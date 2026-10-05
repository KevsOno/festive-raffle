/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0B3D2E',
          accent: '#C9A227',
          light: '#F5E6B8',
        },
      },
    },
  },
  plugins: [],
}
