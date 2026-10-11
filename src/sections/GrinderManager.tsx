import { useState } from 'react'
import { ChevronDown, Disc3, Plus, Trash2 } from 'lucide-react'
import type { Grinder } from '@/types/grinder'
import { newGrinder } from '@/lib/grinder'

interface GrinderManagerProps {
  grinders: Grinder[]
  onAdd: (g: Grinder) => void
  onUpdate: (id: string, patch: Partial<Grinder>) => void
  onRemove: (id: string) => void
}

interface FormState {
  name: string
  min: string
  max: string
  step: string
  unit: string
  note: string
}

function toForm(g: Grinder): FormState {
  return {
    name: g.name,
    min: String(g.min),
    max: String(g.max),
    step: String(g.step),
    unit: g.unit,
    note: g.note ?? '',
  }
}

function validate(f: FormState): string | null {
  if (!f.name.trim()) return '给磨豆器起个名字吧'
  const min = Number(f.min)
  const max = Number(f.max)
  const step = Number(f.step)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '刻度范围要填数字'
  if (min >= max) return '最大刻度要大于最小刻度'
  if (!Number.isFinite(step) || step <= 0) return '步进要是大于 0 的数字'
  if (step > max - min) return '步进不能超过刻度范围'
  if (!f.unit.trim()) return '填一下刻度单位，如「格」'
  return null
}

function GrinderForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState
  submitLabel: string
  onSubmit: (f: FormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const field =
    'w-full bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)]'
  const label = 'text-[12px] text-[var(--c-ink-faint)]'

  return (
    <div className="mt-2 space-y-2.5 bg-[var(--c-surface-soft)] rounded-xl p-3">
      <label className="block">
        <span className={label}>名称</span>
        <input
          className={`${field} mt-1`}
          placeholder="如：泰摩栗子电动磨豆器"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className={label}>最小刻度</span>
          <input
            className={`${field} mt-1`}
            type="number"
            value={form.min}
            onChange={(e) => set('min', e.target.value)}
          />
        </label>
        <label className="block">
          <span className={label}>最大刻度</span>
          <input
            className={`${field} mt-1`}
            type="number"
            value={form.max}
            onChange={(e) => set('max', e.target.value)}
          />
        </label>
        <label className="block">
          <span className={label}>步进</span>
          <input
            className={`${field} mt-1`}
            type="number"
            step="any"
            value={form.step}
            onChange={(e) => set('step', e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={label}>刻度单位</span>
          <input
            className={`${field} mt-1`}
            placeholder="格 / 档 / 圈"
            value={form.unit}
            onChange={(e) => set('unit', e.target.value)}
          />
        </label>
        <label className="block">
          <span className={label}>备注（可选）</span>
          <input
            className={`${field} mt-1`}
            placeholder="如：意式 8-12"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </label>
      </div>
      {error && <p className="text-[12px] text-[var(--c-danger)]">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            const err = validate(form)
            if (err) return setError(err)
            onSubmit(form)
          }}
          className="flex-1 h-9 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[13px] font-medium active:scale-[0.97] transition-transform"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-full bg-white border border-[var(--c-soft-hover)] text-[var(--c-soft-ink)] text-[13px] active:scale-[0.97] transition-transform"
        >
          取消
        </button>
      </div>
    </div>
  )
}

export function GrinderManager({ grinders, onAdd, onUpdate, onRemove }: GrinderManagerProps) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="px-6 mt-4">
      <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">磨豆器管理</p>
      <div className="bg-[var(--c-surface)] rounded-2xl px-4 py-1 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
        {grinders.map((g) => {
          const editing = editingId === g.id
          return (
            <div key={g.id} className="border-b border-[var(--c-soft)] last:border-b-0 py-3">
              <button
                type="button"
                onClick={() => setEditingId(editing ? null : g.id)}
                className="w-full flex items-center gap-2.5 text-left"
              >
                <Disc3 size={17} className="text-[var(--c-ink-faint)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] text-[var(--c-ink)] truncate">{g.name}</p>
                  <p className="text-[12px] text-[var(--c-ink-ghost)] mt-0.5">
                    刻度 {g.min}–{g.max} {g.unit} · 步进 {g.step}
                    {g.note ? ` · ${g.note}` : ''}
                  </p>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-[var(--c-ink-ghost)] shrink-0 transition-transform ${editing ? 'rotate-180' : ''}`}
                />
              </button>
              {editing && (
                <>
                  <GrinderForm
                    initial={toForm(g)}
                    submitLabel="保存修改"
                    onSubmit={(f) => {
                      onUpdate(g.id, {
                        name: f.name.trim(),
                        min: Number(f.min),
                        max: Number(f.max),
                        step: Number(f.step),
                        unit: f.unit.trim(),
                        note: f.note.trim() || undefined,
                      })
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `删除「${g.name}」？豆子上已记录的研磨信息会保留文字，但不再关联这台磨豆器。`
                        )
                      ) {
                        onRemove(g.id)
                        setEditingId(null)
                      }
                    }}
                    className="mt-2 flex items-center gap-1 text-[12.5px] text-[var(--c-danger)] active:opacity-70"
                  >
                    <Trash2 size={13} /> 删除这台磨豆器
                  </button>
                </>
              )}
            </div>
          )
        })}

        {grinders.length === 0 && !adding && (
          <p className="py-4 text-[13px] text-[var(--c-ink-ghost)]">还没有磨豆器，先添加一台吧。</p>
        )}

        {adding ? (
          <div className="py-3">
            <GrinderForm
              initial={toForm(newGrinder())}
              submitLabel="添加磨豆器"
              onSubmit={(f) => {
                const g = newGrinder()
                onAdd({
                  ...g,
                  name: f.name.trim(),
                  min: Number(f.min),
                  max: Number(f.max),
                  step: Number(f.step),
                  unit: f.unit.trim(),
                  note: f.note.trim() || undefined,
                })
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 py-3.5 text-[var(--c-accent)] text-[14px] font-medium active:opacity-70"
          >
            <Plus size={16} /> 添加磨豆器
          </button>
        )}
      </div>
    </div>
  )
}
