import type { Bean, RoastLevel } from '@/types/bean'

/** 产品参考值，非统一行业标准；中间烘焙度按相邻范围插值。 */
export const REST_GUIDE: Record<RoastLevel, { min: number; max: number; days: number }> = {
  浅烘: { min: 10, max: 21, days: 14 },
  中浅烘: { min: 7, max: 14, days: 10 },
  中烘: { min: 5, max: 10, days: 7 },
  中深烘: { min: 3, max: 7, days: 5 },
  深烘: { min: 2, max: 5, days: 3 },
}
const DAY = 86400000
export function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function calendarDay(value: string | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const time = Date.parse(value + 'T00:00:00Z')
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null
}
export function validRoastDate(value: unknown): string | undefined {
  return typeof value === 'string' && calendarDay(value) !== null ? value : undefined
}
export function validRestDays(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 90 ? value : undefined
}
export function restInfo(bean: Pick<Bean, 'roastDate' | 'restDays' | 'roastLevel'>, today = localToday()) {
  const roasted = calendarDay(bean.roastDate)
  const now = calendarDay(today)
  if (roasted === null || now === null || roasted > now) return null
  const days = validRestDays(bean.restDays) ?? (REST_GUIDE[bean.roastLevel] || REST_GUIDE.中烘).days
  const ready = roasted + days * DAY
  return { days, readyDate: new Date(ready).toISOString().slice(0, 10), elapsed: Math.round((now - roasted) / DAY), remaining: Math.max(0, Math.round((ready - now) / DAY)) }
}
