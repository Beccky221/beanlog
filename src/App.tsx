/* eslint-disable react-hooks/set-state-in-effect --
   两处 effect 都是有意为之：一是把「上一个页面下标」同步进 state（让滑动方向能在
   渲染时就定下来，避免闪一下），二是处理从主屏图标长按菜单进来的深链
   （?action=new / ?action=daily）。两处在写入前都做了判断，不会造成级联渲染。 */
import { useEffect, useRef, useState } from 'react'
import { LayoutGrid, Images, UserRound, CalendarDays, AlertTriangle, X } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { useStore } from '@/lib/store'
import { applyTheme, persistTheme, readStoredTheme, type ThemeName } from '@/lib/theme'
import { BeanLibrary } from '@/sections/BeanLibrary'
import { BeanDetail } from '@/sections/BeanDetail'
import { PosterWall } from '@/sections/PosterWall'
import { Profile } from '@/sections/Profile'
import { DailyLog } from '@/sections/DailyLog'

type Tab = 'library' | 'daily' | 'wall' | 'profile'

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'library', label: '豆库', icon: LayoutGrid },
  { key: 'daily', label: '每日记录', icon: CalendarDays },
  { key: 'wall', label: '豆袋墙', icon: Images },
  { key: 'profile', label: '我的', icon: UserRound },
]

/** 标签顺序，用来判断切页滑动方向 */
const VIEW_ORDER: Record<Tab, number> = { library: 0, daily: 1, wall: 2, profile: 3 }

function newBean(): Bean {
  return {
    id: `bean-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    roastLevel: '中烘',
    status: '未开袋',
    rating: 0,
    note: '',
    placeholder: { color: '#8A4B2A', label: '新豆袋', sub: 'BEANLOG' },
    trackOpenDate: false,
    repurchaseCount: 0,
    inRepurchase: false,
    inPlanToBuy: false,
    createdAt: new Date().toISOString(),
  }
}

export default function App() {
  const store = useStore()
  const { beans, grinders, dailyRecords } = store.data

  const [theme, setTheme] = useState<ThemeName>(() => readStoredTheme())
  const [tab, setTab] = useState<Tab>('library')
  const [draftBean, setDraftBean] = useState<Bean | null>(null)
  const [isNew, setIsNew] = useState(false)

  // 主题写到 <html data-theme>，CSS 变量整体切换
  useEffect(() => {
    applyTheme(theme)
    persistTheme(theme)
  }, [theme])

  const toggleTheme = (next: ThemeName) => setTheme(next)

  /* ----------------------------- 豆子增删改 ----------------------------- */

  const openDetail = (id: string) => {
    const bean = beans.find((b) => b.id === id)
    if (!bean) return
    setDraftBean(bean)
    setIsNew(false)
  }

  const openNew = () => {
    setDraftBean(newBean())
    setIsNew(true)
  }

  const closeDetail = () => {
    setDraftBean(null)
    setIsNew(false)
  }

  const saveDetail = (bean: Bean) => {
    const finalBean = { ...bean, name: bean.name.trim() || '未命名豆袋' }
    store.setBeans((prev) =>
      isNew ? [finalBean, ...prev] : prev.map((b) => (b.id === finalBean.id ? finalBean : b)),
    )
    closeDetail()
  }

  const removeBean = (id: string) => {
    const target = beans.find((b) => b.id === id)
    store.setBeans((prev) => prev.filter((b) => b.id !== id))
    // 照片不再被引用，顺手删掉回收空间
    if (target) store.dropPhotos([target.photoId, target.originalPhotoId])
  }

  const deleteDetail = (id: string) => {
    if (window.confirm('确定删除这袋豆子吗？')) {
      removeBean(id)
      closeDetail()
    }
  }

  const deleteFromLibrary = (id: string) => {
    if (window.confirm('确定删除这袋豆子吗？')) removeBean(id)
  }

  const detailOpen = draftBean !== null

  // 主标签互切：缩放淡入；进出详情页（页中页）：按方向左右滑入。
  // 方向要看「上一个页面」，所以把上一次的下标存成 state：
  // 渲染时直接算类名（不留空档、不闪），effect 里只更新这个下标。
  const viewIndex = detailOpen && draftBean ? TABS.length : VIEW_ORDER[tab]
  const [lastViewIndex, setLastViewIndex] = useState(0)
  const slideClass = detailOpen
    ? 'page-enter-right'
    : lastViewIndex >= TABS.length
      ? 'page-enter-left'
      : 'page-enter-zoom'
  useEffect(() => {
    setLastViewIndex((prev) => (prev === viewIndex ? prev : viewIndex))
  }, [viewIndex])

  // 支持从主屏图标的长按菜单直接进入（manifest 里的 shortcuts）
  const shortcutDone = useRef(false)
  useEffect(() => {
    if (store.loading || shortcutDone.current) return
    shortcutDone.current = true
    const action = new URLSearchParams(window.location.search).get('action')
    if (!action) return
    if (action === 'daily') setTab('daily')
    if (action === 'new') openNew()
    window.history.replaceState(null, '', window.location.pathname)
  }, [store.loading])

  /* ------------------------------- 首次加载 ------------------------------- */

  if (store.loading) {
    return (
      <div className="h-dvh bg-[var(--c-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--c-ink-faint)]">
          <svg viewBox="0 0 120 160" className="w-16 h-auto animate-pulse" aria-hidden>
            <rect x="18" y="10" width="84" height="18" rx="5" fill="var(--c-soft)" />
            <path
              d="M12 28 h96 v104 q0 12 -12 12 h-72 q-12 0 -12 -12 z"
              fill="var(--c-soft)"
            />
            <rect x="34" y="56" width="52" height="56" rx="4" fill="var(--c-surface)" />
          </svg>
          <p className="text-[13px]">正在打开豆库…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-[var(--c-bg)] flex justify-center items-center sm:py-6">
      {/* 手机容器 */}
      <div className="w-full max-w-[430px] h-full sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] bg-[var(--c-app)] relative sm:rounded-[2.4rem] sm:shadow-[0_30px_80px_rgb(var(--c-shadow)/0.28)] sm:border sm:border-[var(--c-border)] overflow-hidden">
        {/* 存储告警：写入失败（多半是空间满了）时出现，避免静默丢数据 */}
        {store.warning && (
          <div className="absolute top-0 inset-x-0 z-40 px-4 pt-[calc(0.75rem+var(--safe-t))]">
            <div className="rounded-2xl bg-[var(--c-danger-bg)] text-[var(--c-danger)] px-4 py-3 flex items-start gap-2.5 shadow-[0_8px_24px_rgb(var(--c-shadow)/0.18)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p className="text-[12.5px] leading-relaxed flex-1">{store.warning.message}</p>
              <button
                type="button"
                onClick={store.dismissWarning}
                aria-label="关闭提示"
                className="shrink-0 active:opacity-60"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <div
          key={detailOpen && draftBean ? `detail-${draftBean.id}` : tab}
          className={`page-scroll h-full overflow-y-auto ${slideClass}`}
        >
          {detailOpen && draftBean ? (
            <BeanDetail
              bean={draftBean}
              isNew={isNew}
              grinders={grinders}
              onSave={saveDetail}
              onDelete={deleteDetail}
              onBack={closeDetail}
              onSavePhoto={store.savePhoto}
              onDropPhotos={store.dropPhotos}
            />
          ) : (
            <>
              {tab === 'library' && (
                <BeanLibrary
                  beans={beans}
                  grinders={grinders}
                  onOpen={openDetail}
                  onAdd={openNew}
                  onDelete={deleteFromLibrary}
                />
              )}
              {tab === 'daily' && (
                <DailyLog
                  records={dailyRecords}
                  onChange={(next) => store.setDailyRecords(() => next)}
                  onSavePhoto={store.savePhoto}
                  onDropPhotos={store.dropPhotos}
                />
              )}
              {tab === 'wall' && <PosterWall beans={beans} onBack={() => setTab('library')} />}
              {tab === 'profile' && (
                <Profile
                  beans={beans}
                  grinders={grinders}
                  store={store}
                  theme={theme}
                  onChangeTheme={toggleTheme}
                  onUpdateBean={(id, patch) =>
                    store.setBeans((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
                  }
                  onOpenBean={openDetail}
                  onAddGrinder={(g) => store.setGrinders((prev) => [...prev, g])}
                  onUpdateGrinder={(id, patch) =>
                    store.setGrinders((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
                  }
                  onRemoveGrinder={(id) => store.setGrinders((prev) => prev.filter((g) => g.id !== id))}
                />
              )}

              {/* 底部标签栏 */}
              <nav className="tab-bar">
                <div className="bg-[var(--c-surface)]/85 backdrop-blur rounded-full shadow-[0_10px_30px_rgb(var(--c-shadow)/0.18)] border border-[var(--c-border)] px-3 py-2 flex gap-1">
                  {TABS.map(({ key, label, icon: Icon }) => {
                    const active = tab === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        aria-current={active ? 'page' : undefined}
                        className="flex flex-col items-center w-[64px] py-1 group"
                      >
                        <span
                          className={`w-10 h-8 rounded-full flex items-center justify-center transition-colors ${
                            active ? 'bg-[var(--c-primary)]' : 'bg-transparent'
                          }`}
                        >
                          <Icon
                            size={18}
                            className={
                              active ? 'text-[var(--c-primary-ink)]' : 'text-[var(--c-ink-soft)]'
                            }
                          />
                        </span>
                        <span
                          className={`text-[10.5px] mt-0.5 ${
                            active
                              ? 'text-[var(--c-ink)] font-semibold'
                              : 'text-[var(--c-ink-faint)]'
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
