import { useState } from 'react'
import { ScanText } from 'lucide-react'
import { checkVisionConfig, clearVisionConfig, getVisionConfig, saveVisionConfig } from '@/lib/cloudVision'

export function VisionSettings() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(() => getVisionConfig().url)
  const [token, setToken] = useState(() => getVisionConfig().token)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const save = async (check: boolean) => {
    setError(''); setStatus('')
    try {
      saveVisionConfig(url, token)
      if (check) {
        setBusy(true)
        const model = await checkVisionConfig()
        setStatus(`服务已连接（${model}）。尚未调用模型识别图片。`)
      } else setStatus('设置已保存，可以在豆袋页面选择千问识图。尚未检查连接。')
    } catch (err) { setError(err instanceof Error ? err.message : '设置未完成，请重试。') }
    finally { setBusy(false) }
  }
  return <section className="px-6 mt-5">
    <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-4">
      <button type="button" onClick={() => setOpen(!open)} disabled={busy} aria-expanded={open} aria-controls="vision-settings" className="w-full flex items-center gap-3 text-left">
        <ScanText size={20} className="text-[var(--c-accent)]" />
        <span className="flex-1"><span className="block text-[15px] text-[var(--c-ink)]">千问识图设置</span><span className="block mt-1 text-[12px] text-[var(--c-ink-faint)]">连接你的识图服务</span></span>
        <span className="text-[var(--c-ink-faint)]">{open ? '−' : '＋'}</span>
      </button>
      {open && <div id="vision-settings" className="mt-4 text-[12px] text-[var(--c-ink-soft)]">
        <p className="leading-relaxed">使用千问时，你选择的识别图片会经由你的服务发送到阿里云。识别结果需核对后填入。</p>
        <label className="block mt-3">识图服务地址
          <input type="url" value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://你的函数地址.cn-beijing.fcapp.run" autoCapitalize="none" spellCheck={false} className="mt-2 p-3 w-full rounded-xl bg-[var(--c-paper)] outline-none" />
        </label>
        <label className="block mt-3">服务口令
          <input type="password" value={token} disabled={busy} onChange={e => setToken(e.target.value)} placeholder="与后端 VISION_ACCESS_TOKEN 一致" autoComplete="off" className="mt-2 p-3 w-full rounded-xl bg-[var(--c-paper)] outline-none" />
        </label>
        <p className="mt-2 leading-relaxed text-[11px] text-[var(--c-ink-faint)]">口令只保留在本次会话中，不随记录备份。重新打开 APP 后可能需要再填写。千问 API Key 请只填在阿里云函数的环境变量里。</p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button type="button" disabled={busy} onClick={() => void save(true)} className="px-4 py-2 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] disabled:opacity-50">{busy ? '正在检查…' : '保存并检查连接'}</button>
          <button type="button" disabled={busy} onClick={() => void save(false)} className="px-3 py-2 rounded-full">仅保存</button>
          <button type="button" disabled={busy} onClick={() => { clearVisionConfig(); setUrl(getVisionConfig().url); setToken(''); setError(''); setStatus('口令已清除，服务地址已恢复默认。') }} className="px-3 py-2 rounded-full text-[var(--c-ink-faint)]">清除设置</button>
        </div>
        {status && <p role="status" className="mt-3 leading-relaxed">{status}</p>}
        {error && <p role="alert" className="mt-3 leading-relaxed text-[var(--c-danger)]">{error}</p>}
      </div>}
    </div>
  </section>
}
