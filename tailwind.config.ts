import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'hp-foundation': 'var(--bg-foundation)',
        'hp-card': 'var(--surface-card)',
        'hp-inset': 'var(--surface-inset)',
        'hp-ink': 'var(--ink-primary)',
        'hp-body': 'var(--ink-body)',
        'hp-muted': 'var(--ink-muted)',
        'hp-rule': 'var(--rule)',
        'hp-pink': 'var(--accent)',
        'hp-platinum': 'var(--platinum)',
      },
      fontFamily: {
        title: ['var(--font-title)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        eyebrow: '0.14em',
      },
    },
  },
  plugins: [],
};

export default config;
