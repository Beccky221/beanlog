export interface NearbyCafe {
  id: string
  name: string
  address: string
  distance: number
}

const cache = new Map<string, { time: number; cafes: NearbyCafe[] }>()
const radians = (value: number) => value * Math.PI / 180
function distance(lat: number, lon: number, otherLat: number, otherLon: number) {
  const a = Math.sin(radians(otherLat - lat) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(otherLat)) * Math.sin(radians(otherLon - lon) / 2) ** 2
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a))))
}

/** 用户定位后查询一次附近咖啡馆；短期缓存减少公共服务请求。 */
export async function nearbyCafes(latitude: number, longitude: number, signal: AbortSignal): Promise<NearbyCafe[]> {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error('定位坐标无效，请重新定位。')
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
  const saved = cache.get(key)
  if (saved && Date.now() - saved.time < 600000) return saved.cafes
  const query = `[out:json][timeout:20];nwr(around:1500,${latitude},${longitude})["amenity"="cafe"];out center tags;`
  const response = await fetch('https://overpass.private.coffee/api/interpreter', {
    method: 'POST', body: new URLSearchParams({ data: query }), signal,
  })
  if (!response.ok) throw new Error(response.status === 429 ? '附近店铺搜索繁忙，请稍后重试。' : '附近店铺暂时无法读取，可先手动填写店名。')
  const data = await response.json() as { elements?: { type?: string; id?: number; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> }[]; remark?: string }
  if (!Array.isArray(data.elements) || data.remark) throw new Error('附近店铺搜索未完成，请稍后重试或手动填写。')
  const cafes: NearbyCafe[] = []
  for (const item of data.elements) {
    const tags = item.tags ?? {}
    const name = (tags['name:zh'] || tags.name || '').trim()
    const lat = item.lat ?? item.center?.lat
    const lon = item.lon ?? item.center?.lon
    if (!name || typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const meters = distance(latitude, longitude, lat, lon)
    if (meters > 1600) continue
    if (cafes.some(cafe => cafe.name === name && Math.abs(cafe.distance - meters) < 30)) continue
    cafes.push({ id: `${item.type}-${item.id}`, name: name.slice(0, 160), distance: meters,
      address: (tags['addr:full'] || [tags['addr:city'], tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')).slice(0, 240) })
  }
  cafes.sort((a, b) => a.distance - b.distance)
  if (cache.size >= 30) cache.clear()
  cache.set(key, { time: Date.now(), cafes })
  return cafes
}
