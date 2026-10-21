import { useEffect, useRef, useState } from 'react'
import { Camera, Images } from 'lucide-react'
import type { Bean, RoastLevel } from '@/types/bean'
import { ROAST_LEVELS } from '@/types/bean'
import { extractIdentity, recognizeLocalPhoto } from '@/lib/localOcr'
import { RecommendationAccess } from '@/components/RecommendationAccess'
import { OcrCropSelector } from '@/components/OcrCropSelector'
import type { ImageCrop } from '@/lib/ocrImage'
import { getVisionMode, recognizeCloudPhoto, setVisionMode, type VisionIdentity, type VisionMode } from '@/lib/cloudVision'

const FIELDS = [
  { key: 'name', label: '豆子名称' },
  { key: 'brand', label: '品牌' },
  { key: 'variety', label: '豆子品种' },
  { key: 'processingMethod', label: '处理法' },
  { key: 'origin', label: '产区' },
  { key: 'flavor', label: '黑咖风味' },
  { key: 'milkFlavor', label: '奶咖风味' },
  { key: 'roastLevel', label: '烘焙程度' },
] as const

type Selected = Record<keyof VisionIdentity, boolean>

export function PhotoRecognition({ bean, onApply, onUsePhoto }: { bean: Bean; onApply: (patch: Partial<Bean>) => void; onUsePhoto: (photo: File) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [raw, setRaw] = useState('')
  const [mode, setMode] = useState<VisionMode>(getVisionMode)
  const [resultMode, setResultMode] = useState<VisionMode>('local')
  const [warnings, setWarnings] = useState<string[]>([])
  const [values, setValues] = useState<VisionIdentity | null>(null)
  const [selected, setSelected] = useState<Selected>({ name: false, brand: false, variety: false, flavor: false, milkFlavor: false, processingMethod: false, origin: false, roastLevel: false })
  const [confidence, setConfidence] = useState(0)
  const [source, setSource] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [enhance, setEnhance] = useState(false)
  const [askPhoto, setAskPhoto] = useState(false)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [photoSaved, setPhotoSaved] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [activeCrop, setActiveCrop] = useState<ImageCrop | undefined>()
  const [chooseSource, setChooseSource] = useState(false)
  const albumInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  useEffect(() => {
    if (!source) return
    const url = URL.createObjectURL(source)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [source])

  const start = async (photo: File, useEnhancement = enhance, crop?: ImageCrop) => {
    if (busy || savingPhoto) return
    controller.current?.abort()
    setCropOpen(false)
    setActiveCrop(crop)
    setChooseSource(false)
    setSource(photo)
    setAskPhoto(false)
    setPhotoSaved(false)
    const task = new AbortController()
    controller.current = task
    setBusy(true)
    setError('')
    setValues(null)
    setRaw('')
    setWarnings([])
    setResultMode(mode)
    setStatus('正在读取本机照片…')
    try {
      let found: VisionIdentity
      if (mode === 'cloud') {
        const result = await recognizeCloudPhoto(photo, setStatus, task.signal, crop)
        found = result.fields
        setRaw(result.text)
        setWarnings(result.warnings)
      } else {
        const result = await recognizeLocalPhoto(photo, setStatus, task.signal, useEnhancement, crop)
        if (!result.text) throw new Error('没有读到文字。请拍清晰的包装正面，或裁剪到标签区域后重试。')
        found = { ...extractIdentity(result.text, result.lines), name: '' }
        setRaw(result.text)
        setConfidence(result.confidence)
      }
      if (task.signal.aborted) return
      setValues(found)
      setSelected({
        name: !!found.name && !bean.name,
        brand: !!found.brand && !bean.brand,
        variety: !!found.variety && !bean.variety,
        flavor: !!found.flavor && !bean.flavor,
        milkFlavor: !!found.milkFlavor && !bean.milkFlavor,
        processingMethod: !!found.processingMethod && !bean.processingMethod,
        origin: !!found.origin && !bean.origin,
        roastLevel: false,
      })
      setStatus('识别完成，请核对后填入')
      setAskPhoto(true)
    } catch (err) {
      if (task.signal.aborted) return
      setError(err instanceof Error ? err.message : '识别未完成，请检查网络或换一张清晰照片重试。')
      setStatus('')
    } finally {
      if (!task.signal.aborted) setBusy(false)
    }
  }

  const cancel = () => {
    controller.current?.abort()
    setBusy(false)
    setStatus(mode === 'cloud' ? '已停止等待。若图片已发送，后端可能仍在识别并产生费用。' : '已取消，可以重新识别')
  }

  const apply = () => {
    if (!values) return
    const patch: Partial<Bean> = {}
    for (const { key } of FIELDS) {
      const value = values[key].trim()
      if (!selected[key] || !value) continue
      if (key === 'roastLevel') patch.roastLevel = value as RoastLevel
      else patch[key] = value
    }
    onApply(patch)
    setValues(null)
    setRaw('')
    setStatus('已填入身份卡，点击页面右上角“保存”完成记录')
  }

  const sourceControls = <div id="recognition-source-options" role="group" aria-label="选择识别图片来源" className="mt-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-3">
    <div className="flex justify-center gap-3 py-2">
      <button type="button" onClick={() => { setChooseSource(false); cameraInput.current?.click() }} className="px-4 py-2.5 rounded-full flex items-center gap-2 text-[13px] text-[var(--c-accent)]"><Camera size={16} />拍照</button>
      <button type="button" onClick={() => { setChooseSource(false); albumInput.current?.click() }} className="px-4 py-2.5 rounded-full flex items-center gap-2 text-[13px] text-[var(--c-accent)]"><Images size={16} />从相册选图</button>
    </div>
    <button type="button" onClick={() => setChooseSource(false)} className="block mx-auto mt-1 px-3 py-1.5 rounded-full text-[12px] text-[var(--c-ink-faint)]">取消</button>
  </div>

  return (
    <div className="mt-3">
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" aria-label="拍摄用于识别的照片"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) { setEnhance(true); void start(file, true) } }} />
      <input ref={albumInput} type="file" accept="image/*" className="hidden" aria-label="从相册选择用于识别的图片"
        onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void start(file) }} />
      <div className="flex justify-center gap-2 mt-3" role="group" aria-label="选择识别方式">
        {([{ id: 'cloud', label: '千问识图' }, { id: 'local', label: '本机识别' }] as const).map(item => <button key={item.id} type="button" disabled={busy || savingPhoto} aria-pressed={mode === item.id} aria-expanded={chooseSource && mode === item.id} aria-controls="recognition-source-options" onClick={() => { setMode(item.id); setVisionMode(item.id); setValues(null); setRaw(''); setWarnings([]); setError(''); setStatus(''); setChooseSource(true) }} className={'px-4 py-2 rounded-full text-[12px] disabled:opacity-50 ' + (mode === item.id ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]' : 'text-[var(--c-ink-soft)]')}>{item.label}</button>)}
      </div>
      {chooseSource && (mode === 'cloud' ? <RecommendationAccess inline>{() => sourceControls}</RecommendationAccess> : sourceControls)}
      {mode === 'local' && <label className="mt-2 flex items-center gap-2 text-[12px] text-[var(--c-ink-soft)]">
        <input type="checkbox" checked={enhance} disabled={busy} onChange={(e) => setEnhance(e.target.checked)} />实拍增强（试用）
      </label>}
      {mode === 'local' && enhance && <p className="mt-1 text-[11px] leading-relaxed text-[var(--c-ink-faint)]">尝试减轻阴影、增强文字。请正对标签拍摄，避免反光；处理时间会稍长。</p>}
      {source && <div className="mt-3 flex items-center gap-3 p-2.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-surface)]">
        {preview && <img src={preview} alt="本次识别图片" className="w-12 h-14 rounded-lg object-contain shrink-0" />}
        <div className="min-w-0 flex-1"><p className="text-[12px] truncate text-[var(--c-ink)]">{source.name || '本次拍摄的照片'}</p><p className="text-[11px] text-[var(--c-ink-faint)]">{photoSaved ? '已设为豆袋图片，保存记录后生效' : '仅用于本次识别'}</p></div>
        {!busy && !savingPhoto && <button type="button" onClick={() => void start(source, enhance, activeCrop)} className="shrink-0 px-2 py-1.5 rounded-full text-[11.5px] text-[var(--c-accent)]">重新识别</button>}
      </div>}
      {source && !busy && !savingPhoto && <button type="button" onClick={() => setCropOpen(open => !open)} className="mt-2 px-3 py-2 rounded-full text-[12px] text-[var(--c-accent)]">框选标签重新识别</button>}
      {cropOpen && source && preview && <OcrCropSelector url={preview} onCancel={() => setCropOpen(false)} onRecognize={crop => void start(source, enhance, crop)} />}
      {askPhoto && source && <div className="mt-3 p-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)]" role="group" aria-label="保存识别照片">
        <p className="text-[14px] text-[var(--c-ink)]">是否将这张照片设为豆袋图片？</p>
        <p className="mt-1 text-[11.5px] text-[var(--c-ink-faint)]">{bean.photoId || bean.placeholder ? '将替换当前展示图，点击右上角“保存”后生效。' : '设置后，点击右上角“保存”完成记录。'}</p>
        <div className="mt-3 flex gap-3">
          <button type="button" disabled={savingPhoto} onClick={async () => {
            setSavingPhoto(true)
            try {
              if (await onUsePhoto(source)) { setPhotoSaved(true); setAskPhoto(false) }
            } finally { setSavingPhoto(false) }
          }} className="flex-1 py-2 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[13px] disabled:opacity-50">{savingPhoto ? '正在保存照片…' : '设为豆袋图片'}</button>
          <button type="button" disabled={savingPhoto} onClick={() => setAskPhoto(false)} className="px-4 py-2 rounded-full text-[13px] text-[var(--c-ink-soft)] disabled:opacity-50">不保存图片</button>
        </div>
      </div>}
      {status && <p role="status" aria-live="polite" className="mt-2 text-[12px] text-[var(--c-ink-soft)]">{status}</p>}
      {busy && <button type="button" onClick={cancel} className="mt-2 px-3 py-1.5 rounded-full text-[12px] text-[var(--c-ink-soft)]">取消识别</button>}
      {error && <p role="alert" className="mt-2 text-[12px] text-[var(--c-danger)]">{error}</p>}
      {values && (
        <div className="mt-3 p-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)]">
          <p className="text-[14px] text-[var(--c-ink)]">核对识别结果</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--c-ink-faint)]">{resultMode === 'cloud' ? '以下是千问提取的候选信息，仍可能出现误读或推断，请对照原图核对。' : confidence < 65 ? '这张照片的文字较难识别，请仔细核对。' : '已结合文字、词库和版面提取候选，可能包含错字修正，请核对。'}勾选的项目会替换身份卡中的内容；未读到的信息请手动填写。</p>
          {warnings.length > 0 && <ul className="mt-2 pl-4 list-disc text-[11.5px] leading-relaxed text-[var(--c-ink-soft)]">{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="py-2.5 border-b border-[var(--c-line-soft)]">
              <label className="flex gap-2 items-center text-[12px] text-[var(--c-ink)]">
                <input type="checkbox" checked={selected[key]} onChange={(e) => setSelected((prev) => ({ ...prev, [key]: e.target.checked }))} />
                {label}
              </label>
              {key === 'roastLevel' ? (
                <select aria-label="识别的烘焙程度" value={values.roastLevel} onChange={(e) => setValues({ ...values, roastLevel: e.target.value as RoastLevel | '' })} className="mt-2 w-full p-2 text-[13px] rounded-lg">
                  <option value="">未识别到</option>
                  {ROAST_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              ) : (
                <input aria-label={`识别的${label}`} value={values[key]} placeholder="未识别到，可手动填写" onChange={(e) => setValues({ ...values, [key]: e.target.value })} className="mt-2 w-full p-2 bg-transparent outline-none text-[13px] text-[var(--c-ink-soft)]" />
              )}
            </div>
          ))}
          {raw && <details className="mt-3 text-[12px] text-[var(--c-ink-faint)]">
            <summary className="cursor-pointer">{resultMode === 'cloud' ? '查看模型转写文字（请对照原图）' : '查看识别原文'}</summary>
            <p className="mt-2 whitespace-pre-wrap break-words max-h-48 overflow-y-auto select-text">{raw}</p>
          </details>}
          <button type="button" onClick={apply} disabled={!FIELDS.some(({ key }) => selected[key] && values[key].trim())}
            className="mt-3 w-full py-2.5 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[13px] disabled:opacity-40">确认填入</button>
          <button type="button" onClick={() => { setValues(null); setRaw(''); setStatus('') }} className="mt-2 w-full py-2 rounded-full text-[12px] text-[var(--c-ink-soft)]">暂不填入</button>
        </div>
      )}
    </div>
  )
}
