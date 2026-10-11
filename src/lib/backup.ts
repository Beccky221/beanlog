import type { AppData } from '@/lib/store'
import type { Bean, DailyRecord } from '@/types/bean'
import { beanPhotoIds } from '@/types/bean'
import { dataUrlToBlob, blobToDataUrl } from '@/lib/image'
import { getPhoto } from '@/lib/idb'
import { newPhotoId } from '@/lib/store'

export const BACKUP_SCHEMA = 'beanlog.backup'
/** 当前导出格式版本。v1 = localStorage 时代的形状（照片是 dataURL） */
export const BACKUP_VERSION = 2

export interface BackupFile {
  schema: string
  version: number
  app: string
  exportedAt: string
  counts: { beans: number; grinders: number; dailyRecords: number; photos: number }
  data: {
    beans: unknown[]
    grinders: unknown[]
    dailyRecords: unknown[]
    /** 照片单独存：照片 id → dataURL。v2 起才有 */
    photos?: Record<string, string>
  }
}

/* ============================== 导出 ============================== */

/** 控制并发，避免一次把几百张照片全读进内存 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

export async function buildBackup(data: AppData): Promise<BackupFile> {
  const photoIds = new Set<string>()
  for (const bean of data.beans) for (const id of beanPhotoIds(bean)) photoIds.add(id)
  for (const rec of data.dailyRecords) for (const id of rec.photoIds ?? []) photoIds.add(id)

  const idList = [...photoIds]
  const urls = await mapLimit(idList, 4, async (id) => {
    const blob = await getPhoto(id)
    if (!blob) return null
    try {
      return await blobToDataUrl(blob)
    } catch {
      return null
    }
  })
  const photoMap: Record<string, string> = {}
  idList.forEach((id, i) => {
    const url = urls[i]
    if (url) photoMap[id] = url
  })

  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    app: '豆袋小记',
    exportedAt: new Date().toISOString(),
    counts: {
      beans: data.beans.length,
      grinders: data.grinders.length,
      dailyRecords: data.dailyRecords.length,
      photos: Object.keys(photoMap).length,
    },
    data: {
      beans: data.beans,
      grinders: data.grinders,
      dailyRecords: data.dailyRecords,
      photos: photoMap,
    },
  }
}

/* ============================== 导入 ============================== */

export interface ImportResult {
  data: AppData
  photos: number
  /** 旧格式（v1）导入过来说一声，让界面提示"已自动升级" */
  upgradedFromV1: boolean
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('这个文件不是有效的 JSON，可能不是豆袋小记的备份')
  }
  const obj = parsed as Record<string, unknown>
  if (!obj || obj.schema !== BACKUP_SCHEMA) {
    throw new Error('备份文件格式不对（缺少 schema 标记）')
  }
  const version = typeof obj.version === 'number' ? obj.version : 0
  if (version < 1 || version > BACKUP_VERSION) {
    throw new Error(`备份版本 ${version} 不认识，请用更新的版本打开`)
  }
  const data = (obj.data ?? {}) as Record<string, unknown>
  if (!Array.isArray(data.beans)) {
    throw new Error('备份里没有豆子数据，可能文件损坏了')
  }
  return obj as unknown as BackupFile
}

/**
 * 把备份里的照片写回 IndexedDB，并把数据整理成 AppData。
 * v1 备份（照片是嵌在豆子/记录里的 dataURL）也走同一条路，自动升级。
 */
export async function restoreBackup(
  backup: BackupFile,
  writePhoto: (id: string, blob: Blob) => Promise<void>,
): Promise<ImportResult> {
  const rawPhotos = backup.data.photos ?? {}
  const upgradedFromV1 = backup.version < 2

  // 先把独立存放的照片写进去
  const photoEntries = Object.entries(rawPhotos).filter(([, v]) => typeof v === 'string')
  await mapLimit(photoEntries, 4, async ([id, dataUrl]) => {
    try {
      await writePhoto(id, dataUrlToBlob(dataUrl))
    } catch {
      /* 单张失败不影响整体导入 */
    }
  })
  const written = new Set(photoEntries.map(([id]) => id))

  /** 旧格式兜底：字段里直接是 dataURL 就地转成照片 */
  const saveInlineDataUrl = async (value: unknown): Promise<string | undefined> => {
    if (typeof value !== 'string' || !value.startsWith('data:')) return undefined
    const id = newPhotoId()
    try {
      await writePhoto(id, dataUrlToBlob(value))
      written.add(id)
      return id
    } catch {
      return undefined
    }
  }

  const beans: Bean[] = []
  for (const item of asArray(backup.data.beans)) {
    const raw = (item ?? {}) as Record<string, unknown>
    let photoId = typeof raw.photoId === 'string' && written.has(raw.photoId) ? raw.photoId : undefined
    if (!photoId) photoId = await saveInlineDataUrl(raw.photo)

    let originalPhotoId =
      typeof raw.originalPhotoId === 'string' && written.has(raw.originalPhotoId)
        ? raw.originalPhotoId
        : undefined
    if (!originalPhotoId) originalPhotoId = await saveInlineDataUrl(raw.originalPhoto)

    beans.push({
      id: asString(raw.id) || newPhotoId(),
      name: asString(raw.name, '未命名豆袋'),
      brand: typeof raw.brand === 'string' ? raw.brand : undefined,
      variety: typeof raw.variety === 'string' ? raw.variety : undefined,
      flavor: typeof raw.flavor === 'string' ? raw.flavor : undefined,
      roastLevel: (raw.roastLevel as Bean['roastLevel']) ?? '中烘',
      status: (raw.status as Bean['status']) ?? '未开袋',
      rating: typeof raw.rating === 'number' ? raw.rating : 0,
      note: asString(raw.note),
      photoId,
      originalPhotoId,
      placeholder: (raw.placeholder as Bean['placeholder']) ?? undefined,
      openDate: typeof raw.openDate === 'string' ? raw.openDate : undefined,
      trackOpenDate: !!raw.trackOpenDate,
      repurchaseCount: typeof raw.repurchaseCount === 'number' ? raw.repurchaseCount : 0,
      inRepurchase: !!raw.inRepurchase,
      inPlanToBuy: !!raw.inPlanToBuy,
      grindGrinderId: typeof raw.grindGrinderId === 'string' ? raw.grindGrinderId : undefined,
      grindGrinderName: typeof raw.grindGrinderName === 'string' ? raw.grindGrinderName : undefined,
      grindSetting: typeof raw.grindSetting === 'string' ? raw.grindSetting : undefined,
      brews: Array.isArray(raw.brews) ? (raw.brews as Bean['brews']) : undefined,
      createdAt: asString(raw.createdAt) || new Date().toISOString(),
    })
  }

  const dailyRecords: DailyRecord[] = []
  for (const item of asArray(backup.data.dailyRecords)) {
    const raw = (item ?? {}) as Record<string, unknown>
    const photoIds: string[] = []
    if (Array.isArray(raw.photoIds)) {
      for (const id of raw.photoIds) {
        if (typeof id === 'string' && written.has(id)) photoIds.push(id)
      }
    }
    // v1：记录里直接存 dataURL 数组
    if (Array.isArray(raw.photos)) {
      for (const p of raw.photos) {
        const id = await saveInlineDataUrl(p)
        if (id) photoIds.push(id)
      }
    }
    dailyRecords.push({
      id: asString(raw.id) || newPhotoId(),
      date: asString(raw.date) || new Date().toISOString().slice(0, 10),
      photoIds,
      method: typeof raw.method === 'string' ? raw.method : undefined,
      values: (raw.values as Record<string, string>) ?? {},
      note: typeof raw.note === 'string' ? raw.note : undefined,
    })
  }

  const grinders = asArray(backup.data.grinders) as AppData['grinders']

  return {
    data: { beans, grinders, dailyRecords },
    photos: written.size,
    upgradedFromV1,
  }
}

/* ============================== 下载 ============================== */

export function downloadText(text: string, filename: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 稍后释放，Safari 上立即 revoke 会下载失败
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function backupFileName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `豆袋小记-备份-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
}

/** 读取用户选的文件内容 */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
