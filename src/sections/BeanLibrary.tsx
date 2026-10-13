/* eslint-disable react-hooks/set-state-in-effect --
   这里的 effect 是把「外部缓存/异步读到的值」同步进 state（照片地址、滑动位置、
   海报渲染结果），setState 都带了相同性判断，不会引起级联渲染。 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Bookmark, Plus, Search, Trash2 } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { ROAST_LEVELS } from '@/types/bean'
import type { Grinder } from '@/types/grinder'
import { Stars } from '@/components/Stars'
import { useScrollToTop } from '@/lib/useScrollToTop'
import { BeanThumb } from '@/components/BeanThumb'

interface BeanLibraryProps {
  beans: Bean[]
  grinders: Grinder[]
  onOpen: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

const REVEAL = 76

interface SwipeableItemProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTap: () => void
  onDelete: () => void
  children: React.ReactNode
}

/** 左滑露出删除按钮的卡片容器（iOS 邮件式） */
function SwipeableItem({ open, onOpenChange, onTap, onDelete, children }: SwipeableItemProps) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; horiz: boolean } | null>(null)
  const swiped = useRef(false)

  // 父级把这一张收起时（比如点了别处），滑开状态也跟着复位。
  // 用「上一次的 open」比对，只在真正变化时写 state。
  const prevOpen = useRef(open)
  useEffect(() => {
    if (prevOpen.current === open) return
    prevOpen.current = open
    setOffset((prev) => {
      const next = open ? -REVEAL : 0
      return prev === next ? prev : next
    })
  }, [open])

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, base: open ? -REVEAL : 0, horiz: false }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current
    if (!s) return
    const t = e.touches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (!s.horiz) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        s.horiz = true
        setDragging(true)
      } else if (Math.abs(dy) > 8) {
        start.current = null // 垂直滚动，不干预
        return
      } else {
        return
      }
    }
    setOffset(Math.min(0, Math.max(-REVEAL, s.base + dx)))
  }

  const onTouchEnd = () => {
    const s = start.current
    start.current = null
    if (!s || !s.horiz) return
    swiped.current = true
    setDragging(false)
    const shouldOpen = offset < -REVEAL / 2
    setOffset(shouldOpen ? -REVEAL : 0)
    onOpenChange(shouldOpen)
  }

  const handleClick = () => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    if (open) onOpenChange(false)
    else onTap()
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-[0_4px_18px_rgb(var(--c-shadow) / 0.07)]">
      {/* 底层删除按钮 */}
      <button
        type="button"
        onClick={onDelete}
        aria-label="删除这袋豆子"
        className="absolute inset-y-0 right-0 w-[76px] bg-[var(--c-danger-solid)] text-[var(--c-primary-ink)] flex flex-col items-center justify-center gap-1 active:bg-[var(--c-danger-solid-hover)]"
      >
        <Trash2 size={18} />
        <span className="text-[12px] font-medium">删除</span>
      </button>
      {/* 上层卡片内容（可左滑） */}
      <div
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        className={`relative bg-[var(--c-surface)] rounded-2xl ${dragging ? '' : 'transition-transform duration-200'}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  )
}

export function BeanLibrary({ beans, grinders, onOpen, onAdd, onDelete }: BeanLibraryProps) {
  const scrollToTop = useScrollToTop()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | 'roastLevel' | 'origin' | 'processingMethod' | 'brand'>('all')
  const [filter, setFilter] = useState<string | null>(null)
  const categoryOptions = useMemo<string[]>(() => category === 'all' ? [] : category === 'roastLevel'
    ? [...ROAST_LEVELS]
    : [...new Set(beans.map(bean => (bean[category] ?? '').trim()))].sort((a, b) => {
      if (!a) return 1
      if (!b) return -1
      return a.localeCompare(b, 'zh-CN')
    }), [beans, category])
  const activeFilter = filter !== null && categoryOptions.includes(filter) ? filter : null
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return beans.filter((b) => {
      if (category !== 'all' && activeFilter !== null && (b[category] ?? '').trim() !== activeFilter) return false
      if (!q) return true
      return (
        b.name.toLowerCase().includes(q) ||
        b.note.toLowerCase().includes(q) ||
        (b.brand ?? '').toLowerCase().includes(q) ||
        (b.variety ?? '').toLowerCase().includes(q) ||
        (b.flavor ?? '').toLowerCase().includes(q) ||
        (b.milkFlavor ?? '').toLowerCase().includes(q) ||
        (b.processingMethod ?? '').toLowerCase().includes(q) ||
        (b.origin ?? '').toLowerCase().includes(q) ||
        b.roastLevel.includes(q)
      )
    })
  }, [beans, query, category, activeFilter])

  const grindText = (bean: Bean): string | null => {
    if (!bean.grindSetting) return null
    const grinder = grinders.find((g) => g.id === bean.grindGrinderId)
    const unit = grinder?.unit ?? '格'
    // 关联档案仍存在时显示当前名称；删除后才使用历史名称快照。
    const grinderName = grinder?.name ?? bean.grindGrinderName
    const name = grinderName ? ` · ${grinderName}` : ''
    return `研磨 ${bean.grindSetting} ${unit}${name}`
  }

  return (
    <div className="list-bottom-space">
      {/* 页头（点标题回到顶部，桌面端比较顺手） */}
      <header
        className="px-6 pt-[calc(2.5rem+var(--safe-t))] pb-2 cursor-pointer select-none"
        onClick={scrollToTop}
        title="回到顶部"
      >
        <p className="text-[11px] tracking-[0.35em] text-[var(--c-ink-faint)] font-medium">
          MY BEAN ARCHIVE
        </p>
        <div className="flex items-end justify-between mt-1.5">
          <h1
            className="bl-journal-title text-[34px] leading-none font-bold text-[var(--c-ink)]"
            style={{ fontFamily: "var(--font-title-handwritten)" }}
          >
            豆库
          </h1>
          <span className="text-[13px] text-[var(--c-ink-faint)] pb-0.5">共 {beans.length} 袋</span>
        </div>
      </header>

      {/* 搜索 */}
      <div className="px-6 mt-4">
        <div className="flex items-center gap-2 bg-[var(--c-surface)]/80 border border-[var(--c-border)] rounded-full px-4 py-2.5 shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.05)]">
          <Search size={16} className="text-[var(--c-ink-ghost)] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜豆名、品牌、品种、风味或笔记"
            className="bg-transparent outline-none text-[14px] w-full placeholder:text-[var(--c-placeholder)] text-[var(--c-ink)]"
          />
        </div>
      </div>

      {/* 分类维度与筛选标签 */}
      <div className="px-6 mt-4 flex items-center justify-between gap-3">
        <label htmlFor="bean-category" className="text-[12px] text-[var(--c-ink-faint)]">分类方式</label>
        <select id="bean-category" value={category} onChange={(e) => {
          setCategory(e.target.value as typeof category)
          setFilter(null)
          setOpenId(null)
        }} className="rounded-full px-3 py-2 text-[13px] text-[var(--c-ink)] bg-[var(--c-surface)] border border-[var(--c-border)]">
          <option value="all">全部</option>
          <option value="roastLevel">按烘焙度</option>
          <option value="origin">按产区</option>
          <option value="processingMethod">按处理法</option>
          <option value="brand">店铺</option>
        </select>
      </div>
      {category !== 'all' && <div className="bl-roast-filter px-6 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {categoryOptions.map((r) => (
          <button
            key={`value:${r}`}
            type="button"
            onClick={() => { setFilter(r); setOpenId(null) }}
            aria-pressed={activeFilter === r}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
              activeFilter === r
                ? 'bg-[var(--c-primary)] text-[var(--c-primary-ink)]'
                : 'bg-[var(--c-surface)]/70 text-[var(--c-ink-soft)] border border-[var(--c-border)]'
            }`}
          >
            {r || '未填写'}
          </button>
        ))}
      </div>}

      {/* 豆袋列表 */}
      <div className="px-6 mt-5 space-y-3.5">
        {filtered.map((bean) => (
          <SwipeableItem
            key={bean.id}
            open={openId === bean.id}
            onOpenChange={(o) => setOpenId(o ? bean.id : null)}
            onTap={() => onOpen(bean.id)}
            onDelete={() => {
              setOpenId(null)
              onDelete(bean.id)
            }}
          >
            <div className="p-3.5 flex gap-3.5 border border-[var(--c-line)] rounded-2xl">
              <div className="w-[76px] h-[96px] rounded-xl bg-[var(--c-photo-well)] overflow-hidden shrink-0 flex items-center justify-center">
                <BeanThumb
                  bean={bean}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1 py-0.5 text-left">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-[var(--c-ink)] leading-snug break-all">
                    {bean.name}
                  </h3>
                </div>
                <p className="text-[12px] text-[var(--c-ink-faint)] mt-1">
                  {[bean.origin?.trim(), bean.processingMethod?.trim(), bean.roastLevel].filter(Boolean).join(' · ')}
                </p>
                {grindText(bean) && (
                  <p className="text-[12px] text-[var(--c-ink-faint)] mt-0.5">{grindText(bean)}</p>
                )}
                {bean.rating > 0 && (
                  <div className="mt-1.5">
                    <Stars value={bean.rating} size={13} />
                  </div>
                )}
                {bean.note && (
                  <p className="text-[12.5px] text-[var(--c-ink-soft)] mt-1.5 line-clamp-1">{bean.note}</p>
                )}
                {(bean.inRepurchase || bean.inPlanToBuy) && (
                  <div className="flex gap-1.5 mt-2">
                    {bean.inRepurchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--c-danger-bg)] text-[var(--c-danger)]">
                        <Heart size={10} className="fill-[var(--c-danger)]" /> 值得回购
                      </span>
                    )}
                    {bean.inPlanToBuy && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--c-soft)] text-[var(--c-primary)]">
                        <Bookmark size={10} className="fill-[var(--c-primary)]" /> 准备买
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SwipeableItem>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--c-ink-ghost)]">
            <p className="text-[14px]">没有找到这袋豆子</p>
            <p className="text-[12px] mt-1">换个关键词，或者记下新的一袋</p>
          </div>
        )}
      </div>

      {/* 新增 */}
      <button
        type="button"
        onClick={onAdd}
        aria-label="记一袋新豆子"
        className="floating-action absolute z-20 w-14 h-14 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] shadow-[0_8px_22px_rgb(var(--c-shadow)/0.4)] flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={26} />
      </button>
    </div>
  )
}
