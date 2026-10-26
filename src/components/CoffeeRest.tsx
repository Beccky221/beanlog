import { useEffect, useState } from 'react'
import type { Bean } from '@/types/bean'
import { localToday, REST_GUIDE, restInfo } from '@/lib/coffeeRest'

export function CoffeeRest({ bean, onChange }: { bean: Bean; onChange: (patch: Partial<Bean>) => void }) {
  const [today, setToday] = useState(localToday)
  useEffect(() => {
    const refresh = () => setToday(localToday())
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const guide = REST_GUIDE[bean.roastLevel] || REST_GUIDE.中烘
  const info = restInfo(bean, today)
  return <section className="py-4 border-t border-[var(--c-soft)]" aria-label="养豆计划">
    <label className="block text-[13px] text-[var(--c-ink)]">烘焙日期（生产日期）
      <input type="date" value={bean.roastDate ?? ''} max={today} onChange={event => onChange({ roastDate: event.target.value || undefined })}
        className="block mt-2 w-full min-w-0 min-h-11 rounded-xl px-3 py-2 bg-[var(--c-surface-soft)] text-[14px] outline-none" />
    </label>
    <div className="mt-4 flex items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-[13px] text-[var(--c-ink)]">养豆天数
        <input type="number" min={0} max={90} step={1} value={bean.restDays ?? ''} placeholder={String(guide.days)} aria-label="自定养豆天数"
          onChange={event => {
            const value = event.target.value
            if (!value) onChange({ restDays: undefined })
            else if (Number.isInteger(Number(value))) onChange({ restDays: Math.max(0, Math.min(90, Number(value))) })
          }} className="w-20 min-h-10 rounded-xl px-3 py-2 bg-[var(--c-surface-soft)] outline-none text-[14px] text-center" />天
      </label>
      {bean.restDays !== undefined && <button type="button" onClick={() => onChange({ restDays: undefined })} className="text-[12px] text-[var(--c-primary)] min-h-10">恢复建议</button>}
    </div>
    <p className="mt-2 text-[12px] text-[var(--c-ink-faint)]">{bean.roastLevel}参考 {guide.min}–{guide.max} 天，{bean.restDays === undefined ? `当前按建议 ${guide.days} 天计算` : `当前自定 ${bean.restDays} 天`}。</p>
    <div className="mt-3 rounded-xl bg-[var(--c-soft)] p-3 text-[var(--c-ink)]" role="status" aria-live="polite">
      {info ? <><p className="text-[13px]">预计可开始喝：{info.readyDate.replaceAll('-', '/')}</p><p className="mt-1 text-[12px] text-[var(--c-ink-soft)]">{info.remaining ? `已养 ${info.elapsed} 天，再等约 ${info.remaining} 天` : '已到建议开喝日期，可以试喝调整'}</p></> : <p className="text-[12px]">{bean.roastDate ? '请填写有效且不晚于今天的烘焙日期。' : '填写烘焙日期后，计算预计开喝日期。'}</p>}
    </div>
    <p className="mt-2 text-[11px] leading-relaxed text-[var(--c-ink-faint)]">养豆从烘焙当天起算，与开袋日期不同。以上为常温密封存放的参考，浅烘、意式可能需更久；优先参考烘焙商建议和实际试喝。</p>
    <details className="mt-2 text-[11px] text-[var(--c-ink-faint)]"><summary className="cursor-pointer py-1">建议依据</summary><p className="leading-relaxed">综合烘焙商公开建议整理为可调整的起始值，不代表统一标准。中浅烘、中深烘为相邻范围的折中。</p><div className="flex flex-wrap gap-3 mt-2"><a href="https://www.roastingwarehouse.com.au/blogs/news/how-long-do-coffee-beans-stay-fresh" target="_blank" rel="noopener noreferrer" className="underline">Roasting Warehouse</a><a href="https://www.ublend.com.au/post/the-myth-of-freshness-why-coffee-needs-to-rest-before-it-s-at-its-best" target="_blank" rel="noopener noreferrer" className="underline">Ublend</a><a href="https://us.lacabra.com/pages/resting-coffee" target="_blank" rel="noopener noreferrer" className="underline">La Cabra</a></div></details>
  </section>
}
