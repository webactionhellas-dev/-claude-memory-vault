import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ink: near-black gallery surfaces
        ink: {
          DEFAULT: '#0a0a0a',
          900: '#060606',
          800: '#0e0e0e',
          700: '#141414',
          600: '#1a1a1a',
          500: '#242424'
        },
        // Bone: off-white text
        bone: {
          DEFAULT: '#ECE8DF',
          dim: '#A8A39A',
          faint: '#8A847A'
        },
        // Brand accent: Unicorn Tattoo's petrol/teal blue (from the logo crest).
        // Token names kept as violet/magenta so every existing class maps to the
        // new brand blue without touching components.
        violet: '#2E96B0',
        magenta: '#46B7CE',
        accent: {
          DEFAULT: '#2E96B0',
          bright: '#46B7CE',
          deep: '#123A44'
        }
      },
      fontFamily: {
        // Latin → Cormorant Unicase (brand), Greek glyphs fall through to GFS Didot
        display: ['var(--font-cormorant)', 'var(--font-didot)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif']
      },
      letterSpacing: {
        eyebrow: '0.34em',
        kicker: '0.22em'
      },
      maxWidth: {
        edge: '1680px'
      },
      transitionTimingFunction: {
        ink: 'cubic-bezier(0.22, 1, 0.36, 1)'
      },
      keyframes: {
        grain: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%': { transform: 'translate(-5%,-5%)' },
          '30%': { transform: 'translate(3%,-8%)' },
          '50%': { transform: 'translate(-4%,6%)' },
          '70%': { transform: 'translate(6%,4%)' },
          '90%': { transform: 'translate(-2%,7%)' }
        },
        floatcue: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '50%': { transform: 'translateY(8px)', opacity: '1' }
        }
      },
      animation: {
        grain: 'grain 8s steps(6) infinite',
        floatcue: 'floatcue 2.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
};

export default config;
