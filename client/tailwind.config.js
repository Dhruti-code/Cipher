/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sketch: {
          bg: '#fdfbf7',
          fg: '#2d2d2d',
          muted: '#e5e0d8',
          accent: '#ff4d4d',
          secondary: '#2d5da1',
          paper: '#f9f6ef',
          line: '#2d2d2d',
        },
      },
      fontFamily: {
        heading: ['Kalam', 'cursive', 'sans-serif'],
        body: ['"Patrick Hand"', 'cursive', 'sans-serif'],
      },
      boxShadow: {
        // Hard offset shadows only - NO blurred shadows!
        'sketch-xs': '1px 1px 0px #2d2d2d',
        'sketch-sm': '2px 2px 0px #2d2d2d',
        'sketch': '3px 3px 0px #2d2d2d',
        'sketch-md': '4px 4px 0px #2d2d2d',
        'sketch-lg': '6px 6px 0px #2d2d2d',
        'sketch-accent': '3px 3px 0px #ff4d4d',
        'sketch-secondary': '3px 3px 0px #2d5da1',
        'sketch-pressed': '1px 1px 0px #2d2d2d',
      },
      borderRadius: {
        // Wobbly, hand-drawn irregular border-radius
        'sketch-wobbly': '255px 15px 225px 15px/15px 225px 15px 255px',
        'sketch-card': '255px 25px 225px 25px/25px 225px 25px 255px',
        'sketch-btn': '255px 20px 225px 20px/20px 225px 20px 255px',
        'sketch-input': '255px 15px 225px 15px/15px 225px 15px 255px',
        'sketch-badge': '120px 20px 100px 20px/20px 100px 20px 120px',
        'sketch-round': '50% 50% 50% 50% / 60% 60% 40% 40%',
      },
      borderWidth: {
        'sketch': '2px',
        'sketch-thick': '3px',
      },
    },
  },
  plugins: [],
};
