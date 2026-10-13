import { useRef, useState } from 'react'
import { ChevronLeft, ImagePlus, Minus, Plus, Trash2 } from 'lucide-react'
import type { Bean, DrinkStatus, RoastLevel } from '@/types/bean'
import { ROAST_LEVELS, DRINK_STATUS } from '@/types/bean'
import type { Grinder } from '@/types/grinder'
import { Stars } from '@/components/Stars'
import { Toggle } from '@/components/Toggle'
import { OptionRow } from '@/components/OptionRow'
import { BrewCard } from '@/components/BrewCard'
import { BeanThumb } from '@/components/BeanThumb'
import { PhotoRecognition } from '@/components/PhotoRecognition'
import { processPhotoFile } from '@/lib/image'

interface BeanDetailProps {
  bean: Bean
  isNew: boolean
  grinders: Grinder[]
  onSave: (bean: Bean) => void
  onDelete: (id: string) => void
  onBack: () => void
  /** 把处理好的照片写进 IndexedDB，返回照片 id */
  onSavePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  /** 放弃不再使用的照片（换图、取消新建时） */
  onDropPhotos: (ids: (string | undefined)[]) => void
}

/** 把数值按步进格式化：18 而不是 18.0，17.5 保留一位 */
function formatSetting(v: number): string {
  return String(Math.round(v * 100) / 100)
}

const NO_GRIND = '不记录'
const IDENTITY_FIELDS = [
  { key: 'name', label: '豆子名称', placeholder: '填写这袋豆子的名称' },
  { key: 'brand', label: '品牌', placeholder: '如：皮爷咖啡、分子咖啡' },
  { key: 'variety', label: '豆子品种', placeholder: '如：瑰夏、波旁、卡杜拉' },
  { key: 'processingMethod', label: '处理法', placeholder: '如：水洗、日晒、蜜处理' },
  { key: 'origin', label: '产区', placeholder: '如：埃塞俄比亚 · 耶加雪菲' },
] as const

export function BeanDetail({
  bean,
  isNew,
  grinders,
  onSave,
  onDelete,
  onBack,
  onSavePhoto,
  onDropPhotos,
}: BeanDetailProps) {
  const [draft, setDraft] = useState<Bean>(bean)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  /** 本次编辑中新存进来的照片，取消/换图时要回收 */
  const tempPhotos = useRef<string[]>([])

  // 左滑返回上一页（在输入框、滑杆、按钮上起手时不触发）
  const backTouch = useRef<{ x: number; y: number; skip: boolean } | null>(null)

  const onTouchStartBack = (e: React.TouchEvent) => {
    const t = e.touches[0]
    const target = e.target as HTMLElement
    const skip = !!target.closest('input, textarea, select, button, a, [role="button"]')
    backTouch.current = { x: t.clientX, y: t.clientY, skip }
  }

  const onTouchEndBack = (e: React.TouchEvent) => {
    const s = backTouch.current
    backTouch.current = null
    if (!s || s.skip) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 1.5) onBack()
  }

  const set = <K extends keyof Bean>(key: K, value: Bean[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const handlePhoto = async (file: File | undefined) => {
    if (!file || photoBusy) return false
    setPhotoBusy(true)
    try {
      const processed = await processPhotoFile(file)
      const { id, originalId } = await onSavePhoto(processed.blob, processed.original)
      // 换图时把旧照片标记为待回收
      const previous = [draft.photoId, draft.originalPhotoId]
      setDraft((d) => ({ ...d, photoId: id, originalPhotoId: originalId }))
      const reusable = previous.filter((p): p is string => !!p && !tempPhotos.current.includes(p))
      if (reusable.length) onDropPhotos(reusable)
      tempPhotos.current.push(id, ...(originalId ? [originalId] : []))
      return true
    } catch (err) {
      window.alert('照片保存失败，可能是本地空间不够了。可以先去「我的 → 数据管理」导出备份。')
      console.error(err)
      return false
    } finally {
      setPhotoBusy(false)
    }
  }

  /** 保存或取消时，回收本次编辑产生但没被采用的临时照片 */
  const commitTempPhotos = () => {
    const kept = new Set([draft.photoId, draft.originalPhotoId].filter(Boolean))
    const orphans = tempPhotos.current.filter((id) => !kept.has(id))
    if (orphans.length) onDropPhotos(orphans)
    tempPhotos.current = []
  }

  const handleBack = () => {
    // 新建时直接返回 = 放弃这袋豆子，顺手删掉刚存的照片
    if (isNew) onDropPhotos(tempPhotos.current)
    else commitTempPhotos()
    onBack()
  }

  const handleSave = () => {
    commitTempPhotos()
    onSave(draft)
  }

  // ---- 研磨信息 ----
  const grinder = grinders.find((g) => g.id === draft.grindGrinderId)
  const grinderMissing = !grinder && !!draft.grindGrinderName
  const grinderDisplayName = grinder
    ? grinder.name
    : grinderMissing
      ? `${draft.grindGrinderName}（已删除）`
      : NO_GRIND

  const grinderOptions = [
    NO_GRIND,
    ...grinders.map((g) => g.name),
    ...(grinderMissing ? [grinderDisplayName] : []),
  ]

  const selectGrinder = (name: string) => {
    if (name === NO_GRIND) {
      setDraft((d) => ({
        ...d,
        grindGrinderId: undefined,
        grindGrinderName: undefined,
        grindSetting: undefined,
      }))
      return
    }
    if (name === grinderDisplayName && grinderMissing) return // 已删除的保留原样
    const g = grinders.find((x) => x.name === name)
    if (!g) return
    setDraft((d) => ({
      ...d,
      grindGrinderId: g.id,
      grindGrinderName: g.name,
      grindSetting: d.grindSetting ?? formatSetting(g.min),
    }))
  }

  const grindValue = grinder
    ? Math.min(grinder.max, Math.max(grinder.min, Number(draft.grindSetting ?? grinder.min)))
    : 0

  const setGrindValue = (v: number) => {
    if (!grinder) return
    const clamped = Math.min(grinder.max, Math.max(grinder.min, v))
    set('grindSetting', formatSetting(clamped))
  }

  return (
    <div className="pb-16" onTouchStart={onTouchStartBack} onTouchEnd={onTouchEndBack}>
      {/* 顶栏 */}
      <div className="sticky top-0 z-20 bg-[var(--c-app)]/90 backdrop-blur px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.1)] flex items-center justify-center text-[var(--c-ink)] active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[15px] font-semibold text-[var(--c-ink)]">
          {isNew ? '记一袋新豆子' : '豆袋'}
        </h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={photoBusy}
          className="px-4 h-10 rounded-full bg-white shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.1)] text-[14px] font-medium text-[var(--c-ink)] active:scale-95 transition-transform"
        >
          保存
        </button>
      </div>

      {/* 豆名大标题 */}
      <div className="px-5 mt-3">
        <input
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="品牌-豆名，如：分子咖啡-雪松可可"
          aria-label="豆子名称"
          className="w-full bg-transparent outline-none text-[26px] leading-snug font-bold text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)]"
        />
      </div>

      {/* 照片：点击图片区域即可上传/更换 */}
      <div className="px-5 mt-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="上传豆袋照片"
          className="relative w-full rounded-2xl bg-[var(--c-photo-well)] border border-[var(--c-border)] h-[240px] flex items-center justify-center overflow-hidden active:scale-[0.99] transition-transform"
        >
          {draft.photoId || draft.placeholder ? (
            <>
              <BeanThumb bean={draft} className="max-w-full max-h-full object-contain" />
              <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-[var(--c-ink)]/70 text-[var(--c-primary-ink)] text-[11.5px] pl-2 pr-2.5 py-1">
                <ImagePlus size={12} /> 更换照片
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-[var(--c-ink-ghost)] text-[13px]">
              <ImagePlus size={20} />
              点击上传豆袋照片
            </span>
          )}
        </button>
        {photoBusy && (
          <p className="text-[12px] text-[var(--c-ink-faint)] mt-2 text-center">正在处理照片…</p>
        )}
        <div className="flex items-center justify-end mt-2">
          {draft.photoId && (
            <button
              type="button"
              onClick={() => {
                onDropPhotos([draft.photoId, draft.originalPhotoId])
                setDraft((d) => ({ ...d, photoId: undefined, originalPhotoId: undefined }))
              }}
              className="text-[11.5px] text-[var(--c-danger)] active:opacity-70"
            >
              移除照片
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handlePhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className="px-5">
        <PhotoRecognition
          bean={draft}
          onUsePhoto={handlePhoto}
          onApply={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        />
      </div>

      {/* 豆子身份卡 */}
      <div className="px-5 mt-6">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">豆子身份卡</p>
        <div className="bg-[var(--c-surface)] rounded-2xl px-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
          {IDENTITY_FIELDS.map(({ key, label, placeholder }) => (
            <label
              key={key}
              className="flex items-start gap-3 py-3.5 border-b border-[var(--c-soft)]"
            >
              <span className="shrink-0 w-[66px] pt-0.5 text-[15px] text-[var(--c-ink)]">{label}</span>
              <input
                type="text"
                value={draft[key] ?? ''}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="flex-1 min-w-0 bg-transparent outline-none text-[14px] leading-relaxed text-[var(--c-ink-soft)]"
              />
            </label>
          ))}
          <div className="py-3.5 border-b border-[var(--c-soft)]">
            <p className="text-[15px] text-[var(--c-ink)]">风味</p>
            <div className="mt-3 space-y-3">
              {([
                { key: 'flavor', label: '黑咖风味', placeholder: '如：柑橘、花香、巧克力' },
                { key: 'milkFlavor', label: '奶咖风味', placeholder: '如：奶油、焦糖、曲奇饼干' },
              ] as const).map(({ key, label, placeholder }) => <label key={key} className="block">
                <span className="text-[12px] text-[var(--c-ink-faint)]">{label}</span>
                <textarea value={draft[key] ?? ''} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={2}
                  className="bl-identity-textarea mt-1.5 block w-full rounded-xl px-3 py-2 bg-[var(--c-surface-soft)] outline-none text-[14px] leading-relaxed text-[var(--c-ink-soft)] resize-y" />
              </label>)}
            </div>
          </div>
          <OptionRow
            label="烘焙程度"
            value={draft.roastLevel}
            options={ROAST_LEVELS}
            onChange={(v) => set('roastLevel', v as RoastLevel)}
          />
          <OptionRow
            label="饮用状态"
            value={draft.status}
            options={DRINK_STATUS}
            onChange={(v) => set('status', v as DrinkStatus)}
          />
        </div>
      </div>

      {/* 研磨信息 */}
      <div className="px-5 mt-5">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">研磨信息</p>
        <div className="bg-[var(--c-surface)] rounded-2xl px-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
          <div className="py-3.5 border-b border-[var(--c-soft)]">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-[var(--c-ink)]">磨豆器</span>
              <span className="text-[13px] text-[var(--c-ink-soft)]">{grinderDisplayName}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {grinderOptions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectGrinder(name)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
                    name === grinderDisplayName
                      ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]'
                      : 'bg-[var(--c-soft)] text-[var(--c-soft-ink)] active:bg-[var(--c-soft-hover)]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          {grinder && (
            <div className="py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-[var(--c-ink)]">研磨刻度</span>
                <span className="text-[15px] font-semibold text-[var(--c-accent)] tabular-nums">
                  {formatSetting(grindValue)} {grinder.unit}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                <button
                  type="button"
                  aria-label="调细一档"
                  onClick={() => setGrindValue(grindValue - grinder.step)}
                  className="w-8 h-8 rounded-full bg-[var(--c-soft)] text-[var(--c-soft-ink)] flex items-center justify-center active:scale-90 transition-transform shrink-0"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="range"
                  min={grinder.min}
                  max={grinder.max}
                  step={grinder.step}
                  value={grindValue}
                  onChange={(e) => setGrindValue(Number(e.target.value))}
                  className="flex-1 accent-[var(--c-toggle-on)] h-1.5"
                  aria-label="研磨刻度"
                />
                <button
                  type="button"
                  aria-label="调粗一档"
                  onClick={() => setGrindValue(grindValue + grinder.step)}
                  className="w-8 h-8 rounded-full bg-[var(--c-soft)] text-[var(--c-soft-ink)] flex items-center justify-center active:scale-90 transition-transform shrink-0"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex justify-between text-[11px] text-[var(--c-ink-ghost)] mt-1.5 px-11 tabular-nums">
                <span>{formatSetting(grinder.min)}（细）</span>
                <span>{formatSetting(grinder.max)}（粗）</span>
              </div>
              {grinder.note && (
                <p className="text-[12px] text-[var(--c-ink-ghost)] mt-2">备注：{grinder.note}</p>
              )}
            </div>
          )}
          {grinders.length === 0 && (
            <p className="py-3 text-[12px] text-[var(--c-ink-ghost)]">
              还没有磨豆器档案，去「我的 → 磨豆器管理」添加一台。
            </p>
          )}
        </div>
      </div>

      {/* 冲煮参数 */}
      <div className="px-5 mt-5">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">冲煮参数</p>
        <BrewCard brews={draft.brews} onChange={(b) => set('brews', b)} />
      </div>

      {/* 饮用时间线 */}
      <div className="px-5 mt-5">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">饮用时间线（可选）</p>
        <div className="bg-[var(--c-surface)] rounded-2xl px-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
          <div className="flex items-center justify-between py-3.5">
            <span className="text-[15px] text-[var(--c-ink)]">记录开袋日期</span>
            <Toggle
              checked={draft.trackOpenDate}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  trackOpenDate: v,
                  openDate: v ? d.openDate ?? new Date().toISOString().slice(0, 10) : d.openDate,
                }))
              }
            />
          </div>
          {draft.trackOpenDate && (
            <div className="flex items-center justify-between py-3 border-t border-[var(--c-soft)]">
              <span className="text-[14px] text-[var(--c-ink-soft)]">开袋日期</span>
              <input
                type="date"
                value={draft.openDate ?? ''}
                onChange={(e) => set('openDate', e.target.value)}
                className="bg-transparent outline-none text-[14px] text-[var(--c-ink)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 随想记录 */}
      <div className="px-5 mt-5">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">随想记录</p>
        <div className="bg-[var(--c-surface)] rounded-2xl px-4 py-3.5 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)] space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-[var(--c-ink)]">评分</span>
            <Stars value={draft.rating} onChange={(v) => set('rating', v)} size={22} />
          </div>
          <textarea
            value={draft.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="补一句自己看得懂的感受，不用写成品鉴报告…"
            rows={3}
            className="w-full bg-[var(--c-surface-soft)] rounded-xl p-3 outline-none text-[14px] text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)] resize-none"
          />
        </div>
      </div>

      {/* 清单 */}
      <div className="px-5 mt-5">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">回购清单</p>
        <div className="bg-[var(--c-surface)] rounded-2xl px-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
          <div className="flex items-center justify-between py-3.5 border-b border-[var(--c-soft)]">
            <div>
              <p className="text-[15px] text-[var(--c-ink)]">值得回购</p>
              <p className="text-[12px] text-[var(--c-ink-ghost)] mt-0.5">喜欢、以后还愿意喝</p>
            </div>
            <Toggle checked={draft.inRepurchase} onChange={(v) => set('inRepurchase', v)} />
          </div>
          <div className="flex items-center justify-between py-3.5 border-b border-[var(--c-soft)]">
            <div>
              <p className="text-[15px] text-[var(--c-ink)]">准备买</p>
              <p className="text-[12px] text-[var(--c-ink-ghost)] mt-0.5">近期打算买</p>
            </div>
            <Toggle checked={draft.inPlanToBuy} onChange={(v) => set('inPlanToBuy', v)} />
          </div>
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-[15px] text-[var(--c-ink)]">回购次数</p>
              <p className="text-[12px] text-[var(--c-ink-ghost)] mt-0.5">这袋豆子回购过几次</p>
            </div>
            <input
              type="number"
              min={0}
              value={draft.repurchaseCount || ''}
              onChange={(e) =>
                set('repurchaseCount', Math.max(0, Number(e.target.value) || 0))
              }
              placeholder="0"
              aria-label="回购次数"
              className="w-20 bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)] text-center"
            />
          </div>
        </div>
      </div>

      {!isNew && (
        <div className="px-5 mt-6">
          <button
            type="button"
            onClick={() => onDelete(draft.id)}
            className="w-full h-11 rounded-full bg-[var(--c-danger-bg)] text-[var(--c-danger)] text-[14px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Trash2 size={15} /> 删除这袋豆子
          </button>
        </div>
      )}
    </div>
  )
}
