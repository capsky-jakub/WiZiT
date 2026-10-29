/**
 * Tailwind CSS v3 configuration for build-time compilation.
 * Replaces the insecure runtime Play CDN (cdn.tailwindcss.com) while preserving
 * class-based dark mode and custom Google brand colors.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1a73e8',
          red: '#ea4335',
          green: '#34a853',
          yellow: '#fbbc04',
          gray: '#f1f3f4',
        },
      },
    },
  },
  plugins: [],
};
