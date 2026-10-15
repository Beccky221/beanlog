import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, ExternalLink, Search, LockKeyhole, Sparkles } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { ROAST_LEVELS } from '@/types/bean'
import type { CoffeePreferences, CoffeeProduct, RecommendationState } from '@/types/recommendation'
import { matchProduct, normalizeProduct, normalizeRecommendationState, normalizeRoaster } from '@/lib/recommendations'
import { COFFEE_CATALOG, ROASTER_CATALOG } from '@/data/coffeeCatalog'
import type { RecommendationSession } from '@/lib/recommendationAccess'

const unique = (items: string[]) => [...new Set(items.map(s => s.trim()).filter(Boolean))]
const parts = (text?: string) => (text ?? '').split(/[、,，/;；\n]+/).map(s => s.trim()).filter(Boolean)
const dateText = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '日期待确认' : date.toLocaleDateString('zh-CN') }
const isTaobaoItem = (url: string) => {
  try { const u = new URL(url); return ['item.taobao.com', 'detail.tmall.com', 'detail.m.tmall.com'].includes(u.hostname) && !!u.searchParams.get('id') } catch { return false }
}
const inputClass = 'w-full rounded-xl bg-[var(--c-surface-soft)] px-3 py-2 outline-none text-[13px] text-[var(--c-ink)]'
function Choices({ title, options, selected, onChange }: { title: string; options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  const [custom, setCustom] = useState('')
  const add = () => { const next = unique([...selected, ...parts(custom)]).slice(0, 20); onChange(next); setCustom('') }
  return <fieldset className="mt-4"><legend className="text-[13px] text-[var(--c-ink-soft)]">{title}</legend>
    <div className="flex flex-wrap gap-2 py-3">{unique([...options, ...selected]).map(value => <button key={value} type="button" aria-pressed={selected.includes(value)} onClick={() => onChange(selected.includes(value) ? selected.filter(s => s !== value) : [...selected, value].slice(0, 20))}
      className={`rounded-full px-3 py-1.5 text-[12px] ${selected.includes(value) ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]' : 'bg-[var(--c-soft)] text-[var(--c-soft-ink)]'}`}>{value}</button>)}</div>
    <div className="flex gap-2"><input aria-label={`添加${title}`} value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="也可以自己填写，多项用逗号隔开" className={inputClass} /><button type="button" disabled={!custom.trim()} onClick={add} className="rounded-full px-3 text-[12px] shrink-0 text-[var(--c-accent)] disabled:opacity-40">添加</button></div>
  </fieldset>
}
export function CoffeeRecommendations({ beans, value, onChange, onBack, connection, onAccessExpired }: { beans: Bean[]; value?: RecommendationState; onChange: (state: RecommendationState) => void; onBack: () => void; connection: RecommendationSession; onAccessExpired: () => void }) {
  const state = useMemo(() => normalizeRecommendationState(value), [value]), prefs = state.preferences
  const [preferencesOpen, setPreferencesOpen] = useState(true)
  const [view, setView] = useState<'products' | 'roasters' | 'saved'>('products')
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [state.preferences, view, state.lastSearchAt])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const controller = useRef<AbortController | null>(null)
  const latest = useRef(state)
  useEffect(() => { latest.current = state }, [state])
  useEffect(() => () => controller.current?.abort(), [])
  const patchPrefs = (patch: Partial<CoffeePreferences>) => onChange({ ...state, preferences: { ...prefs, ...patch } })
  const allProducts = useMemo(() => [...new Map([...COFFEE_CATALOG, ...state.products].map(p => [p.url, p])).values()], [state.products])
  const ranked = allProducts.map(product => matchProduct(product, prefs)).filter((match): match is NonNullable<typeof match> => !!match).sort((a, b) => b.score - a.score)
  const withPreferences = prefs.origins.length + prefs.varieties.length + prefs.processes.length + prefs.roasts.length > 0 || prefs.drink !== 'any'
  const displayed = view === 'saved' ? allProducts.filter(p => state.favoriteIds.includes(p.id)).map(p => matchProduct(p, { ...prefs, excludedOrigins: [], market: 'any', maxPrice100g: null })!).filter(Boolean) : ranked.filter(m => !withPreferences || m.score > 0)
  const roasters = [...new Map([...ROASTER_CATALOG.filter(r => prefs.market === 'any' || r.id === 'peets-cn'), ...state.roasters].map(r => [r.url, r])).values()]
  const favorite = (product: CoffeeProduct) => onChange({ ...state, favoriteIds: state.favoriteIds.includes(product.id) ? state.favoriteIds.filter(id => id !== product.id) : [...state.favoriteIds, product.id] })
  const connect = async (search: boolean) => {
    setError(''); setMessage('')
    const base = connection.endpoint
    const token = connection.token
    controller.current?.abort()
    const task = new AbortController(); controller.current = task
    setBusy(true)
    const timeout = setTimeout(() => task.abort(), 75000)
    const snapshot = JSON.stringify(prefs)
    try {
      const response = await fetch(`${base}/api/${search ? 'recommend' : 'status'}`, { method: search ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(search ? { 'Content-Type': 'application/json' } : {}) }, body: search ? JSON.stringify({ preferences: prefs }) : undefined, signal: task.signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' })
      if (response.status === 401) { onAccessExpired(); return }
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '推荐服务没有完成请求。')
      if (search) {
        const products = (Array.isArray(result.products) ? result.products : []).map((p: unknown) => normalizeProduct(p)).filter((p: CoffeeProduct | null): p is CoffeeProduct => !!p)
        const freshRoasters = (Array.isArray(result.roasters) ? result.roasters : []).map((r: unknown) => normalizeRoaster(r)).filter((r: ReturnType<typeof normalizeRoaster>): r is NonNullable<typeof r> => !!r)
        const current = latest.current
        onChange({ ...current, products: [...new Map([...current.products, ...products].map(p => [p.url, p])).values()].slice(-300), roasters: [...new Map([...current.roasters, ...freshRoasters].map(r => [r.url, r])).values()].slice(-100), lastSearchAt: result.checkedAt || new Date().toISOString(), lastSearchPreferences: snapshot })
        setConfigured(true)
        setMessage(`${result.cached ? '使用近期相同偏好的搜索缓存。' : '搜索完成。'}新增或更新 ${products.length} 款豆子、${freshRoasters.length} 家烘焙商。${typeof result.warning === 'string' ? result.warning : ''}`)
      } else {
        setConfigured(!!result.configured)
        setMessage(result.configured ? `${result.provider === 'onebound' ? '万邦淘宝商品服务' : '千问'}已连接，今天还可搜索 ${result.remaining} 次。` : '推荐服务已连接，但尚未配置千问。开通百炼并填写后端密钥后再试。')
      }
    } catch (e) {
      setError(task.signal.aborted ? '请求已取消或超时，可以稍后重试。' : e instanceof TypeError ? '无法连接推荐服务。请确认服务已启动、地址正确；手机端需可访问的 HTTPS 地址。' : (e as Error).message)
    } finally { clearTimeout(timeout); setBusy(false) }
  }
  const useFavorites = () => {
    const liked = beans.filter(b => b.rating >= 4 || b.inRepurchase)
    if (!liked.length) { setMessage('先给喜欢的豆袋评4星以上，或加入“值得回购”。'); return }
    patchPrefs({ origins: unique(liked.flatMap(b => parts(b.origin))).slice(0, 20), varieties: unique(liked.flatMap(b => parts(b.variety))).slice(0, 20), processes: unique(liked.flatMap(b => parts(b.processingMethod))).slice(0, 20), roasts: unique(liked.map(b => b.roastLevel)) })
    setMessage('已从4星以上或值得回购的豆袋提取偏好，可继续调整。')
  }
  return <div className="min-h-full pb-12">
    <header className="sticky top-0 z-10 px-5 pt-5 pb-3 flex items-center justify-between bg-[var(--c-app)]/95 backdrop-blur">
      <button type="button" onClick={onBack} aria-label="返回我的" className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--c-ink)]"><ArrowLeft size={18} /></button>
      <h2 className="text-[17px] text-[var(--c-ink)]">找一袋喜欢的豆</h2>
      <button type="button" onClick={onAccessExpired} aria-label="更换邀请码" title="更换邀请码" className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--c-ink-soft)]"><LockKeyhole size={18} /></button>
    </header>
    <div className="px-5">
      <p className="mt-3 text-[12px] leading-relaxed text-[var(--c-ink-faint)]">把偏好告诉豆袋小记，从真实商品资料中寻找下一袋。价格和库存以店铺页面为准。</p>
      <section className="mt-4 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-4">
        <button type="button" onClick={() => setPreferencesOpen(open => !open)} aria-expanded={preferencesOpen} className="w-full flex justify-between text-[15px] text-[var(--c-ink)]"><span>我的咖啡偏好</span><span>{preferencesOpen ? '−' : '＋'}</span></button>
        {preferencesOpen && <>
          <button type="button" onClick={useFavorites} className="mt-3 rounded-full px-3 py-2 text-[12px] text-[var(--c-accent)]">从喜欢的豆袋提取偏好</button>
          <p className="mt-4 text-[12px] text-[var(--c-ink-soft)]">想找哪种豆？</p>
          <div className="flex flex-wrap gap-2 py-3">{([['any', '不限'], ['espresso', '意式'], ['filter', '手冲'], ['cold', '冷萃'], ['omni', '全能豆']] as const).map(([brew, label]) => <button key={brew} type="button" aria-pressed={prefs.brew === brew} onClick={() => patchPrefs({ brew })} className={`rounded-full px-3 py-2 text-[12px] ${prefs.brew === brew ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]' : 'text-[var(--c-ink-soft)]'}`}>{label}</button>)}</div>
          <Choices title="喜欢的产地／产区" options={['埃塞俄比亚', '哥伦比亚', '巴拿马', '肯尼亚', '巴西', '云南', ...beans.flatMap(b => parts(b.origin)).slice(0, 12)]} selected={prefs.origins} onChange={origins => patchPrefs({ origins })} />
          <Choices title="喜欢的豆种" options={['瑰夏', '波旁', '铁皮卡', '卡杜拉', '卡杜艾', '原生种', '74110', '74112']} selected={prefs.varieties} onChange={varieties => patchPrefs({ varieties })} />
          <Choices title="处理法" options={['水洗', '日晒', '蜜处理', '厌氧', '湿刨']} selected={prefs.processes} onChange={processes => patchPrefs({ processes })} />
          <Choices title="烘焙度" options={[...ROAST_LEVELS]} selected={prefs.roasts} onChange={roasts => patchPrefs({ roasts })} />
          <div className="mt-4 flex flex-wrap gap-2 py-2">{(['any', 'black', 'milk'] as const).map(drink => <button key={drink} type="button" aria-pressed={prefs.drink === drink} onClick={() => patchPrefs({ drink })} className={`rounded-full px-3 py-2 text-[12px] ${prefs.drink === drink ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]' : 'text-[var(--c-ink-soft)]'}`}>{drink === 'any' ? '黑咖奶咖都喝' : drink === 'black' ? '主要喝黑咖' : '主要喝奶咖'}</button>)}</div>
          <label className="mt-3 block text-[12px] text-[var(--c-ink-soft)]">预算上限（元／100g，可不填）<input type="number" min="1" max="10000" inputMode="decimal" value={prefs.maxPrice100g ?? ''} onChange={e => patchPrefs({ maxPrice100g: e.target.value ? Number(e.target.value) : null })} placeholder="如：50" className={`${inputClass} mt-2`} /></label>
          <label className="mt-4 flex justify-between items-center text-[12px] text-[var(--c-ink-soft)]">购买范围<select value={prefs.market} onChange={e => patchPrefs({ market: e.target.value as CoffeePreferences['market'] })} className="rounded-full px-3 py-2 bg-[var(--c-surface-soft)]"><option value="china">国内优先</option><option value="any">包含海外</option></select></label>
          <details className="mt-4 text-[12px] text-[var(--c-ink-faint)]"><summary>排除不喜欢的产区</summary><Choices title="不想推荐的产区" options={['埃塞俄比亚', '哥伦比亚', '巴西', '云南']} selected={prefs.excludedOrigins} onChange={excludedOrigins => patchPrefs({ excludedOrigins })} /></details>
          <p className="mt-3 text-[11px] text-[var(--c-ink-faint)]">偏好已自动保存。缺少价格或品种的信息会标注待确认。</p>
        </>}
      </section>
      <button type="button" disabled={busy} onClick={() => void connect(true)} className="mt-5 w-full flex items-center justify-center gap-2 rounded-full py-3 bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[14px] disabled:opacity-50"><Search size={17} />{busy ? '正在查找真实豆款…' : '找新豆'}</button>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--c-ink-faint)]">{configured === false ? '千问尚未开通，推荐库仍可查看。' : '联网搜索会发送所选偏好，不发送你的照片、札记或整个豆库。相同偏好近期结果会复用以减少费用。'}</p>
      {busy && <button type="button" onClick={() => controller.current?.abort()} className="mt-2 px-3 py-1.5 rounded-full text-[12px] text-[var(--c-ink-faint)]">取消搜索</button>}
      {error && <p role="alert" className="mt-3 text-[12px] text-[var(--c-danger)] leading-relaxed">{error}</p>}
      {message && <p role="status" className="mt-3 text-[12px] text-[var(--c-ink-soft)] leading-relaxed">{message}</p>}
      {state.lastSearchAt && <p className="mt-3 text-[11px] text-[var(--c-ink-faint)]">最近搜索：{dateText(state.lastSearchAt)}{state.lastSearchPreferences !== JSON.stringify(prefs) ? ' · 偏好已变化，库中保留了之前的候选' : ''}</p>}
      <div className="mt-5 flex gap-2 py-2">{(['products', 'roasters', 'saved'] as const).map(tab => <button key={tab} type="button" aria-pressed={view === tab} onClick={() => setView(tab)} className={`flex-1 py-2 rounded-full text-[13px] ${view === tab ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]' : 'text-[var(--c-ink-soft)]'}`}>{tab === 'products' ? '商品豆' : tab === 'roasters' ? '烘焙商' : '已收藏'}</button>)}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--c-ink-faint)]">推荐库起步收录 {COFFEE_CATALOG.length} 款海外官网参考豆款，国内资料等待联网补充。资料匹配不代表库存或擅长认证。</p>
      <div className="mt-3 space-y-4">
        {view === 'roasters' ? roasters.map(roaster => <article key={roaster.url} className="p-4 rounded-2xl bg-[var(--c-surface)] border border-[var(--c-line)]">
          <h3 className="text-[16px] text-[var(--c-ink)]">{roaster.name}</h3><p className="mt-2 text-[12px] leading-relaxed text-[var(--c-ink-soft)]">{roaster.evidence}</p><p className="mt-2 text-[11px] text-[var(--c-ink-faint)]">{roaster.source === 'qwen' ? '联网候选' : '官网资料入口'} · {dateText(roaster.checkedAt)}</p>
          <a href={roaster.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--c-accent)]">查看来源 <ExternalLink size={12} /></a>
        </article>) : displayed.slice(page * 10, (page + 1) * 10).map(({ product, reasons, missing, partial }) => <article key={product.url} className="p-4 rounded-2xl bg-[var(--c-surface)] border border-[var(--c-line)]">
          <div className="flex justify-between gap-3">{product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-16 h-20 shrink-0 rounded-xl object-contain" />}<div className="min-w-0 flex-1"><h3 className="text-[16px] text-[var(--c-ink)] line-clamp-2">{product.name}</h3><p className="mt-1 text-[12px] text-[var(--c-ink-faint)]">{product.roaster}</p></div><button type="button" onClick={() => favorite(product)} aria-label={state.favoriteIds.includes(product.id) ? '取消收藏豆款' : '收藏豆款'} aria-pressed={state.favoriteIds.includes(product.id)} className="self-start rounded-full p-2 text-[var(--c-accent)]"><Bookmark size={18} fill={state.favoriteIds.includes(product.id) ? 'currentColor' : 'none'} /></button></div>
          <p className="mt-3 text-[12px] text-[var(--c-ink-soft)]">{[product.origins.join('／'), product.processes.join('／'), product.roast].filter(Boolean).join(' · ') || '详细属性待确认'}</p>
          {product.flavors.length > 0 && <p className="mt-1 text-[12px] text-[var(--c-ink-faint)]">{product.flavors.slice(0, 3).join(' · ')}</p>}
          <p className="mt-3 text-[13px] text-[var(--c-ink)]">{product.price100gCny === null ? product.listingPriceCny ? `展示价 ¥${product.listingPriceCny.toFixed(2)} · 规格待确认` : '价格待确认' : `¥${product.price100gCny.toFixed(1)}／100g`}</p>
          <details className="mt-3 text-[11px] text-[var(--c-ink-faint)]"><summary className="cursor-pointer">匹配与来源详情{partial ? ' · 部分匹配' : ''}</summary>
            {product.varieties.length > 0 && <p className="mt-2">豆种：{product.varieties.join('、')}</p>}
            {reasons.length > 0 && <p className="mt-2">{reasons.join(' · ')}</p>}
            {missing.length > 0 && <p className="mt-2">{missing.join(' · ')}</p>}
            <p className="mt-2">{product.priceNote}</p><p className="mt-2 leading-relaxed">{product.evidence}</p>
          </details>
          <div className="mt-3 flex items-center justify-between gap-2"><span className="text-[10.5px] text-[var(--c-ink-faint)]">{product.source === 'onebound' ? '淘宝商品 · 万邦' : product.source === 'qwen' ? '联网候选' : '官网资料'} · {dateText(product.checkedAt)}</span><a href={product.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] text-[var(--c-accent)]">{isTaobaoItem(product.url) ? '直达商品' : '查看来源'} <ExternalLink size={12} /></a></div>
        </article>)}
        {view !== 'roasters' && displayed.length > 0 && <div className="flex items-center justify-between gap-3 py-3">
          <button type="button" disabled={page === 0} onClick={() => setPage(n => n - 1)} className="rounded-full px-4 py-2 text-[12px] text-[var(--c-accent)] disabled:opacity-30">上一页</button>
          <span className="text-[11px] text-[var(--c-ink-faint)]">第 {page + 1} / {Math.ceil(displayed.length / 10)} 页 · 每页10款</span>
          <button type="button" disabled={(page + 1) * 10 >= displayed.length} onClick={() => setPage(n => n + 1)} className="rounded-full px-4 py-2 text-[12px] text-[var(--c-accent)] disabled:opacity-30">下一页</button>
        </div>}
        {view !== 'roasters' && displayed.length === 0 && <div className="p-5 rounded-2xl border border-dashed border-[var(--c-line)] text-center">
          <Sparkles size={24} className="mx-auto text-[var(--c-ink-faint)]" /><p className="mt-3 text-[13px] text-[var(--c-ink-soft)]">{view === 'saved' ? '看到喜欢的豆款，可以点书签收藏。' : '推荐库暂时没有符合这些偏好的豆款。'}</p>
          {view !== 'saved' && <p className="mt-2 text-[12px] text-[var(--c-ink-faint)]">可以调整偏好，或开通千问后联网查找。</p>}
          {prefs.market === 'china' && view !== 'saved' && <button type="button" onClick={() => patchPrefs({ market: 'any' })} className="mt-3 rounded-full px-4 py-2 text-[12px] text-[var(--c-accent)]">看看海外参考豆款</button>}
        </div>}
      </div>
    </div>
  </div>
}
