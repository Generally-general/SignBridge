/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0f172a',
        },
        indigo: {
          900: '#312e81',
        },
        cyan: {
          400: '#22d3ee',
        },
      },
      backdropBlur: {
        md: '12px',
      },
    },
  },
  plugins: [],
};
