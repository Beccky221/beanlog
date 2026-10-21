import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, KeyRound, LockKeyhole } from 'lucide-react'
import { AnimatedTitle } from '@/components/AnimatedTitle'
import { INVITE_SESSION_EVENT, checkRecommendationSession, forgetRecommendationSession, readRecommendationEndpoint, readRecommendationSession, RecommendationAccessError, saveRecommendationSession, verifyRecommendationInvite, type RecommendationSession } from '@/lib/recommendationAccess'

export function RecommendationAccess({ onBack, children, inline = false }: { onBack?: () => void; inline?: boolean; children: (session: RecommendationSession, lock: () => void) => ReactNode }) {
  const [saved] = useState(readRecommendationSession)
  const [session, setSession] = useState<RecommendationSession | null>(null)
  const [endpoint, setEndpoint] = useState(() => saved?.endpoint || readRecommendationEndpoint())
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(!!saved)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!saved) return
    const task = new AbortController()
    controller.current = task
    void checkRecommendationSession(saved, task.signal).then(value => {
      if (!task.signal.aborted && readRecommendationSession()?.token === saved.token) { setSession(value); saveRecommendationSession(value) }
    }).catch(err => {
      if (task.signal.aborted) return
      if (err instanceof RecommendationAccessError && err.status === 401 && readRecommendationSession()?.token === saved.token) forgetRecommendationSession()
      setError(err instanceof Error ? err.message : '验证未完成，请重试。')
    }).finally(() => { if (!task.signal.aborted) setBusy(false) })
    return () => task.abort()
  }, [saved])
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    const sync = () => { setSession(readRecommendationSession()); setCode(''); setError('') }
    window.addEventListener(INVITE_SESSION_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(INVITE_SESSION_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => { forgetRecommendationSession(); setSession(null); setCode(''); setError('授权已到期，请重新输入邀请码。') }, Math.max(0, Date.parse(session.expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [session])
  const lock = () => { controller.current?.abort(); forgetRecommendationSession(); setSession(null); setCode(''); setError(''); setBusy(false) }
  const unlock = async () => {
    if (busy) return
    if (!code.trim()) { setError('请输入邀请人给你的邀请码。'); return }
    controller.current?.abort()
    const task = new AbortController()
    controller.current = task
    setBusy(true); setError('')
    try {
      const value = await verifyRecommendationInvite(endpoint, code, task.signal)
      if (task.signal.aborted) return
      saveRecommendationSession(value)
      setCode(''); setSession(value)
    } catch (err) { if (!task.signal.aborted) setError(err instanceof Error ? err.message : '邀请验证未完成，请重试。') }
    finally { if (!task.signal.aborted) setBusy(false) }
  }
  if (session) return children(session, lock)
  return <div className={inline ? 'mt-3' : 'min-h-full pb-12'}>
    {!inline && <header className="sticky top-0 z-10 px-5 pt-5 pb-3 flex items-center gap-3 bg-[var(--c-app)]/95 backdrop-blur">
      <button type="button" onClick={onBack} aria-label="返回首页" className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--c-ink)]"><ArrowLeft size={18} /></button>
      <h2 className="text-[17px] text-[var(--c-ink)]" aria-label="风味捕手"><AnimatedTitle text="风味捕手" /></h2>
    </header>}
    <div className={inline ? '' : 'px-6 pt-8'}>
      <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-6">
        <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--c-soft)] text-[var(--c-accent)]"><LockKeyhole size={23} /></span>
        <h3 className="bl-display-title mt-5 text-[22px] text-[var(--c-ink)]">邀请开启咖啡探索</h3>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--c-ink-faint)]">输入邀请码，即可同时开启千问识图和风味捕手。</p>
        <form className="mt-5" onSubmit={event => { event.preventDefault(); void unlock() }}>
          <label className="block text-[12px] text-[var(--c-ink-soft)]">邀请码
            <input value={code} onChange={event => setCode(event.target.value)} disabled={busy} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} maxLength={128} placeholder="请输入邀请码" className="mt-2 w-full rounded-xl bg-[var(--c-surface-soft)] px-3 py-3 outline-none text-[15px] tracking-[.08em] text-[var(--c-ink)]" />
          </label>
          <button type="submit" disabled={busy || !code.trim()} className="mt-4 w-full rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] py-3 flex items-center justify-center gap-2 text-[14px] disabled:opacity-50"><KeyRound size={16} />{busy ? '正在验证邀请…' : '验证并开启'}</button>
        </form>
        {busy && !code && <p role="status" className="mt-3 text-[12px] text-[var(--c-ink-faint)]">正在检查这台设备的邀请授权…</p>}
        {error && <p role="alert" className="mt-3 text-[12px] leading-relaxed text-[var(--c-danger)]">{error}</p>}
        <p className="mt-4 text-[11px] leading-relaxed text-[var(--c-ink-faint)]">一次验证，两项功能通用。本设备记住授权7天，到期后重新验证；邀请码与授权不随豆库备份导出。</p>
      </div>
      <details className="mt-5 text-[12px] text-[var(--c-ink-faint)]" open={!endpoint}>
        <summary className="cursor-pointer py-2">连接设置</summary>
        <label className="block mt-2">推荐服务地址<input type="url" value={endpoint} onChange={event => { setEndpoint(event.target.value); setError('') }} disabled={busy} autoCapitalize="none" spellCheck={false} placeholder="https://邀请人提供的推荐服务地址" className="mt-2 w-full rounded-xl bg-[var(--c-surface)] border border-[var(--c-line)] px-3 py-3 outline-none text-[12px]" /></label>
        <p className="mt-2 leading-relaxed text-[11px]">此地址用于统一邀请码验证和找豆服务。识图地址单独配置，两项功能共用邀请授权。</p>
      </details>
    </div>
  </div>
}
