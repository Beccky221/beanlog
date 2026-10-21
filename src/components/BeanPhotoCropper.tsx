import { useEffect, useRef, useState } from 'react'
import { Crop, RotateCcw, X } from 'lucide-react'

const clamp = (value: number, bound: number) => Math.max(-bound, Math.min(bound, value))

/** 正方形展示图：拖动照片改变取景，保存完整来源以便再次裁切。 */
export function BeanPhotoCropper({ source, onCancel, onApply }: {
  source: Blob
  onCancel: () => void
  onApply: (photo: Blob, original?: Blob) => Promise<boolean>
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const area = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)
  const trigger = useRef<Element | null>(document.activeElement)
  useEffect(() => {
    close.current?.focus()
    const target = trigger.current
    const url = URL.createObjectURL(source)
    const img = new Image()
    let active = true
    img.onload = () => { if (active) setImage(img) }
    img.onerror = () => { if (active) setError('无法打开这张图片，请换用 JPG、PNG 或其他浏览器支持的格式。') }
    img.src = url
    return () => {
      active = false
      URL.revokeObjectURL(url)
      if (target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true })
    }
  }, [source])
  const ratio = image ? image.naturalWidth / image.naturalHeight : 1
  const width = Math.max(1, ratio) * zoom
  const height = Math.max(1, 1 / ratio) * zoom
  const x = clamp(offset.x, (width - 1) / 2)
  const y = clamp(offset.y, (height - 1) / 2)
  const left = .5 - width / 2 + x
  const top = .5 - height / 2 + y
  const apply = async (crop: boolean) => {
    if (!image || busy) return
    setBusy(true)
    setError('')
    try {
      let photo = source
      if (crop) {
        const canvas = document.createElement('canvas')
        const side = Math.min(1600, Math.max(1, Math.round(image.naturalWidth / width)))
        canvas.width = side
        canvas.height = side
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('画布不可用')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, side, side)
        ctx.drawImage(image, left * side, top * side, width * side, height * side)
        photo = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('导出失败')), 'image/jpeg', .9))
      }
      if (!(await onApply(photo, crop ? source : undefined))) setError('照片未能保存，请重试。')
    } catch { setError('裁切失败，请重试或选择使用完整图片。') }
    finally { setBusy(false) }
  }
  return <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bean-crop-title"
    className="fixed inset-0 z-[60] flex justify-center bg-black/50"
    onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onCancel() }
      if (event.key === 'Tab') {
        const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')
        if (!controls?.length) return
        const first = controls[0], last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }}>
    <div className="w-full max-w-[430px] bg-[var(--c-app)] overflow-y-auto px-5 pt-[calc(1rem+var(--safe-t))] pb-[calc(1.5rem+var(--safe-b))]">
      <header className="flex items-center justify-between mb-5">
        <h2 id="bean-crop-title" className="flex gap-2 items-center text-[18px] text-[var(--c-ink)]"><Crop size={19} />裁切豆袋照片</h2>
        <button ref={close} type="button" disabled={busy} onClick={onCancel} aria-label="取消裁切" className="w-11 h-11 flex items-center justify-center text-[var(--c-ink)] disabled:opacity-40"><X size={20} /></button>
      </header>
      <p className="text-[13px] text-[var(--c-ink-soft)] mb-4">拖动照片调整位置，缩放取景。方框内就是卡片和海报使用的图片。</p>
      <div ref={area} tabIndex={0} role="group" aria-label="照片裁切区域，可拖动或使用方向键移动"
        className="relative w-full aspect-square overflow-hidden rounded-2xl bg-[var(--c-photo-well)] touch-none select-none outline-offset-4"
        onPointerDown={event => {
          if (busy || !image || drag.current) return
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: x, oy: y }
        }}
        onPointerMove={event => {
          const start = drag.current
          if (!start || start.id !== event.pointerId || busy) return
          const side = event.currentTarget.getBoundingClientRect().width
          setOffset({ x: clamp(start.ox + (event.clientX - start.x) / side, (width - 1) / 2), y: clamp(start.oy + (event.clientY - start.y) / side, (height - 1) / 2) })
        }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
        onKeyDown={event => {
          const shifts: Record<string, [number, number]> = { ArrowLeft: [-.025, 0], ArrowRight: [.025, 0], ArrowUp: [0, -.025], ArrowDown: [0, .025] }
          const shift = shifts[event.key]
          if (shift && !busy) { event.preventDefault(); setOffset({ x: clamp(x + shift[0], (width - 1) / 2), y: clamp(y + shift[1], (height - 1) / 2) }) }
        }}>
        {image && <img src={image.src} alt="裁切预览" draggable={false} className="absolute max-w-none pointer-events-none" style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` }} />}
        <div className="absolute inset-0 pointer-events-none border border-white/70 rounded-2xl">
          {[1, 2].map(n => <div key={n}><span className="absolute top-0 bottom-0 border-l border-white/40" style={{ left: `${n * 100 / 3}%` }} /><span className="absolute left-0 right-0 border-t border-white/40" style={{ top: `${n * 100 / 3}%` }} /></div>)}
        </div>
      </div>
      <label className="flex items-center gap-4 mt-6 text-[13px] text-[var(--c-ink)]">缩放<input aria-label="照片缩放" type="range" min={1} max={4} step={.01} value={zoom} disabled={busy || !image} onChange={event => { setOffset({ x, y }); setZoom(Number(event.target.value)) }} className="flex-1 min-w-0 accent-[var(--c-primary)]" /><span className="w-10 text-right">{zoom.toFixed(1)}×</span></label>
      <button type="button" disabled={busy} onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }} className="flex gap-1.5 items-center min-h-11 mt-2 text-[13px] text-[var(--c-primary)]"><RotateCcw size={14} />重置位置</button>
      <p role="status" className="my-3 text-[12px] text-[var(--c-danger)]">{error || (image ? '' : '正在打开图片…')}</p>
      <button type="button" disabled={busy || !image} onClick={() => void apply(true)} className="w-full min-h-12 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] disabled:opacity-40">{busy ? '正在保存…' : '使用裁切照片'}</button>
      <button type="button" disabled={busy || !image} onClick={() => void apply(false)} className="w-full min-h-12 mt-2 text-[13px] text-[var(--c-primary)] disabled:opacity-40">不裁切，使用完整图片</button>
    </div>
  </div>
}
