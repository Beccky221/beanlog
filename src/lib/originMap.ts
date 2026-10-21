import type { Bean } from '@/types/bean'

export interface CoffeeOrigin {
  id: string
  name: string
  lon: number
  lat: number
  aliases: string[]
}

// 产国级示意点位；只根据用户填写的产区归集，不用豆名、品牌或品种推测。
export const COFFEE_ORIGINS: CoffeeOrigin[] = [
  { id: 'ethiopia', name: '埃塞俄比亚', lon: 39, lat: 8, aliases: ['埃塞俄比亚', '衣索比亚', '衣索比亞', '埃塞', 'ethiopia', '耶加雪菲', '西达摩', '西達摩', '古姬', '古吉', '罕贝拉', '罕貝拉', '班其玛吉', 'yirgacheffe', 'sidamo', 'sidama', 'guji', 'bench maji'] },
  { id: 'kenya', name: '肯尼亚', lon: 37, lat: 0, aliases: ['肯尼亚', '肯尼亞', 'kenya', '涅里', '基里尼亚加', 'nyeri', 'kirinyaga'] },
  { id: 'rwanda', name: '卢旺达', lon: 30, lat: -2, aliases: ['卢旺达', '盧旺達', 'rwanda'] },
  { id: 'burundi', name: '布隆迪', lon: 30, lat: -4, aliases: ['布隆迪', '蒲隆地', 'burundi'] },
  { id: 'tanzania', name: '坦桑尼亚', lon: 35, lat: -7, aliases: ['坦桑尼亚', '坦尚尼亞', '坦桑尼亞', 'tanzania'] },
  { id: 'uganda', name: '乌干达', lon: 32, lat: 2, aliases: ['乌干达', '烏干達', 'uganda'] },
  { id: 'drc', name: '刚果（金）', lon: 24, lat: -3, aliases: ['刚果金', '刚果（金）', '剛果金', 'democratic republic of congo', 'drc'] },
  { id: 'malawi', name: '马拉维', lon: 34, lat: -13, aliases: ['马拉维', '馬拉維', 'malawi'] },
  { id: 'zambia', name: '赞比亚', lon: 28, lat: -14, aliases: ['赞比亚', '尚比亞', 'zambia'] },
  { id: 'yemen', name: '也门', lon: 45, lat: 15, aliases: ['也门', '葉門', 'yemen'] },
  { id: 'brazil', name: '巴西', lon: -48, lat: -15, aliases: ['巴西', 'brazil', 'brasil', '米纳斯', '米納斯', '喜拉多', 'cerrado', 'minas gerais'] },
  { id: 'colombia', name: '哥伦比亚', lon: -74, lat: 4, aliases: ['哥伦比亚', '哥倫比亞', 'colombia', '慧兰', '蕙兰', '惠兰', 'huila', '纳里尼奥', 'nariño', 'narino', '考卡', 'cauca'] },
  { id: 'peru', name: '秘鲁', lon: -75, lat: -10, aliases: ['秘鲁', '秘魯', 'peru'] },
  { id: 'ecuador', name: '厄瓜多尔', lon: -79, lat: -1, aliases: ['厄瓜多尔', '厄瓜多爾', 'ecuador'] },
  { id: 'bolivia', name: '玻利维亚', lon: -65, lat: -17, aliases: ['玻利维亚', '玻利維亞', 'bolivia'] },
  { id: 'venezuela', name: '委内瑞拉', lon: -66, lat: 7, aliases: ['委内瑞拉', '委內瑞拉', 'venezuela'] },
  { id: 'panama', name: '巴拿马', lon: -80, lat: 9, aliases: ['巴拿马', '巴拿馬', 'panama', '波奎特', 'boquete'] },
  { id: 'costa-rica', name: '哥斯达黎加', lon: -84, lat: 10, aliases: ['哥斯达黎加', '哥斯大黎加', '哥斯達黎加', 'costa rica', '塔拉珠', 'tarrazu'] },
  { id: 'guatemala', name: '危地马拉', lon: -90, lat: 15, aliases: ['危地马拉', '瓜地馬拉', '危地馬拉', 'guatemala', '薇薇特南果', '韦韦特南果', 'huehuetenango', '安提瓜', 'antigua'] },
  { id: 'honduras', name: '洪都拉斯', lon: -87, lat: 15, aliases: ['洪都拉斯', '宏都拉斯', 'honduras'] },
  { id: 'nicaragua', name: '尼加拉瓜', lon: -85, lat: 13, aliases: ['尼加拉瓜', 'nicaragua'] },
  { id: 'el-salvador', name: '萨尔瓦多', lon: -89, lat: 14, aliases: ['萨尔瓦多', '薩爾瓦多', 'el salvador'] },
  { id: 'mexico', name: '墨西哥', lon: -99, lat: 19, aliases: ['墨西哥', 'mexico'] },
  { id: 'jamaica', name: '牙买加', lon: -77, lat: 18, aliases: ['牙买加', '牙買加', 'jamaica'] },
  { id: 'cuba', name: '古巴', lon: -79, lat: 22, aliases: ['古巴', 'cuba'] },
  { id: 'dominican', name: '多米尼加', lon: -70, lat: 19, aliases: ['多米尼加', '多明尼加', 'dominican republic'] },
  { id: 'china', name: '中国', lon: 101, lat: 24, aliases: ['中国', '中國', 'china', '云南', '雲南', 'yunnan', '普洱', '保山', '临沧', '臨滄', '海南'] },
  { id: 'indonesia', name: '印度尼西亚', lon: 112, lat: -3, aliases: ['印度尼西亚', '印度尼西亞', '印尼', 'indonesia', '苏门答腊', '蘇門答臘', 'sumatra', '苏拉威西', 'sulawesi', '爪哇', '曼特宁', '曼特寧', 'mandheling'] },
  { id: 'india', name: '印度', lon: 77, lat: 13, aliases: ['印度', 'india'] },
  { id: 'vietnam', name: '越南', lon: 108, lat: 14, aliases: ['越南', 'vietnam', 'viet nam'] },
  { id: 'thailand', name: '泰国', lon: 99, lat: 19, aliases: ['泰国', '泰國', 'thailand'] },
  { id: 'laos', name: '老挝', lon: 103, lat: 18, aliases: ['老挝', '寮國', '老撾', 'laos'] },
  { id: 'myanmar', name: '缅甸', lon: 97, lat: 21, aliases: ['缅甸', '緬甸', 'myanmar', 'burma'] },
  { id: 'philippines', name: '菲律宾', lon: 123, lat: 11, aliases: ['菲律宾', '菲律賓', 'philippines'] },
  { id: 'papua-new-guinea', name: '巴布亚新几内亚', lon: 145, lat: -6, aliases: ['巴布亚新几内亚', '巴布亞紐幾內亞', '巴布亞新幾內亞', 'papua new guinea', 'png'] },
  { id: 'timor-leste', name: '东帝汶', lon: 126, lat: -9, aliases: ['东帝汶', '東帝汶', 'timor leste', 'east timor'] },
  { id: 'hawaii', name: '夏威夷', lon: -156, lat: 20, aliases: ['夏威夷', 'hawaii', '夏威夷科纳', 'kona'] },
]

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
function containsAlias(text: string, alias: string) {
  const value = normalize(alias)
  if (/^[a-z ]+$/.test(value)) return new RegExp(`(?:^|[^a-z])${value}(?=$|[^a-z])`).test(text)
  return text.includes(value)
}

export function matchCoffeeOrigins(value?: string) {
  const text = normalize(value ?? '')
  return COFFEE_ORIGINS.filter(origin => origin.aliases.some(alias => containsAlias(text, alias)))
    // “印度尼西亚”中包含“印度”，不能给同一来源额外计入印度。
    .filter(origin => origin.id !== 'india' || /印度(?!尼)/.test(text) || containsAlias(text, 'india'))
}

export function summarizeOrigins(beans: Bean[]) {
  const groups = new Map<string, { origin: CoffeeOrigin; beans: Bean[] }>()
  const unresolved: Bean[] = []
  for (const bean of beans) {
    const origins = matchCoffeeOrigins(bean.origin)
    if (!origins.length) unresolved.push(bean)
    for (const origin of origins) {
      const group = groups.get(origin.id) ?? { origin, beans: [] }
      group.beans.push(bean)
      groups.set(origin.id, group)
    }
  }
  return { groups: [...groups.values()].sort((a, b) => b.beans.length - a.beans.length || a.origin.name.localeCompare(b.origin.name, 'zh-CN')), unresolved, mappedCount: beans.length - unresolved.length }
}

export const mapPoint = (lon: number, lat: number) => ({ x: (lon + 180) * 2, y: (82 - lat) * 2 })

// 原创概括轮廓，仅供散点构图；不包含国界或精确地理边界。
const LAND: number[][][] = [
  [[-168,70],[-145,72],[-126,68],[-112,73],[-90,73],[-63,58],[-54,48],[-68,45],[-80,26],[-88,20],[-98,17],[-107,24],[-117,33],[-126,49],[-150,59],[-168,60]],
  [[-98,20],[-88,21],[-84,15],[-77,9],[-81,7],[-88,13]],
  [[-80,12],[-66,10],[-50,2],[-35,-6],[-40,-23],[-53,-34],[-68,-55],[-75,-44],[-73,-20],[-82,-2]],
  [[-53,82],[-22,79],[-20,65],[-43,59],[-59,69]],
  [[-11,36],[-8,44],[-1,48],[-6,58],[7,58],[18,71],[36,70],[45,61],[60,70],[98,75],[142,67],[178,65],[170,52],[145,43],[140,35],[126,36],[121,24],[108,20],[109,7],[100,1],[96,15],[85,21],[78,7],[70,22],[52,25],[43,13],[35,30],[21,35],[9,38]],
  [[-17,34],[4,37],[23,32],[34,30],[43,12],[51,10],[43,-12],[34,-29],[20,-35],[11,-18],[8,2],[-7,5],[-17,17]],
  [[113,-12],[130,-10],[141,-15],[153,-26],[145,-39],[130,-34],[115,-35],[112,-22]],
  [[47,-13],[51,-17],[48,-26],[44,-25]],
  [[129,31],[135,34],[142,42],[145,45],[141,34]],
  [[96,5],[105,-5],[107,-8],[101,-4]], [[106,-6],[119,-7],[123,-10],[111,-9]],
  [[130,-3],[148,-3],[151,-10],[140,-9]], [[122,18],[126,12],[125,5],[119,10]],
  [[173,-35],[178,-38],[170,-47],[166,-45]], [[-8,58],[-3,59],[1,51],[-6,50]],
]
function inside(x: number, y: number, polygon: number[][]) {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
export const WORLD_DOTS = (() => {
  const dots: { x: number; y: number; r: number }[] = []
  for (let row = 0, lat = -54; lat <= 78; row++, lat += 5) for (let lon = -176 + (row % 2) * 2.5; lon <= 179; lon += 5) {
    if (!LAND.some(polygon => inside(lon, lat, polygon))) continue
    const p = mapPoint(lon, lat)
    dots.push({ x: p.x, y: p.y, r: 2.8 })
  }
  return dots
})()
