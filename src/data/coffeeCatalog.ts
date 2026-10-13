import type { CoffeeProduct, RoasterSuggestion } from '@/types/recommendation'

// 少量官网资料作为冷启动；不把海外报价或商品页面存在当作国内在售证明。
const common = { source: 'catalog' as const, checkedAt: '2026-10-13', price100gCny: null, drink: 'any' as const, market: 'overseas' as const,
  priceNote: '海外官网参考资料；人民币到手价、国内购买渠道和库存待确认。' }
export const COFFEE_CATALOG: CoffeeProduct[] = [
  { ...common, id: 'onyx-tropical-weather', name: 'Tropical Weather', roaster: 'Onyx Coffee Lab', origins: ['埃塞俄比亚'], varieties: ['混合品种'], processes: ['水洗', '日晒'], roast: '浅烘', flavors: ['莓果', '甜茶', '蜂蜜', '李子'],
    url: 'https://onyxcoffeelab.com/products/tropical-weather', evidence: '官网说明为埃塞俄比亚水洗与日晒拼配，标注浅烘；季节性批次会变化。' },
  { ...common, id: 'onyx-geometry', name: 'Geometry', roaster: 'Onyx Coffee Lab', origins: ['哥伦比亚', '埃塞俄比亚'], varieties: ['混合品种'], processes: ['水洗'], roast: '浅烘', flavors: ['莓果', '核果', '伯爵茶'],
    url: 'https://onyxcoffeelab.com/products/geometry', evidence: '官网标注哥伦比亚与埃塞俄比亚来源、水洗及浅烘，适用手冲与意式。' },
  { ...common, id: 'peets-major-dickasons', name: "Major Dickason’s", roaster: "Peet’s Coffee", origins: [], varieties: [], processes: [], roast: '深烘', flavors: ['香料'],
    url: 'https://www.peets.com/products/major-dickasons', evidence: '海外官网标注深烘及香料等风味；没有把拼配推断为某个具体产区或豆种。' },
  { ...common, id: 'peets-big-bang', name: 'Big Bang', roaster: "Peet’s Coffee", origins: ['埃塞俄比亚', '拉丁美洲'], varieties: [], processes: ['水洗', '日晒'], roast: '中烘', flavors: [],
    url: 'https://www.peets.com/products/big-bang', evidence: '海外官网标注中烘，介绍中提到拉丁美洲与埃塞俄比亚咖啡；批次与当地售卖版本需核对。' },
]
export const ROASTER_CATALOG: RoasterSuggestion[] = [
  { id: 'peets-cn', name: '皮爷咖啡', url: 'https://www.peets.cn/', source: 'catalog', checkedAt: '2026-10-13', evidence: '中国企业官网介绍其深烘传统。具体豆款、产区和销售情况需查官方门店或商品页。' },
  { id: 'onyx-official', name: 'Onyx Coffee Lab', url: 'https://onyxcoffeelab.com/collections/coffee', source: 'catalog', checkedAt: '2026-10-13', evidence: '官网有按产区、品种、处理法和烘焙度列出的豆款资料。这是资料入口，并非对其擅长领域的独立评价。' },
]
