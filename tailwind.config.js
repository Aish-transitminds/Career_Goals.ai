/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fox: {
          orange: '#FF5E00',
          'orange-hover': '#E65400',
          navy: '#0B1026',
          'navy-2': '#151B3A',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
        },
        navy: {
          DEFAULT: '#0B1026',
          800: '#151B3A',
          900: '#0B1026',
          950: '#050814',
        },
        fit: {
          strong: '#059669',    // Emerald-600
          'strong-bg': '#ecfdf5',
          possible: '#d97706',  // Amber-600
          'possible-bg': '#fffbeb',
          reach: '#7c3aed',     // Violet-600
          'reach-bg': '#f5f3ff',
          prep: '#475569',      // Slate-600
          'prep-bg': '#f1f5f9',
        },
      },
      fontFamily: {
        sans: [
          'Poppins',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        poppins: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
