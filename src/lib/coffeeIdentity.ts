import type { RoastLevel } from '@/types/bean'

export interface ExtractedIdentity {
  brand: string
  variety: string
  flavor: string
  milkFlavor: string
  processingMethod: string
  origin: string
  roastLevel: RoastLevel | ''
}
export interface OcrLine {
  text: string
  confidence: number
  /** 相对于整张图片的坐标，范围 0–1 */
  x: number
  y: number
  height: number
}

const normalize = (text: string) => text.normalize('NFKC')
  .replace(/([\u3400-\u9fff])[^\S\r\n]+(?=[\u3400-\u9fff])/g, '$1')
  .replace(/([\u3400-\u9fff])[^\S\r\n]+(?=[\u3400-\u9fff])/g, '$1')
  .trim()

const VARIETIES = [
  { name: '瑰夏', pattern: /瑰[夏厦]|艺[伎妓]|ge[is]+sha/i },
  { name: '波旁', pattern: /波[旁傍]|bourbon/i },
  { name: '铁皮卡', pattern: /铁皮卡|鐵皮卡|typica/i },
  { name: '卡杜拉', pattern: /卡[杜都]拉|caturra/i },
  { name: '卡杜艾', pattern: /卡杜[艾埃]|catuai/i },
  { name: '卡蒂姆', pattern: /卡[蒂帝]姆|catimor/i },
  { name: '帕卡马拉', pattern: /帕卡[马馬]拉|pacamara/i },
  { name: '帕卡斯', pattern: /帕卡斯|pacas\b/i },
  { name: 'SL28', pattern: /\bSL\s*[-–]?\s*28\b/i },
  { name: 'SL34', pattern: /\bSL\s*[-–]?\s*34\b/i },
  { name: '74110', pattern: /\b74110\b/ },
  { name: '74112', pattern: /\b74112\b/ },
  { name: '原生种', pattern: /原生[种種]|heirloom/i },
  { name: '爪哇', pattern: /爪哇|\bjava\b/i },
  { name: '尖身波旁', pattern: /尖身波旁|laurina/i },
  { name: '粉红波旁', pattern: /粉[红紅]波旁|pink\s+bourbon/i },
  { name: '黄波旁', pattern: /[黄黃]波旁|yellow\s+bourbon/i },
]

// 词表用于识别风味描述，不把「拼配」「意式」当作植物品种。
const FLAVORS = [
  '罗马洋甘菊','洋甘菊','小青柑','黑巧克力','牛奶巧克力','白巧克力','巧克力',
  '焦糖','黄糖','红糖','黑糖','蔗糖','蜂蜜','枫糖','太妃糖','奶油','黄油','香草',
  '草莓','蓝莓','覆盆子','树莓','蔓越莓','黑莓','桑葚','莓果','樱桃','葡萄','葡萄干',
  '柑橘','柑桔','橘子','橙子','血橙','甜橙','橙皮','柠檬','青柠','佛手柑','金桔','柚子','西柚',
  '水蜜桃','白桃','桃子','杏子','李子','苹果','青苹果','梨','荔枝','龙眼','芒果',
  '菠萝','凤梨','百香果','热带水果','水果','香蕉','椰子','无花果','红枣',
  '茉莉','玫瑰','桂花','栀子花','白花','花香','红茶','绿茶','乌龙茶','伯爵茶','茶感',
  '杏仁','榛子','核桃','花生','坚果','可可','肉桂','香料','香草荚','麦芽','饼干','饼干甜',
  'strawberry','blueberry','raspberry','cherry','grape','peach','apricot','apple',
  'citrus','orange','lemon','lime','bergamot','grapefruit','mango','pineapple',
  'chamomile','jasmine','rose','floral','black tea','oolong','caramel','brown sugar',
  'honey','chocolate','cocoa','hazelnut','almond','nuts','vanilla','butter',
].sort((a, b) => b.length - a.length)

const BRANDS = ['GRAND CRU', '艾思品', '皮爷咖啡', "Peet's", '分子咖啡', 'CODE BLACK', '小芒果咖啡', '星巴克', 'Seesaw', 'MANNER', 'M Stand', '三顿半', '永璞', '隅田川']

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = above
    }
  }
  return row[b.length]
}

function brandCandidate(text: string): { name: string; known: boolean } {
  const clean = text.replace(/(?:口|□|■|●|○){2,}$/, '').trim()
  const key = clean.replace(/[\s'’]/g, '').toLowerCase()
  const exact = BRANDS.find(brand => brand.replace(/[\s'’]/g, '').toLowerCase() === key)
  if (exact) return { name: exact, known: true }
  const close = BRANDS.filter(brand => /^[\u3400-\u9fff]+$/.test(brand) && brand.length === clean.length && editDistance(clean, brand) === 1)
  return { name: close.length === 1 ? close[0] : clean, known: close.length === 1 }
}

function flavorTokens(line: string): string[] {
  const matches: { text: string; start: number; end: number }[] = []
  const lower = line.toLowerCase()
  for (const word of FLAVORS) {
    let start = lower.indexOf(word)
    while (start >= 0) {
      const end = start + word.length
      if (!matches.some(hit => start < hit.end && end > hit.start)) matches.push({ text: line.slice(start, end), start, end })
      start = lower.indexOf(word, end)
    }
  }
  return matches.sort((a, b) => a.start - b.start).map(hit => hit.text)
}

const PROMOTION = /赠|贈|限购|折扣|包邮|满减|净含量|净重|保质期|生产日期|￥|¥|\d+\s*(?:g|kg|克|ml|毫升)\b/i
const MARKETING = /风味参考|春季限定|季节限定|新品|限量|咖啡豆|精品咖啡|意式咖啡|深烘|浅烘|烘焙|拼配|单品|风味|flavou?r|tasting|specialty|espresso|blend|roast/i

/** 先读明确标签，再按品种、风味词和版面提取候选。候选须由用户确认。 */
export function extractIdentity(raw: string, layout: OcrLine[] = []): ExtractedIdentity {
  const text = normalize(raw)
  const lines = text.split(/\r?\n/).map(normalize).filter(Boolean)
  const boundary = /(?:品牌|烘焙商|豆种|品种|黑咖风味|奶咖风味|风味|产地|产区|处理方式|处理法|加工方式|烘焙程度|烘焙度|净含量|生产日期|保质期)\s*[:：]/i
  const read = (label: string) => {
    const matcher = new RegExp(`^(?:${label})\\s*[:：|｜-]?\\s*(.*)$`, 'i')
    for (let i = 0; i < lines.length; i++) {
      const match = matcher.exec(lines[i])
      if (!match) continue
      const value = (match[1] || lines[i + 1] || '').split(boundary)[0].trim()
      if (value && !/^(品牌|品种|豆种|风味|产地|处理|烘焙|净含量)/.test(value)) return value.slice(0, 160)
    }
    return ''
  }
  let brand = read('品牌|烘焙商|brand\\b|roaster\\b')
  let variety = read('豆子品种|咖啡品种|品种|豆种|variety\\b|varietal\\b')
  let flavor = read('黑咖风味|黑咖|风味描述|风味调性|风味参考|风味|flavou?r(?:\\s+notes?)?\\b|tasting\\s+notes?\\b')

  const milkFlavor = read('奶咖风味|奶咖|加奶风味|milk(?:\\s+coffee)?\\s+notes?\\b')

  const origin = read('产地信息|产地|产区|国家|origin\\b|region\\b')
  let processingMethod = read('处理方式|处理法|加工方式|process(?:ing)?(?:\\s+method)?\\b')
  if (!processingMethod) {
    const methods = [
      { name: '厌氧日晒', pattern: /厌氧日晒|anaerobic\s+natural/i },
      { name: '厌氧水洗', pattern: /厌氧水洗|anaerobic\s+washed/i },
      { name: '水洗', pattern: /水洗|\bwashed\b/i },
      { name: '日晒', pattern: /日晒|\bnatural\s+process/i },
      { name: '蜜处理', pattern: /蜜处理|\bhoney\s+process/i },
      { name: '湿刨', pattern: /湿刨|\bwet[-\s]+hulled\b/i },
    ]
    const found = methods.filter(method => method.pattern.test(text))
    processingMethod = found.filter(method => !found.some(other => other.name !== method.name && other.name.includes(method.name))).map(method => method.name).join('、')
  }

  if (!variety) {
    const found = VARIETIES.filter(item => item.pattern.test(text))
    // 复合品种命中时，移除其中重复的通用品种，如粉红波旁中的波旁。
    if (!found.length) {
      // 只在「…拼配」附近使用一字差异候选，不将其它广告文字当成品种。
      for (const match of text.matchAll(/([\u3400-\u9fff]{2,6})拼配/g)) {
        const close = VARIETIES.filter(item => item.name.length === match[1].length && editDistance(item.name, match[1]) === 1)
        if (close.length === 1) found.push(close[0])
      }
    }
    variety = found.filter(item => !found.some(other => other.name !== item.name && other.name.includes(item.name))).map(item => item.name).join('、')
    if (variety && /拼配|blend/i.test(text)) variety += '（拼配）'
  }

  // 风味参考后的大字可能只是产品昵称；优先取含多个风味词的描述行。
  const flavorLines = lines.filter(line => !PROMOTION.test(line)).map(line => {
    let tokens = flavorTokens(line)
    // 仅当同一行已有多个明确风味时，补全分隔开的近似词；不从产品昵称猜风味。
    if (tokens.length >= 2) {
      const parts = line.split(/[|｜丨、,，/·]/).map(part => part.trim())
      const corrected = parts.map(part => {
        if (flavorTokens(part).length || !/^[\u3400-\u9fff]{2,6}$/.test(part)) return part
        const close = FLAVORS.filter(word => word.length === part.length && editDistance(word, part) === 1)
        return close.length === 1 ? close[0] : part
      }).join('、')
      tokens = flavorTokens(corrected)
    }
    const separators = /[|｜丨、,，/·]/.test(line)
    return { line, tokens, score: tokens.length * 10 + (separators ? 4 : 0) - (MARKETING.test(line) ? 8 : 0) }
  }).filter(item => item.tokens.length >= 2).sort((a, b) => b.score - a.score)
  if (flavorLines[0] && (!flavor || flavorTokens(flavor).length < 2)) {
    flavor = [...new Set(flavorLines[0].tokens)].join('、')
  } else if (!flavor) {
    // 少量包装把每个风味各写一行，只收取独立的风味短语。
    const standalone = lines.flatMap(line => {
      const tokens = flavorTokens(line)
      return tokens.length === 1 && line.replace(/[\s|｜丨、,，.。]/g, '').toLowerCase() === tokens[0].toLowerCase() ? tokens : []
    })
    if (standalone.length) flavor = [...new Set(standalone)].join('、')
  }

  const compact = text.replace(/\s+/g, '')
  const roastText = read('烘焙程度|烘焙度|烘焙|roast(?:\\s+level)?\\b').toLowerCase()
  const roastSource = `${roastText}\n${compact}`
  let roastLevel: RoastLevel | '' = ''
  if (/^(中深|medium[ -]?dark)$/.test(roastText) || /中深(?:度)?(?:烘焙|烘)|medium[ -]?dark(?:roast)?/i.test(roastSource)) roastLevel = '中深烘'
  else if (/^(中浅|medium[ -]?light|light[ -]?medium)$/.test(roastText) || /中浅(?:度)?(?:烘焙|烘)|medium[ -]?light|light[ -]?medium/i.test(roastSource)) roastLevel = '中浅烘'
  else if (/深(?:度)?(?:烘焙|烘)|darkroast/i.test(roastSource) || /^(深|dark)$/.test(roastText)) roastLevel = '深烘'
  else if (/浅(?:度)?(?:烘焙|烘)|lightroast/i.test(roastSource) || /^(浅|light)$/.test(roastText)) roastLevel = '浅烘'
  else if (/中(?:度)?(?:烘焙|烘)|mediumroast/i.test(roastSource) || /^(中|medium)$/.test(roastText)) roastLevel = '中烘'

  if (!brand) {
    // 品牌常处于图片上沿，不能简单把最大字号的产品名当成品牌。
    const candidates = layout.map(line => ({ ...line, text: normalize(line.text) })).filter(line =>
      line.y < 0.2 && line.height >= 0.012 && line.confidence >= 40 &&
      line.text.length >= 2 && line.text.length <= 36 && /[a-z\u3400-\u9fff]/i.test(line.text) &&
      !MARKETING.test(line.text) && !PROMOTION.test(line.text) && flavorTokens(line.text).length === 0 &&
      !VARIETIES.some(item => item.pattern.test(line.text))
    ).map(line => ({ ...line, candidate: brandCandidate(line.text) }))
    const top = Math.min(...candidates.map(line => line.y))
    const nearTop = candidates.filter(line => line.y <= top + .025).sort((a, b) => Number(b.candidate.known) - Number(a.candidate.known) || a.y - b.y || a.x - b.x)
    if (nearTop[0]) brand = nearTop[0].candidate.name
  }
  return { brand, variety, flavor, milkFlavor, processingMethod, origin, roastLevel }
}
