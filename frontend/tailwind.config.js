/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#f0f6fc',
          100: '#e1eef9',
          200: '#b8daf2',
          300: '#7bb9e6',
          400: '#3994d6',
          500: '#1575be',
          600: '#0c5b9e',
          700: '#0b4a81',
          800: '#0e3f6b',
          900: '#0f2942',
          950: '#091c2f',
        },
        teal: {
          500: '#0d9488',
          600: '#0f766e',
        },
      },
    },
  },
  plugins: [],
};
