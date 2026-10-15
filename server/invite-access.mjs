import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const normalize = value => typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : ''
const equal = (a, b) => {
  const left = Buffer.from(a), right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** 邀请码只保存摘要；授权每次回到服务器检查有效期与撤销状态。 */
export function createInviteAccess() {
  const hashes = new Set((process.env.RECOMMEND_INVITE_HASHES || '').split(',').map(v => v.trim()).filter(v => /^[a-f0-9]{64}$/.test(v)))
  const secret = process.env.RECOMMEND_INVITE_SESSION_SECRET || ''
  const ready = hashes.size > 0 && secret.length >= 32
  const attempts = new Map()
  const sign = payload => createHmac('sha256', secret).update(`v1.${payload}`).digest('base64url')
  const seconds = 7 * 24 * 60 * 60
  return {
    verify(code, address) {
      if (!ready) return { status: 503, error: '邀请功能尚未在推荐服务中配置，请联系邀请人。' }
      const now = Date.now()
      for (const [ip, record] of attempts) if (record.until <= now) attempts.delete(ip)
      const record = attempts.get(address) || { count: 0, until: now + 10 * 60 * 1000 }
      if (record.count >= 10 || attempts.size >= 5000) return { status: 429, error: '尝试次数较多，请十分钟后再试。' }
      record.count++
      attempts.set(address, record)
      const normalized = normalize(code)
      const hash = createHash('sha256').update(normalized).digest('hex')
      if (typeof code !== 'string' || code.length > 128 || normalized.length < 16 || !/^[A-Z2-9]+$/.test(normalized) || ![...hashes].some(h => equal(h, hash))) {
        return { status: 401, error: '邀请码不正确或已停用，请向邀请人确认。' }
      }
      attempts.delete(address)
      const exp = Math.floor(now / 1000) + seconds
      const payload = Buffer.from(JSON.stringify({ invite: hash, exp, id: randomBytes(16).toString('hex') })).toString('base64url')
      return { status: 200, token: `v1.${payload}.${sign(payload)}`, expiresAt: new Date(exp * 1000).toISOString() }
    },
    authorize(header) {
      if (!ready || typeof header !== 'string' || header.length > 1024) return null
      const match = /^Bearer v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(header)
      if (!match || !equal(sign(match[1]), match[2])) return null
      try {
        const data = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
        const now = Math.floor(Date.now() / 1000)
        if (!hashes.has(data.invite) || !Number.isSafeInteger(data.exp) || data.exp <= now || data.exp > now + seconds) return null
        return { invite: data.invite, expiresAt: new Date(data.exp * 1000).toISOString() }
      } catch { return null }
    },
  }
}
