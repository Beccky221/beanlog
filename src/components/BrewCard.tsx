import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { GrindEditor } from '@/components/GrindEditor'
import type { Grinder } from '@/types/grinder'
import { BREW_METHODS, type BrewRecipe } from '@/types/bean'

interface BrewCardProps {
  brews: BrewRecipe[] | undefined
  grinders: Grinder[]
  onChange: (brews: BrewRecipe[]) => void
}

function parseNum(v: string | undefined): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const newRecipeId = () => globalThis.crypto?.randomUUID?.() || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`

/** 各冲煮方式可保存多组独立方案；旧配方作为该方式的第一组。 */
export function BrewCard({ brews, grinders, onChange }: BrewCardProps) {
  const [methodId, setMethodId] = useState(BREW_METHODS[0].id)
  const method = BREW_METHODS.find((m) => m.id === methodId) ?? BREW_METHODS[0]
  const [selectedIds, setSelectedIds] = useState<Record<string, string>>({})
  const methodRecipes = (brews || []).filter(item => item.method === method.id)
  const recipe = methodRecipes.find(item => item.id === selectedIds[method.id]) || methodRecipes[0]
  const recipeIndex = recipe ? (brews || []).indexOf(recipe) : -1
  const recipeLabel = (item: BrewRecipe, index: number) => item.label?.trim() || `方案 ${index + 1}`

  const update = (patch: Partial<BrewRecipe>) => {
    const list = [...(brews || [])]
    const id = recipe?.id || newRecipeId()
    if (recipeIndex >= 0) list[recipeIndex] = { ...list[recipeIndex], ...patch, id }
    else list.push({ id, method: method.id, values: {}, ...patch })
    setSelectedIds(current => ({ ...current, [method.id]: id }))
    onChange(list)
  }
  const add = () => {
    const list = [...(brews || [])]
    if (!methodRecipes.length) list.push({ id: newRecipeId(), method: method.id, label: '方案 1', values: {} })
    const labels = new Set(methodRecipes.map(recipeLabel))
    if (!methodRecipes.length) labels.add('方案 1')
    let number = 1
    while (labels.has(`方案 ${number}`)) number++
    const id = newRecipeId()
    list.push({ id, method: method.id, label: `方案 ${number}`, values: {} })
    setSelectedIds(current => ({ ...current, [method.id]: id }))
    onChange(list)
  }
  const remove = () => {
    if (recipeIndex < 0 || !window.confirm('删除当前这组冲煮参数？')) return
    let list = (brews || []).filter((_, index) => index !== recipeIndex)
    // 保留一个空方案，避免旧版研磨字段再次迁入已删除的方案。
    if (!list.some(item => item.method === method.id)) list = [...list, { id: newRecipeId(), method: method.id, values: {}, grind: {} }]
    setSelectedIds(current => ({ ...current, [method.id]: list.find(item => item.method === method.id)!.id || '' }))
    onChange(list)
  }
  const setValue = (key: string, value: string) => update({ values: { ...(recipe?.values || {}), [key]: value } })

  // 粉水比 / 粉液比速览
  const dose = parseNum(recipe?.values.dose)
  const water = parseNum(recipe?.values.water ?? recipe?.values.yield)
  const ratio = dose && water ? `1 : ${Math.round((water / dose) * 10) / 10}` : null
  const ratioLabel = method.id === 'espresso' ? '粉液比' : '粉水比'

  return (
    <div className="bl-bean-brew-card bg-[var(--c-surface)] rounded-2xl px-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
      {/* 冲煮方式切换 */}
      <div className="flex gap-2 py-3.5 border-b border-[var(--c-soft)] overflow-x-auto">
        {BREW_METHODS.map((m) => {
          const filled = (brews || []).some(r => r.method === m.id && (Object.values(r.values).some(value => value.trim() !== '') || !!r.note?.trim() || !!r.grind?.grinderName || !!r.grind?.setting))
          const active = m.id === method.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethodId(m.id)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                active
                  ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]'
                  : 'bg-[var(--c-soft)] text-[var(--c-soft-ink)] active:bg-[var(--c-soft-hover)]'
              }`}
            >
              {m.name}
              {filled && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--c-tint)]' : 'bg-[var(--c-chip-ink)]'}`}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="py-3 border-b border-[var(--c-soft)]">
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">选择{method.name}参数方案</span>
            <select value={recipe?.id || ''} onChange={event => setSelectedIds(current => ({ ...current, [method.id]: event.target.value }))}
              className="w-full min-h-10 rounded-xl px-3 py-2 bg-[var(--c-surface-soft)] outline-none text-[13px] text-[var(--c-ink)]">
              {methodRecipes.length ? methodRecipes.map((item, index) => <option key={item.id || index} value={item.id}>{recipeLabel(item, index)}</option>) : <option value="">方案 1</option>}
            </select>
          </label>
          <button type="button" onClick={add} className="shrink-0 min-h-10 px-2 flex gap-1 items-center text-[12px] text-[var(--c-primary)]"><Plus size={14} />新增参数</button>
          {recipe && <button type="button" onClick={remove} aria-label="删除当前参数方案" className="shrink-0 w-10 h-10 flex items-center justify-center text-[var(--c-danger)]"><Trash2 size={15} /></button>}
        </div>
        <label className="mt-2 flex items-center gap-2 text-[12px] text-[var(--c-ink-faint)]">方案名称
          <input type="text" value={recipe?.label || ''} placeholder={recipe ? recipeLabel(recipe, methodRecipes.indexOf(recipe)) : '方案 1'} maxLength={60}
            onChange={event => update({ label: event.target.value })} className="min-w-0 flex-1 rounded-xl bg-[var(--c-surface-soft)] px-3 py-2 text-[13px] text-[var(--c-ink)] outline-none" />
        </label>
      </div>

      <GrindEditor value={recipe?.grind} grinders={grinders} onChange={grind => update({ grind })} />

      {/* 参数填写 */}
      <div className="py-3.5">
        <div className="grid grid-cols-2 gap-3">
          {method.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-[12px] text-[var(--c-ink-faint)]">
                {f.label}
                {f.unit ? ` (${f.unit})` : ''}
              </span>
              <input
                inputMode="decimal"
                value={recipe?.values[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => setValue(f.key, e.target.value)}
                className="mt-1 w-full bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)]"
              />
            </label>
          ))}
        </div>

        {ratio && (
          <p className="text-[12px] text-[var(--c-ink-soft)] mt-2.5 tabular-nums">
            {ratioLabel}约 <span className="font-semibold text-[var(--c-accent)]">{ratio}</span>
          </p>
        )}

        <input
          value={recipe?.note ?? ''}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="一句话备注，如：这个比例最平衡"
          className="mt-3 w-full bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)]"
        />


      </div>
    </div>
  )
}
