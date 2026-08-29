/** @type {import('tailwindcss').Config} */
export default {
  content: ['./landing/**/*.{html,ts,tsx}', './lab/**/*.{html,ts,tsx}', './shared/**/*.{ts,tsx}'],
  theme: { extend: { colors: { accent: 'var(--accent)' } } },
  plugins: [],
};
