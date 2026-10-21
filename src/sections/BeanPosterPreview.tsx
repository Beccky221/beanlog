import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Share2, RefreshCw } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { downloadDataUrl, renderBeanPoster } from '@/lib/poster'

export function BeanPosterPreview({ bean, onBack }: { bean: Bean; onBack: () => void }) {
  const [includeRating, setIncludeRating] = useState(true)
  const [includeNote, setIncludeNote] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ url: string; file: File; key: string } | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sharing, setSharing] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const safeName = Array.from(bean.name || '咖啡豆', char => char.charCodeAt(0) < 32 ? '-' : char).join('').replace(/[<>:"/\\|?*]/g, '-').slice(0, 70)
  const filename = `${safeName}-咖啡海报.png`
  const key = `${includeRating}-${includeNote}-${attempt}`
  const poster = result?.key === key ? result : null

  useEffect(() => { closeButton.current?.focus() }, [])
  useEffect(() => {
    let active = true
    renderBeanPoster(bean, { includeRating, includeNote }).then(async url => {
      // 提前准备文件，点击分享时直接调用系统菜单，保留浏览器的用户手势授权。
      const encoded = atob(url.slice(url.indexOf(',') + 1))
      const bytes = Uint8Array.from(encoded, char => char.charCodeAt(0))
      const file = new File([bytes], filename, { type: 'image/png' })
      if (active) setResult({ url, file, key })
    }).catch(() => {
      if (active) setError('海报生成失败，请重试。')
    })
    return () => { active = false }
  }, [bean, includeRating, includeNote, attempt, filename, key])

  const resetFeedback = () => { setError(''); setMessage('') }
  const save = () => {
    if (!poster) return
    downloadDataUrl(poster.url, filename)
    setMessage('已发起图片下载；手机上也可以长按海报保存。')
  }
  const share = async () => {
    if (!poster || sharing) return
    if (!navigator.canShare?.({ files: [poster.file] })) {
      setMessage('当前浏览器不支持直接分享，请保存图片后发送。')
      return
    }
    setSharing(true)
    try {
      await navigator.share({ files: [poster.file], title: bean.name })
      setMessage('已打开系统分享。')
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === 'AbortError')) setMessage('暂时无法调用分享，请保存图片后发送。')
    } finally { setSharing(false) }
  }

  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bean-poster-title"
      className="absolute inset-0 z-30 bg-[var(--c-app)] overflow-y-auto page-enter-right"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onBack() }
        if (event.key === 'Tab') {
          const buttons = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
          if (!buttons?.length) return
          const first = buttons[0], last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
      }}>
      <header className="sticky top-0 z-10 bg-[var(--c-app)] px-5 py-4 flex items-center justify-between border-b border-[var(--c-border)]">
        <button ref={closeButton} type="button" onClick={onBack} className="flex items-center gap-1 min-h-10 text-[13px] text-[var(--c-primary)]"><ArrowLeft size={17} />返回豆库</button>
        <h1 id="bean-poster-title" className="text-[18px] text-[var(--c-ink)]">分享海报</h1>
      </header>
      <div className="px-5 pt-5 pb-[calc(2rem+var(--safe-b))]">
        <div className="flex gap-5 text-[13px] text-[var(--c-ink-soft)] mb-4 flex-wrap">
          {bean.rating > 0 && <label className="flex items-center gap-2 min-h-10"><input type="checkbox" checked={includeRating} onChange={event => { resetFeedback(); setIncludeRating(event.target.checked) }} />附上评分</label>}
          {bean.note?.trim() && <label className="flex items-center gap-2 min-h-10"><input type="checkbox" checked={includeNote} onChange={event => { resetFeedback(); setIncludeNote(event.target.checked) }} />附上札记</label>}
        </div>
        {poster ? <img src={poster.url} alt={`${bean.name}的分享海报预览`} className="w-full rounded-xl shadow-lg" /> : (
          <div className="min-h-80 rounded-xl bg-[var(--c-surface)] flex flex-col items-center justify-center gap-4 text-[var(--c-ink-soft)]" role="status">
            <p>{error || '正在制作这袋豆子的海报…'}</p>
            {error && <button type="button" onClick={() => { resetFeedback(); setAttempt(value => value + 1) }} className="flex items-center gap-2 min-h-11"><RefreshCw size={16} />重新生成</button>}
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button type="button" disabled={!poster || sharing} onClick={save} className="flex-1 min-h-12 rounded-full bg-[var(--c-surface)] border border-[var(--c-border)] text-[var(--c-primary)] flex items-center justify-center gap-2 disabled:opacity-40"><Download size={17} />保存图片</button>
          <button type="button" disabled={!poster || sharing} onClick={share} className="flex-1 min-h-12 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] flex items-center justify-center gap-2 disabled:opacity-40"><Share2 size={17} />{sharing ? '正在分享…' : '分享'}</button>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-[var(--c-ink-faint)]" role="status" aria-live="polite">{message || '可长按海报保存图片，再分享到微信或朋友圈。'}</p>
      </div>
    </div>
  )
}
