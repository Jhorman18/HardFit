/** @type {import('tailwindcss').Config} */
const accent = 'rgb(var(--accent) / <alpha-value>)'
const onAccent = 'rgb(var(--on-accent) / <alpha-value>)'

const STATE_FAMILIES = ['red', 'emerald', 'green', 'amber', 'orange', 'yellow', 'blue']
const STATE_TONES = [200, 300, 400, 700, 800, 900, 950]

const stateColors = {}
for (const family of STATE_FAMILIES) {
  stateColors[family] = {}
  for (const tone of STATE_TONES) {
    stateColors[family][tone] = `rgb(var(--${family}-${tone}) / <alpha-value>)`
  }
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...stateColors,
        neutral: {
          50: 'rgb(var(--n-50) / <alpha-value>)',
          100: 'rgb(var(--n-100) / <alpha-value>)',
          200: 'rgb(var(--n-200) / <alpha-value>)',
          300: 'rgb(var(--n-300) / <alpha-value>)',
          400: 'rgb(var(--n-400) / <alpha-value>)',
          500: 'rgb(var(--n-500) / <alpha-value>)',
          600: 'rgb(var(--n-600) / <alpha-value>)',
          700: 'rgb(var(--n-700) / <alpha-value>)',
          750: 'rgb(var(--n-750) / <alpha-value>)',
          800: 'rgb(var(--n-800) / <alpha-value>)',
          850: 'rgb(var(--n-850) / <alpha-value>)',
          900: 'rgb(var(--n-900) / <alpha-value>)',
          950: 'rgb(var(--n-950) / <alpha-value>)',
        },
        white: 'rgb(var(--fg) / <alpha-value>)',
        black: 'rgb(var(--bg) / <alpha-value>)',
        accent: {
          DEFAULT: accent,
          fg: onAccent,
        },
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        // Código de competición: no cambia con el tema ni con el acento. Solo para datos de peso.
        plate: {
          25: '#E5483C',
          20: '#4C80EA',
          15: '#F2BF1D',
          10: '#3DB06E',
          5: '#EFEBE1',
        },
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '6px',
        md: '6px',
        lg: '10px',
        xl: '10px',
        '2xl': '10px',
        '3xl': '10px',
      },
      backgroundColor: {
        white: accent,
      },
      borderColor: {
        white: accent,
      },
      textColor: {
        black: onAccent,
      },
      ringColor: {
        white: accent,
      },
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
