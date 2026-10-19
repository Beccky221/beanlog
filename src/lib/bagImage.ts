/**
 * 生成一只风格化咖啡袋 SVG 占位图（dataURL）。
 * 没有真实照片时，让豆库和豆袋墙依然有「一袋一袋」的感觉。
 */
import englishHandFont from '@/assets/fonts/SounsoQuality-Regular.woff2?inline'

interface BagOptions {
  /** 袋身主色 */
  color: string
  /** 顶部折边颜色（默认自动加深） */
  foldColor?: string
  /** 标签底色 */
  labelColor?: string
  /** 标签文字色 */
  labelTextColor?: string
  /** 标签主文案（通常是风味名） */
  label: string
  /** 标签下方小字（通常是品牌） */
  sub?: string
}

function shade(hex: string, amt: number): string {
  const n = hex.replace('#', '')
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** 把长标签按每行最多 n 个字折行 */
function wrapLabel(text: string, perLine = 4): string[] {
  const lines: string[] = []
  let rest = text
  while (rest.length > perLine) {
    lines.push(rest.slice(0, perLine))
    rest = rest.slice(perLine)
  }
  if (rest) lines.push(rest)
  return lines.slice(0, 3)
}

export function bagImage(opts: BagOptions): string {
  const {
    color,
    labelColor = '#F5EFE2',
    labelTextColor = '#4A3B2E',
    label,
    sub = '',
  } = opts
  const fold = opts.foldColor ?? shade(color, -28)
  const edge = shade(color, -45)
  const highlight = shade(color, 22)
  const lines = wrapLabel(label)
  const lineHeight = 30
  const textStartY = 200 - ((lines.length - 1) * lineHeight) / 2

  const labelLines = lines
    .map(
      (ln, i) =>
        `<text x="150" y="${textStartY + i * lineHeight}" text-anchor="middle" font-family="'Sounso Quality','Kaiti SC','STKaiti','KaiTi',cursive" font-size="24" font-weight="600" fill="${labelTextColor}">${escapeXml(ln)}</text>`
    )
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
  <style>@font-face{font-family:'Sounso Quality';src:url('${englishHandFont}') format('woff2');font-weight:400;unicode-range:U+0041-005A,U+0061-007A,U+00C0-024F,U+1E00-1EFF;}</style>
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${edge}"/>
      <stop offset="0.18" stop-color="${color}"/>
      <stop offset="0.55" stop-color="${highlight}"/>
      <stop offset="1" stop-color="${edge}"/>
    </linearGradient>
  </defs>
  <!-- 顶部折边 -->
  <rect x="78" y="46" width="144" height="34" rx="9" fill="${fold}"/>
  <rect x="78" y="70" width="144" height="10" fill="${shade(fold, -18)}"/>
  <!-- 袋身 -->
  <path d="M70 80 h160 v246 q0 26 -26 26 h-108 q-26 0 -26 -26 z" fill="url(#body)"/>
  <!-- 两侧压边 -->
  <rect x="70" y="80" width="9" height="252" fill="${edge}" opacity="0.55"/>
  <rect x="221" y="80" width="9" height="252" fill="${edge}" opacity="0.55"/>
  <!-- 底部封口 -->
  <rect x="70" y="330" width="160" height="9" fill="${edge}" opacity="0.6"/>
  <!-- 标签 -->
  <rect x="99" y="138" width="102" height="128" rx="6" fill="${labelColor}"/>
  <rect x="99" y="138" width="102" height="128" rx="6" fill="none" stroke="${shade(labelColor, -30)}" stroke-width="1.5"/>
  <circle cx="150" cy="158" r="7" fill="none" stroke="${labelTextColor}" stroke-width="1.6" opacity="0.7"/>
  <path d="M147 152 q6 6 0 12" fill="none" stroke="${labelTextColor}" stroke-width="1.4" opacity="0.7"/>
  ${labelLines}
  ${
    sub
      ? `<text x="150" y="256" text-anchor="middle" font-family="'Sounso Quality','Kaiti SC','STKaiti','KaiTi',cursive" font-size="11" letter-spacing="1.5" fill="${labelTextColor}" opacity="0.75">${escapeXml(sub)}</text>`
      : ''
  }
  <!-- 底部排气阀 -->
  <circle cx="150" cy="306" r="7" fill="${shade(color, -35)}"/>
  <circle cx="150" cy="306" r="3" fill="${shade(color, 30)}"/>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
