import { useEffect, useRef, useState } from 'react'
export function PhotoEditor({ source, onCancel, onApply }: { source: Blob; onCancel: () => void; onApply: (photo: Blob) => void }) {
  const [rotation, setRotation] = useState(0)
  const [url, setUrl] = useState('')
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 1, height: 1 })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { close.current?.focus() }, [])
  useEffect(() => {
    const original = URL.createObjectURL(source)
    let active = true, preview = ''
    const image = new Image()
    image.onload = () => {
      if (!active) return
      try {
        const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight))
        const w = Math.round(image.naturalWidth * scale), h = Math.round(image.naturalHeight * scale)
        const next = document.createElement('canvas')
        next.width = rotation % 180 ? h : w; next.height = rotation % 180 ? w : h
        const context = next.getContext('2d'); if (!context) throw new Error()
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, next.width, next.height)
        context.translate(next.width / 2, next.height / 2); context.rotate(rotation * Math.PI / 180)
        context.drawImage(image, -w / 2, -h / 2, w, h)
        preview = next.toDataURL('image/jpeg', .94)
        setCanvas(next); setUrl(preview); setCrop({ x: 0, y: 0, width: 1, height: 1 }); setError('')
      } catch { setError('图片无法编辑，请换用JPG或PNG。') }
    }
    image.onerror = () => { if (active) setError('当前浏览器无法打开此照片，请换用JPG或PNG。') }
    image.src = original
    return () => { active = false; URL.revokeObjectURL(original) }
  }, [source, rotation])
  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }
  }
  const apply = () => {
    if (!canvas || busy || crop.width < .02 || crop.height < .02) return
    setBusy(true)
    try {
      const next = document.createElement('canvas'), scale = Math.min(1, 1800 / Math.max(canvas.width * crop.width, canvas.height * crop.height))
      next.width = Math.max(1, Math.round(canvas.width * crop.width * scale)); next.height = Math.max(1, Math.round(canvas.height * crop.height * scale))
      const context = next.getContext('2d'); if (!context) throw new Error()
      context.drawImage(canvas, crop.x * canvas.width, crop.y * canvas.height, crop.width * canvas.width, crop.height * canvas.height, 0, 0, next.width, next.height)
      next.toBlob(blob => { setBusy(false); if (blob) onApply(blob); else setError('图片导出失败，请重试。') }, 'image/jpeg', .94)
    } catch { setBusy(false); setError('图片导出失败，请重试。') }
  }
  return <div className="bl-tools-modal" role="dialog" aria-modal="true" aria-label="编辑咖啡照片" onKeyDown={event => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onCancel() }
    if (event.key === 'Tab') {
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      if (!buttons.length) return
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus() }
      else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus() }
    }
  }}>
    <section className="bl-tools-dialog">
      <header><h2>编辑照片</h2><button type="button" ref={close} disabled={busy} onClick={onCancel}>取消</button></header>
      <p>可旋转照片，再拖动框选要保留的区域。曲线图请保留坐标轴、单位和完整曲线。</p>
      <div className="bl-tools-photo-stage">
        {url && <div className="bl-tools-crop" onPointerDown={event => { if (busy) return; event.currentTarget.setPointerCapture(event.pointerId); start.current = point(event); setCrop({ ...start.current, width: 0, height: 0 }) }}
          onPointerMove={event => { if (!start.current) return; const end = point(event), origin = start.current; setCrop({ x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width: Math.abs(origin.x - end.x), height: Math.abs(origin.y - end.y) }) }} onPointerUp={() => { start.current = null }} onPointerCancel={() => { start.current = null }}>
          <img src={url} alt="照片裁切预览" draggable={false} />
          <span style={{ position: 'absolute', pointerEvents: 'none', left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%`, border: '2px solid #fff', boxShadow: '0 0 0 3000px #0005' }} />
        </div>}
      </div>
      <div className="bl-tools-actions"><button type="button" disabled={busy} onClick={() => { setCanvas(null); setRotation(value => (value + 270) % 360) }}>向左旋转</button><button type="button" disabled={busy} onClick={() => { setCanvas(null); setRotation(value => (value + 90) % 360) }}>向右旋转</button><button type="button" disabled={busy} onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}>保留整张</button></div>
      {error && <p role="alert">{error}</p>}
      <button type="button" className="bl-tools-primary" disabled={!canvas || busy || crop.width < .02 || crop.height < .02} onClick={apply}>{busy ? '正在处理…' : '使用这张照片'}</button>
    </section>
  </div>
}
