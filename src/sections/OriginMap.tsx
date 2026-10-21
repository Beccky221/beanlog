import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, MapPin } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { mapPoint, summarizeOrigins, WORLD_DOTS } from '@/lib/originMap'
import { AnimatedTitle } from '@/components/AnimatedTitle'

export function OriginMap({ beans, onBack, onOpenBean }: { beans: Bean[]; onBack: () => void; onOpenBean: (id: string) => void }) {
  const { groups, unresolved, mappedCount } = useMemo(() => summarizeOrigins(beans), [beans])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = groups.find(group => group.origin.id === selectedId) ?? groups[0]
  const max = Math.max(1, ...groups.map(group => group.beans.length))
  const markers = groups.map(group => ({ ...group, ...mapPoint(group.origin.lon, group.origin.lat) }))
  const leftMarkers = markers.filter(marker => marker.origin.lon < -25)
  const rightMarkers = markers.filter(marker => marker.origin.lon >= -25)
  const chartHeight = Math.max(280, Math.max(leftMarkers.length, rightMarkers.length) * 94 + 50)
  const mapTop = (chartHeight - 210) / 2
  const callouts = [leftMarkers, rightMarkers].flatMap((sideMarkers, side) =>
    [...sideMarkers].sort((a, b) => a.y - b.y || a.x - b.x || a.origin.id.localeCompare(b.origin.id))
      .map((marker, index) => ({ ...marker, left: side === 0, labelY: (chartHeight - (sideMarkers.length - 1) * 94) / 2 + index * 94 })))
  return (
    <section className="bl-origin-page">
      <header className="bl-origin-header">
        <button type="button" autoFocus onClick={onBack} aria-label="返回豆库"><ArrowLeft size={18} /></button>
        <h1 className="bl-journal-title bl-journal-title-compact" aria-label="产地地图"><AnimatedTitle text="产地地图" /></h1>
        <span className="bl-origin-header-spacer" aria-hidden="true" />
      </header>
      <div className="bl-origin-intro">
        <div className="bl-origin-stats"><span><strong>{groups.length}</strong> 处产地</span><span><strong>{mappedCount}</strong> 袋已标记</span></div>
      </div>
      <div className="bl-origin-map-card">
        <div className="bl-origin-map-label"><span>豆子的旅行地图</span><span>ORIGIN NOTES</span></div>
        <svg viewBox={`0 0 900 ${chartHeight}`} className="bl-origin-world" role="group" aria-label="散点世界地图，产地名称以引线分布在左右两侧；颜色越深代表收藏豆袋越多，点击产地名称查看豆子">
          <g transform={`translate(180 ${mapTop}) scale(.7)`}>
          <g className="bl-origin-guides" aria-hidden="true">
            <path d="M12 117 Q350 113 708 117 M12 211 Q350 215 708 211" />
            <path d="M12 164 Q350 162 708 164" strokeDasharray="2 7" />
          </g>
          <g aria-hidden="true">
            {WORLD_DOTS.map((dot, index) => {
              let weight = 0
              for (const marker of markers) {
                const distance = Math.hypot(dot.x - marker.x, dot.y - marker.y)
                if (distance < 23) weight = Math.max(weight, (marker.beans.length / max) * (1 - distance / 30))
              }
              return <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill={weight ? 'var(--c-primary)' : 'var(--c-ink)'} opacity={weight ? .54 + weight * .44 : .5} />
            })}
          </g>
          {markers.map(marker => (
            <g key={marker.origin.id} className="bl-origin-marker" role="button" tabIndex={0} aria-label={`${marker.origin.name}，${marker.beans.length} 袋`} aria-pressed={selected?.origin.id === marker.origin.id}
              onClick={() => setSelectedId(marker.origin.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(marker.origin.id) } }}>
              <title>{marker.origin.name} · {marker.beans.length} 袋</title>
              <circle cx={marker.x} cy={marker.y} r="21" fill="transparent" />
              <circle className="bl-origin-marker-ring" cx={marker.x} cy={marker.y} r="12" fill="none" stroke="var(--c-primary)" strokeWidth="1.5" opacity={selected?.origin.id === marker.origin.id ? .8 : 0} />
              <circle cx={marker.x} cy={marker.y} r={4 + Math.min(4, Math.sqrt(marker.beans.length))} fill="var(--c-primary)" opacity={.35 + .6 * marker.beans.length / max} stroke="var(--c-surface)" strokeWidth="1.5" />
            </g>
          ))}
          </g>
          {callouts.map((marker, index) => (
            <g key={marker.origin.id} className="bl-origin-callout" style={{ animationDelay: `${300 + Math.min(index, 6) * 55}ms` }} role="button" tabIndex={0} aria-label={`${marker.origin.name}，${marker.beans.length} 袋`} aria-pressed={selected?.origin.id === marker.origin.id}
              onClick={() => setSelectedId(marker.origin.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(marker.origin.id) } }}>
              <path className="bl-origin-leader" pathLength="1" d={`M${180 + marker.x * .7} ${mapTop + marker.y * .7} Q${marker.left ? 200 : 665} ${marker.labelY} ${marker.left ? 177 : 689} ${marker.labelY} L${marker.left ? 167 : 699} ${marker.labelY}`} />
              <circle cx={marker.left ? 167 : 699} cy={marker.labelY} r="2.5" fill="currentColor" />
              <rect className="bl-origin-callout-hit" x={marker.left ? 0 : 704} y={marker.labelY - 34} width={marker.left ? 160 : 190} height="78" rx="12" />
              <text className="bl-origin-callout-name" x={marker.left ? 153 : 711} y={marker.labelY - 4} textAnchor={marker.left ? 'end' : 'start'}>{marker.origin.name}</text>
              <text className="bl-origin-callout-count" x={marker.left ? 153 : 711} y={marker.labelY + 27} textAnchor={marker.left ? 'end' : 'start'}>{marker.beans.length} 袋收藏</text>
            </g>
          ))}
        </svg>
        <div className="bl-origin-legend"><span>少</span><i /><i /><i /><i /><span>多</span><em>收藏袋数</em></div>
      </div>

      {groups.length > 0 ? <>
        {selected && <section className="bl-origin-selection" aria-live="polite">
          <header><h2>{selected.origin.name}</h2><span>{selected.beans.length} 袋收藏</span></header>
          {selected.beans.map((bean, index) => <button key={bean.id} type="button" className="bl-origin-bean" style={{ animationDelay: `${400 + Math.min(index, 5) * 55}ms` }} onClick={() => onOpenBean(bean.id)}><span><strong>{bean.name}</strong><small>{[bean.brand, bean.origin].filter(Boolean).join(' · ')}</small></span><ArrowUpRight size={16} aria-hidden /></button>)}
        </section>}
      </> : <div className="bl-origin-empty"><MapPin size={24} /><p>{beans.length ? '给豆子添一个来处' : '第一袋豆子的旅程，从这里开始'}</p><span>在豆袋的“产区”中填写国家或常见产区，地图就会亮起。</span></div>}

      {unresolved.length > 0 && <details className="bl-origin-unresolved">
        <summary>待标记的豆袋 · {unresolved.length} 袋</summary>
        <p>这些产区暂时无法定位，点开豆袋可以补充国家或产区。</p>
        {unresolved.map(bean => <button type="button" key={bean.id} onClick={() => onOpenBean(bean.id)}><span>{bean.name}<small>{bean.origin?.trim() || '尚未填写产区'}</small></span><ArrowUpRight size={14} /></button>)}
      </details>}
    </section>
  )
}
