/** 主题：绿色（原配色）/ 米色（参考稿的纸感配色） */

export type ThemeName = 'green' | 'beige'

export const THEMES: { id: ThemeName; name: string; hint: string }[] = [
  { id: 'green', name: '苔绿', hint: '清爽的浅绿底色' },
  { id: 'beige', name: '米纸', hint: '偏暖的纸感底色' },
]

export const THEME_STORAGE_KEY = 'beanlog.theme.v1'

export function isThemeName(v: unknown): v is ThemeName {
  return v === 'green' || v === 'beige'
}

/** 读取上次选择的主题；index.html 里有一段相同的逻辑负责首屏不闪白 */
export function readStoredTheme(): ThemeName {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeName(raw)) return raw
  } catch {
    /* 隐私模式下读不到就用默认值 */
  }
  return 'green'
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
  // 让 iOS 状态栏、地址栏颜色跟着主题走
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--c-app').trim()
    if (color) meta.setAttribute('content', color)
  }
}

export function persistTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* 存不上也不影响本次使用 */
  }
}

/** 读 CSS 变量当前的值，canvas 画海报时用（保证海报和界面同色） */
export function cssVar(name: string, fallback = '#000000'): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
