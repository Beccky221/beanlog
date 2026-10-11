import type { DailyRecord } from '@/types/bean'
import { DailyRecords } from '@/components/DailyRecords'
import { useScrollToTop } from '@/lib/useScrollToTop'

interface DailyLogProps {
  records: DailyRecord[]
  onChange: (records: DailyRecord[]) => void
  onSavePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  onDropPhotos: (ids: (string | undefined)[]) => void
}

/** 每日记录标签页：月历 + 每天的照片、冲煮参数和札记 */
export function DailyLog({ records, onChange, onSavePhoto, onDropPhotos }: DailyLogProps) {
  const scrollToTop = useScrollToTop()
  const dayCount = new Set(records.map((r) => r.date)).size

  return (
    <div className="list-bottom-space">
      <header
        className="px-6 pt-[calc(2.5rem+var(--safe-t))] pb-2 cursor-pointer select-none"
        onClick={scrollToTop}
        title="回到顶部"
      >
        <p className="text-[11px] tracking-[0.35em] text-[var(--c-ink-faint)] font-medium">
          DAILY BREW JOURNAL
        </p>
        <h1
          className="text-[34px] leading-none font-bold text-[var(--c-ink)] mt-1.5"
          style={{ fontFamily: "'Songti SC','Noto Serif SC',serif" }}
        >
          每日记录
        </h1>
        <p className="text-[12px] text-[var(--c-ink-ghost)] mt-1.5">
          {dayCount > 0 ? `已在 ${dayCount} 天留下记录` : '今天喝了什么，记下来'}
        </p>
      </header>

      <div className="px-5 mt-4">
        <DailyRecords
          records={records}
          onChange={onChange}
          onSavePhoto={onSavePhoto}
          onDropPhotos={onDropPhotos}
        />
      </div>
    </div>
  )
}
