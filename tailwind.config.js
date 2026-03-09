/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (auto-switch dark/light via CSS vars) ──
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        surface2: 'var(--surface2)',
        border:   'var(--border)',
        text:     'var(--text)',
        muted:    'var(--muted)',

        // ── Static palette ──
        navy: {
          900: '#080f1a',
          800: '#0d1829',
          700: '#112035',
          600: '#172944',
          500: '#1e3456',
          400: '#2a4570',
          300: '#3d5a8a',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light:   '#e2c06a',
          dim:     '#8a6e2f',
          glow:    'rgba(201,168,76,0.15)',
        },
        parchment: {
          DEFAULT: '#f7f3ec',
          dark:    '#ede8df',
          darker:  '#dfd8cc',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans:  ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'navy': '0 4px 20px rgba(0,0,0,0.4)',
        'gold': '0 0 0 3px rgba(201,168,76,0.2)',
      },
      animation: {
        'fade-up':  'fadeUp 0.4s ease-out both',
        'fade-in':  'fadeIn 0.3s ease-out both',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.32,0.72,0,1) both',
      },
      keyframes: {
        fadeUp:  { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};