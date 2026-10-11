/** 主题：绿色（原配色）/ 米色（参考稿的纸感配色） */

export type ThemeName = 'jade' | 'blue' | 'purple' | 'pink' | 'white' | 'gray'

export const THEMES: { id: ThemeName; name: string; hint: string; colors: { paper: string; surface: string; accent: string; soft: string } }[] = [{"id": "jade", "name": "青白玉", "hint": "青白玉与葱黛 · 温润古雅", "colors": {"paper": "#F2F0E4", "surface": "#FCFBF4", "accent": "#77794C", "soft": "#E0E1CA"}}, {"id": "blue", "name": "月白蓝", "hint": "月白与靛青 · 清澈沉静", "colors": {"paper": "#EDF3F6", "surface": "#FAFCFD", "accent": "#326B88", "soft": "#D2E4EA"}}, {"id": "purple", "name": "丁香紫", "hint": "丁香与黛紫 · 柔和安静", "colors": {"paper": "#F2EDF5", "surface": "#FCFAFD", "accent": "#80658F", "soft": "#E3D8EA"}}, {"id": "pink", "name": "桃花粉", "hint": "桃天与苏梅 · 温柔暖意", "colors": {"paper": "#FAEFF0", "surface": "#FFFAFA", "accent": "#AC6078", "soft": "#F0D5DD"}}, {"id": "white", "name": "凝脂白", "hint": "凝脂与象牙 · 素净自然", "colors": {"paper": "#F5F3ED", "surface": "#FFFEFA", "accent": "#82765F", "soft": "#E9E3D6"}}, {"id": "gray", "name": "烟雨灰", "hint": "淡烟与石涅 · 克制留白", "colors": {"paper": "#EFF0EE", "surface": "#FBFCFA", "accent": "#697570", "soft": "#DCE1DC"}}]

export const THEME_STORAGE_KEY = 'beanlog.theme.v1'

export function isThemeName(v: unknown): v is ThemeName {
  return THEMES.some(t => t.id === v)
}

/** 读取上次选择的主题；index.html 里有一段相同的逻辑负责首屏不闪白 */
export function readStoredTheme(): ThemeName {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeName(raw)) return raw
  } catch {
    /* 隐私模式下读不到就用默认值 */
  }
  return 'jade'
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
