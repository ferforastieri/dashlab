/** @type {import('tailwindcss').Config} */
export default {
  content: ['./lab/index.html', './lab/**/*.{ts,tsx}'],
  theme: { extend: { colors: { accent: 'var(--accent)' } } },
  plugins: [],
};
