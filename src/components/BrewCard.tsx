import { useState } from 'react'
import { BREW_METHODS, type BrewRecipe } from '@/types/bean'

interface BrewCardProps {
  brews: BrewRecipe[] | undefined
  onChange: (brews: BrewRecipe[]) => void
}

function parseNum(v: string | undefined): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 冲煮记录卡片：顶部切换冲煮方式，下方记录该方式「最好喝的一份参数」 */
export function BrewCard({ brews, onChange }: BrewCardProps) {
  const [methodId, setMethodId] = useState(BREW_METHODS[0].id)
  const method = BREW_METHODS.find((m) => m.id === methodId) ?? BREW_METHODS[0]
  const recipe = brews?.find((b) => b.method === method.id)

  const update = (patch: Partial<BrewRecipe>) => {
    const list = brews ? [...brews] : []
    const idx = list.findIndex((b) => b.method === method.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...patch }
    else list.push({ method: method.id, values: {}, ...patch })
    onChange(list)
  }

  const setValue = (key: string, v: string) =>
    update({ values: { ...(recipe?.values ?? {}), [key]: v } })

  const hasContent =
    !!recipe &&
    (Object.values(recipe.values).some((v) => v.trim() !== '') || !!recipe.note?.trim())

  // 粉水比 / 粉液比速览
  const dose = parseNum(recipe?.values.dose)
  const water = parseNum(recipe?.values.water ?? recipe?.values.yield)
  const ratio = dose && water ? `1 : ${Math.round((water / dose) * 10) / 10}` : null
  const ratioLabel = method.id === 'espresso' ? '粉液比' : '粉水比'

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl px-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
      {/* 冲煮方式切换 */}
      <div className="flex gap-2 py-3.5 border-b border-[var(--c-soft)] overflow-x-auto">
        {BREW_METHODS.map((m) => {
          const r = brews?.find((b) => b.method === m.id)
          const filled = !!r && Object.values(r.values).some((v) => v.trim() !== '')
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

        {!hasContent && (
          <p className="text-[12px] text-[var(--c-ink-ghost)] mt-2.5">
            把{method.name}冲得最好喝的那次参数记在这里，下次照着冲。
          </p>
        )}
      </div>
    </div>
  )
}
