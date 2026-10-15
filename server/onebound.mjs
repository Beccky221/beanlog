const text = (v, n = 180) => typeof v === 'string' ? v.trim().slice(0, n) : ''
const aliases = { '埃塞俄比亚': ['埃塞', 'Ethiopia', '耶加雪菲', '西达摩', '古吉'], '哥伦比亚': ['Colombia'], '巴拿马': ['Panama'], '巴西': ['Brazil'], '肯尼亚': ['Kenya'], '云南': ['云南'] }
const has = (title, value) => [value, ...(aliases[value] || [])].some(a => title.toLowerCase().includes(a.toLowerCase()))
export const oneboundReady = () => !!(process.env.ONEBOUND_KEY && process.env.ONEBOUND_SECRET)
export async function queryOnebound(p) {
  const brew = { espresso: '意式', filter: '手冲', cold: '冷萃', omni: '全能' }[p.brew] || ''
  // 一次搜索仅一次接口调用。少量关键词召回，其他偏好用于排序。
  const words = [p.origins[0], p.processes[0], '咖啡豆'].filter(Boolean)
  if (words.length === 1) words.unshift(p.varieties[0] || brew || '精品')
  const endpoint = new URL('https://api-gw.onebound.cn/taobao/item_search/')
  endpoint.search = new URLSearchParams({ key: process.env.ONEBOUND_KEY, secret: process.env.ONEBOUND_SECRET, q: words.join(' '), page: '1', lang: 'zh-CN', cache: 'yes' }).toString()
  let raw
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(55000) })
    if (!response.ok) throw new Error()
    raw = await response.json()
  } catch { throw new Error('万邦请求失败或超时，请检查服务状态后再试。') }
  if (String(raw.error_code) !== '0000' && String(raw.error_code) !== '0' && (raw.error_code || raw.error)) throw new Error('万邦未完成搜索，请在万邦后台检查密钥、接口权限、额度和有效期。')
  const items = Array.isArray(raw.items?.item) ? raw.items.item : []
  const checkedAt = new Date().toISOString(), found = new Map()
  for (const item of items) {
    const name = text(item.title), id = String(item.num_iid || '')
    if (!/^\d+$/.test(id) || !/咖啡|coffee/i.test(name) || /生豆|咖啡机|磨豆机|胶囊|速溶|咖啡杯|手冲壶/.test(name)) continue
    if (p.excludedOrigins.some(v => has(name, v))) continue
    const origins = [...new Set([...Object.keys(aliases), ...p.origins].filter(v => has(name, v)))]
    if (p.origins.length && !p.origins.some(v => has(name, v))) continue
    const processes = ['水洗', '日晒', '蜜处理', '厌氧', '湿刨'].filter(v => name.includes(v))
    const varieties = [...new Set(['瑰夏', '波旁', '铁皮卡', '卡杜拉', '74110', '74112', '74158', '原生种', ...p.varieties].filter(v => name.includes(v)))]
    const roast = ['中浅烘', '中深烘', '浅烘', '中烘', '深烘'].find(v => name.includes(v)) || ''
    const price = Number(item.promotion_price || item.price)
    const image = text(item.pic_url, 1000)
    let imageUrl = ''
    try { const u = new URL(image.startsWith('//') ? 'https:' + image : image); if (u.protocol === 'https:' && (u.hostname === 'alicdn.com' || u.hostname.endsWith('.alicdn.com'))) imageUrl = u.href } catch { /* 缺少安全图片地址时使用文字卡片 */ }
    const shop = text(item.shop_title || item.nick)
    const score = p.origins.filter(v => has(name, v)).length * 4 + p.processes.filter(v => name.includes(v)).length * 2 + p.varieties.filter(v => name.includes(v)).length * 4 + p.roasts.filter(v => name.includes(v)).length * 2 + (brew && name.includes(brew) ? 3 : 0)
    found.set(id, { id: 'onebound:' + id, name, roaster: shop || '店铺待确认', origins, varieties, processes, roast, flavors: [], drink: 'any', market: 'china',
      brew: /全能|omni/i.test(name) ? 'omni' : brew && name.includes(brew) ? p.brew : /意式|espresso/i.test(name) ? 'espresso' : /手冲|filter/i.test(name) ? 'filter' : /冷萃/i.test(name) ? 'cold' : undefined,
      price100gCny: null, listingPriceCny: Number.isFinite(price) && price > 0 ? price : null, imageUrl,
      priceNote: '接口展示价，规格及实际成交价以商品页为准；不据标题换算每100g价格。',
      url: 'https://item.taobao.com/item.htm?id=' + id, evidence: '万邦淘宝商品搜索返回；属性按商品标题提取，缺失信息待确认。', checkedAt, source: 'onebound', score })
  }
  const products = [...found.values()].sort((a, b) => b.score - a.score).slice(0, 20).map(({score, ...product}) => product)
  return { products, roasters: [], checkedAt, provider: 'onebound', warning: `淘宝候选 ${products.length} 款。部分属性待确认，价格未换算每100g；未额外调用商品详情或千问。` }
}
