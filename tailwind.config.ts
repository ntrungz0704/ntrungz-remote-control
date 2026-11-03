import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          900: '#1E3A8A',
        },
        carrier: {
          grab: {
            DEFAULT: '#00B14F',
            light: '#E8F8F0',
            border: '#A3E7C3',
          },
          shopee: {
            DEFAULT: '#EE4D2D',
            light: '#FEEFEA',
            border: '#FCA591',
          },
          xanhsm: {
            DEFAULT: '#008B8B',
            light: '#E6F7F7',
            border: '#80CBC4',
          },
          ahamove: {
            DEFAULT: '#FF5722',
            light: '#FFF0EB',
            border: '#FFAB91',
          },
          be: {
            DEFAULT: '#F59E0B',
            light: '#FEF9E7',
            border: '#FDE68A',
          },
          sandbox: {
            DEFAULT: '#6366F1',
            light: '#EEF2FF',
            border: '#C7D2FE',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseRadar: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.3)', opacity: '0.2' },
          '100%': { transform: 'scale(0.95)', opacity: '0.8' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        pulseRadar: 'pulseRadar 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
