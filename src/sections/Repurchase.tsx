import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, PlusCircle, X } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { BeanThumb } from '@/components/BeanThumb'

export type ListKey = 'planToBuy' | 'repurchase'

interface RepurchaseProps {
  beans: Bean[]
  onUpdate: (id: string, patch: Partial<Bean>) => void
  onOpen: (id: string) => void
  /** 初始显示哪份清单（从「我的」统计卡点进来时指定） */
  initialList?: ListKey
  /** 提供时页头显示返回按钮（作为「我的」里的页中页使用） */
  onBack?: () => void
}

const META: Record<
  ListKey,
  { title: string; desc: string; flag: 'inPlanToBuy' | 'inRepurchase' }
> = {
  planToBuy: {
    title: '准备买',
    desc: '近期打算买的豆子。',
    flag: 'inPlanToBuy',
  },
  repurchase: {
    title: '值得回购',
    desc: '喝过喜欢、以后愿意再买的豆子。',
    flag: 'inRepurchase',
  },
}

export function Repurchase({ beans, onUpdate, onOpen, initialList, onBack }: RepurchaseProps) {
  const [list, setList] = useState<ListKey>(initialList ?? 'repurchase')
  const [pickerOpen, setPickerOpen] = useState(false)

  const meta = META[list]
  const other: ListKey = list === 'repurchase' ? 'planToBuy' : 'repurchase'

  const inList = useMemo(() => beans.filter((b) => b[meta.flag]), [beans, meta.flag])
  const candidates = useMemo(() => beans.filter((b) => !b[meta.flag]), [beans, meta.flag])

  const otherFlag = META[other].flag

  return (
    <div className="list-bottom-space">
      {/* 页头 */}
      <header className="px-6 pt-[calc(2.5rem+var(--safe-t))] pb-2 flex items-start gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="mt-1 w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.1)] flex items-center justify-center text-[var(--c-ink)] active:scale-95 transition-transform shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <p className="text-[11px] tracking-[0.35em] text-[var(--c-ink-faint)] font-medium">
            ANOTHER GOOD CUP
          </p>
          <h1
            className="text-[34px] leading-none font-bold text-[var(--c-ink)] mt-1.5"
            style={{ fontFamily: "'Songti SC','Noto Serif SC',serif" }}
          >
            回购
          </h1>
        </div>
      </header>

      {/* 分段切换 */}
      <div className="px-6 mt-4">
        <div className="bg-[var(--c-line-soft)] rounded-full p-1 flex">
          {(Object.keys(META) as ListKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setList(key)}
              className={`flex-1 py-2 rounded-full text-[14px] transition-all duration-200 ${
                list === key
                  ? 'bg-[var(--c-surface)] text-[var(--c-ink)] font-semibold shadow-[0_2px_8px_rgb(var(--c-shadow) / 0.12)]'
                  : 'text-[var(--c-ink-soft)]'
              }`}
            >
              {META[key].title}
            </button>
          ))}
        </div>
      </div>

      {/* 说明与添加 */}
      <div className="px-6 mt-4">
        <div className="bg-[var(--c-surface)] rounded-2xl px-4 py-3.5 border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)]">
          <p className="text-[13px] text-[var(--c-ink-faint)]">{meta.desc}</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center gap-2 py-3 mt-1 text-[var(--c-accent)] text-[14.5px] font-medium active:opacity-70"
          >
            <PlusCircle size={18} className="fill-[var(--c-accent)] text-[var(--c-surface)]" />
            添加到“{meta.title}”
          </button>
          <p className="text-[11.5px] text-[var(--c-placeholder)] border-t border-[var(--c-line)] pt-2.5">
            两份清单独立，同一袋可以同时加入。操作后自动保存。
          </p>
        </div>
      </div>

      {/* 清单 */}
      <div className="px-6 mt-6">
        <p className="text-[13px] text-[var(--c-ink-faint)] mb-3">
          {meta.title} · {inList.length} 袋
        </p>
        <div className="space-y-3.5">
          {inList.map((bean) => (
            <div
              key={bean.id}
              className="bg-[var(--c-surface)] rounded-2xl p-3.5 border border-[var(--c-line)] shadow-[0_4px_18px_rgb(var(--c-shadow) / 0.07)]"
            >
              <button
                type="button"
                onClick={() => onOpen(bean.id)}
                className="w-full flex gap-3.5 items-center text-left"
              >
                <div className="w-[64px] h-[78px] rounded-xl bg-[var(--c-photo-well)] overflow-hidden shrink-0 flex items-center justify-center">
                  <BeanThumb bean={bean} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-[var(--c-ink)] break-all leading-snug">
                    {bean.name}
                  </h3>
                  {bean.note && (
                    <p className="text-[12.5px] text-[var(--c-ink-soft)] mt-0.5 line-clamp-1">{bean.note}</p>
                  )}
                  <p className="text-[12px] text-[var(--c-ink-ghost)] mt-1">
                    {bean.repurchaseCount > 0 ? `回购 ${bean.repurchaseCount} 次` : bean.roastLevel}
                  </p>
                </div>
                <ChevronRight size={17} className="text-[var(--c-placeholder)] shrink-0" />
              </button>
              <div className="flex gap-2 mt-3 pl-[2px]">
                <button
                  type="button"
                  onClick={() => onUpdate(bean.id, { [otherFlag]: !bean[otherFlag] })}
                  className="px-3 py-1.5 rounded-full bg-[var(--c-soft)] text-[12.5px] text-[var(--c-soft-ink)] active:scale-95 transition-transform"
                >
                  {bean[otherFlag] ? `取消${META[other].title}` : `加入${META[other].title}`}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(bean.id, { [meta.flag]: false })}
                  className="px-3 py-1.5 rounded-full bg-[var(--c-soft)] text-[12.5px] text-[var(--c-soft-ink)] active:scale-95 transition-transform"
                >
                  取消{meta.title}
                </button>
              </div>
            </div>
          ))}

          {inList.length === 0 && (
            <div className="text-center py-14 text-[var(--c-ink-ghost)]">
              <p className="text-[14px]">「{meta.title}」还是空的</p>
              <p className="text-[12px] mt-1">
                {list === 'repurchase'
                  ? '喝到喜欢的，就把它放进来'
                  : '把最近想买的豆子先记下来'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 添加选择器 */}
      {pickerOpen && (
        <div
          className="absolute inset-0 z-30 bg-[var(--c-ink)]/40 flex items-end"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full bg-[var(--c-app)] rounded-t-3xl max-h-[70%] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-[16px] font-semibold text-[var(--c-ink)]">
                添加到“{meta.title}”
              </h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="关闭"
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[var(--c-ink-soft)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 pb-8 space-y-2">
              {candidates.map((bean) => (
                <button
                  key={bean.id}
                  type="button"
                  onClick={() => {
                    onUpdate(bean.id, { [meta.flag]: true })
                    setPickerOpen(false)
                  }}
                  className="w-full flex items-center gap-3 bg-[var(--c-surface)] rounded-xl p-2.5 border border-[var(--c-line)] text-left active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-12 rounded-lg bg-[var(--c-photo-well)] overflow-hidden shrink-0 flex items-center justify-center">
                    <BeanThumb bean={bean} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                  <span className="text-[14px] text-[var(--c-ink)] break-all">{bean.name}</span>
                </button>
              ))}
              {candidates.length === 0 && (
                <p className="text-center text-[13px] text-[var(--c-ink-ghost)] py-8">
                  所有豆子都在这份清单里了
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
