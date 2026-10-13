import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Bean, DailyRecord } from '@/types/bean'
import { beanPhotoIds } from '@/types/bean'
import type { RecommendationState } from '@/types/recommendation'
import { normalizeRecommendationState } from '@/lib/recommendations'
import type { Grinder } from '@/types/grinder'
import {
  clearPhotos,
  deletePhoto,
  kvGet,
  kvSet,
  listPhotoIds,
  putPhoto,
  requestPersistence,
} from '@/lib/idb'
import { dataUrlToBlob } from '@/lib/image'
import { forgetPhotoUrl, resetPhotoCache } from '@/lib/usePhoto'
import { makeSampleBeans } from '@/data/sampleBeans'

const DATA_KEY = 'appData'
const MIGRATED_KEY = 'migratedFromLocalStorage'
/** 旧版本（数据全在 localStorage 里）用过的键 */
const LEGACY = {
  beans: 'beanlog.beans.v1',
  grinders: 'beanlog.grinders.v1',
  dailyRecords: 'beanlog.dailyRecords.v1',
} as const

export interface AppData {
  recommendations?: RecommendationState
  beans: Bean[]
  grinders: Grinder[]
  dailyRecords: DailyRecord[]
}

export interface StorageWarning {
  kind: 'quota' | 'unknown'
  message: string
  at: number
}

function defaultGrinders(): Grinder[] {
  return [
    {
      id: 'grinder-default-electric',
      name: '我的电动磨豆器',
      min: 1,
      max: 40,
      step: 1,
      unit: '格',
      note: '数字越小磨得越细',
    },
  ]
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function newPhotoId(): string {
  return newId('photo')
}

/* ============================ 迁移旧数据 ============================ */

function readLegacyArray<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : null
  } catch {
    return null
  }
}

/** 把 dataURL 存进 IndexedDB，返回照片 id；不是 dataURL 就返回 undefined */
async function importDataUrlPhoto(value: unknown): Promise<string | undefined> {
  if (typeof value !== 'string' || !value.startsWith('data:')) return undefined
  try {
    const id = newPhotoId()
    await putPhoto(id, dataUrlToBlob(value))
    return id
  } catch {
    return undefined
  }
}

/**
 * 把 localStorage 时代的数据搬到 IndexedDB：
 * 照片从 dataURL 变成 blob，豆子和每日记录只留 id。
 * 搬完后清掉旧键，localStorage 立刻腾出空间。
 */
async function migrateFromLocalStorage(): Promise<AppData | null> {
  const legacyBeans = readLegacyArray<Record<string, unknown>>(LEGACY.beans)
  const legacyGrinders = readLegacyArray<Grinder>(LEGACY.grinders)
  const legacyRecords = readLegacyArray<Record<string, unknown>>(LEGACY.dailyRecords)
  if (!legacyBeans && !legacyGrinders && !legacyRecords) return null

  const beans: Bean[] = []
  for (const raw of legacyBeans ?? []) {
    const photoId = await importDataUrlPhoto(raw.photo)
    const originalPhotoId = await importDataUrlPhoto(raw.originalPhoto)
    const bean = { ...raw } as Record<string, unknown>
    // 旧版本里嵌在豆子上的字段，清掉
    delete bean.photo
    delete bean.originalPhoto
    delete bean.grams
    delete bean.dailyRecords
    beans.push({
      ...(bean as unknown as Bean),
      photoId,
      originalPhotoId,
      placeholder: (raw.placeholder as Bean['placeholder']) ?? undefined,
      status: (raw.status as Bean['status']) ?? '未开袋',
      roastLevel: (raw.roastLevel as Bean['roastLevel']) ?? '中烘',
      rating: typeof raw.rating === 'number' ? raw.rating : 0,
      note: typeof raw.note === 'string' ? raw.note : '',
      trackOpenDate: !!raw.trackOpenDate,
      repurchaseCount: typeof raw.repurchaseCount === 'number' ? raw.repurchaseCount : 0,
      inRepurchase: !!raw.inRepurchase,
      inPlanToBuy: !!raw.inPlanToBuy,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    })
  }

  const dailyRecords: DailyRecord[] = []
  for (const raw of legacyRecords ?? []) {
    const photos = Array.isArray(raw.photos) ? (raw.photos as unknown[]) : []
    const photoIds: string[] = []
    for (const p of photos) {
      const id = await importDataUrlPhoto(p)
      if (id) photoIds.push(id)
    }
    dailyRecords.push({
      id: typeof raw.id === 'string' ? raw.id : newId('rec'),
      date: typeof raw.date === 'string' ? raw.date : new Date().toISOString().slice(0, 10),
      photoIds,
      method: typeof raw.method === 'string' ? raw.method : undefined,
      values: (raw.values as Record<string, string>) ?? {},
      note: typeof raw.note === 'string' ? raw.note : undefined,
    })
  }

  try {
    localStorage.removeItem(LEGACY.beans)
    localStorage.removeItem(LEGACY.grinders)
    localStorage.removeItem(LEGACY.dailyRecords)
  } catch {
    /* 清不掉也无所谓，反正不再读了 */
  }

  return {
    beans,
    grinders: legacyGrinders ?? defaultGrinders(),
    dailyRecords,
  }
}

/** 删掉没有任何地方引用的照片，回收空间 */
async function pruneOrphanPhotos(data: AppData): Promise<number> {
  const used = new Set<string>()
  for (const bean of data.beans) for (const id of beanPhotoIds(bean)) used.add(id)
  for (const rec of data.dailyRecords) for (const id of rec.photoIds) used.add(id)

  const all = await listPhotoIds()
  const orphans = all.filter((id) => !used.has(id))
  await Promise.all(orphans.map((id) => deletePhoto(id).catch(() => {})))
  return orphans.length
}

/* ============================== 主 store ============================== */

export interface Store {
  setRecommendations: (state: RecommendationState) => void
  data: AppData
  loading: boolean
  /** 上次保存失败（多半是空间满了）的提示 */
  warning: StorageWarning | null
  dismissWarning: () => void
  setBeans: (updater: (prev: Bean[]) => Bean[]) => void
  setGrinders: (updater: (prev: Grinder[]) => Grinder[]) => void
  setDailyRecords: (updater: (prev: DailyRecord[]) => DailyRecord[]) => void
  /** 保存一张照片，返回照片 id */
  savePhoto: (blob: Blob, original?: Blob) => Promise<{ id: string; originalId?: string }>
  /** 删除一组照片（照片删掉后界面上的地址也会失效） */
  dropPhotos: (ids: (string | undefined)[]) => void
  /** 用备份数据整体替换 */
  replaceAll: (next: AppData) => Promise<void>
  /** 恢复成示例数据 */
  resetToSamples: () => Promise<void>
  /** 清理没有引用的照片，返回清掉的数量 */
  prunePhotos: () => Promise<number>
  /** 立即落盘（导出前调用，保证拿到最新数据） */
  flush: () => Promise<void>
}

export function useStore(): Store {
  const [data, setData] = useState<AppData>({ beans: [], grinders: defaultGrinders(), dailyRecords: [] })
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState<StorageWarning | null>(null)

  const dirty = useRef(false)
  const latest = useRef(data)
  latest.current = data
  const saveTimer = useRef<number | undefined>(undefined)
  /** 每次状态变化都 +1，用来判断写入是否是针对最新状态 */
  const stateVersion = useRef(0)

  /* ---------------------------- 启动：读数据 ---------------------------- */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const migrated = await kvGet<boolean>(MIGRATED_KEY)
        let loaded: AppData | null = null

        if (!migrated) {
          loaded = await migrateFromLocalStorage()
          if (loaded) {
            await kvSet(DATA_KEY, loaded)
            await kvSet(MIGRATED_KEY, true)
          }
        }

        if (!loaded) {
          loaded = (await kvGet<AppData>(DATA_KEY)) ?? null
          // 老库也要把迁移标记补上，避免每次都去找 localStorage
          if (!migrated) await kvSet(MIGRATED_KEY, true)
        }

        if (!loaded) {
          // 全新用户：给一柜子示例豆子，先让界面有东西看
          loaded = { beans: makeSampleBeans(), grinders: defaultGrinders(), dailyRecords: [] }
          await kvSet(DATA_KEY, loaded)
        }

        if (!alive) return
        setData({
          beans: loaded.beans ?? [],
          grinders: loaded.grinders?.length ? loaded.grinders : defaultGrinders(),
          dailyRecords: loaded.dailyRecords ?? [],
          recommendations: normalizeRecommendationState(loaded.recommendations),
        })
        // 顺手清一次孤儿照片（比如上次删豆子时留下的）
        void pruneOrphanPhotos(loaded).catch(() => {})
        // 尽量申请持久化，别让系统在空间紧张时清掉
        void requestPersistence()
      } catch (err) {
        console.error('读取本地数据失败', err)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  /* ------------------------------ 写入 ------------------------------ */
  /**
   * 保存时给每次写入编号。
   * 关键：不能因为「写 A 的过程中又改了状态」而漏掉后一次改动，
   * 也不能让先发起的写入（可能很慢）覆盖后一次更新的内容。
   * 所以写入完成后比对版本号，发现期间有新改动就再写一遍。
   */
  const persist = useCallback(async () => {
    if (!dirty.current) return
    const version = stateVersion.current
    dirty.current = false
    try {
      await kvSet(DATA_KEY, latest.current)
      setWarning((w) => (w?.kind === 'quota' ? null : w))
      // 写入期间状态又变了：标记为待写入，交给下一次调度（或这里补一次）
      if (stateVersion.current !== version) dirty.current = true
    } catch (err) {
      // 失败就保持脏标记，下次还会尝试
      dirty.current = true
      const isQuota =
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      setWarning({
        kind: isQuota ? 'quota' : 'unknown',
        message: isQuota
          ? '本地空间不够了，最近的改动可能没存上。建议先导出备份，再删掉一些不用的照片。'
          : '保存失败，最近的改动可能没存上。建议先导出备份。',
        at: Date.now(),
      })
    }
  }, [])

  /** 取消排队中的延迟保存（整体替换数据前必须调用，否则旧状态会覆盖新数据） */
  const cancelScheduled = useCallback(() => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = undefined
    }
  }, [])

  const schedule = useCallback(() => {
    dirty.current = true
    cancelScheduled()
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = undefined
      void persist()
    }, 350)
  }, [persist, cancelScheduled])

  // 页面要被隐藏/关闭时，把没写完的立刻写掉
  useEffect(() => {
    const flushNow = () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = undefined
      }
      void persist()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushNow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushNow)
      flushNow()
    }
  }, [persist])

  const update = useCallback(
    (patch: (prev: AppData) => AppData) => {
      stateVersion.current += 1
      setData((prev) => patch(prev))
      schedule()
    },
    [schedule],
  )

  /* ---------------------------- 对外操作 ---------------------------- */

  const savePhoto = useCallback(async (blob: Blob, original?: Blob) => {
    const id = newPhotoId()
    await putPhoto(id, blob)
    let originalId: string | undefined
    if (original) {
      originalId = newPhotoId()
      try {
        await putPhoto(originalId, original)
      } catch {
        originalId = undefined
      }
    }
    return { id, originalId }
  }, [])

  const dropPhotos = useCallback((ids: (string | undefined)[]) => {
    for (const id of ids) {
      if (!id) continue
      forgetPhotoUrl(id)
      void deletePhoto(id).catch(() => {})
    }
  }, [])

  const replaceAll = useCallback(
    async (next: AppData) => {
      // 关键：先取消排队中的延迟保存，否则它会在导入后再写一遍旧数据
      cancelScheduled()
      stateVersion.current += 1
      setData(next)
      latest.current = next
      dirty.current = true
      await persist()
      void pruneOrphanPhotos(next).catch(() => {})
    },
    [persist, cancelScheduled],
  )

  const resetToSamples = useCallback(async () => {
    const next: AppData = { beans: makeSampleBeans(), grinders: defaultGrinders(), dailyRecords: [] }
    cancelScheduled()
    await clearPhotos()
    resetPhotoCache()
    stateVersion.current += 1
    setData(next)
    latest.current = next
    dirty.current = true
    await persist()
  }, [persist, cancelScheduled])

  const prunePhotos = useCallback(async () => {
    return pruneOrphanPhotos(latest.current)
  }, [])

  const flush = useCallback(async () => {
    cancelScheduled()
    await persist()
  }, [persist, cancelScheduled])

  return useMemo(
    () => ({
      data,
      loading,
      warning,
      dismissWarning: () => setWarning(null),
      setBeans: (updater) => update((prev) => ({ ...prev, beans: updater(prev.beans) })),
      setGrinders: (updater) => update((prev) => ({ ...prev, grinders: updater(prev.grinders) })),
      setRecommendations: (state: RecommendationState) => update(prev => ({ ...prev, recommendations: normalizeRecommendationState(state) })),
    setDailyRecords: (updater) =>
        update((prev) => ({ ...prev, dailyRecords: updater(prev.dailyRecords) })),
      savePhoto,
      dropPhotos,
      replaceAll,
      resetToSamples,
      prunePhotos,
      flush,
    }),
    [data, loading, warning, update, savePhoto, dropPhotos, replaceAll, resetToSamples, prunePhotos, flush],
  )
}
