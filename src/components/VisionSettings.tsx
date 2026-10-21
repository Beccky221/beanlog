import { useState } from 'react'
import { ScanText } from 'lucide-react'
import { RecommendationAccess } from '@/components/RecommendationAccess'
import { checkVisionConfig, clearVisionConfig, getVisionConfig, saveVisionConfig } from '@/lib/cloudVision'

export function VisionSettings() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(() => getVisionConfig().url)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const save = async (check: boolean) => {
    setError(''); setStatus('')
    try {
      saveVisionConfig(url)
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
        <RecommendationAccess inline>{(_session, lock) => <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--c-soft)] p-3"><p>邀请已开启 · 千问识图与风味捕手通用</p><button type="button" onClick={lock} className="shrink-0 py-2">退出授权</button></div>}</RecommendationAccess>
        <details className="mt-3"><summary className="cursor-pointer py-2">高级连接设置</summary>
        <label className="block mt-3">识图服务地址
          <input type="url" value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://你的函数地址.cn-beijing.fcapp.run" autoCapitalize="none" spellCheck={false} className="mt-2 p-3 w-full rounded-xl bg-[var(--c-paper)] outline-none" />
        </label>
        <p className="mt-2 leading-relaxed text-[11px] text-[var(--c-ink-faint)]">默认地址已配置。用户只需验证邀请码；千问 API Key 由管理员保存在后台。</p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button type="button" disabled={busy} onClick={() => void save(true)} className="px-4 py-2 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] disabled:opacity-50">{busy ? '正在检查…' : '保存并检查连接'}</button>
          <button type="button" disabled={busy} onClick={() => void save(false)} className="px-3 py-2 rounded-full">仅保存</button>
          <button type="button" disabled={busy} onClick={() => { clearVisionConfig(); setUrl(getVisionConfig().url); setError(''); setStatus('识图服务地址已恢复默认，邀请授权不变。') }} className="px-3 py-2 rounded-full text-[var(--c-ink-faint)]">恢复默认地址</button>
        </div>
        </details>
        {status && <p role="status" className="mt-3 leading-relaxed">{status}</p>}
        {error && <p role="alert" className="mt-3 leading-relaxed text-[var(--c-danger)]">{error}</p>}
      </div>}
    </div>
  </section>
}
