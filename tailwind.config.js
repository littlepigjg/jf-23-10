/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        space: {
          950: '#05071a',
          900: '#0a0e27',
          800: '#0f1538',
          700: '#161e4a',
          600: '#1f2a61',
        },
        neon: {
          cyan: '#00e5ff',
          'cyan-dim': '#00a8bd',
          orange: '#ff6b35',
          yellow: '#ffd166',
          purple: '#7c3aed',
          blue: '#60a5fa',
          red: '#ef4444',
          green: '#22c55e',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 8px rgba(0,229,255,0.5), 0 0 20px rgba(0,229,255,0.25)',
        'neon-orange': '0 0 8px rgba(255,107,53,0.5), 0 0 20px rgba(255,107,53,0.25)',
        'neon-yellow': '0 0 8px rgba(255,209,102,0.5), 0 0 20px rgba(255,209,102,0.25)',
        'neon-purple': '0 0 8px rgba(124,58,237,0.5), 0 0 20px rgba(124,58,237,0.25)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'blink': 'blink 1.2s step-end infinite',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.8', filter: 'drop-shadow(0 0 6px currentColor)' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 16px currentColor)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
