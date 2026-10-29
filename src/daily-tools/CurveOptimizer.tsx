import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Bean, DailyRecord } from '@/types/bean'
import type { BrewAnalysis, BrewObservation } from '@/types/brewOptimization'
import { BREW_FIELDS, brewRequest, cleanAnalysis, recognizeBrew } from '@/lib/brewOptimization'
import { RecommendationAccess } from '@/components/RecommendationAccess'
import { editDailyPhoto } from './photoDialog'
export interface DailyToolsConfig { entry: DailyRecord; bean?: Bean; urls?: (string | undefined)[]; onPatch: (patch: Partial<DailyRecord>) => void }
export function CurveOptimizer({ config }: { config: DailyToolsConfig }) {
  const saved = config.entry.brewOptimization?.method === config.entry.method ? config.entry.brewOptimization : undefined
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState('')
  const [observation, setObservation] = useState<BrewObservation | null>(saved?.observation || null)
  const [analysis, setAnalysis] = useState<BrewAnalysis | null>(saved?.analysis || null)
  const [feeling, setFeeling] = useState(saved?.feeling || '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reading, setReading] = useState(false)
  const file = useRef<HTMLInputElement>(null), close = useRef<HTMLButtonElement>(null), trigger = useRef<HTMLButtonElement>(null)
  const controller = useRef<AbortController | null>(null)
  const current = useRef(config); current.current = config
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  useEffect(() => {
    if (!open) return
    const app = document.getElementById('root'), inert = app?.inert
    if (app) app.inert = true
    close.current?.focus()
    return () => { if (app) app.inert = !!inert; trigger.current?.focus({ preventScroll: true }) }
  }, [open])
  const dismiss = () => { controller.current?.abort(); setBusy(''); setOpen(false) }
  const choose = async (source: Blob) => {
    if (source.size > 30 * 1024 * 1024) { setError('图片超过30MB，请先缩小。'); return }
    setReading(true); setError('')
    try {
      const edited = await editDailyPhoto(source)
      if (edited) { setPhoto(edited); setObservation(null); setAnalysis(null); setMessage('') }
    } catch { setError('无法读取这张照片。') }
    finally { setReading(false) }
  }
  const execute = async (step: 'recognize' | 'analyze') => {
    if (busy || reading || (step === 'recognize' && !photo) || (step === 'analyze' && !observation)) return
    controller.current?.abort()
    const task = new AbortController(); controller.current = task
    const timeout = window.setTimeout(() => task.abort(), 75000)
    setBusy(step); setError(''); setMessage('')
    try {
      if (step === 'recognize') {
        const result = await recognizeBrew(photo!, current.current.entry.method || 'espresso', task.signal)
        if (task.signal.aborted) return
        // 图中没出现的字段仅用已填写的参数补充，证据单独列出，供核对来源。
        const fields = { ...result.fields }
        for (const [key, value] of Object.entries(current.current.entry.values)) if (value && !fields[key]) fields[key] = value
        setObservation({ ...result, fields }); setAnalysis(null)
      } else {
        const bean = current.current.bean
        const context = bean ? [bean.name, bean.roastLevel, bean.processingMethod, bean.variety].filter(Boolean).join(' · ') : ''
        const result = await brewRequest('/brew/analyze', { ...observation, method: current.current.entry.method || 'espresso', feeling, context }, task.signal)
        if (task.signal.aborted) return
        if (result.schema !== 'beanlog.brew.analysis.v1') throw new Error('分析结果不完整。')
        setAnalysis(cleanAnalysis(result))
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '请求未完成，请稍后再试。') }
    finally { clearTimeout(timeout); if (controller.current === task) { controller.current = null; setBusy('') } }
  }
  const setField = (key: string, value: string) => {
    if (!observation) return
    setObservation({ ...observation, fields: { ...observation.fields, [key]: value } }); setAnalysis(null); setMessage('')
  }
  const putParameters = () => {
    if (!observation) return
    const method = current.current.entry.method || 'espresso'
    const allowed = method === 'espresso' ? ['dose','yield','time','temp'] : method === 'pour-over' ? ['dose','water','time','temp'] : ['dose','water','hours']
    const values = { ...current.current.entry.values }
    for (const key of allowed) if (observation.fields[key]?.trim()) {
      if (values[key] && values[key] !== observation.fields[key] && !window.confirm(`“${BREW_FIELDS.find(([field]) => field === key)?.[1]}”已有 ${values[key]}，用 ${observation.fields[key]} 替换？`)) continue
      values[key] = observation.fields[key]
    }
    current.current.onPatch({ values }); setMessage('已填入本条记录，点击页面上方“保存”后生效。屏幕计时不一定包含预浸泡，请核对。')
  }
  return <>
    <button type="button" ref={trigger} className="bl-tools-launch" onClick={() => setOpen(true)}>冲煮曲线优化{saved ? ' · 已有分析' : ''}</button>
    {open && createPortal(<div className="bl-tools-modal" role="dialog" aria-modal="true" aria-label="冲煮曲线优化" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); dismiss() }
      if (event.key === 'Tab') {
        const list = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary')
        if (!list.length) return
        if (event.shiftKey && document.activeElement === list[0]) { event.preventDefault(); list[list.length - 1].focus() }
        else if (!event.shiftKey && document.activeElement === list[list.length - 1]) { event.preventDefault(); list[0].focus() }
      }
    }}><section className="bl-tools-dialog">
      <header><h2>冲煮曲线优化</h2><button type="button" ref={close} onClick={dismiss}>返回记录</button></header>
      <p>先整理图中信息，核对后再分析。照片请转正并裁掉黑边，保留坐标、单位、图例与完整曲线。</p>
      <RecommendationAccess inline>{() => <>
        <input ref={file} type="file" accept="image/*" hidden onChange={event => { const photo = event.target.files?.[0]; event.target.value = ''; if (photo) void choose(photo) }} />
        <div className="bl-tools-actions"><button type="button" disabled={!!busy || reading} onClick={() => file.current?.click()}>选择曲线照片</button>
          {photo && <button type="button" disabled={!!busy || reading} onClick={() => void choose(photo)}>裁切 / 旋转</button>}
        </div>
        {!!config.urls?.some(Boolean) && <div className="bl-tools-actions">{config.urls.map((url, index) => url && <button type="button" key={index} disabled={!!busy || reading} onClick={async () => { try { await choose(await (await fetch(url)).blob()) } catch { setError('无法读取记录照片。') } }}>使用记录照片 {index + 1}</button>)}</div>}
        {reading && <p role="status">正在打开照片编辑…</p>}
        {preview && <img className="bl-tools-preview" src={preview} alt="准备识别的冲煮曲线" />}
        <button type="button" className="bl-tools-primary" disabled={!photo || !!busy || reading} onClick={() => void execute('recognize')}>{busy === 'recognize' ? '千问正在读取曲线…' : '识别曲线与参数'}</button>
        {observation && <section className="bl-tools-section">
          <h3>核对识别结果</h3><p>未知项留空。请补充粉量、口感等；计时起点不清楚时，不能把屏幕时间直接视为全程萃取时长。</p>
          <div className="bl-tools-grid">{BREW_FIELDS.map(([key, label]) => <label key={key}>{label}<input inputMode="decimal" value={observation.fields[key] || ''} placeholder="未读到，可补充" disabled={!!busy} onChange={event => setField(key, event.target.value)} /></label>)}</div>
          <label>曲线类型<select disabled={!!busy} value={observation.curveType} onChange={event => { setObservation({ ...observation, curveType: event.target.value }); setAnalysis(null) }}><option value="flow">流量 (g/s)</option><option value="pressure">压力 (bar)</option><option value="temperature">温度</option><option value="weight">重量</option><option value="unknown">无法确定</option></select></label>
          <label>计时起点<select disabled={!!busy} value={observation.timingBasis} onChange={event => { setObservation({ ...observation, timingBasis: event.target.value }); setAnalysis(null) }}><option value="unknown">无法确定</option><option value="pump_start">从启动泵 / 开始注水计时</option><option value="first_drip">从首滴计时</option></select></label>
          <label>曲线观察<textarea disabled={!!busy} rows={3} value={observation.curveSummary} onChange={event => { setObservation({ ...observation, curveSummary: event.target.value }); setAnalysis(null) }} /></label>
          {observation.warnings.map((warning, index) => <p key={index}>待确认：{warning}</p>)}
          <details><summary>查看图中文字依据</summary>{observation.evidence.map((row, index) => <p key={index}>{BREW_FIELDS.find(([key]) => key === row.field)?.[1] || row.field}：{row.text}（{row.confidence === 'high' ? '较清晰' : row.confidence === 'medium' ? '需核对' : '不确定'}）</p>)}</details>
          <label>这杯的口感与目标<textarea rows={2} disabled={!!busy} value={feeling} placeholder="如：偏酸、薄，想更甜；不知道也可以留空" onChange={event => { setFeeling(event.target.value); setAnalysis(null) }} /></label>
          <div className="bl-tools-actions"><button type="button" disabled={!!busy} onClick={putParameters}>采用已核对参数</button></div>
          <button type="button" className="bl-tools-primary" disabled={!!busy || reading} onClick={() => void execute('analyze')}>{busy === 'analyze' ? '千问正在分析…' : '确认并分析优化方向'}</button>
        </section>}
        {analysis && <section className="bl-tools-section"><h3>优化方向</h3><p>{analysis.summary}</p>
          {analysis.findings.map((row, index) => <div className="bl-tools-result" key={index}><strong>观察 {index + 1}：{row.observation}</strong><p>可能原因：{row.hypothesis}</p><p>口感影响（推测）：{row.possibleTaste}</p></div>)}
          {analysis.adjustments.map((row, index) => <div className="bl-tools-result" key={index}><strong>对照尝试 {index + 1}：{row.change}</strong><p>{row.reason}</p><p>验证：{row.check}</p></div>)}
          {!!analysis.limitations.length && <><h4>这张图不能确定</h4><ul>{analysis.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul></>}
          {!!analysis.questions.length && <><h4>还可以补充</h4><ul>{analysis.questions.map((text, index) => <li key={index}>{text}</li>)}</ul></>}
          <button type="button" className="bl-tools-primary" onClick={() => { current.current.onPatch({ brewOptimization: { observation: observation!, analysis, feeling, method: current.current.entry.method || 'espresso', updatedAt: new Date().toISOString() } }); setMessage('分析已放入本条记录，返回后点击上方“保存”。') }}>将分析留在本条记录</button>
        </section>}
        {busy && <button type="button" onClick={() => controller.current?.abort()}>取消等待</button>}
        {error && <p className="bl-tools-error" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <p className="bl-tools-small">仅在点击时发送选中的曲线照片和确认的参数。识图、分析各调用一次千问，不自动重试。建议属于待验证假设。</p>
      </>}</RecommendationAccess>
    </section></div>, document.body)}
  </>
}
