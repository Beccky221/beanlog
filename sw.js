/* 豆袋小记离线缓存
   - 页面导航：网络优先，离线时回退缓存
   - 静态资源（JS/CSS/图标）：缓存优先
   改动静态资源后记得把 CACHE 版本号 +1，否则老用户会继续用缓存的旧文件。 */
const CACHE = 'beanlog-v7'
const ENTRY = './index.html'
/** 安装时预缓存，保证断网也能打开 */
const PRECACHE = ['./', ENTRY, './manifest.webmanifest', './icon-192.png', './icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 单个文件失败不要拖垮整个安装（比如子路径下少个图标）
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clientsClaim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 页面导航：网络优先，离线时用缓存的入口页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(ENTRY, copy))
          return res
        })
        .catch(() => caches.match(ENTRY).then((hit) => hit || caches.match('./'))),
    )
    return
  }

  // 其它 GET：缓存优先，未命中再联网并写入缓存
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              const copy = res.clone()
              caches.open(CACHE).then((cache) => cache.put(req, copy))
            }
            return res
          })
          .catch(() => hit),
    ),
  )
})

/** 允许页面主动触发更新（以后做「检查更新」按钮用） */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})
