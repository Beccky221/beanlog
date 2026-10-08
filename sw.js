/* 豆袋小记离线缓存：页面导航走网络优先，静态资源走缓存优先
   注意：全部使用相对路径，应用可能部署在子路径下 */
const CACHE = 'beanlog-v3'
const ENTRY = './index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', ENTRY, './manifest.webmanifest', './icon-192.png']))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clientsClaim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  // 页面导航：网络优先，离线时回退到缓存的入口页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(ENTRY, copy))
          return res
        })
        .catch(() => caches.match(ENTRY))
    )
    return
  }

  // 静态资源：缓存优先，未命中则联网并写入缓存
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
    )
  )
})
