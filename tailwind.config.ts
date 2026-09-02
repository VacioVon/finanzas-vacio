import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        // ── Brand / Identidad QloB ────────────────────────────────
        // Azul eléctrico — reemplaza primary genérico
        primary: {
          50:  '#E8F0FF',
          100: '#C5D8FF',
          200: '#94B8FF',
          300: '#6398FF',
          400: '#3F84FF',
          500: '#2979FF',
          600: '#1A5CE5',
          700: '#1245C4',
          800: '#0D35A3',
          900: '#0A2882',
        },
        brand: {
          50:  '#E8F0FF',
          100: '#C5D8FF',
          200: '#94B8FF',
          300: '#6398FF',
          400: '#3F84FF',
          500: '#2979FF',
          600: '#1A5CE5',
          700: '#1245C4',
          800: '#0D35A3',
          900: '#0A2882',
        },

        // ── Semántica financiera ──────────────────────────────────
        // Gasto — coral
        gasto: {
          50:  '#FEF1F0',
          100: '#FDDBD9',
          200: '#FBB7B3',
          300: '#F8938D',
          400: '#F67069',
          500: '#F4645F',
          600: '#D94040',
          700: '#B82020',
        },
        // Ingreso — verde eléctrico
        ingreso: {
          50:  '#EDFDF5',
          100: '#D5FAE8',
          200: '#ABEFD1',
          300: '#6EE4B4',
          400: '#30D897',
          500: '#10D97F',
          600: '#0CBB6B',
          700: '#099D5A',
        },
        // Ahorro — violeta
        ahorro: {
          50:  '#F5EFFE',
          100: '#EAE0FD',
          200: '#D5C0FB',
          300: '#BFA0F9',
          400: '#AA80F7',
          500: '#9B5DE5',
          600: '#7C4ABB',
          700: '#5E3890',
        },
        // Mover / Transferencia — cian
        mover: {
          50:  '#E5FAFC',
          100: '#CCF5F8',
          200: '#99EBF1',
          300: '#66E0E7',
          400: '#33D1D8',
          500: '#00C2CB',
          600: '#009BA3',
          700: '#00757B',
        },
        // XP / Logros — dorado
        xp: {
          50:  '#FFF8E1',
          100: '#FFEDB3',
          200: '#FFE080',
          300: '#FFD24D',
          400: '#FFCA40',
          500: '#FFB703',
          600: '#DB9B00',
          700: '#B77F00',
        },

        // ── Semántica de sistema (remapeada a paleta QloB) ────────
        // danger = coral (errores + gastos)
        danger: {
          50:  '#FEF1F0',
          100: '#FDDBD9',
          200: '#FBB7B3',
          400: '#F67069',
          500: '#F4645F',
          600: '#D94040',
          700: '#B82020',
          800: '#921010',
        },
        // success = verde (éxito + ingresos)
        success: {
          50:  '#EDFDF5',
          100: '#D5FAE8',
          400: '#30D897',
          500: '#10D97F',
          600: '#0CBB6B',
          700: '#099D5A',
          800: '#077A47',
        },
        // warning = ámbar (alertas, para_tercero)
        warning: {
          50:  '#FFF8E1',
          100: '#FFEDB3',
          200: '#FFE080',
          300: '#FFD24D',
          400: '#FFCA40',
          500: '#FFB703',
          600: '#DB9B00',
          700: '#B77F00',
          800: '#935C00',
        },

        // ── Superficies nocturnas (dark-first) ───────────────────
        night: {
          0:      '#1A1822',   // cards principales / sidebar
          1:      '#23212C',   // cards elevadas / modales
          2:      '#2C2A38',   // inputs, interactivos
          3:      '#353344',   // hover, seleccionados
          border: '#3D3B50',   // bordes cósmicos
        },

        // ── Deep Ocean — módulos analíticos ──────────────────────
        ocean: {
          bg:     '#0E1E25',   // fondo alternativo analítico
          0:      '#162A32',   // cards en contexto ocean
          1:      '#1F3A45',   // cards elevadas ocean
          2:      '#2A4E5C',   // inputs en ocean
          border: '#2E6070',   // bordes ocean — más visibles
        },

        // ── Regal Gold — objetivos / logros / progreso ───────────
        gold: {
          400:    '#D4B347',
          500:    '#C9A227',   // Regal Gold — objetivos completados
          600:    '#A8851F',
        },

        // ── Superficie light ──────────────────────────────────────
        surface: '#FFFFFF',
        background: '#0D0B14', // Space Black — fondo real de la app
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-lg':  '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        nav:        '0 -1px 3px 0 rgb(0 0 0 / 0.06)',
        // Glows QloB — solo donde aportan jerarquía
        'glow-brand':   '0 0 18px rgba(41,121,255,0.22)',
        'glow-gasto':   '0 0 18px rgba(244,100,95,0.22)',
        'glow-ingreso': '0 0 18px rgba(16,217,127,0.20)',
        'glow-ahorro':  '0 0 18px rgba(155,93,229,0.22)',
        'glow-mover':   '0 0 18px rgba(0,194,203,0.20)',
        'glow-xp':      '0 0 18px rgba(255,183,3,0.25)',
        'glow-gold':    '0 0 22px rgba(201,162,39,0.30)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'shimmer':    'shimmer 2.2s linear infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'vita-pulse': 'vitaPulse 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1'   },
        },
        vitaPulse: {
          '0%,100%': { opacity: '0.7', transform: 'scaleX(1)'    },
          '50%':     { opacity: '1',   transform: 'scaleX(1.005)' },
        },
      }
    }
  },
  plugins: []
}

export default config
