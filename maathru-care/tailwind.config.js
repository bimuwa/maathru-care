/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        emerald: {
          900: '#166534', // Deep Emerald
          700: '#15803D', // Emerald
          500: '#22C55E', // Soft Emerald
          50: '#F0FDF4',  // Soft green surface
        },
        teal: {
          600: '#0D9488', // Teal
          50: '#F0FDFA',  // Soft teal surface
          100: '#CCFBF1', // Soft Teal
        },
        slate: {
          900: '#0F172A', // Primary text
          600: '#475569', // Secondary text
          400: '#94A3B8', // Muted text
          50: '#F8FAFC',  // Main background
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
