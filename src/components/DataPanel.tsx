import { useEffect, useRef, useState } from 'react'
import { Download, Upload, RefreshCw, HardDrive, AlertTriangle } from 'lucide-react'
import type { Store } from '@/lib/store'
import {
  BACKUP_SCHEMA,
  BACKUP_VERSION,
  backupFileName,
  buildBackup,
  downloadText,
  parseBackup,
  readTextFile,
  restoreBackup,
} from '@/lib/backup'
import { estimateUsage, putPhoto } from '@/lib/idb'
import { resetPhotoCache } from '@/lib/usePhoto'

interface DataPanelProps {
  store: Store
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 数据管理：导出/导入备份 + 空间占用。
 * 这是「换手机 / 清缓存 / 空间告急」时唯一能救命的地方，所以放在「我的」里显眼位置。
 */
export function DataPanel({ store }: DataPanelProps) {
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [busy, setBusy] = useState<null | 'export' | 'import' | 'prune'>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const photoCount = store.data.beans.filter((b) => b.photoId).length

  const refreshUsage = () => {
    void estimateUsage().then(setUsage)
  }

  useEffect(() => {
    refreshUsage()
  }, [])

  const handleExport = async () => {
    setBusy('export')
    setMessage(null)
    try {
      // 先把待写入的数据落盘，保证导出的就是最新的
      await store.flush()
      const backup = await buildBackup(store.data)
      const text = JSON.stringify(backup, null, 2)
      downloadText(text, backupFileName())
      setMessage({
        kind: 'ok',
        text: `已导出 ${backup.counts.beans} 袋豆子、${backup.counts.photos} 张照片（${formatBytes(text.length)}）`,
      })
    } catch (err) {
      console.error(err)
      setMessage({ kind: 'error', text: '导出失败，请再试一次' })
    } finally {
      setBusy(null)
    }
  }

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    setBusy('import')
    setMessage(null)
    try {
      const text = await readTextFile(file)
      const backup = parseBackup(text)
      const confirmed = window.confirm(
        `即将用备份覆盖当前数据：\n\n豆子 ${(backup.data.beans ?? []).length} 袋\n每日记录 ${(backup.data.dailyRecords ?? []).length} 条\n\n当前数据会被替换，确定继续吗？`,
      )
      if (!confirmed) return

      const result = await restoreBackup(backup, async (id, blob) => {
        await putPhoto(id, blob)
      })
      resetPhotoCache()
      await store.replaceAll(result.data)
      refreshUsage()
      setMessage({
        kind: 'ok',
        text: result.upgradedFromV1
          ? `已从旧版备份恢复 ${result.data.beans.length} 袋豆子、${result.photos} 张照片（照片已转成新格式）`
          : `已恢复 ${result.data.beans.length} 袋豆子、${result.photos} 张照片`,
      })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : '导入失败' })
    } finally {
      setBusy(null)
    }
  }

  const handlePrune = async () => {
    setBusy('prune')
    setMessage(null)
    try {
      const removed = await store.prunePhotos()
      refreshUsage()
      setMessage({
        kind: 'ok',
        text: removed > 0 ? `清理了 ${removed} 张没有用到的照片` : '没有需要清理的照片',
      })
    } finally {
      setBusy(null)
    }
  }

  const rowClass =
    'bl-data-action w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-xl bg-[var(--c-surface)]'

  return (
    <div className="px-6 mt-6">
      <p className="text-[12px] text-[var(--c-ink-faint)] mb-2">数据管理</p>

      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] shadow-[0_3px_14px_rgb(var(--c-shadow) / 0.05)] p-3 space-y-3">
        {/* 存储占用 */}
        <div className="px-1 py-1 flex items-center gap-3">
          <HardDrive size={16} className="text-[var(--c-ink-faint)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] text-[var(--c-ink)]">
              {usage ? `已用 ${formatBytes(usage.usage)}` : '本地存储'}
            </p>
            <p className="text-[11.5px] text-[var(--c-ink-ghost)] mt-0.5">
              {photoCount > 0 ? `${photoCount} 袋有照片` : '还没有照片'}
              {usage && usage.quota > 0 ? ` · 可用 ${formatBytes(usage.quota)}` : ''}
            </p>
          </div>
        </div>

        <button type="button" onClick={handleExport} disabled={busy !== null} className={rowClass}>
          <Download size={16} className="text-[var(--c-primary)] shrink-0" />
          <span className="flex-1">
            <span className="block text-[13.5px] text-[var(--c-ink)]">
              {busy === 'export' ? '正在导出…' : '导出备份'}
            </span>
            <span className="block text-[11.5px] text-[var(--c-ink-ghost)] mt-0.5">
              一袋豆子和照片打成一个文件，换手机时用得上
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className={rowClass}
        >
          <Upload size={16} className="text-[var(--c-primary)] shrink-0" />
          <span className="flex-1">
            <span className="block text-[13.5px] text-[var(--c-ink)]">
              {busy === 'import' ? '正在导入…' : '从备份恢复'}
            </span>
            <span className="block text-[11.5px] text-[var(--c-ink-ghost)] mt-0.5">
              会覆盖当前数据，导入前请确认
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={handlePrune}
          disabled={busy !== null}
          className={rowClass}
        >
          <RefreshCw size={16} className="text-[var(--c-primary)] shrink-0" />
          <span className="flex-1">
            <span className="block text-[13.5px] text-[var(--c-ink)]">{busy === 'prune' ? '正在清理…' : '清理无用的照片'}</span>
            <span className="block text-[11.5px] text-[var(--c-ink-ghost)] mt-0.5">释放未被记录使用的照片空间</span>
          </span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void handleImportFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {message && (
        <div
          className={`mt-3 rounded-xl px-3.5 py-3 flex items-start gap-2 text-[12px] leading-relaxed ${
            message.kind === 'ok'
              ? 'bg-[var(--c-soft)] text-[var(--c-soft-ink)]'
              : 'bg-[var(--c-danger-bg)] text-[var(--c-danger)]'
          }`}
        >
          {message.kind === 'error' && <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      <p className="text-[11.5px] text-[var(--c-ink-ghost)] mt-3 leading-relaxed">
        记录和照片保存在这台设备的浏览器里。使用千问识图时，所选图片会经由识图服务发送至阿里云；本机识别模式不上传图片。搜索附近咖啡馆时，会向地图服务发送定位坐标；使用千问找豆时，会向推荐服务发送所选咖啡偏好。清理浏览器数据、换手机之前，
        记得先导出备份。
      </p>

      <p className="text-[10.5px] text-[var(--c-placeholder)] mt-4">
        备份格式 {BACKUP_SCHEMA} v{BACKUP_VERSION}
      </p>
    </div>
  )
}
