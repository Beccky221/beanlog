import type { Bean } from '@/types/bean'
import { getPhoto } from '@/lib/idb'
import { blobToDataUrl } from '@/lib/image'
import { bagImage } from '@/lib/bagImage'
import { APP_BRAND_EN, placeholderBrand } from '@/lib/brand'
import { cssVar } from '@/lib/theme'

const BODY = `'Coffee Lab Libian','Coffee Lab Source Serif',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif`
const TITLE = `'Sounso Quality','YouSheBiaoTiHei','Smiley Sans',sans-serif`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** canvas 只认具体颜色值，主题变量要先读出来 */
function palette() {
  return {
    bg: cssVar('--c-poster-bg', '#EFF5EA'),
    frame: cssVar('--c-poster-frame', '#CBDFCE'),
    ink: cssVar('--c-ink', '#2C4537'),
    faint: cssVar('--c-ink-soft', '#6E8C7A'),
  }
}

/** 取一袋豆子画海报用的图：有真实照片就用照片，否则用占位豆袋 */
async function resolveBeanImage(bean: Bean): Promise<string> {
  if (bean.photoId) {
    try {
      const blob = await getPhoto(bean.photoId)
      if (blob) return await blobToDataUrl(blob)
    } catch {
      /* 照片读不到就退到占位图 */
    }
  }
  return bagImage({
    color: bean.placeholder?.color ?? '#8A4B2A',
    label: bean.placeholder?.label ?? (bean.name.slice(0, 4) || '咖啡豆'),
    sub: placeholderBrand(bean.placeholder?.sub),
  })
}

/**
 * 把长名字折成最多两行。
 * 优先在「-」「空格」这类自然断点处断开，否则取中间位置，
 * 这样「小芒果咖啡-哥伦比亚慧兰」不会出现一行 11 字、一行 1 字的情况。
 */
function wrapName(name: string, max = 11): string[] {
  if (name.length <= max) return [name]
  for (let i = max; i >= Math.ceil(max / 2); i--) {
    const ch = name[i - 1]
    if (ch === '-' || ch === ' ' || ch === '·') {
      const head = name.slice(0, i).trim()
      const tail = name.slice(i).trim()
      if (head && tail) return [head, tail]
    }
  }
  const mid = Math.ceil(name.length / 2)
  const head = name.slice(0, mid)
  const tail = name.slice(mid)
  if (tail.length <= max) return [head, tail]
  return [head, tail.slice(0, max - 1) + '…']
}

/** 把图片以 contain 方式画进指定区域 */
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.min(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/**
 * 渲染「我的咖啡收藏」豆袋墙海报，返回 PNG dataURL。
 * 预览与保存共用这一份渲染结果，保证所见即所得。
 */
export async function renderPoster(beans: Bean[]): Promise<string> {
  // 等字体准备好再绘制，确保保存的海报和界面使用同样的标题与正文字体。
  await Promise.all([
    document.fonts.load('400 22px "Coffee Lab Source Serif"', 'Coffee Lab 18 36 93'),
    document.fonts.load('400 22px "Coffee Lab Libian"', '咖啡豆子产区'),
    document.fonts.load('400 68px "YouSheBiaoTiHei"', '我的咖啡收藏'),
    document.fonts.load('400 22px "Sounso Quality"', 'COFFEE LAB'),
  ])
  const shown = beans.slice(0, 9)
  const cols = 3
  const rows = Math.max(1, Math.ceil(shown.length / cols))

  const W = 1080
  const margin = 72
  const headerH = 300
  const cellH = 358
  const footerH = 150
  const H = headerH + rows * cellH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const paletteColors = palette()

  // 纸面
  ctx.fillStyle = paletteColors.bg
  ctx.fillRect(0, 0, W, H)
  // 细腻边框
  ctx.strokeStyle = paletteColors.frame
  ctx.lineWidth = 2
  ctx.strokeRect(28, 28, W - 56, H - 56)

  const ink = paletteColors.ink
  const faint = paletteColors.faint

  // 顶部刊头
  ctx.fillStyle = faint
  ctx.font = `500 22px ${BODY}`
  ctx.textBaseline = 'alphabetic'
  const headerY = 96
  ctx.letterSpacing = '6px'
  ctx.fillText(`${APP_BRAND_EN} / COFFEE MEMORIES`, margin, headerY)
  const bagsText = `${String(shown.length).padStart(2, '0')} BAGS`
  ctx.letterSpacing = '4px'
  const bw = ctx.measureText(bagsText).width
  ctx.fillText(bagsText, W - margin - bw - 30, headerY)
  ctx.letterSpacing = '0px'

  // 大标题
  ctx.fillStyle = ink
  ctx.font = `400 68px ${TITLE}`
  ctx.fillText('我的咖啡收藏', margin, headerY + 96)

  ctx.fillStyle = faint
  ctx.font = `500 20px ${BODY}`
  ctx.letterSpacing = '5px'
  ctx.fillText('A LITTLE ARCHIVE OF GOOD COFFEE', margin, headerY + 146)
  ctx.letterSpacing = '0px'

  // 网格
  const gridW = W - margin * 2
  const cellW = gridW / cols
  const gridTop = headerH + 10

  for (let i = 0; i < shown.length; i++) {
    const bean = shown[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = margin + col * cellW
    const cy = gridTop + row * cellH

    // 豆袋照片（IndexedDB 里取，或退到占位豆袋图）
    try {
      const img = await loadImage(await resolveBeanImage(bean))
      drawContain(ctx, img, cx + 18, cy, cellW - 36, 210)
    } catch {
      /* 图片加载失败就留空 */
    }

    // 编号 + 名称（名字太长分两行，比截断成省略号好认）
    ctx.fillStyle = faint
    ctx.font = `400 20px ${BODY}`
    ctx.fillText(String(i + 1).padStart(2, '0'), cx + 18, cy + 252)

    ctx.fillStyle = ink
    ctx.font = `400 22px ${TITLE}`
    const nameLines = wrapName(bean.name)
    nameLines.forEach((line, li) => {
      ctx.fillText(line, cx + 18, cy + 284 + li * 28)
    })
  }

  // 底部落款
  const footY = H - 78
  ctx.fillStyle = faint
  ctx.font = `400 22px ${BODY}`
  ctx.fillText('留住风味，也留住生活。', margin, footY)

  ctx.letterSpacing = '5px'
  ctx.font = `500 20px ${BODY}`
  const brand = APP_BRAND_EN
  const brandW = ctx.measureText(brand).width
  ctx.fillText(brand, W - margin - brandW - 30, footY)
  ctx.letterSpacing = '0px'

  return canvas.toDataURL('image/png')
}

export interface BeanPosterOptions {
  includeRating: boolean
  includeNote: boolean
}

/** 按真实字宽排版，限制极长输入，避免手机生成过大的画布。 */
function posterLines(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const lines: string[] = []
  let line = ''
  for (const char of text.trim()) {
    if (char === '\n' || (line && ctx.measureText(line + char).width > width)) {
      lines.push(line)
      line = ''
      if (lines.length === maxLines) {
        let last = lines[maxLines - 1]
        while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1)
        lines[maxLines - 1] = last + '…'
        return lines
      }
      if (char === '\n') continue
    }
    line += char
  }
  if (line) lines.push(line)
  return lines
}

export async function renderBeanPoster(bean: Bean, options: BeanPosterOptions): Promise<string> {
  await Promise.all([
    document.fonts.load('400 34px "Coffee Lab Libian"', '咖啡产区风味札记'),
    document.fonts.load('400 34px "Coffee Lab Source Serif"', 'Coffee Lab'),
    document.fonts.load('400 64px "YouSheBiaoTiHei"', bean.name),
    document.fonts.load('400 34px "Sounso Quality"', bean.name + 'Coffee Lab'),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法生成图片')
  const colors = palette()
  const blocks: { lines: string[]; font: string; color: string; step: number; gap: number }[] = []
  const add = (text: string | undefined, size: number, title = false, gap = 22, max = 4) => {
    if (!text?.trim()) return
    const font = `400 ${size}px ${title ? TITLE : BODY}`
    ctx.font = font
    blocks.push({ lines: posterLines(ctx, text, 904, max), font, color: title ? colors.ink : colors.faint, step: size * 1.5, gap })
  }
  add(bean.name || '未命名豆袋', 62, true, 12, 3)
  add(bean.brand, 32, false, 40, 2)
  add([bean.origin?.trim(), bean.variety?.trim()].filter(Boolean).join(' · '), 32)
  add([bean.processingMethod?.trim(), bean.roastLevel].filter(Boolean).join(' · '), 32, false, 34)
  if (bean.flavor?.trim()) { add('黑咖风味', 28, false, 4); add(bean.flavor, 36, true, 28) }
  if (bean.milkFlavor?.trim()) { add('奶咖风味', 28, false, 4); add(bean.milkFlavor, 36, true, 28) }
  if (options.includeRating && bean.rating > 0) add(`我的评分  ${Math.min(5, bean.rating)} / 5`, 32, false, 24)
  if (options.includeNote && bean.note?.trim()) { add('我的札记', 28, false, 4); add(bean.note, 34, true, 28, 8) }
  const contentTop = 1160
  canvas.height = Math.ceil(contentTop + blocks.reduce((h, b) => h + b.lines.length * b.step + b.gap, 0) + 150)
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = colors.frame
  ctx.lineWidth = 2
  ctx.strokeRect(28, 28, 1024, canvas.height - 56)
  ctx.textBaseline = 'top'
  ctx.fillStyle = colors.ink
  ctx.font = `400 36px ${TITLE}`
  ctx.fillText(APP_BRAND_EN, 88, 83)
  ctx.font = `400 24px ${BODY}`
  ctx.fillStyle = colors.faint
  ctx.textAlign = 'right'
  ctx.fillText('一袋豆子的风味档案', 992, 91)
  ctx.textAlign = 'left'
  ctx.fillStyle = colors.frame
  ctx.fillRect(88, 176, 904, 904)
  const image = await loadImage(await resolveBeanImage(bean))
  drawContain(ctx, image, 108, 196, 864, 864)
  let y = contentTop
  for (const block of blocks) {
    ctx.font = block.font
    ctx.fillStyle = block.color
    for (const line of block.lines) { ctx.fillText(line, 88, y); y += block.step }
    y += block.gap
  }
  ctx.strokeStyle = colors.frame
  ctx.beginPath()
  ctx.moveTo(88, canvas.height - 132)
  ctx.lineTo(992, canvas.height - 132)
  ctx.stroke()
  ctx.fillStyle = colors.faint
  ctx.font = `400 25px ${BODY}`
  ctx.fillText('咖啡实验室 · 我的咖啡收藏与饮用档案', 88, canvas.height - 100)
  return canvas.toDataURL('image/png')
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
