import { Minus, Plus } from 'lucide-react'
import type { GrindSettings } from '@/types/bean'
import type { Grinder } from '@/types/grinder'

export function GrindEditor({ value, grinders, onChange }: { value?: GrindSettings; grinders: Grinder[]; onChange: (value: GrindSettings) => void }) {
  const grinder = grinders.find(item => item.id === value?.grinderId)
  const missing = !grinder && !!value?.grinderName
  const setting = Number(value?.setting)
  const current = grinder ? Math.max(grinder.min, Math.min(grinder.max, Number.isFinite(setting) && value?.setting?.trim() ? setting : grinder.min)) : 0
  const changeSetting = (number: number) => {
    if (!grinder) return
    const stepped = grinder.min + Math.round((number - grinder.min) / grinder.step) * grinder.step
    onChange({ grinderId: grinder.id, grinderName: grinder.name, unit: grinder.unit, setting: String(Math.round(Math.min(grinder.max, Math.max(grinder.min, stepped)) * 100) / 100) })
  }
  return <section className="py-3.5 border-b border-[var(--c-soft)]" aria-label="当前冲煮方式的研磨参数">
    <p className="text-[12px] text-[var(--c-ink-faint)]">研磨参数</p>
    <label className="block mt-3 text-[13px] text-[var(--c-ink)]">磨豆器
      <select value={grinder?.id || (missing ? '__missing__' : '')} onChange={event => {
        if (!event.target.value) { onChange({}); return }
        const selected = grinders.find(item => item.id === event.target.value)
        if (selected) onChange({ grinderId: selected.id, grinderName: selected.name, unit: selected.unit, setting: String(selected.min) })
      }} className="block mt-2 w-full min-h-11 rounded-xl px-3 py-2 bg-[var(--c-surface-soft)] text-[14px] outline-none">
        <option value="">不记录</option>
        {grinders.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        {missing && <option value="__missing__">{value?.grinderName}（已删除）</option>}
      </select>
    </label>
    {grinder && <>
      <div className="mt-4 flex items-center justify-between text-[13px] text-[var(--c-ink)]"><span>研磨刻度</span><span className="text-[var(--c-accent)]">{value?.setting?.trim() || '未填写'} {grinder.unit}</span></div>
      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={() => changeSetting(current - grinder.step)} aria-label="研磨刻度减少一档" className="w-9 h-9 shrink-0 rounded-full bg-[var(--c-soft)] flex items-center justify-center text-[var(--c-primary)]"><Minus size={15} /></button>
        <input type="range" min={grinder.min} max={grinder.max} step={grinder.step} value={current} onChange={event => changeSetting(Number(event.target.value))} aria-label="当前方式的研磨刻度" className="flex-1 min-w-0 accent-[var(--c-primary)]" />
        <button type="button" onClick={() => changeSetting(current + grinder.step)} aria-label="研磨刻度增加一档" className="w-9 h-9 shrink-0 rounded-full bg-[var(--c-soft)] flex items-center justify-center text-[var(--c-primary)]"><Plus size={15} /></button>
      </div>
      <div className="mt-1 px-12 flex justify-between text-[11px] text-[var(--c-ink-faint)]"><span>{grinder.min}</span><span>{grinder.max} {grinder.unit}</span></div>
    </>}
    {missing && <p className="mt-3 text-[12px] text-[var(--c-ink-soft)]">原研磨刻度：{value?.setting || '未填写'} {value?.unit || ''}。可重新选择磨豆器。</p>}
    {!grinders.length && <p className="mt-3 text-[12px] text-[var(--c-ink-faint)]">可在“我的 → 磨豆器管理”添加磨豆器。</p>}
  </section>
}
