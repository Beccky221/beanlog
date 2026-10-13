import { createWorker, OEM, PSM } from 'tesseract.js'
import workerSource from 'tesseract.js/dist/worker.min.js?raw'
import coreSource from 'tesseract.js-core/tesseract-core-lstm.wasm.js?raw'
import ocrLicenses from '@/assets/ocr-licenses.txt?raw'
import { kvGet, kvSet } from '@/lib/idb'

import { extractIdentity } from '@/lib/coffeeIdentity'
export { extractIdentity } from '@/lib/coffeeIdentity'
export type { ExtractedIdentity } from '@/lib/coffeeIdentity'
import type { OcrLine } from '@/lib/coffeeIdentity'

const memory = new Map<string, Uint8Array>()

// v6.0.1 的对象语言参数在初始化阶段误读 data；只将初始化消息转为语言代码。
// 加载阶段仍保留模型二进制，确保缓存成功后无需网络请求。
const workerBridge = `
self.addEventListener('message', function(event) {
  var message = event.data;
  if (message && message.action === 'initialize' && Array.isArray(message.payload.langs)) {
    message.payload.langs = message.payload.langs.map(function(lang) {
      return typeof lang === 'string' ? lang : lang.code;
    });
  }
});
// 初始化失败或提前取消时，保证后台线程最终释放。
setTimeout(function() { self.close(); }, 150000);
`

async function readableImage(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1.5, 2200 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器无法处理这张照片，请换用 JPEG 或 PNG 图片。')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 用局部亮度补偿拍摄阴影；保留原图识别结果，增强结果仅作为补读。 */
function enhancePhoto(photo: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = photo.width
  canvas.height = photo.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return photo
  ctx.drawImage(photo, 0, 0)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { width, height } = canvas
  const gray = new Uint8Array(width * height)
  const horizontal = new Float32Array(gray.length)
  const radius = Math.max(12, Math.round(Math.min(width, height) / 24))
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.round(pixels.data[i * 4] * .299 + pixels.data[i * 4 + 1] * .587 + pixels.data[i * 4 + 2] * .114)
  }
  // 分两次滑动平均，避免为高分辨率照片分配大型积分图。
  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = 0; x <= Math.min(radius, width - 1); x++) sum += gray[y * width + x]
    for (let x = 0; x < width; x++) {
      horizontal[y * width + x] = sum / (Math.min(width - 1, x + radius) - Math.max(0, x - radius) + 1)
      if (x - radius >= 0) sum -= gray[y * width + x - radius]
      if (x + radius + 1 < width) sum += gray[y * width + x + radius + 1]
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = 0; y <= Math.min(radius, height - 1); y++) sum += horizontal[y * width + x]
    for (let y = 0; y < height; y++) {
      const i = y * width + x
      const mean = sum / (Math.min(height - 1, y + radius) - Math.max(0, y - radius) + 1)
      const value = Math.max(0, Math.min(255, (gray[i] * 235 / (mean + 15) - 170) * 1.25 + 170))
      pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = value
      if (y - radius >= 0) sum -= horizontal[(y - radius) * width + x]
      if (y + radius + 1 < height) sum += horizontal[(y + radius + 1) * width + x]
    }
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas
}

async function language(code: string, signal: AbortSignal, report: (text: string) => void) {
  signal.throwIfAborted()
  const key = `ocr.model.v1.${code}`
  const cached = memory.get(code) ?? await kvGet<Uint8Array>(key).catch(() => undefined)
  signal.throwIfAborted()
  if (cached?.byteLength) return { code, data: cached }
  report(`正在下载${code === 'chi_sim' ? '中文' : '英文'}识别包，首次准备可能需要一些时间…`)
  const response = await fetch(`https://cdn.jsdelivr.net/npm/@tesseract.js-data/${code}@1.0.0/4.0.0_best_int/${code}.traineddata.gz`, { signal }).catch((error: unknown) => {
    if (signal.aborted) throw error
    throw new Error('语言包暂时无法下载，请保持联网后重试；也可以先手动填写。')
  })
  if (!response.ok) throw new Error('识别包下载失败，请检查网络后重试。')
  const data = new Uint8Array(await response.arrayBuffer())
  signal.throwIfAborted()
  if (data.byteLength < 1000) throw new Error('识别包不完整，请联网重试。')
  memory.set(code, data)
  // 语言包独立于豆子记录，缓存失败也不影响本次识别和用户数据。
  await kvSet(key, data).catch(() => undefined)
  return { code, data }
}

/** 引擎与 worker 随 HTML 内嵌；只有首次获取语言包需要联网。图片不发送到任何服务。 */
export async function recognizeLocalPhoto(blob: Blob, report: (text: string) => void, signal: AbortSignal, enhance = false) {
  const photo = await readableImage(blob)
  signal.throwIfAborted()
  const langs = []
  for (const code of ['chi_sim', 'eng']) langs.push(await language(code, signal, report))
  signal.throwIfAborted()
  report('正在准备本机识别…')
  // 使用兼容不支持 SIMD 的设备的内嵌引擎，避免 file:// 的跨域 worker 限制。
  const workerUrl = URL.createObjectURL(new Blob([`/*${ocrLicenses.replaceAll('*/', '* /')}*/\n`, workerBridge, '\n', coreSource, '\n', workerSource], { type: 'text/javascript' }))
  let rejectEngine: (error: Error) => void = () => undefined
  const engineError = new Promise<never>((_, reject) => { rejectEngine = reject })
  const pending = createWorker(langs, OEM.LSTM_ONLY, {
    workerPath: workerUrl,
    workerBlobURL: false,
    cacheMethod: 'none',
    errorHandler: () => rejectEngine(new Error('本机识别引擎未能完成处理，请换一张清晰照片后重试。')),
    logger: (m) => {
      if (!signal.aborted && m.status === 'recognizing text') report(`正在读取包装文字 ${Math.round(m.progress * 100)}%`)
    },
  })
  let stop: (() => void) | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  const interrupted = new Promise<never>((_, reject) => {
    stop = () => reject(new DOMException('已取消识别', 'AbortError'))
    signal.addEventListener('abort', stop, { once: true })
    timeout = setTimeout(() => reject(new Error('识别用时较长，请裁剪到文字区域后重试。')), 120000)
    if (signal.aborted) stop()
  })
  try {
    const worker = await Promise.race([pending, interrupted, engineError])
    signal.throwIfAborted()
    await Promise.race([worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, user_defined_dpi: '300' }), interrupted, engineError])
    const { data } = await Promise.race([worker.recognize(photo, {}, { text: true, blocks: true }), interrupted, engineError])
    signal.throwIfAborted()
    let lines: OcrLine[] = (data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.map(line => ({
      text: line.text,
      confidence: line.confidence,
      x: line.bbox.x0 / photo.width,
      y: line.bbox.y0 / photo.height,
      height: (line.bbox.y1 - line.bbox.y0) / photo.height,
    }))))
    let text = data.text.trim()
    const initial = extractIdentity(text, lines)
    if (!initial.variety || !initial.flavor) {
      report('正在补读小字和品种信息…')
      // 不同字号在同一缩放比例下可能漏读，补一次较小比例，合并文字供候选匹配。
      const alternate = document.createElement('canvas')
      alternate.width = Math.max(1, Math.round(photo.width / 1.5))
      alternate.height = Math.max(1, Math.round(photo.height / 1.5))
      const ctx = alternate.getContext('2d')
      if (ctx) {
        ctx.drawImage(photo, 0, 0, alternate.width, alternate.height)
        const extra = await Promise.race([worker.recognize(alternate, {}, { text: true, blocks: true }), interrupted, engineError])
        signal.throwIfAborted()
        text += '\n' + extra.data.text.trim()
        lines = [...lines, ...(extra.data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.map(line => ({
          text: line.text, confidence: line.confidence,
          x: line.bbox.x0 / alternate.width, y: line.bbox.y0 / alternate.height,
          height: (line.bbox.y1 - line.bbox.y0) / alternate.height,
        }))))]
      }
    }
    if (enhance) {
      report('正在增强实拍照片并补读文字…')
      // 先让界面更新，也让用户可以在额外处理之前取消。
      await new Promise(resolve => setTimeout(resolve, 0))
      signal.throwIfAborted()
      const enhanced = enhancePhoto(photo)
      signal.throwIfAborted()
      const extra = await Promise.race([worker.recognize(enhanced, {}, { text: true, blocks: true }), interrupted, engineError])
      signal.throwIfAborted()
      text += '\n' + extra.data.text.trim()
      lines = [...lines, ...(extra.data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.map(line => ({
        text: line.text, confidence: line.confidence,
        x: line.bbox.x0 / enhanced.width, y: line.bbox.y0 / enhanced.height,
        height: (line.bbox.y1 - line.bbox.y0) / enhanced.height,
      }))))]
    }
    return { text, confidence: data.confidence, lines }
  } finally {
    if (timeout) clearTimeout(timeout)
    if (stop) signal.removeEventListener('abort', stop)
    void pending.then(async (worker) => { await worker.terminate() }).catch(() => undefined).finally(() => URL.revokeObjectURL(workerUrl))
  }
}

