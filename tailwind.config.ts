import type { Config } from 'tailwindcss';

// Palette: Golden Caramel #B28558 · Smoked Moss #322C25 · Dark Sangria #2C0E11, extended with tints/shades of each.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sangria: { 950: '#1B0709', 900: '#2C0E11', 800: '#381419', 700: '#4A1D23', 600: '#63292F' },
        moss: { 950: '#211D18', 900: '#322C25', 800: '#3E372E', 700: '#4D443A', 600: '#665B4D', 500: '#857868' },
        caramel: { 100: '#F1E6D6', 200: '#E3CDB0', 300: '#D2B48C', 400: '#C19A6E', 500: '#B28558', 600: '#8F6A44', 700: '#6E5034' },
        cream: '#F1E6D6',
        ok: { DEFAULT: '#9DB98B', deep: '#2B3A26' },
        bad: { DEFAULT: '#D98078', deep: '#4A1F1E' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: { ticket: '0 30px 60px -30px rgba(0,0,0,.6), 0 0 0 1px rgba(178,133,88,.18)' },
    },
  },
  plugins: [],
};
export default config;
