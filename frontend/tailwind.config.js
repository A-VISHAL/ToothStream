module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        perio: {
          50: '#f5fbff',
          100: '#e3f5ff',
          200: '#baeafc',
          300: '#7dd9f7',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      boxShadow: {
        clinical: '0 18px 42px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};