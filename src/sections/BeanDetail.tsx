import { useId, useRef, useState } from 'react'
import { ChevronLeft, ImagePlus, Crop, Trash2 } from 'lucide-react'
import type { Bean, DrinkStatus, RoastLevel } from '@/types/bean'
import { ROAST_LEVELS, DRINK_STATUS } from '@/types/bean'
import type { Grinder } from '@/types/grinder'
import { Stars } from '@/components/Stars'
import { Toggle } from '@/components/Toggle'
import { OptionRow } from '@/components/OptionRow'
import { BrewCard } from '@/components/BrewCard'
import { CoffeeRest } from '@/components/CoffeeRest'
import { localToday, validRoastDate } from '@/lib/coffeeRest'
import { beanRecipes } from '@/lib/brewRecipes'
import { BeanThumb } from '@/components/BeanThumb'
import { PhotoRecognition } from '@/components/PhotoRecognition'
import { processPhotoFile } from '@/lib/image'
import { getPhoto } from '@/lib/idb'
import { BeanPhotoCropper } from '@/components/BeanPhotoCropper'

interface BeanDetailProps {
  bean: Bean
  isNew: boolean
  grinders: Grinder[]
  onSave: (bean: Bean) => void
  onDelete: (id: string) => void
  onBack: () => void
  /** 从每日记录打开时说明返回目的地 */
  backLabel?: string
  /** 把处理好的照片写进 IndexedDB，返回照片 id */
  onSavePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  /** 放弃不再使用的照片（换图、取消新建时） */
  onDropPhotos: (ids: (string | undefined)[]) => void
}

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
  backLabel,
  onSavePhoto,
  onDropPhotos,
}: BeanDetailProps) {
  const [draft, setDraft] = useState<Bean>(() => ({ ...bean, brews: beanRecipes(bean) }))
  const [identityTab, setIdentityTab] = useState('identity')
  const identityFolderId = useId()
  const identityTabs = [
    { id: 'identity', label: '豆子身份' },
    { id: 'brewing', label: '研磨冲煮' },
    { id: 'drinking', label: '饮用回购' },
    { id: 'notes', label: '随想记录' },
  ] as const
  const [photoBusy, setPhotoBusy] = useState(false)
  const [cropSource, setCropSource] = useState<Blob | null>(null)
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
    if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 1.5) handleBack()
  }

  const set = <K extends keyof Bean>(key: K, value: Bean[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const savePhoto = async (blob: Blob, original?: Blob) => {
    setPhotoBusy(true)
    try {
      const { id, originalId } = await onSavePhoto(blob, original)
      setDraft(current => ({ ...current, photoId: id, originalPhotoId: originalId }))
      tempPhotos.current.push(id, ...(originalId ? [originalId] : []))
      return true
    } catch {
      window.alert('照片保存失败，可能是本地空间不够了。可以先去「我的 → 数据管理」导出备份。')
      return false
    } finally { setPhotoBusy(false) }
  }

  // 识图照片仍按原有流程设置，之后也可以用“编辑照片”裁切。
  const handlePhoto = async (file: File | undefined) => {
    if (!file || photoBusy) return false
    setPhotoBusy(true)
    try {
      const processed = await processPhotoFile(file)
      return await savePhoto(processed.blob, processed.original)
    } finally { setPhotoBusy(false) }
  }

  const chooseCropPhoto = async (file: File | undefined) => {
    if (!file || photoBusy) return
    setPhotoBusy(true)
    try {
      // 完整来源先压缩到适合手机存储的尺寸，再交给裁切器取景。
      const processed = await processPhotoFile(file)
      setCropSource(processed.blob)
    } catch { window.alert('图片读取失败，请重新选择。') }
    finally { setPhotoBusy(false) }
  }

  const editPhoto = async () => {
    if (photoBusy) return
    setPhotoBusy(true)
    try {
      const original = draft.originalPhotoId ? await getPhoto(draft.originalPhotoId) : undefined
      const source = original || (draft.photoId ? await getPhoto(draft.photoId) : undefined)
      if (source) setCropSource(source)
      else window.alert('没有找到这张照片，请重新从相册选择。')
    } catch { window.alert('图片读取失败，请稍后重试。') }
    finally { setPhotoBusy(false) }
  }

  const handleBack = () => {
    if (photoBusy) return
    // 未保存的换图不删除豆库正在使用的旧照片。
    onDropPhotos(tempPhotos.current)
    tempPhotos.current = []
    onBack()
  }

  const handleSave = () => {
    if (photoBusy || cropSource) return
    if (draft.roastDate && (!validRoastDate(draft.roastDate) || draft.roastDate > localToday())) {
      window.alert('请填写有效且不晚于今天的烘焙日期。')
      return
    }
    const kept = new Set([draft.photoId, draft.originalPhotoId].filter(Boolean))
    const unused = [...tempPhotos.current, bean.photoId, bean.originalPhotoId]
      .filter((id): id is string => !!id && !kept.has(id))
    onSave({ ...draft,
      grindGrinderId: undefined, grindGrinderName: undefined, grindSetting: undefined,
      inRepurchase: !draft.inPlanToBuy && draft.inRepurchase,
      trackOpenDate: !draft.inPlanToBuy && !!draft.openDate,
    })
    if (unused.length) onDropPhotos([...new Set(unused)])
    tempPhotos.current = []
  }

  return (
    <>
    <div inert={cropSource !== null} className="bl-bean-detail pb-16" onTouchStart={onTouchStartBack} onTouchEnd={onTouchEndBack}>
      {/* 顶栏 */}
      <div className="sticky top-0 z-20 bg-[var(--c-app)]/90 backdrop-blur px-5 pt-5 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={photoBusy}
          aria-label={backLabel ?? '返回'}
          autoFocus={!!backLabel}
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.1)] flex items-center justify-center text-[var(--c-ink)] active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[15px] font-semibold text-[var(--c-ink)]">
          {isNew ? '记一袋新豆子' : '豆袋'}
          {backLabel && <span className="mt-0.5 block text-[10.5px] font-normal text-[var(--c-ink-faint)]">{backLabel}</span>}
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

      <div className="bl-bean-detail-cover px-5 mt-3">
        <div className="min-w-0">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photoBusy}
          aria-label="上传豆袋照片"
          className="relative w-full rounded-2xl bg-[var(--c-photo-well)] border border-[var(--c-border)] aspect-square flex items-center justify-center overflow-hidden active:scale-[0.99] transition-transform"
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
        </div>
        <div className="min-w-0 flex flex-col justify-center">
          <label className="block">
            <span className="text-[11px] text-[var(--c-ink-faint)]">豆子名称</span>
            <textarea rows={3} value={draft.name} onChange={event => set('name', event.target.value)}
              placeholder="填写豆子名称" aria-label="豆子名称"
              className="mt-1 w-full bg-transparent outline-none text-[20px] leading-snug font-bold text-[var(--c-ink)] placeholder:text-[var(--c-placeholder)] resize-none" />
          </label>
        {photoBusy && (
          <p className="text-[12px] text-[var(--c-ink-faint)] mt-2 text-center">正在处理照片…</p>
        )}
        <div className="flex items-center flex-wrap gap-3 mt-2">
          {draft.photoId && <button type="button" disabled={photoBusy} onClick={() => void editPhoto()} className="flex items-center gap-1.5 min-h-10 text-[12px] text-[var(--c-primary)] disabled:opacity-40"><Crop size={14} />编辑照片</button>}
          {draft.photoId && (
            <button
              type="button"
              onClick={() => {
                setDraft((d) => ({ ...d, photoId: undefined, originalPhotoId: undefined }))
              }}
              disabled={photoBusy}
              className="text-[11.5px] min-h-10 text-[var(--c-danger)] active:opacity-70 disabled:opacity-40"
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
            void chooseCropPhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        </div>
      </div>

      {/* 豆子身份卡 */}
      <div className="px-5 mt-6">
        <div className="bl-record-folder bl-bean-identity-folder">
          <div className="bl-record-index" role="tablist" aria-label="豆子档案分类">
            {identityTabs.map(({ id, label }, index) => <button key={id} id={`${identityFolderId}-${id}`} type="button" role="tab"
              aria-selected={identityTab === id} aria-controls={`${identityFolderId}-${id}-panel`} tabIndex={identityTab === id ? 0 : -1}
              className="bl-record-tab" onClick={() => setIdentityTab(id)}
              onKeyDown={event => {
                const next = event.key === 'ArrowRight' ? (index + 1) % identityTabs.length
                  : event.key === 'ArrowLeft' ? (index + identityTabs.length - 1) % identityTabs.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? identityTabs.length - 1 : -1
                if (next < 0) return
                event.preventDefault()
                setIdentityTab(identityTabs[next].id)
                document.getElementById(`${identityFolderId}-${identityTabs[next].id}`)?.focus()
              }}>{label}</button>)}
          </div>
          <div className="bl-record-sheet">
          <div id={`${identityFolderId}-identity-panel`} role="tabpanel" aria-labelledby={`${identityFolderId}-identity`} hidden={identityTab !== 'identity'} className="bl-record-page-content" data-source="home">
          <div className="bl-identity-recognition border-b border-[var(--c-soft)] pb-3">
            <PhotoRecognition bean={draft} onUsePhoto={handlePhoto}
              onApply={patch => setDraft(current => ({ ...current, ...patch }))} />
          </div>
          {IDENTITY_FIELDS.map(({ key, label, placeholder }) => (
            <label
              key={key}
              className="bl-identity-field flex items-center gap-3 border-b border-[var(--c-soft)]"
            >
              <span className="shrink-0 w-[66px] text-[14px] text-[var(--c-ink)]">{label}</span>
              <input
                type="text"
                value={draft[key] ?? ''}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="flex-1 min-w-0 bg-transparent outline-none text-[14px] leading-relaxed text-[var(--c-ink-soft)]"
              />
            </label>
          ))}
          <OptionRow compact
            label="烘焙程度"
            value={draft.roastLevel}
            options={ROAST_LEVELS}
            onChange={(v) => set('roastLevel', v as RoastLevel)}
          />
          <div className="py-2">
            <p className="text-[12px] text-[var(--c-ink)]">风味档案</p>
            <div className="mt-1">
              {([
                { key: 'flavor', label: '黑咖风味', placeholder: '如：柑橘、花香、巧克力' },
                { key: 'milkFlavor', label: '奶咖风味', placeholder: '如：奶油、焦糖、曲奇饼干' },
              ] as const).map(({ key, label, placeholder }) => <label key={key} className="bl-identity-field flex items-center gap-3">
                <span className="shrink-0 w-[66px] text-[12px] text-[var(--c-ink-faint)]">{label}</span>
                <input type="text" value={draft[key] ?? ''} onChange={event => set(key, event.target.value)} placeholder={placeholder}
                  className="min-w-0 flex-1 bg-transparent outline-none text-[14px] leading-relaxed text-[var(--c-ink-soft)]" />
              </label>)}
            </div>
          </div>
          <OptionRow compact
            label="饮用状态"
            value={draft.status}
            options={DRINK_STATUS}
            onChange={(v) => set('status', v as DrinkStatus)}
          />
          <CoffeeRest bean={draft} onChange={patch => setDraft(current => ({ ...current, ...patch }))} />
          </div>
          <div id={`${identityFolderId}-brewing-panel`} role="tabpanel" aria-labelledby={`${identityFolderId}-brewing`} hidden={identityTab !== 'brewing'} className="bl-record-page-content">
      {/* 冲煮参数 */}
      <div className="bl-bean-dossier-section">
        <BrewCard grinders={grinders} brews={draft.brews} onChange={(b) => set('brews', b)} />
      </div>

          </div>
          <div id={`${identityFolderId}-drinking-panel`} role="tabpanel" aria-labelledby={`${identityFolderId}-drinking`} hidden={identityTab !== 'drinking'} className="bl-record-page-content">
      <div className="bl-bean-dossier-section">
        <fieldset>
          <legend className="text-[13px] text-[var(--c-ink)]">购买状态</legend>
          <div className="flex gap-3 mt-3" role="group" aria-label="购买状态">
            {[{ planned: true, label: '准备买' }, { planned: false, label: '已购买' }].map(option => <button key={option.label} type="button"
              aria-pressed={draft.inPlanToBuy === option.planned} onClick={() => set('inPlanToBuy', option.planned)}
              className={`flex-1 min-h-11 rounded-full text-[13px] transition-colors ${draft.inPlanToBuy === option.planned ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]' : 'bg-[var(--c-soft)] text-[var(--c-soft-ink)]'}`}>
              {option.label}
            </button>)}
          </div>
        </fieldset>
        {!draft.inPlanToBuy && <div className="mt-4 bl-record-page-content">
          <label className="flex flex-wrap items-center justify-between gap-3 py-3.5 border-b border-[var(--c-soft)]">
            <span className="text-[14px] text-[var(--c-ink)]">开袋日期</span>
            <input type="date" value={draft.openDate ?? ''} aria-label="开袋日期"
              onChange={event => setDraft(current => ({ ...current, openDate: event.target.value || undefined, trackOpenDate: !!event.target.value }))}
              className="min-w-0 max-w-full min-h-10 bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)]" />
          </label>
          <div className="flex items-center justify-between py-3.5 border-b border-[var(--c-soft)]">
            <div>
              <p className="text-[15px] text-[var(--c-ink)]">值得回购</p>
              <p className="text-[12px] text-[var(--c-ink-ghost)] mt-0.5">喜欢、以后还愿意喝</p>
            </div>
            <Toggle checked={draft.inRepurchase} onChange={value => set('inRepurchase', value)} />
          </div>
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-[15px] text-[var(--c-ink)]">回购次数</p>
              <p className="text-[12px] text-[var(--c-ink-ghost)] mt-0.5">这袋豆子回购过几次</p>
            </div>
            <input type="number" min={0} value={draft.repurchaseCount || ''} placeholder="0" aria-label="回购次数"
              onChange={event => set('repurchaseCount', Math.max(0, Number(event.target.value) || 0))}
              className="w-20 bg-[var(--c-surface-soft)] rounded-xl px-3 py-2 outline-none text-[14px] text-[var(--c-ink)] text-center" />
          </div>
        </div>}
      </div>

          </div>
          <div id={`${identityFolderId}-notes-panel`} role="tabpanel" aria-labelledby={`${identityFolderId}-notes`} hidden={identityTab !== 'notes'} className="bl-record-page-content">
      {/* 随想记录 */}
      <div className="bl-bean-dossier-section">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">随想记录</p>
        <div className="py-3.5 space-y-3.5">
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

          </div>
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
    {cropSource && <BeanPhotoCropper source={cropSource} onCancel={() => setCropSource(null)}
      onApply={async (photo, original) => {
        const saved = await savePhoto(photo, original)
        if (saved) setCropSource(null)
        return saved
      }} />}
    </>
  )
}
