import type { BrewAnalysis, BrewObservation, BrewOptimization } from '@/types/brewOptimization'
import { getVisionConfig, visionUrl } from '@/lib/cloudVision'
import { readRecommendationSession, forgetRecommendationSession } from '@/lib/recommendationAccess'
import { readableImage } from '@/lib/ocrImage'
export const BREW_FIELDS = [
  ['dose', '粉量 (g)'], ['yield', '饮品重量 (g)'], ['time', '屏幕时间 (秒)'], ['temp', '水温 (°C)'],
  ['flow', '瞬时流量 (g/s)'], ['pressure', '压力 (bar)'], ['water', '注水量 (g)'], ['hours', '冷藏时长 (小时)'],
] as const
const text = (v: unknown, max = 1600) => typeof v === 'string' ? v.trim().slice(0, max) : ''
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' ? v as Record<string, unknown> : {}
const strings = (v: unknown) => Array.isArray(v) ? v.slice(0, 10).map(x => text(x, 600)).filter(Boolean) : []
export function cleanObservation(value: unknown): BrewObservation {
  const v = object(value)
  return { fields: Object.fromEntries(BREW_FIELDS.map(([key]) => [key, text(object(v.fields)[key], 30)])), curveType: text(v.curveType, 40), curveSummary: text(v.curveSummary), timingBasis: text(v.timingBasis, 40) || 'unknown', warnings: strings(v.warnings), evidence: Array.isArray(v.evidence) ? v.evidence.slice(0, 12).map(x => { const row = object(x); return { field: text(row.field, 30), text: text(row.text, 400), confidence: text(row.confidence, 20) } }) : [] }
}
export function cleanAnalysis(value: unknown): BrewAnalysis {
  const v = object(value)
  return { summary: text(v.summary, 900), findings: Array.isArray(v.findings) ? v.findings.slice(0, 4).map(x => { const r = object(x); return { observation: text(r.observation, 600), hypothesis: text(r.hypothesis, 600), possibleTaste: text(r.possibleTaste, 600), confidence: text(r.confidence, 20) } }) : [], adjustments: Array.isArray(v.adjustments) ? v.adjustments.slice(0, 3).map(x => { const r = object(x); return { change: text(r.change, 600), reason: text(r.reason, 600), check: text(r.check, 600) } }) : [], limitations: strings(v.limitations), questions: strings(v.questions) }
}
export function normalizeBrewOptimization(value: unknown): BrewOptimization | undefined {
  const v = object(value)
  if (!v.observation) return undefined
  return { observation: cleanObservation(v.observation), analysis: v.analysis ? cleanAnalysis(v.analysis) : undefined, feeling: text(v.feeling, 600), method: text(v.method, 40), updatedAt: text(v.updatedAt, 60) }
}
export async function brewRequest(path: string, payload: unknown, signal: AbortSignal) {
  const session = readRecommendationSession()
  if (!session) throw new Error('请先验证邀请码。')
  try {
    const response = await fetch(visionUrl(getVisionConfig().url) + path, { method: payload ? 'POST' : 'GET', headers: { Authorization: `Bearer ${session.token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}), credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal })
    const data = await response.json()
    if (response.status === 401) forgetRecommendationSession()
    if (response.status === 404) throw new Error('识图后台尚未升级“冲煮曲线优化”，请上传新版 vision 部署包。')
    if (!response.ok) throw new Error(text(data.error, 300) || '服务暂时不可用，请稍后重试。')
    return data
  } catch (cause) {
    if (signal.aborted) throw new Error('已停止等待；已发送的模型请求可能仍计费。')
    if (cause instanceof TypeError) throw new Error('无法连接识图服务，请检查网络和服务地址。')
    throw cause
  }
}
export async function recognizeBrew(photo: Blob, method: string, signal: AbortSignal) {
  const health = await brewRequest('/health', null, signal)
  if (!health.capabilities?.includes('brew-curve-v1')) throw new Error('识图后台尚未升级，请上传新版 vision 部署包。')
  const canvas = await readableImage(photo)
  if (signal.aborted) throw new Error('已取消。')
  const image = canvas.toDataURL('image/jpeg', .92)
  if (image.length > 8 * 1024 * 1024) throw new Error('图片过大，请裁掉无关区域后再试。')
  const data = await brewRequest('/brew/recognize', { image, method }, signal)
  if (data.schema !== 'beanlog.brew.v1') throw new Error('识别结果不完整。')
  return cleanObservation(data)
}
