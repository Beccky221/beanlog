import type { Bean, DailyRecord } from '@/types/bean'
import { DailyRecords } from '@/components/DailyRecords'
import { JournalHeading } from '@/components/JournalHeading'

interface DailyLogProps {
  beans: Bean[]
  onOpenBean: (id: string) => void
  records: DailyRecord[]
  onChange: (records: DailyRecord[]) => void
  onSavePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  onDropPhotos: (ids: (string | undefined)[]) => void
}

/** 每日记录标签页：月历 + 每天的照片、冲煮参数和札记 */
export function DailyLog({ beans, onOpenBean, records, onChange, onSavePhoto, onDropPhotos }: DailyLogProps) {
  const dayCount = new Set(records.map((r) => r.date)).size

  return (
    <div className="list-bottom-space bl-vertical-page">
      <JournalHeading title="每日记录" eyebrow="DAILY BREW JOURNAL" />
      <div className="bl-vertical-page-body">
        <p className="px-5 text-[12px] text-[var(--c-ink-ghost)] pt-1">
          {dayCount > 0 ? `已在 ${dayCount} 天留下记录` : '今天喝了什么，记下来'}
        </p>

      <div className="px-5 mt-4">
        <DailyRecords
          beans={beans}
          onOpenBean={onOpenBean}
          records={records}
          onChange={onChange}
          onSavePhoto={onSavePhoto}
          onDropPhotos={onDropPhotos}
        />
      </div>
      </div>
    </div>
  )
}
