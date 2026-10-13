import type { ExtractedIdentity } from '@/lib/coffeeIdentity'
import { ROAST_LEVELS, type RoastLevel } from '@/types/bean'
import { readableImage, type ImageCrop } from '@/lib/ocrImage'

export type VisionIdentity = ExtractedIdentity & { name: string }
export type VisionMode = 'cloud' | 'local'
const URL_KEY = 'beanlog.vision.url'
const TOKEN_KEY = 'beanlog.vision.token'
const MODE_KEY = 'beanlog.vision.mode'
const DEFAULT_VISION_URL = 'https://beanlog-vision-kfzdniddch.cn-beijing.fcapp.run'
export const getVisionMode = (): VisionMode => localStorage.getItem(MODE_KEY) === 'local' ? 'local' : 'cloud'
export const setVisionMode = (mode: VisionMode) => localStorage.setItem(MODE_KEY, mode)
export const getVisionConfig = () => ({ url: localStorage.getItem(URL_KEY) || DEFAULT_VISION_URL, token: sessionStorage.getItem(TOKEN_KEY) || '' })

export function visionUrl(value: string) {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new Error('请填写部署后获得的 HTTPS 函数地址。') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/+$/, '') !== '') throw new Error('请填写函数的 HTTPS 根地址，不要带路径或参数。')
  if (url.hostname.endsWith('.aliyuncs.com')) throw new Error('这里要填函数计算的地址（通常以 fcapp.run 结尾），不是千问 Base URL。')
  return url.origin
}

export function saveVisionConfig(url: string, token: string) {
  const normalized = visionUrl(url)
  if (token.trim().length < 16 || /[\s\u0080-\uffff]/.test(token.trim())) throw new Error('服务口令至少16位，请使用英文字母、数字或符号。')
  if (token.trim().startsWith('sk-')) throw new Error('这里填写自设的服务口令，千问 API Key 只填在阿里云后端。')
  localStorage.setItem(URL_KEY, normalized)
  sessionStorage.setItem(TOKEN_KEY, token.trim())
  setVisionMode('cloud')
}

export function clearVisionConfig() {
  localStorage.removeItem(URL_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

async function request(path: string, signal: AbortSignal, image?: string) {
  const config = getVisionConfig()
  if (!config.url || !config.token) throw new Error('请先在“我的 → 千问识图设置”填写服务地址和口令。重新打开 APP 后需再填口令。')
  try {
    const response = await fetch(visionUrl(config.url) + path, { method: image ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${config.token}`, ...(image ? { 'Content-Type': 'application/json' } : {}) },
      ...(image ? { body: JSON.stringify({ image }) } : {}), signal,
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error' })
    let data
    try { data = await response.json() } catch { throw new Error('识图服务没有返回 JSON，请检查函数地址和部署入口。') }
    if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `识图服务暂时不可用（${response.status}）。`)
    return data
  } catch (error) {
    if (signal.aborted) throw error
    if (error instanceof TypeError) throw new Error('无法连接识图服务，请检查网络、函数地址和后端允许来源配置。')
    throw error
  }
}

export async function checkVisionConfig() {
  const data = await request('/health', AbortSignal.timeout(15000))
  if (data.service !== 'beanlog-vision' || !data.configured) throw new Error('该地址不是已配置的豆袋识图服务。')
  return String(data.model || '千问视觉')
}

export async function recognizeCloudPhoto(photo: Blob, report: (text: string) => void, signal: AbortSignal, crop?: ImageCrop): Promise<{ fields: VisionIdentity; warnings: string[]; text: string }> {
  if (!getVisionConfig().url || !getVisionConfig().token) throw new Error('请先在“我的 → 千问识图设置”配置服务地址和口令。')
  if (photo.size > 30 * 1024 * 1024) throw new Error('原图超过30MB，请先裁剪或缩小图片。')
  report('正在整理识别图片…')
  const canvas = await readableImage(photo, crop ? { ...crop, vertical: false } : undefined)
  if (signal.aborted) throw new DOMException('已取消', 'AbortError')
  let encoded = canvas.toDataURL('image/jpeg', .92)
  if (encoded.length > 8 * 1024 * 1024) encoded = canvas.toDataURL('image/jpeg', .8)
  if (encoded.length > 8 * 1024 * 1024) throw new Error('识别图片仍然过大，请框选标签区域后重试。')
  report('正在发送到千问，识别豆袋信息…')
  const timer = new AbortController()
  const timeout = window.setTimeout(() => timer.abort(), 70000)
  const combined = new AbortController()
  const abort = () => combined.abort()
  signal.addEventListener('abort', abort, { once: true })
  timer.signal.addEventListener('abort', abort, { once: true })
  try {
    const result = await request('/recognize', combined.signal, encoded)
    if (!result.fields || typeof result.fields !== 'object') throw new Error('识图服务未返回豆袋信息。')
    const clean = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 300) : ''
    const fields: VisionIdentity = { name: clean(result.fields.name), brand: clean(result.fields.brand), variety: clean(result.fields.variety),
      processingMethod: clean(result.fields.processingMethod), origin: clean(result.fields.origin), flavor: clean(result.fields.flavor), milkFlavor: clean(result.fields.milkFlavor),
      roastLevel: ROAST_LEVELS.includes(result.fields.roastLevel) ? result.fields.roastLevel as RoastLevel : '' }
    const warnings = Array.isArray(result.warnings) ? result.warnings.slice(0, 8).map(clean).filter(Boolean) : []
    if (!Object.values(fields).some(Boolean)) warnings.push('未读到明确的豆袋字段，请换一张清晰图片或手动填写。')
    return { fields, warnings, text: typeof result.transcription === 'string' ? result.transcription.slice(0, 1500) : '' }
  } catch (error) {
    if (timer.signal.aborted && !signal.aborted) throw new Error('等待识图结果超时，此次请求可能已计费，请稍后再操作。')
    throw error
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
    timer.signal.removeEventListener('abort', abort)
  }
}
