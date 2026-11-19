/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        sungai: { 50: '#ecfbfd', 100: '#cff4f9', 300: '#6fd6e6', 500: '#159fb8', 700: '#0b6b80', 800: '#0b5566', 900: '#0a3a47', 950: '#04222b' },
        senja: { 300: '#fcc56b', 400: '#f9a83a', 500: '#ef8a17' },
      },
      keyframes: {
        arus: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        naik: { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        radar: { from: { opacity: '0', transform: 'scale(0.6)' }, to: { opacity: '1', transform: 'scale(1)' } },
        denyut: { '0%,100%': { opacity: '0.35', transform: 'scale(1)' }, '50%': { opacity: '0.9', transform: 'scale(1.6)' } },
      },
      animation: {
        'arus-lambat': 'arus 28s linear infinite',
        'arus-sedang': 'arus 18s linear infinite',
        'arus-cepat': 'arus 11s linear infinite',
        naik: 'naik 0.9s cubic-bezier(0.22,1,0.36,1) both',
        denyut: 'denyut 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
