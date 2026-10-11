/* eslint-disable react-hooks/set-state-in-effect --
   这里的 effect 是把「外部缓存/异步读到的值」同步进 state（照片地址、滑动位置、
   海报渲染结果），setState 都带了相同性判断，不会引起级联渲染。 */
import { useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import type { Bean } from '@/types/bean'
import { renderPoster, downloadDataUrl } from '@/lib/poster'

interface PosterWallProps {
  beans: Bean[]
  onBack: () => void
}

export function PosterWall({ beans, onBack }: PosterWallProps) {
  const [poster, setPoster] = useState<string | null>(null)
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let alive = true
    // 重新排版时把旧海报换成「正在排版」，避免看到上一版的图
    setRendering(true)
    renderPoster(beans)
      .then((url) => {
        if (!alive) return
        setPoster(url)
        setRendering(false)
      })
      .catch(() => {
        if (alive) setRendering(false)
      })
    return () => {
      alive = false
    }
  }, [beans])

  const save = () => {
    if (poster) downloadDataUrl(poster, '我的咖啡收藏.png')
  }

  const share = async () => {
    if (!poster) return
    try {
      const blob = await (await fetch(poster)).blob()
      const file = new File([blob], '我的咖啡收藏.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '我的咖啡收藏' })
        return
      }
    } catch {
      /* 不支持分享就退回下载 */
    }
    save()
  }

  return (
    <div className="list-bottom-space">
      {/* 顶栏 */}
      <div className="px-5 pt-[calc(1.5rem+var(--safe-t))] flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 h-10 rounded-full bg-white shadow-[0_2px_10px_rgb(var(--c-shadow) / 0.1)] text-[13.5px] text-[var(--c-ink)] active:scale-95 transition-transform"
        >
          返回调整
        </button>
        <h2 className="text-[16px] font-semibold text-[var(--c-ink)]">海报预览</h2>
        <span className="w-[76px]" />
      </div>

      <p className="text-center text-[13px] text-[var(--c-ink-faint)] mt-4">
        {Math.min(beans.length, 9)} 袋豆子的收藏海报
      </p>

      {/* 海报 */}
      <div className="px-6 mt-4">
        <div className="rounded-md overflow-hidden shadow-[0_14px_40px_rgb(var(--c-shadow) / 0.18)] border border-[var(--c-border)] bg-[var(--c-poster-bg)]">
          {poster ? (
            <img src={poster} alt="我的咖啡收藏海报" className="w-full block" draggable={false} />
          ) : (
            <div className="aspect-[3/4] flex items-center justify-center text-[var(--c-ink-ghost)] text-[13px]">
              {rendering ? '正在排版豆袋墙…' : '暂无豆子'}
            </div>
          )}
        </div>
      </div>


      {/* 操作 */}
      <div className="px-6 mt-5 flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!poster}
          className="flex-1 h-12 rounded-full bg-[var(--c-primary)] text-[var(--c-primary-ink)] text-[14.5px] font-medium flex items-center justify-center gap-2 shadow-[0_8px_22px_rgb(var(--c-shadow)/0.35)] active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <Download size={16} /> 保存到相册
        </button>
        <button
          type="button"
          onClick={share}
          disabled={!poster}
          className="flex-1 h-12 rounded-full bg-[var(--c-tint)] text-[var(--c-tint-ink)] text-[14.5px] font-medium flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <Share2 size={16} /> 分享海报
        </button>
      </div>
    </div>
  )
}
