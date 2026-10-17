/* eslint-disable react-hooks/set-state-in-effect --
   两处 effect 都是有意为之：一是把「上一个页面下标」同步进 state（让滑动方向能在
   渲染时就定下来，避免闪一下），二是处理从主屏图标长按菜单进来的深链
   （?action=new / ?action=daily）。两处在写入前都做了判断，不会造成级联渲染。 */
import { useEffect, useRef, useState } from 'react'
import { logoUrl } from '@/lib/logo'
import { APP_NAME, APP_POSITIONING, APP_BRAND_EN } from '@/lib/brand'
import { ArrowLeft, ArrowUpRight, AlertTriangle, X } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { useStore } from '@/lib/store'
import { applyTheme, persistTheme, readStoredTheme, type ThemeName } from '@/lib/theme'
import { BeanLibrary } from '@/sections/BeanLibrary'
import { BeanDetail } from '@/sections/BeanDetail'
import { PosterWall } from '@/sections/PosterWall'
import { Profile } from '@/sections/Profile'
import { DailyLog } from '@/sections/DailyLog'
import { CoffeeRecommendations } from '@/sections/CoffeeRecommendations'
import { RecommendationAccess } from '@/components/RecommendationAccess'

type Section = 'library' | 'daily' | 'recommendations' | 'profile'
type Tab = 'home' | Section

const TABS: { key: Section; label: string; english: string; note: string }[] = [
  { key: 'library', label: '豆库', english: 'BEAN ARCHIVE', note: '收好每一袋喜欢' },
  { key: 'daily', label: '每日记录', english: 'DAILY JOURNAL', note: '记下一杯的日常' },
  { key: 'recommendations', label: '找豆推荐', english: 'COFFEE DISCOVERY', note: '商品豆与烘焙商 · 邀请制' },
  { key: 'profile', label: '我的', english: 'MY CORNER', note: '偏好与随身工具' },
]

const VIEW_ORDER: Record<Tab, number> = { home: 0, library: 1, daily: 2, recommendations: 3, profile: 4 }

function HomeDirectory({ onOpen }: { onOpen: (section: Section) => void }) {
  return (
    <main className="bl-home-directory">
      <header className="bl-home-intro">
        <p>{APP_BRAND_EN} · COFFEE FIELD NOTES</p>
        <h1 className="bl-journal-title">{APP_NAME}</h1>
        <span>{APP_POSITIONING}</span>
      </header>
      <nav className="bl-home-chapters" aria-label="选择板块">
        {TABS.map(({ key, label, english, note }, index) => (
          <button key={key} type="button" className="bl-home-chapter" aria-label={key === 'recommendations' ? '找一袋喜欢的豆，商品豆与烘焙商推荐，凭邀请码开启' : undefined} onClick={() => onOpen(key)}>
            <span className="bl-home-chapter-index" aria-hidden>0{index + 1}</span>
            <ArrowUpRight size={16} className="bl-home-chapter-arrow" aria-hidden />
            <span className={`bl-home-chapter-title ${key === 'library' ? 'bl-library-title' : 'bl-journal-title'}`}>{label}</span>
            <span className="bl-home-chapter-english">{english}</span>
            <span className="bl-home-chapter-note">{note}</span>
          </button>
        ))}
      </nav>
      <p className="bl-home-footer">一袋一记 · 一杯一日</p>
    </main>
  )
}

function newBean(): Bean {
  return {
    id: `bean-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    roastLevel: '中烘',
    status: '未开袋',
    rating: 0,
    note: '',
    placeholder: { color: '#8A4B2A', label: '新豆袋', sub: APP_BRAND_EN },
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
  const [tab, setTab] = useState<Tab>('home')
  const [draftBean, setDraftBean] = useState<Bean | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [wallOpen, setWallOpen] = useState(false)
  const closeWall = () => {
    setWallOpen(false)
    requestAnimationFrame(() => document.getElementById('bean-library-wall')?.focus())
  }

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
    const finalBean = {
      ...bean,
      name: bean.name.trim() || '未命名豆袋',
      brand: bean.brand?.trim() || undefined,
      variety: bean.variety?.trim() || undefined,
      flavor: bean.flavor?.trim() || undefined,
    }
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
  const viewIndex = detailOpen && draftBean ? TABS.length + 1 : VIEW_ORDER[tab]
  const [lastViewIndex, setLastViewIndex] = useState(0)
  const slideClass = detailOpen
    ? 'page-enter-right'
    : lastViewIndex > TABS.length
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
    if (action === 'new') { setTab('library'); openNew() }
    window.history.replaceState(null, '', window.location.pathname)
  }, [store.loading])

  /* ------------------------------- 首次加载 ------------------------------- */

  if (store.loading) {
    return (
      <div className="h-dvh bg-[var(--c-app)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--c-ink-faint)]">
          <span className="beanlog-startup-logo" style={{ maskImage: `url("${logoUrl}")`, WebkitMaskImage: `url("${logoUrl}")` }} aria-hidden />
          <p className="text-[13px]">正在打开豆库…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-[var(--c-bg)] flex justify-center items-center sm:py-6">
      {/* 手机容器 */}
      <div className="bl-directory-app w-full max-w-[430px] h-full sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] bg-[var(--c-app)] relative sm:rounded-[2.4rem] sm:shadow-[0_30px_80px_rgb(var(--c-shadow)/0.28)] sm:border sm:border-[var(--c-border)] overflow-hidden">
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
          inert={wallOpen}
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
              {tab === 'home' && <HomeDirectory onOpen={setTab} />}
              {tab !== 'home' && tab !== 'recommendations' && <button type="button" className="bl-home-return" onClick={() => setTab('home')}><ArrowLeft size={15} aria-hidden />首页</button>}
              {tab === 'library' && (
                <BeanLibrary
                  beans={beans}
                  grinders={grinders}
                  onOpen={openDetail}
                  onAdd={openNew}
                  onDelete={deleteFromLibrary}
                  onOpenWall={() => setWallOpen(true)}
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
              {tab === 'recommendations' && (
                <RecommendationAccess onBack={() => setTab('home')}>
                  {(connection, lock) => <CoffeeRecommendations beans={beans} value={store.data.recommendations} onChange={store.setRecommendations} onBack={() => setTab('home')} connection={connection} onAccessExpired={lock} />}
                </RecommendationAccess>
              )}
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


            </>
          )}
        </div>
        {wallOpen && (
          <div className="absolute inset-0 z-30 bg-[var(--c-app)] overflow-y-auto sheet-enter" role="dialog" aria-modal="true" aria-label="豆库展示墙" onKeyDown={(event) => { if (event.key === 'Escape') closeWall() }}>
            <PosterWall beans={beans} onBack={closeWall} />
          </div>
        )}
      </div>
    </div>
  )
}
