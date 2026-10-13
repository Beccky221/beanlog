import type { CoffeePreferences, CoffeeProduct, RecommendationState, RoasterSuggestion } from '@/types/recommendation'

export const DEFAULT_PREFERENCES: CoffeePreferences = {
  origins: [], excludedOrigins: [], varieties: [], processes: [], roasts: [],
  drink: 'any', market: 'china', maxPrice100g: null,
}
const strings = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === 'string').map(s => s.trim().slice(0, 80)).filter(Boolean))].slice(0, 30) : []
const short = (v: unknown, max = 240) => typeof v === 'string' ? v.trim().slice(0, max) : ''
export const safeSourceUrl = (value: unknown): string => {
  try {
    const u = new URL(String(value))
    if (u.protocol !== 'https:' || u.username || u.password || /^(localhost|127\.|10\.|192\.168\.|\[)/.test(u.hostname)) return ''
    return u.href
  } catch { return '' }
}
export function normalizeProduct(value: unknown, source: 'catalog' | 'qwen' = 'qwen'): CoffeeProduct | null {
  const p = (value ?? {}) as Record<string, unknown>
  const url = safeSourceUrl(p.url), name = short(p.name, 120), roaster = short(p.roaster, 100)
  if (!url || !name || !roaster) return null
  return { id: short(p.id, 180) || url, name, roaster, url,
    origins: strings(p.origins), varieties: strings(p.varieties), processes: strings(p.processes),
    roast: short(p.roast, 40), flavors: strings(p.flavors),
    drink: p.drink === 'black' || p.drink === 'milk' ? p.drink : 'any',
    market: p.market === 'china' || p.market === 'overseas' ? p.market : 'unknown',
    price100gCny: typeof p.price100gCny === 'number' && Number.isFinite(p.price100gCny) && p.price100gCny > 0 ? p.price100gCny : null,
    priceNote: short(p.priceNote), evidence: short(p.evidence, 400), checkedAt: short(p.checkedAt, 40), source }
}
export function normalizeRoaster(value: unknown, source: 'catalog' | 'qwen' = 'qwen'): RoasterSuggestion | null {
  const p = (value ?? {}) as Record<string, unknown>, url = safeSourceUrl(p.url), name = short(p.name, 100)
  if (!url || !name) return null
  return { id: short(p.id, 180) || url, name, url, evidence: short(p.evidence, 400), checkedAt: short(p.checkedAt, 40), source }
}
export function normalizeRecommendationState(value: unknown): RecommendationState {
  const v = (value ?? {}) as Record<string, unknown>, p = (v.preferences ?? {}) as Record<string, unknown>
  return {
    preferences: { origins: strings(p.origins), excludedOrigins: strings(p.excludedOrigins), varieties: strings(p.varieties), processes: strings(p.processes), roasts: strings(p.roasts),
      drink: p.drink === 'black' || p.drink === 'milk' ? p.drink : 'any', market: p.market === 'any' ? 'any' : 'china',
      maxPrice100g: typeof p.maxPrice100g === 'number' && Number.isFinite(p.maxPrice100g) && p.maxPrice100g > 0 ? Math.min(10000, p.maxPrice100g) : null },
    products: Array.isArray(v.products) ? v.products.map(x => normalizeProduct(x)).filter((x): x is CoffeeProduct => !!x).slice(0, 300) : [],
    roasters: Array.isArray(v.roasters) ? v.roasters.map(x => normalizeRoaster(x)).filter((x): x is RoasterSuggestion => !!x).slice(0, 100) : [],
    favoriteIds: Array.isArray(v.favoriteIds) ? [...new Set(v.favoriteIds.filter((id): id is string => typeof id === 'string').map(id => id.slice(0, 180)))].slice(0, 300) : [], lastSearchAt: short(v.lastSearchAt, 40) || undefined, lastSearchPreferences: short(v.lastSearchPreferences, 4000) || undefined,
  }
}
const matches = (selected: string[], actual: string[]) => selected.filter(s => actual.some(a => a.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(a.toLowerCase())))
export function matchProduct(p: CoffeeProduct, prefs: CoffeePreferences) {
  if (matches(prefs.excludedOrigins, p.origins).length || (prefs.market === 'china' && p.market === 'overseas') ||
    (prefs.maxPrice100g !== null && p.price100gCny !== null && p.price100gCny > prefs.maxPrice100g)) return null
  const reasons: string[] = [], missing: string[] = []
  let score = 0, criteria = 0
  for (const [label, selected, actual, weight] of [
    ['产区', prefs.origins, p.origins, 4], ['豆种', prefs.varieties, p.varieties, 4],
    ['处理法', prefs.processes, p.processes, 2], ['烘焙度', prefs.roasts, p.roast ? [p.roast] : [], 2],
  ] as const) {
    if (!selected.length) continue
    criteria++
    const hit = label === '烘焙度' ? selected.filter(s => actual.includes(s)) : matches([...selected], [...actual])
    if (hit.length) { score += weight; reasons.push(`${label}：${hit.join('、')}`) }
    else missing.push(actual.length ? `${label}不匹配` : `${label}待确认`)
  }
  if (prefs.drink !== 'any') {
    criteria++
    if (p.drink === prefs.drink) { score += 1; reasons.push(prefs.drink === 'milk' ? '有奶咖适用信息' : '有黑咖适用信息') }
    else missing.push('饮用方式待确认')
  }
  if (prefs.excludedOrigins.length && !p.origins.length) missing.push('产区待确认')
  if (prefs.maxPrice100g !== null && p.price100gCny === null) missing.push('价格待确认')
  if (prefs.market === 'china' && p.market === 'unknown') missing.push('国内购买渠道待确认')
  return { product: p, score, reasons, missing, partial: criteria > 0 && missing.length > 0 }
}
