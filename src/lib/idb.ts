/**
 * IndexedDB 封装。
 *
 * 为什么不用 localStorage：
 * - localStorage 只有 ~5MB，一张压缩后的咖啡照片就有 200～600KB，十几张就满了；
 * - 而且超出配额时会抛 QuotaExceededError，以前是静默吞掉的，用户以为存上了，其实没有。
 * - IndexedDB 配额通常是几百 MB 起，还能直接存 Blob，所以照片全部放这里。
 *
 * 数据结构：
 *   db "beanlog" v1
 *     store "kv"     : { key: string, value: unknown }  —— 元数据（豆子、磨豆器、每日记录）
 *     store "photos" : { id: string, blob: Blob, createdAt: number }
 */

const DB_NAME = 'beanlog'
const DB_VERSION = 1
const KV_STORE = 'kv'
const PHOTO_STORE = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null

export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined'
}

/** 打开数据库（同一页面只打开一次） */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('当前浏览器不支持 IndexedDB'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      // 其它标签页升级数据库时主动让路，避免 blocked
      db.onversionchange = () => db.close()
      resolve(db)
    }
    req.onerror = () => reject(req.error ?? new Error('打开 IndexedDB 失败'))
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = run(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'))
        t.onabort = () => reject(t.error ?? new Error('IndexedDB 事务被中断'))
      }),
  )
}

/* ------------------------------- 元数据 kv ------------------------------- */

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await tx<{ key: string; value: T } | undefined>(KV_STORE, 'readonly', (s) => s.get(key) as IDBRequest<{ key: string; value: T } | undefined>)
  return row?.value
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await tx(KV_STORE, 'readwrite', (s) => s.put({ key, value }))
}

export async function kvDelete(key: string): Promise<void> {
  await tx(KV_STORE, 'readwrite', (s) => s.delete(key))
}

/* -------------------------------- 照片 -------------------------------- */

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  await tx(PHOTO_STORE, 'readwrite', (s) => s.put({ id, blob, createdAt: Date.now() }))
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  const row = await tx<{ id: string; blob: Blob } | undefined>(PHOTO_STORE, 'readonly', (s) => s.get(id) as IDBRequest<{ id: string; blob: Blob } | undefined>)
  return row?.blob
}

export async function deletePhoto(id: string): Promise<void> {
  await tx(PHOTO_STORE, 'readwrite', (s) => s.delete(id))
}

/** 清空所有照片，用于「导入备份」时整体替换 */
export async function clearPhotos(): Promise<void> {
  await tx(PHOTO_STORE, 'readwrite', (s) => s.clear())
}

/** 列出所有照片 id（清理孤儿照片时用） */
export async function listPhotoIds(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>(PHOTO_STORE, 'readonly', (s) => s.getAllKeys())
  return keys.map(String)
}

/** 数据库当前占用的空间（各浏览器支持程度不同，取不到就返回 null） */
export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (!est || typeof est.usage !== 'number' || typeof est.quota !== 'number') return null
    return { usage: est.usage, quota: est.quota }
  } catch {
    return null
  }
}

/** 请求「持久化存储」，避免系统在空间紧张时清掉我们的数据 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
