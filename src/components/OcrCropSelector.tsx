import { useRef, useState } from 'react'
import type { ImageCrop } from '@/lib/ocrImage'

export function OcrCropSelector({ url, onRecognize, onCancel }: { url: string; onRecognize: (crop: ImageCrop) => void; onCancel: () => void }) {
  const [crop, setCrop] = useState<ImageCrop>({ x: 0, y: 0, width: 1, height: 1 })
  const [vertical, setVertical] = useState(false)
  const [characterCount, setCharacterCount] = useState(4)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (e.clientY - box.top) / box.height)) }
  }
  return <div className="mt-3 p-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)]">
    <p className="text-[13px] text-[var(--c-ink)]">框选文字标签</p>
    <p className="mt-1 text-[11.5px] text-[var(--c-ink-faint)]">在图片上拖动，框住要识别的文字；可单独框选产区或风味。只影响识别，不改变豆袋图片。</p>
    <div className="mt-3 mx-auto w-fit max-w-full overflow-hidden rounded-lg">
      <div className="relative touch-none select-none cursor-crosshair" onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId)
        origin.current = point(e)
        setCrop({ ...origin.current, width: 0, height: 0 })
      }} onPointerMove={e => {
        if (!origin.current) return
        const end = point(e), start = origin.current
        setCrop({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) })
      }} onPointerUp={() => { origin.current = null }} onPointerCancel={() => { origin.current = null }}>
        <img src={url} alt="拖动框选识别区域" draggable={false} className="block max-w-full max-h-[440px] w-auto pointer-events-none" />
        <div className="absolute pointer-events-none border-2 border-[var(--c-primary)]" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%`, boxShadow: '0 0 0 1000px rgba(0,0,0,.35)' }} />
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[var(--c-ink-soft)]">
      <label className="flex items-center gap-2"><input type="checkbox" checked={vertical} onChange={e => setVertical(e.target.checked)} />竖排单列文字</label>
      {vertical && <label className="flex items-center gap-2">字数<input type="number" min={1} max={24} value={characterCount} onChange={e => setCharacterCount(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} className="w-14 rounded-lg p-1.5 bg-[var(--c-surface-soft)] outline-none" /></label>}
    </div>
    {vertical && <p className="mt-1 text-[11px] text-[var(--c-ink-faint)]">只框住一列文字，填写字数。小字模糊时仍可能读错。</p>}
    <div className="mt-3 flex gap-3">
      <button type="button" disabled={crop.width < .04 || crop.height < .015} onClick={() => onRecognize({ ...crop, vertical, characterCount })} className="flex-1 rounded-full py-2 text-[13px] bg-[var(--c-primary)] text-[var(--c-primary-ink)] disabled:opacity-40">识别选区</button>
      <button type="button" onClick={onCancel} className="rounded-full px-3 py-2 text-[12px] text-[var(--c-ink-faint)]">取消</button>
    </div>
  </div>
}
