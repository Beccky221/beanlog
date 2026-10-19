import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Coffee, ImagePlus, MapPin, PenLine, Plus, Trash2, X } from 'lucide-react'
import { BREW_METHODS, type Bean, type DailyRecord } from '@/types/bean'
import { BeanThumb } from '@/components/BeanThumb'
import { processPhotoFile } from '@/lib/image'
import { usePhotoUrls } from '@/lib/usePhoto'
import { nearbyCafes, type NearbyCafe } from '@/lib/nearbyCafes'

interface DailyRecordsProps {
  beans: Bean[]
  onOpenBean: (id: string) => void
  records: DailyRecord[] | undefined
  onChange: (records: DailyRecord[]) => void
  onSavePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  onDropPhotos: (ids: (string | undefined)[]) => void
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const MAX_PHOTOS = 12

function fmt(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fmtCn(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)} 月 ${Number(d)} 日`
}

function newId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyRecord(date: string): DailyRecord {
  // 默认选中第一种冲煮方式，与编辑器里默认高亮的 pill 保持一致
  return { id: newId(), date, photoIds: [], source: 'home', method: BREW_METHODS[0].id, values: {} }
}

function hasContent(r: DailyRecord): boolean {
  return (
    r.photoIds.length > 0 ||
    !!r.beanId ||
    r.source === 'outside' ||
    Object.values(r.values).some((v) => (v ?? '').trim() !== '') ||
    (r.note ?? '').trim() !== ''
  )
}

/** 每日记录：月历 + 选中日期的记录列表 + 页中页编辑器（一天可记多条） */
export function DailyRecords({
  beans,
  onOpenBean,
  records,
  onChange,
  onSavePhoto,
  onDropPhotos,
}: DailyRecordsProps) {
  const list = useMemo(() => records ?? [], [records])
  const today = fmt(new Date())

  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(today)
  const [editing, setEditing] = useState<string | null>(null)

  const dayRecords = (date: string) => list.filter((r) => r.date === date)
  const datesWithRecords = useMemo(() => new Set(list.map((r) => r.date)), [list])

  // ---- 日历格子 ----
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7 // 周一开头
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(fmt(new Date(year, month, d)))

  const shiftMonth = (delta: number) => setCursor(new Date(year, month + delta, 1))

  const selRecords = dayRecords(selected)

  /** 用编辑器交回的一组模块整体替换这一天的记录 */
  const saveDay = (date: string, entries: DailyRecord[]) => {
    const next = list.filter((r) => r.date !== date).concat(entries)
    next.sort((a, b) => (a.date < b.date ? 1 : -1))
    onChange(next)
  }

  const removeOne = (rec: DailyRecord) => {
    onDropPhotos(rec.photoIds)
    onChange(list.filter((r) => r.id !== rec.id))
  }

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl px-4 py-3.5 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="上个月"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--c-soft-ink)] active:bg-[var(--c-soft)]"
        >
          <ChevronLeft size={17} />
        </button>
        <p className="text-[14px] font-semibold text-[var(--c-ink)]">
          {year} 年 {month + 1} 月
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="下个月"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--c-soft-ink)] active:bg-[var(--c-soft)]"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 mt-1">
        {WEEKDAYS.map((w) => (
          <p key={w} className="text-center text-[11px] text-[var(--c-ink-ghost)] py-1">
            {w}
          </p>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />
          const day = Number(date.split('-')[2])
          const hasRecord = datesWithRecords.has(date)
          const isToday = date === today
          const isSelected = date === selected
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              className="flex flex-col items-center py-1"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition-colors ${
                  isSelected
                    ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)] font-semibold'
                    : isToday
                      ? 'ring-1 ring-[var(--c-chip-ink)] text-[var(--c-ink)] font-semibold'
                      : 'text-[var(--c-ink)] active:bg-[var(--c-soft)]'
                }`}
              >
                {day}
              </span>
              <span
                className={`w-1 h-1 rounded-full mt-0.5 ${
                  hasRecord ? (isSelected ? 'bg-[var(--c-primary)]' : 'bg-[var(--c-chip-ink)]') : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* 记录今天 */}
      <button
        type="button"
        onClick={() => {
          setSelected(today)
          setEditing(today)
        }}
        className="mt-2.5 w-full h-10 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[13.5px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
      >
        <PenLine size={14} /> {datesWithRecords.has(today) ? '补充今天的记录' : '记录今天'}
      </button>

      {/* 选中日期的记录列表 */}
      {selected !== today && (
        <p className="mt-3.5 text-[12px] text-[var(--c-ink-faint)]">{fmtCn(selected)}</p>
      )}
      {selRecords.length > 0 ? (
        <div className="mt-2 space-y-2">
          {selRecords.map((rec, idx) => (
            <div key={rec.id} className="rounded-xl bg-[var(--c-surface-soft)] p-3">
              {selRecords.length > 1 && (
                <p className="text-[11px] text-[var(--c-ink-ghost)] mb-1.5">第 {idx + 1} 条</p>
              )}
              {rec.photoIds.length > 0 && (
                <RecordPhotos photoIds={rec.photoIds} label={fmtCn(selected)} />
              )}
              <RecordParams record={rec} beans={beans} onOpenBean={onOpenBean} />
              <div className="flex gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => setEditing(selected)}
                  className="px-3 py-1.5 rounded-full bg-white text-[12.5px] text-[var(--c-soft-ink)] active:scale-95 transition-transform"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`删除 ${fmtCn(selected)} 的这条记录吗？`)) removeOne(rec)
                  }}
                  className="px-3 py-1.5 rounded-full bg-white text-[12.5px] text-[var(--c-danger)] active:scale-95 transition-transform"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        selected !== today && (
          <div className="mt-2 rounded-xl bg-[var(--c-surface-soft)] px-3 py-3.5 flex items-center justify-between">
            <p className="text-[12.5px] text-[var(--c-ink-ghost)]">这一天还没有记录</p>
            <button
              type="button"
              onClick={() => setEditing(selected)}
              className="px-3 py-1.5 rounded-full bg-white text-[12.5px] text-[var(--c-soft-ink)] active:scale-95 transition-transform"
            >
              补记
            </button>
          </div>
        )
      )}

      {/* 页中页编辑器 */}
      {editing && (
        <DayEditor
          beans={beans}
          onOpenBean={onOpenBean}
          date={editing}
          initial={dayRecords(editing)}
          onSavePhoto={onSavePhoto}
          onDropPhotos={onDropPhotos}
          onClose={() => setEditing(null)}
          onSave={(entries) => {
            saveDay(editing, entries)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/** 记录里的冲煮参数摘要行 */
function RecordParams({ record, beans, onOpenBean }: { record: DailyRecord; beans: Bean[]; onOpenBean: (id: string) => void }) {
  const bean = beans.find(item => item.id === record.beanId)
  const method = record.source === 'outside' ? undefined : BREW_METHODS.find((m) => m.id === record.method)
  const parts = method
    ? method.fields
        .map((f) => {
          const v = record.values[f.key]?.trim()
          return v ? `${f.label} ${v}${f.unit ?? ''}` : null
        })
        .filter(Boolean)
    : []
  const note = record.note?.trim()
  return (
    <div className="mt-2">
      <p className="text-[12.5px] text-[var(--c-ink-soft)]">{record.source === 'outside' ? '外面喝' : '自己做'}</p>
      {record.source !== 'outside' && (bean || record.beanName) && (
        bean ? <button type="button" onClick={() => onOpenBean(bean.id)} aria-label={`查看${bean.name}的豆袋详情`} className="mt-1.5 flex items-center gap-1.5 text-left text-[13px] text-[var(--c-accent)]">
          <Coffee size={14} className="shrink-0" aria-hidden /><span>{bean.name}</span><ChevronRight size={14} className="shrink-0" aria-hidden />
        </button> : <p className="mt-1 text-[12px] text-[var(--c-ink-faint)]">{record.beanName} · 已从豆库删除</p>
      )}
      {record.source === 'outside' && (record.locationName?.trim() || record.location) && <p className="mt-1 text-[12px] text-[var(--c-ink-faint)] flex items-start gap-1">
        <MapPin size={13} className="shrink-0 mt-0.5" />
        {record.locationName?.trim() || (record.location && `${record.location.latitude.toFixed(5)}, ${record.location.longitude.toFixed(5)}`)}
      </p>}
      {(method || parts.length > 0) && (
        <p className="text-[12.5px] text-[var(--c-ink-soft)] leading-relaxed">
          {method ? `${method.name} · ` : ''}
          {parts.length > 0 ? parts.join(' · ') : '参数未填写'}
        </p>
      )}
      {note && <p className="text-[12.5px] text-[var(--c-ink)] mt-1 leading-relaxed">{note}</p>}
    </div>
  )
}

/** 选中日期下，一条记录里已保存的照片 */
function RecordPhotos({ photoIds, label }: { photoIds: string[]; label: string }) {
  const urls = usePhotoUrls(photoIds)
  return (
    <div className="flex gap-2 overflow-x-auto">
      {photoIds.map((id, i) =>
        urls[i] ? (
          <img
            key={id}
            src={urls[i]}
            alt={`${label}的照片 ${i + 1}`}
            className="w-16 h-16 rounded-lg object-cover shrink-0"
            draggable={false}
          />
        ) : (
          <div key={id} className="w-16 h-16 rounded-lg bg-[var(--c-surface)] shrink-0" />
        ),
      )}
    </div>
  )
}

interface DayEditorProps {
  beans: Bean[]
  onOpenBean: (id: string) => void
  date: string
  initial: DailyRecord[]
  onClose: () => void
  onSave: (entries: DailyRecord[]) => void
  onSavePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  onDropPhotos: (ids: (string | undefined)[]) => void
}

/** 某一天的页中页编辑器：一个模块 = 照片 + 冲煮参数，可再加多个模块 */
function DayEditor({ beans, onOpenBean, date, initial, onClose, onSave, onSavePhoto, onDropPhotos }: DayEditorProps) {
  const [entries, setEntries] = useState<DailyRecord[]>(() =>
    initial.length > 0
      ? initial.map((r) => ({ ...r, photoIds: [...r.photoIds], values: { ...r.values } }))
      : [emptyRecord(date)],
  )
  /** 打开编辑器时的照片快照，用来判断退出时哪些新照片没被采用 */
  const originalPhotos = useRef<Set<string>>(
    new Set(initial.flatMap((r) => r.photoIds ?? [])),
  )

  const patchEntry = (id: string, patch: Partial<DailyRecord>) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const removeEntry = (id: string) =>
    setEntries((es) => {
      if (es.length <= 1) return [emptyRecord(date)]
      return es.filter((e) => e.id !== id)
    })

  /** 退出/保存时，回收这次新增但最终没留下的照片 */
  const pruneTempPhotos = (kept: DailyRecord[]) => {
    const keptIds = new Set(kept.flatMap((e) => e.photoIds ?? []))
    const all = new Set(entries.flatMap((e) => e.photoIds ?? []))
    const dropped = [...all].filter((id) => !keptIds.has(id) && !originalPhotos.current.has(id))
    if (dropped.length) onDropPhotos(dropped)
  }

  const save = () => {
    const kept = entries.filter(hasContent).map((e) => ({ ...e, date,
      beanName: beans.find(bean => bean.id === e.beanId)?.name ?? e.beanName,
      ...(e.source === 'outside' ? { method: undefined, values: {}, beanId: undefined, beanName: undefined } : {}),
    }))
    pruneTempPhotos(kept)
    onSave(kept)
  }

  const close = () => {
    // 直接返回：本次新加的照片全部回收，原有数据不动
    const all = new Set(entries.flatMap((e) => e.photoIds ?? []))
    const dropped = [...all].filter((id) => !originalPhotos.current.has(id))
    if (dropped.length) onDropPhotos(dropped)
    onClose()
  }

  return (
    <div className="absolute inset-0 z-30 bg-[var(--c-app)] overflow-y-auto sheet-enter">
      {/* 顶栏 */}
      <div className="sticky top-0 z-10 bg-[var(--c-app)]/90 backdrop-blur px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={close}
          aria-label="返回"
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.1)] flex items-center justify-center text-[var(--c-ink)] active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[15px] font-semibold text-[var(--c-ink)]">{fmtCn(date)} · 每日记录</h2>
        <button
          type="button"
          onClick={save}
          className="px-4 h-10 rounded-full bg-white shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.1)] text-[14px] font-medium text-[var(--c-ink)] active:scale-95 transition-transform"
        >
          保存
        </button>
      </div>

      {/* 记录模块列表 */}
      {entries.map((entry, idx) => (
        <EntryModule
          beans={beans}
          onOpenBean={onOpenBean}
          key={entry.id}
          entry={entry}
          index={idx}
          showIndex={entries.length > 1}
          onPatch={(patch) => patchEntry(entry.id, patch)}
          onRemove={() => removeEntry(entry.id)}
          onSavePhoto={onSavePhoto}
          onDropPhotos={onDropPhotos}
        />
      ))}

      {/* 再加一条 */}
      <div className="px-5 mt-4 pb-10">
        <button
          type="button"
          onClick={() => setEntries((es) => [...es, emptyRecord(date)])}
          className="w-full h-11 rounded-2xl border border-dashed border-[var(--c-ink-ghost)] text-[var(--c-soft-ink)] text-[13.5px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          <Plus size={15} /> 再加一条记录
        </button>
      </div>
    </div>
  )
}

interface EntryModuleProps {
  beans: Bean[]
  onOpenBean: (id: string) => void
  entry: DailyRecord
  index: number
  showIndex: boolean
  onPatch: (patch: Partial<DailyRecord>) => void
  onRemove: () => void
  onSavePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  onDropPhotos: (ids: (string | undefined)[]) => void
}

/** 一条每日记录模块：咖啡照片（点击添加）+ 冲煮参数 */
function EntryModule({
  beans,
  onOpenBean,
  entry,
  index,
  showIndex,
  onPatch,
  onRemove,
  onSavePhoto,
  onDropPhotos,
}: EntryModuleProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const photoIds = entry.photoIds
  const urls = usePhotoUrls(photoIds)
  const method = BREW_METHODS.find((m) => m.id === entry.method) ?? BREW_METHODS[0]

  const addPhotos = async (files: FileList | null) => {
    if (!files || busy) return
    const room = MAX_PHOTOS - photoIds.length
    const picked = Array.from(files).slice(0, room)
    if (!picked.length) return
    setBusy(true)
    try {
      const added: string[] = []
      for (const f of picked) {
        const processed = await processPhotoFile(f)
        const { id } = await onSavePhoto(processed.blob, processed.original)
        added.push(id)
      }
      // 用最新的 photoIds 拼接，避免连续选图时互相覆盖
      onPatch({ photoIds: [...photoIds, ...added] })
    } catch (err) {
      window.alert('照片保存失败，可能是本地空间不够了。可以先去「我的 → 数据管理」导出备份。')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  const removePhotoAt = (i: number) => {
    onDropPhotos([photoIds[i]])
    onPatch({ photoIds: photoIds.filter((_, j) => j !== i) })
  }

  return (
    <div className="mt-4">
      {showIndex && (
        <div className="px-5 mb-1.5 flex items-center justify-between">
          <p className="text-[12px] text-[var(--c-ink-faint)]">第 {index + 1} 条</p>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`删除第 ${index + 1} 条`}
            className="flex items-center gap-1 text-[12px] text-[var(--c-danger)] active:opacity-70"
          >
            <Trash2 size={12} /> 删除这条
          </button>
        </div>
      )}

      {/* 咖啡照片：点击加图 */}
      <div className="px-5">
        {photoIds.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl bg-[var(--c-photo-well)] border border-dashed border-[var(--c-ink-ghost)] h-[120px] flex flex-col items-center justify-center gap-1.5 text-[var(--c-ink-faint)] active:scale-[0.99] transition-transform"
          >
            <ImagePlus size={20} />
            <span className="text-[12.5px]">点击添加咖啡照片</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photoIds.map((id, i) => (
              <div key={id} className="relative aspect-square">
                {urls[i] ? (
                  <img
                    src={urls[i]}
                    alt={`照片 ${i + 1}`}
                    className="w-full h-full rounded-xl object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-[var(--c-surface-soft)]" />
                )}
                <button
                  type="button"
                  onClick={() => removePhotoAt(i)}
                  aria-label={`删除照片 ${i + 1}`}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--c-ink)] text-[var(--c-primary-ink)] flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {photoIds.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl bg-[var(--c-photo-well)] border border-dashed border-[var(--c-ink-ghost)] flex flex-col items-center justify-center gap-1 text-[var(--c-ink-faint)] active:scale-[0.97] transition-transform"
              >
                <ImagePlus size={18} />
                <span className="text-[11px]">加一张</span>
              </button>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addPhotos(e.target.files)
            e.target.value = ''
          }}
        />
        {busy && <p className="text-[12px] text-[var(--c-ink-faint)] mt-2">正在处理照片…</p>}
      </div>

      {/* 索引文件页：来源页签与该页内容连成一张纸。 */}
      <div className="px-5 mt-4">
        <DrinkContext entry={entry} onPatch={onPatch}>
          {entry.source !== 'outside' && <>
          <DailyBeanReference beans={beans} entry={entry} onPatch={onPatch} onOpenBean={onOpenBean} />
          <div className="flex gap-2 py-3.5 border-b border-[var(--c-soft)] overflow-x-auto">
            {BREW_METHODS.map((m) => {
              const active = m.id === method.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPatch({ method: m.id })}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors ${
                    active ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]' : 'bg-[var(--c-soft)] text-[var(--c-soft-ink)]'
                  }`}
                >
                  {m.name}
                </button>
              )
            })}
          </div>
          <div className="pt-3.5 grid grid-cols-2 gap-3">
            {method.fields.map((f) => (
              <label key={f.key} className="block">
                <span className="text-[12px] text-[var(--c-ink-faint)]">
                  {f.label}
                  {f.unit ? ` (${f.unit})` : ''}
                </span>
                <input
                  inputMode="decimal"
                  value={entry.values[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    onPatch({ values: { ...entry.values, [f.key]: e.target.value } })
                  }
                  className="mt-1 w-full bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)]"
                />
              </label>
            ))}
          </div>
          </>}
          <div className="py-3.5">
            <input
              value={entry.note ?? ''}
              placeholder="札记：今天这杯怎么样？"
              aria-label="札记"
              onChange={(e) => onPatch({ note: e.target.value })}
              className="w-full bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)]"
            />
          </div>
        </DrinkContext>
      </div>
    </div>
  )
}

/** 每条自己做的记录独立关联豆库；详情由外层打开，编辑器保持挂载。 */
function DailyBeanReference({ beans, entry, onPatch, onOpenBean }: { beans: Bean[]; entry: DailyRecord; onPatch: (patch: Partial<DailyRecord>) => void; onOpenBean: (id: string) => void }) {
  const selectId = useId()
  const bean = beans.find(item => item.id === entry.beanId)
  const missing = !!entry.beanId && !bean
  return <section className="pt-4 pb-3.5 border-b border-[var(--c-soft)]">
    <label htmlFor={selectId} className="block text-[13px] text-[var(--c-ink-soft)]">今天用的是什么豆子</label>
    <select id={selectId} value={entry.beanId ?? ''} disabled={beans.length === 0 && !missing}
      onChange={event => {
        const selected = beans.find(item => item.id === event.target.value)
        onPatch({ beanId: selected?.id, beanName: selected?.name })
      }}
      className="mt-2 w-full rounded-xl bg-[var(--c-surface-soft)] px-3 py-2.5 text-[13px] text-[var(--c-ink)] outline-none border border-[var(--c-line)] disabled:opacity-60">
      <option value="">{beans.length ? '从豆库选择一袋豆子' : '豆库里还没有豆子'}</option>
      {missing && <option value={entry.beanId}>{entry.beanName || '原豆袋'}（已从豆库删除）</option>}
      {beans.map(item => <option key={item.id} value={item.id}>{item.name}{item.brand?.trim() ? ` · ${item.brand.trim()}` : ''}</option>)}
    </select>
    {bean ? <button type="button" onClick={() => onOpenBean(bean.id)} aria-label={`查看${bean.name}的豆袋详情，返回后继续记录`}
      className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[var(--c-line)] bg-[var(--c-surface)] p-3 text-left text-[var(--c-ink)] active:scale-[0.99] transition-transform">
      <BeanThumb bean={bean} className="h-12 w-10 shrink-0 rounded-lg object-contain bg-[var(--c-photo-well)]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold break-words">{bean.name}</span>
        <span className="mt-0.5 block text-[11.5px] text-[var(--c-ink-faint)]">{[bean.brand, bean.roastLevel].filter(Boolean).join(' · ')}</span>
        <span className="mt-1 block text-[11px] text-[var(--c-accent)]">查看豆袋详情 · 返回后继续记录</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-[var(--c-accent)]" aria-hidden />
    </button> : <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--c-ink-faint)]">
      {missing ? '这袋豆子已从豆库删除，原名称会保留在记录里，也可以重新选择。' : beans.length ? '选好后，点击豆子查看详情，对照冲煮参数。' : '先在豆库添加豆子，再回来关联这杯咖啡。'}
    </p>}
  </section>
}

/** 每杯独立记录来源与地点；定位仅由用户点击触发。 */
function DrinkContext({ entry, onPatch, children }: { entry: DailyRecord; onPatch: (patch: Partial<DailyRecord>) => void; children: ReactNode }) {
  const folderId = useId()
  const activeSource = entry.source ?? 'home'
  const sources = ['home', 'outside'] as const
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousHeight = useRef<number | null>(null)
  useLayoutEffect(() => {
    const sheet = sheetRef.current
    const from = previousHeight.current
    previousHeight.current = null
    if (!sheet || from === null || !sheet.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = sheet.getBoundingClientRect().height
    if (Math.abs(from - to) < 1) return
    sheet.style.overflow = 'hidden'
    const animation = sheet.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: 240, easing: 'cubic-bezier(.22,.61,.36,1)',
    })
    const restore = () => { sheet.style.overflow = '' }
    animation.onfinish = restore
    return () => { animation.cancel(); restore() }
  }, [activeSource])
  const [locating, setLocating] = useState(false)
  const [message, setMessage] = useState('')
  const request = useRef(0)
  const searchController = useRef<AbortController | null>(null)
  const [cafes, setCafes] = useState<NearbyCafe[]>([])
  const [searching, setSearching] = useState(false)
  const [cafeQuery, setCafeQuery] = useState('')
  useEffect(() => () => { request.current++; searchController.current?.abort() }, [])
  const clearSearch = () => {
    searchController.current?.abort()
    setSearching(false)
    setCafes([])
    setCafeQuery('')
  }
  const changeSource = (source: 'home' | 'outside') => {
    if (source === activeSource) return
    previousHeight.current = sheetRef.current?.getBoundingClientRect().height ?? null
    request.current++
    clearSearch()
    setLocating(false)
    setMessage('')
    onPatch({ source })
  }
  const searchCafes = async (latitude: number, longitude: number, token: number) => {
    searchController.current?.abort()
    const controller = new AbortController()
    searchController.current = controller
    setSearching(true)
    setCafes([])
    setCafeQuery('')
    setMessage('正在搜索附近 1.5 公里内的咖啡馆…')
    const timer = setTimeout(() => controller.abort(), 25000)
    try {
      const results = await nearbyCafes(latitude, longitude, controller.signal)
      if (token !== request.current || controller.signal.aborted) return
      setCafes(results)
      setMessage(results.length ? '点选咖啡馆，店名会自动填入上方地点。' : '地图中未找到附近咖啡馆，可手动填写店名。')
    } catch (error) {
      if (token !== request.current) return
      setMessage(controller.signal.aborted ? '附近店铺搜索超时，请重试或手动填写店名。' : error instanceof Error ? error.message : '附近店铺搜索失败，请手动填写店名。')
    } finally {
      clearTimeout(timer)
      if (token === request.current) setSearching(false)
    }
  }
  const locate = () => {
    if (!navigator.geolocation) { setMessage('当前浏览器不支持定位，请手动填写地点。'); return }
    const token = ++request.current
    clearSearch()
    setLocating(true)
    setMessage('')
    navigator.geolocation.getCurrentPosition(position => {
      if (token !== request.current) return
      const { latitude, longitude, accuracy } = position.coords
      onPatch({ location: { latitude, longitude, accuracy } })
      setLocating(false)
      void searchCafes(latitude, longitude, token)
    }, error => {
      if (token !== request.current) return
      setLocating(false)
      setMessage(error.code === 1 ? '未获得定位权限，请允许浏览器定位，或手动填写地点。' : '暂时无法获取位置，请重试或手动填写地点。')
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
  }
  return <div className="bl-record-folder">
    <div className="bl-record-index" role="tablist" aria-label="咖啡记录来源">
      {sources.map((source, index) => <button key={source} type="button" role="tab"
        id={`${folderId}-${source}`} aria-selected={activeSource === source}
        aria-controls={`${folderId}-sheet`} tabIndex={activeSource === source ? 0 : -1}
        onClick={() => changeSource(source)}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (index + 1) % sources.length
          changeSource(sources[next])
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
        }}
        className="bl-record-tab">
        <span className="bl-record-tab-number" aria-hidden="true">0{index + 1}</span>
        <span>{source === 'home' ? '自己做' : '外面喝'}</span>
      </button>)}
    </div>
    <div ref={sheetRef} id={`${folderId}-sheet`} className="bl-record-sheet" role="tabpanel" aria-labelledby={`${folderId}-${activeSource}`} tabIndex={0}>
    <div key={activeSource} className="bl-record-page-content" data-source={activeSource}>
    {entry.source === 'outside' && <div className="pt-1 pb-3.5 border-b border-[var(--c-soft)]">
    <label className="block mt-3 text-[12px] text-[var(--c-ink-faint)]">地点
      <input value={entry.locationName ?? ''} onChange={e => onPatch({ locationName: e.target.value })}
        placeholder="咖啡店名称或地址"
        className="mt-1.5 w-full rounded-xl px-3 py-2 bg-[var(--c-surface-soft)] outline-none text-[14px] text-[var(--c-ink)]" />
    </label>
    <div className="flex items-center gap-3 mt-3">
      <button type="button" disabled={locating} onClick={locate} className="px-3 py-2 rounded-full flex items-center gap-1.5 text-[12px] text-[var(--c-accent)] disabled:opacity-50"><MapPin size={14} />{locating ? '正在定位…' : '获取当前位置'}</button>
      {entry.location && <button type="button" onClick={() => { request.current++; clearSearch(); setLocating(false); setMessage(''); onPatch({ location: undefined }) }} className="px-3 py-2 rounded-full text-[12px] text-[var(--c-danger)]">移除定位</button>}
    </div>
    {entry.location && <button type="button" disabled={locating || searching} onClick={() => {
      const token = ++request.current
      void searchCafes(entry.location!.latitude, entry.location!.longitude, token)
    }} className="mt-2 px-3 py-2 rounded-full text-[12px] text-[var(--c-accent)] disabled:opacity-50">{searching ? '正在搜索附近咖啡馆…' : '搜索附近咖啡馆'}</button>}
    {cafes.length > 0 && <div className="mt-3 rounded-xl border border-[var(--c-line)] p-3">
      <p className="text-[13px] text-[var(--c-ink)]">附近咖啡馆 · 按距离排序</p>
      <input aria-label="筛选附近咖啡馆" value={cafeQuery} onChange={e => setCafeQuery(e.target.value)} placeholder="搜索候选店名"
        className="mt-2 w-full rounded-lg px-3 py-2 bg-[var(--c-surface-soft)] outline-none text-[13px] text-[var(--c-ink)]" />
      <div className="mt-2 max-h-56 overflow-y-auto space-y-2">
        {cafes.filter(cafe => `${cafe.name} ${cafe.address}`.toLowerCase().includes(cafeQuery.trim().toLowerCase())).map(cafe => <button key={cafe.id} type="button"
          aria-pressed={entry.locationName === cafe.name}
          onClick={() => { onPatch({ locationName: cafe.name }); setMessage(`已填入：${cafe.name}`) }}
          className="w-full p-3 rounded-xl text-left text-[var(--c-ink)]">
          <span className="flex justify-between gap-2 text-[13px]"><span>{cafe.name}</span><span className="shrink-0 text-[11px] text-[var(--c-ink-faint)]">{cafe.distance < 1000 ? `${cafe.distance} 米` : `${(cafe.distance / 1000).toFixed(1)} 公里`}{entry.locationName === cafe.name ? ' ✓' : ''}</span></span>
          {cafe.address && <span className="block mt-1 text-[11.5px] text-[var(--c-ink-faint)]">{cafe.address}</span>}
        </button>)}
        {!cafes.some(cafe => `${cafe.name} ${cafe.address}`.toLowerCase().includes(cafeQuery.trim().toLowerCase())) && <p className="text-[12px] text-[var(--c-ink-faint)] py-2">候选中没有匹配店铺，可在上方手动填写。</p>}
      </div>
    </div>}
    <p className="mt-2 text-[10.5px] text-[var(--c-ink-faint)]">搜索需联网，定位坐标会发送给地图服务。店铺数据 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a>，可能不完整。</p>
    {entry.location && <p className="mt-2 text-[11.5px] text-[var(--c-ink-faint)] break-words">{entry.location.latitude.toFixed(5)}, {entry.location.longitude.toFixed(5)}{entry.location.accuracy !== undefined ? ` · 精度约 ${Math.round(entry.location.accuracy)} 米` : ''}</p>}
    {message && <p role="status" className="mt-2 text-[11.5px] text-[var(--c-ink-faint)]">{message}</p>}
    </div>}
    {children}
    </div>
    </div>
  </div>
}
