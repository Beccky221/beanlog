import { useEffect, useRef, useState } from 'react'
import { ScanText } from 'lucide-react'
import type { Bean, RoastLevel } from '@/types/bean'
import { ROAST_LEVELS } from '@/types/bean'
import { getPhoto } from '@/lib/idb'
import { extractIdentity, recognizeLocalPhoto } from '@/lib/localOcr'
import type { ExtractedIdentity } from '@/lib/localOcr'

const FIELDS = [
  { key: 'brand', label: '品牌' },
  { key: 'variety', label: '豆子品种' },
  { key: 'flavor', label: '风味' },
  { key: 'roastLevel', label: '烘焙程度' },
] as const

type Selected = Record<keyof ExtractedIdentity, boolean>

export function PhotoRecognition({ bean, onApply }: { bean: Bean; onApply: (patch: Partial<Bean>) => void }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [raw, setRaw] = useState('')
  const [values, setValues] = useState<ExtractedIdentity | null>(null)
  const [selected, setSelected] = useState<Selected>({ brand: false, variety: false, flavor: false, roastLevel: false })
  const [confidence, setConfidence] = useState(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  const start = async () => {
    if (busy || !bean.photoId) return
    const task = new AbortController()
    controller.current = task
    setBusy(true)
    setError('')
    setValues(null)
    setRaw('')
    setStatus('正在读取本机照片…')
    try {
      const original = bean.originalPhotoId ? await getPhoto(bean.originalPhotoId) : undefined
      const photo = original ?? await getPhoto(bean.photoId)
      if (!photo) throw new Error('找不到这张照片，请重新上传豆袋照片。')
      const result = await recognizeLocalPhoto(photo, setStatus, task.signal)
      if (task.signal.aborted) return
      if (!result.text) throw new Error('没有读到文字。请拍清晰的包装正面，或裁剪到标签区域后重试。')
      const found = extractIdentity(result.text, result.lines)
      setRaw(result.text)
      setValues(found)
      setConfidence(result.confidence)
      setSelected({
        brand: !!found.brand && !bean.brand,
        variety: !!found.variety && !bean.variety,
        flavor: !!found.flavor && !bean.flavor,
        roastLevel: false,
      })
      setStatus('识别完成，请核对后填入')
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
    setStatus('已取消，可以重新识别')
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

  return (
    <div className="mt-3">
      <button type="button" disabled={busy} onClick={start}
        className="w-full rounded-full py-2.5 flex items-center justify-center gap-2 text-[13px] text-[var(--c-accent)] disabled:opacity-50">
        <ScanText size={17} /> {busy ? '正在识别…' : '识别豆袋信息'}
      </button>
      <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--c-ink-faint)]">首次使用需联网下载语言包；图片只在本机识别。正面拍摄、文字清晰时效果更好。</p>
      {status && <p role="status" aria-live="polite" className="mt-2 text-[12px] text-[var(--c-ink-soft)]">{status}</p>}
      {busy && <button type="button" onClick={cancel} className="mt-2 px-3 py-1.5 rounded-full text-[12px] text-[var(--c-ink-soft)]">取消识别</button>}
      {error && <p role="alert" className="mt-2 text-[12px] text-[var(--c-danger)]">{error}</p>}
      {values && (
        <div className="mt-3 p-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)]">
          <p className="text-[14px] text-[var(--c-ink)]">核对识别结果</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--c-ink-faint)]">{confidence < 65 ? '这张照片的文字较难识别，请仔细核对。' : '已结合文字、词库和版面提取候选，可能包含错字修正，请核对。'}勾选的项目会替换身份卡中的内容；未读到的信息请手动填写。</p>
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
          <details className="mt-3 text-[12px] text-[var(--c-ink-faint)]">
            <summary className="cursor-pointer">查看识别原文</summary>
            <p className="mt-2 whitespace-pre-wrap break-words max-h-48 overflow-y-auto select-text">{raw}</p>
          </details>
          <button type="button" onClick={apply} disabled={!FIELDS.some(({ key }) => selected[key] && values[key].trim())}
            className="mt-3 w-full py-2.5 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[13px] disabled:opacity-40">确认填入</button>
          <button type="button" onClick={() => { setValues(null); setRaw(''); setStatus('') }} className="mt-2 w-full py-2 rounded-full text-[12px] text-[var(--c-ink-soft)]">暂不填入</button>
        </div>
      )}
    </div>
  )
}
