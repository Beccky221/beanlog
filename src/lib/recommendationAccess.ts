export interface RecommendationSession { endpoint: string; token: string; expiresAt: string }
const SESSION_KEY = 'beanlog.recommend.invite.session'
const ENDPOINT_KEY = 'beanlog.recommend.endpoint'
const DEFAULT_ENDPOINT = 'https://beanlogecommend-lkwzlzbeca.cn-beijing.fcapp.run'

export class RecommendationAccessError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export function recommendationServiceUrl(value: string) {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new Error('请先在连接设置中填写邀请人提供的推荐服务地址。') }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.username || url.password || url.search || url.hash || url.pathname.replace(/\/+$/, '') || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) throw new Error('请填写推荐服务的 HTTPS 根地址；本机使用可填写 http://127.0.0.1:8787。')
  if (url.hostname === 'beanlog-vision-kfzdniddch.cn-beijing.fcapp.run') throw new Error('这是图片识别服务，请填写邀请人提供的推荐服务地址。')
  return url.origin
}

export function readRecommendationEndpoint() {
  try { return localStorage.getItem(ENDPOINT_KEY) || DEFAULT_ENDPOINT } catch { return DEFAULT_ENDPOINT }
}
export function readRecommendationSession(): RecommendationSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (!value || typeof value.token !== 'string' || !value.token.startsWith('v1.') || value.token.length > 1024 || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()) return null
    return { endpoint: recommendationServiceUrl(value.endpoint), token: value.token, expiresAt: value.expiresAt }
  } catch { return null }
}
export function forgetRecommendationSession() { try { localStorage.removeItem(SESSION_KEY) } catch { /* 当前页面仍会退出授权 */ } }
export function saveRecommendationSession(session: RecommendationSession) {
  try { localStorage.setItem(ENDPOINT_KEY, session.endpoint); localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* 浏览器禁用存储时，只在当前页面使用 */ }
}

async function request(endpoint: string, path: string, signal: AbortSignal, token?: string, code?: string) {
  const timeout = new AbortController()
  const combined = new AbortController()
  const abort = () => combined.abort()
  const timer = window.setTimeout(() => timeout.abort(), 15000)
  signal.addEventListener('abort', abort, { once: true })
  timeout.signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) combined.abort()
  try {
    const response = await fetch(endpoint + path, { method: code !== undefined ? 'POST' : 'GET',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(code !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(code !== undefined ? { body: JSON.stringify({ code }) } : {}), signal: combined.signal,
      credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' })
    let data
    try { data = await response.json() } catch { throw new Error('该地址没有返回推荐服务信息，请确认服务地址。') }
    if (path === '/api/invite/verify' && data.schema !== 'beanlog.recommend.invite') throw new Error('推荐服务尚未更新邀请码功能，请联系邀请人更新服务。')
    if (!response.ok) throw new RecommendationAccessError(typeof data.error === 'string' ? data.error.slice(0, 300) : '邀请码验证未完成，请重试。', response.status)
    return data
  } catch (error) {
    if (signal.aborted) throw error
    if (timeout.signal.aborted) throw new Error('验证连接超时，请稍后重试。')
    if (error instanceof TypeError) throw new Error('无法连接推荐服务，请检查网络和邀请人提供的服务地址。手机端需可访问的 HTTPS 地址。')
    throw error
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
    timeout.signal.removeEventListener('abort', abort)
  }
}

export async function verifyRecommendationInvite(endpoint: string, code: string, signal: AbortSignal): Promise<RecommendationSession> {
  const base = recommendationServiceUrl(endpoint)
  const result = await request(base, '/api/invite/verify', signal, undefined, code.trim())
  if (typeof result.token !== 'string' || !result.token.startsWith('v1.') || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) throw new Error('邀请验证结果不完整，请联系邀请人。')
  return { endpoint: base, token: result.token, expiresAt: result.expiresAt }
}
export async function checkRecommendationSession(session: RecommendationSession, signal: AbortSignal): Promise<RecommendationSession> {
  const result = await request(session.endpoint, '/api/access', signal, session.token)
  if (result.authorized !== true || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) throw new Error('邀请授权未生效，请重新输入邀请码。')
  return { ...session, expiresAt: result.expiresAt }
}
