/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 颜色统一走 index.css 里的主题变量，方便切换配色
      colors: {
        bg: 'var(--c-bg)',
        app: 'var(--c-app)',
        surface: 'var(--c-surface)',
        'surface-soft': 'var(--c-surface-soft)',
        ink: 'var(--c-ink)',
        'ink-soft': 'var(--c-ink-soft)',
        'ink-faint': 'var(--c-ink-faint)',
        'ink-ghost': 'var(--c-ink-ghost)',
        line: 'var(--c-line)',
        border: 'var(--c-border)',
        primary: 'var(--c-primary)',
        'primary-ink': 'var(--c-primary-ink)',
        accent: 'var(--c-accent)',
        soft: 'var(--c-soft)',
        'soft-ink': 'var(--c-soft-ink)',
        danger: 'var(--c-danger)',
      },
      fontFamily: {
        serif: ['var(--font-handwritten)'],
      },
    },
  },
  plugins: [],
}
