/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0D0F13',
        sidebar: '#131720',
        surface: '#191D26',
        'surface-elevated': '#212632',
        'telemetry-bg': '#161A22',
        'gold-primary': '#D4A359',
        'gold-cta': '#C89646',
        'orange-burn': '#D97724',
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
        'border-subtle': '#262C3A',
        'border-sidebar': '#1F2430',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(212, 163, 89, 0.15)',
      }
    },
  },
  plugins: [],
}
