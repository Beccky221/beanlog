import { useMemo, useState } from 'react'
import { Coffee, Heart, Bookmark, ChevronRight, Palette } from 'lucide-react'
import type { Bean } from '@/types/bean'
import type { Grinder } from '@/types/grinder'
import type { Store } from '@/lib/store'
import { THEMES, type ThemeName } from '@/lib/theme'
import { GrinderManager } from '@/sections/GrinderManager'
import { Repurchase, type ListKey } from '@/sections/Repurchase'
import { DataPanel } from '@/components/DataPanel'
import { useScrollToTop } from '@/lib/useScrollToTop'

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
  const scrollToTop = useScrollToTop()
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
    <div className="list-bottom-space">
      <header
        className="px-6 pt-[calc(2.5rem+var(--safe-t))] pb-2 cursor-pointer select-none"
        onClick={scrollToTop}
        title="回到顶部"
      >
        <p className="text-[11px] tracking-[0.35em] text-[var(--c-ink-faint)] font-medium">BEANLOG</p>
        <h1
          className="text-[34px] leading-none font-bold text-[var(--c-ink)] mt-1.5"
          style={{ fontFamily: "'Songti SC','Noto Serif SC',serif" }}
        >
          我的
        </h1>
      </header>

      {/* 统计：值得回购 / 准备买 可点开对应清单 */}
      <div className="px-6 mt-5 grid grid-cols-3 gap-3">
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

      {/* 主题 */}
      <div className="px-6 mt-6">
        <p className="text-[12px] text-[var(--c-ink-faint)] mb-2 flex items-center gap-1.5">
          <Palette size={13} /> 外观
        </p>
        <div className="bg-[var(--c-surface)] rounded-2xl p-3 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const active = t.id === theme
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTheme(t.id)}
                  aria-pressed={active}
                  className={`rounded-xl px-3 py-3 text-left border transition-colors ${
                    active
                      ? 'border-[var(--c-primary)] bg-[var(--c-soft)]'
                      : 'border-[var(--c-line)] bg-[var(--c-surface)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-[var(--c-border)]"
                      style={{ background: t.id === 'green' ? '#4F8A67' : '#8A7256' }}
                      aria-hidden
                    />
                    <span
                      className={`text-[13.5px] ${
                        active
                          ? 'text-[var(--c-ink)] font-semibold'
                          : 'text-[var(--c-ink-soft)]'
                      }`}
                    >
                      {t.name}
                    </span>
                  </span>
                  <span className="block text-[11px] text-[var(--c-ink-ghost)] mt-1">{t.hint}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 磨豆器管理 */}
      <GrinderManager
        grinders={grinders}
        onAdd={onAddGrinder}
        onUpdate={onUpdateGrinder}
        onRemove={onRemoveGrinder}
      />

      <DataPanel store={store} />

      {/* 关于 */}
      <div className="px-6 mt-6">
        <div className="bg-[var(--c-primary)] rounded-2xl px-5 py-5 text-[var(--c-primary-ink)]">
          <p
            className="text-[18px] font-semibold"
            style={{ fontFamily: "'Songti SC','Noto Serif SC',serif" }}
          >
            豆袋小记
          </p>
          <p className="text-[12.5px] leading-relaxed mt-2 opacity-80">
            留住每一袋的名字，也留住喜欢的理由。买到豆子拍下豆袋，喝过之后补一句感受，准备买豆时回来查一查——这袋，我是不是喝过？
          </p>
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
