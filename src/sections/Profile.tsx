import { useMemo, useState } from 'react'
import { Coffee, Heart, Bookmark, ChevronRight, Palette } from 'lucide-react'
import type { Bean } from '@/types/bean'
import type { Grinder } from '@/types/grinder'
import type { Store } from '@/lib/store'
import { THEMES, type ThemeName } from '@/lib/theme'
import { GrinderManager } from '@/sections/GrinderManager'
import { Repurchase, type ListKey } from '@/sections/Repurchase'
import { DataPanel } from '@/components/DataPanel'
import { VisionSettings } from '@/components/VisionSettings'
import { JournalHeading } from '@/components/JournalHeading'
import { APP_NAME, APP_POSITIONING, APP_BRAND_EN } from '@/lib/brand'

interface ProfileProps {
  beans: Bean[]
  grinders: Grinder[]
  store: Store
  theme: ThemeName
  onChangeTheme: (theme: ThemeName) => void
  onUpdateBean: (id: string, patch: Partial<Bean>) => void
  onOpenBean: (id: string) => void
  onAddGrinder: (g: Grinder) => void
  onUpdateGrinder: (id: string, patch: Partial<Grinder>) => void
  onRemoveGrinder: (id: string) => void
}

export function Profile({
  beans,
  grinders,
  store,
  theme,
  onChangeTheme,
  onUpdateBean,
  onOpenBean,
  onAddGrinder,
  onUpdateGrinder,
  onRemoveGrinder,
}: ProfileProps) {
  const [themeOpen, setThemeOpen] = useState(false)
  const activeTheme = THEMES.find(t => t.id === theme)!
  const [openList, setOpenList] = useState<ListKey | null>(null)

  const stats = useMemo(() => {
    const total = beans.length
    const repurchase = beans.filter((b) => b.inRepurchase).length
    const planToBuy = beans.filter((b) => b.inPlanToBuy).length
    return { total, repurchase, planToBuy }
  }, [beans])

  const items: { icon: typeof Coffee; label: string; value: string; list?: ListKey }[] = [
    { icon: Coffee, label: '收藏豆袋', value: `${stats.total} 袋` },
    { icon: Heart, label: '值得回购', value: `${stats.repurchase} 袋`, list: 'repurchase' },
    { icon: Bookmark, label: '准备买', value: `${stats.planToBuy} 袋`, list: 'planToBuy' },
  ]

  return (
    <div className="list-bottom-space bl-vertical-page">
      <JournalHeading title="我的" eyebrow={APP_BRAND_EN} />
      <div className="bl-vertical-page-body">

      {/* 统计：值得回购 / 准备买 可点开对应清单 */}
      <div className="bl-profile-stats px-6 grid grid-cols-3 gap-3">
        {items.map(({ icon: Icon, label, value, list }) =>
          list ? (
            <button
              key={label}
              type="button"
              onClick={() => setOpenList(list)}
              className="relative bg-[var(--c-surface)] rounded-2xl px-4 py-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)] text-left active:scale-[0.96] transition-transform"
            >
              <Icon size={17} className="text-[var(--c-ink-faint)]" />
              <p className="text-[20px] font-semibold text-[var(--c-ink)] mt-2">{value}</p>
              <p className="text-[12px] text-[var(--c-ink-faint)] mt-0.5">{label}</p>
              <ChevronRight
                size={14}
                className="absolute right-3 bottom-4 text-[var(--c-placeholder)]"
                aria-hidden
              />
            </button>
          ) : (
            <div
              key={label}
              className="bg-[var(--c-surface)] rounded-2xl px-4 py-4 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]"
            >
              <Icon size={17} className="text-[var(--c-ink-faint)]" />
              <p className="text-[20px] font-semibold text-[var(--c-ink)] mt-2">{value}</p>
              <p className="text-[12px] text-[var(--c-ink-faint)] mt-0.5">{label}</p>
            </div>
          ),
        )}
      </div>

      <section className="bl-theme-section">
        <button type="button" className="bl-theme-trigger" aria-expanded={themeOpen} aria-controls="bl-theme-options" onClick={() => setThemeOpen(!themeOpen)}>
          <span className="bl-theme-icon" aria-hidden><Palette size={20} /></span>
          <span className="bl-theme-heading"><span className="bl-theme-title">主题颜色</span><span className="bl-theme-subtitle">给咖啡日常，换一种心情</span></span>
          <span className="bl-theme-current"><i style={{background:activeTheme.colors.accent}} />{activeTheme.name}</span>
          <span className="bl-theme-chevron" aria-hidden>{themeOpen ? '−' : '＋'}</span>
        </button>
        {themeOpen && <div id="bl-theme-options" className="bl-theme-options">
          <p className="bl-theme-intro">取色于中国传统色，衬以细腻纸纹。</p>
          <div className="bl-theme-grid" role="group" aria-label="选择 APP 配色">
            {THEMES.map(t => <button key={t.id} type="button" className={'bl-theme-card' + (theme === t.id ? ' is-selected' : '')} aria-pressed={theme === t.id} aria-label={t.name + '，' + t.hint} onClick={() => onChangeTheme(t.id)}>
              <span className="bl-theme-sample" style={{background:t.colors.paper}} aria-hidden>
                <span className="bl-theme-sample-paper" style={{background:t.colors.surface}} />
                <span className="bl-theme-sample-dot" style={{background:t.colors.accent}} />
                <span className="bl-theme-sample-line" style={{background:t.colors.soft}} />
                {theme === t.id && <span className="bl-theme-check" style={{background:t.colors.accent}}>✓</span>}
              </span>
              <span className="bl-theme-card-name">{t.name}</span>
              <span className="bl-theme-card-desc">{t.hint.split(' · ')[0]}</span>
            </button>)}
          </div>
          <p className="bl-theme-note" role="status">当前：{activeTheme.name} · 已自动保存</p>
        </div>}
      </section>

      {/* 磨豆器管理 */}
      <GrinderManager
        grinders={grinders}
        onAdd={onAddGrinder}
        onUpdate={onUpdateGrinder}
        onRemove={onRemoveGrinder}
      />

      <VisionSettings />
      <DataPanel store={store} />

      {/* 关于 */}
      <div className="px-6 mt-6">
        <div className="bg-[var(--c-primary)] rounded-2xl px-5 py-5 text-[var(--c-primary-ink)]">
          <p
            className="text-[18px] font-semibold"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            {APP_NAME}
          </p>
          <p className="text-[12.5px] leading-relaxed mt-2 opacity-80">
            {APP_POSITIONING}。收好喜欢的豆子，记录冲煮参数，也留下每一杯的味道与感受。
          </p>
        </div>
      </div>

      </div>
      {/* 清单页中页：值得回购 / 准备买 */}
      {openList && (
        <div className="absolute inset-0 z-30 bg-[var(--c-app)] overflow-y-auto sheet-enter">
          <Repurchase
            beans={beans}
            onUpdate={onUpdateBean}
            onOpen={onOpenBean}
            initialList={openList}
            onBack={() => setOpenList(null)}
          />
        </div>
      )}
    </div>
  )
}
