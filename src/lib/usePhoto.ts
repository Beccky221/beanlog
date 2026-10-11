/* eslint-disable react-hooks/set-state-in-effect --
   这里的 effect 是把「外部缓存/异步读到的值」同步进 state（照片地址、滑动位置、
   海报渲染结果），setState 都带了相同性判断，不会引起级联渲染。 */
import { useEffect, useState } from 'react'
import { getPhoto } from '@/lib/idb'

/**
 * 照片在 IndexedDB 里，异步取。这个模块负责：
 * - 缓存 blob → objectURL，避免同一张照片反复创建（列表里会重复渲染同一张图）
 * - 组件卸载时释放 objectURL，避免内存泄漏
 */
const urlCache = new Map<string, string>()
const pending = new Map<string, Promise<string | undefined>>()

/** 同步取已缓存的地址；没有就返回 undefined，让调用方先用占位图 */
export function getCachedPhotoUrl(id: string | undefined): string | undefined {
  if (!id) return undefined
  return urlCache.get(id)
}

async function loadUrl(id: string): Promise<string | undefined> {
  const cached = urlCache.get(id)
  if (cached) return cached
  const inflight = pending.get(id)
  if (inflight) return inflight

  const task = getPhoto(id)
    .then((blob) => {
      if (!blob) return undefined
      const url = URL.createObjectURL(blob)
      urlCache.set(id, url)
      return url
    })
    .catch(() => undefined)
    .finally(() => pending.delete(id))

  pending.set(id, task)
  return task
}

function releaseUrl(id: string) {
  const url = urlCache.get(id)
  if (!url) return
  urlCache.delete(id)
  URL.revokeObjectURL(url)
}

/** 删除照片后调用，让缓存和界面一起失效 */
export function forgetPhotoUrl(id: string) {
  releaseUrl(id)
}

/** 清空缓存（导入备份等整体替换数据时用） */
export function resetPhotoCache() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
  pending.clear()
}

/** 只在值真的变化时写 state，避免多余的级联渲染 */
function sameOr(next: string | undefined) {
  return (prev: string | undefined) => (prev === next ? prev : next)
}

function sameList(next: (string | undefined)[]) {
  return (prev: (string | undefined)[]) =>
    prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
}

/** 把照片 id 解析成可直接渲染的地址 */
export function usePhotoUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => getCachedPhotoUrl(id))

  useEffect(() => {
    if (!id) {
      setUrl(sameOr(undefined))
      return
    }
    const cached = getCachedPhotoUrl(id)
    if (cached) {
      setUrl(sameOr(cached))
      return
    }
    let alive = true
    setUrl(sameOr(undefined))
    loadUrl(id).then((u) => {
      if (alive) setUrl(sameOr(u))
    })
    return () => {
      alive = false
    }
  }, [id])

  return url
}

/**
 * 批量版本：每日记录里一天可能有好几张照片。
 * 返回与传入 id 顺序一致的地址数组（取不到的项为 undefined）。
 */
export function usePhotoUrls(ids: string[]): (string | undefined)[] {
  const key = ids.join(',')
  const [urls, setUrls] = useState<(string | undefined)[]>(() =>
    ids.map((id) => getCachedPhotoUrl(id)),
  )

  useEffect(() => {
    let alive = true
    // key 是照片 id 拼出来的，用 key 反推列表即可，不必在渲染期读 ref
    const list = key ? key.split(',') : []
    // 先用缓存里的，剩下的异步补
    setUrls(sameList(list.map((id) => getCachedPhotoUrl(id))))
    Promise.all(list.map((id) => (id ? loadUrl(id) : Promise.resolve(undefined)))).then((res) => {
      if (alive) setUrls(sameList(res))
    })
    return () => {
      alive = false
    }
  }, [key])

  return urls
}
