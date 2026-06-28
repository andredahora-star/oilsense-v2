/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: {
    brand: { DEFAULT: '#22c55e', dark: '#16a34a' },
    surface: '#161b22', base: '#0d1117', border: '#30363d', muted: '#8b949e'
  }}},
  plugins: []
}