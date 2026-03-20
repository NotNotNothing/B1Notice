import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // === 基础颜色系统 ===
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // === 图表颜色 ===
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // === 终端背景层级 ===
        surface: {
          base: 'hsl(var(--surface-base))',
          panel: 'hsl(var(--surface-panel))',
          elevated: 'hsl(var(--surface-elevated))',
        },

        // === 终端边框 ===
        terminal: {
          'border-subtle': 'hsl(var(--border-subtle))',
          'border-default': 'hsl(var(--border-default))',
          'border-emphasis': 'hsl(var(--border-emphasis))',
        },

        // === 语义颜色 - 涨跌 ===
        up: {
          DEFAULT: 'hsl(var(--semantic-up))',
          bg: 'hsl(var(--semantic-up-bg))',
        },
        down: {
          DEFAULT: 'hsl(var(--semantic-down))',
          bg: 'hsl(var(--semantic-down-bg))',
        },
        flat: 'hsl(var(--semantic-flat))',

        // === 语义颜色 - 任务状态 ===
        task: {
          pending: {
            DEFAULT: 'hsl(var(--task-pending))',
            bg: 'hsl(var(--task-pending-bg))',
          },
          running: {
            DEFAULT: 'hsl(var(--task-running))',
            bg: 'hsl(var(--task-running-bg))',
          },
          success: {
            DEFAULT: 'hsl(var(--task-success))',
            bg: 'hsl(var(--task-success-bg))',
          },
          failed: {
            DEFAULT: 'hsl(var(--task-failed))',
            bg: 'hsl(var(--task-failed-bg))',
          },
        },

        // === 语义颜色 - 告警 ===
        alert: {
          info: {
            DEFAULT: 'hsl(var(--alert-info))',
            bg: 'hsl(var(--alert-info-bg))',
          },
          warning: {
            DEFAULT: 'hsl(var(--alert-warning))',
            bg: 'hsl(var(--alert-warning-bg))',
          },
          critical: {
            DEFAULT: 'hsl(var(--alert-critical))',
            bg: 'hsl(var(--alert-critical-bg))',
          },
        },
      },

      // === 圆角系统 ===
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      // === 阴影系统 ===
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'glow-up': '0 0 20px hsl(var(--glow-up))',
        'glow-down': '0 0 20px hsl(var(--glow-down))',
        'glow-focus': '0 0 20px hsl(var(--glow-focus))',
      },

      // === 字体系统 ===
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },

      // === 动画系统 ===
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },

      // === 间距系统（用于工作台布局） ===
      spacing: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
        'header': '64px',
        'bottom-nav': '64px',
      },

      // === Z-index 系统 ===
      zIndex: {
        'sidebar': '40',
        'header': '50',
        'bottom-nav': '50',
        'modal': '60',
        'toast': '70',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
