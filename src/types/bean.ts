export type RoastLevel = '浅烘' | '中浅烘' | '中烘' | '中深烘' | '深烘'

export type DrinkStatus = '未开袋' | '正在喝' | '已喝完'

/** 冲煮方式的一个参数位，如「粉量 (g)」 */
export interface BrewField {
  key: string
  label: string
  unit?: string
  placeholder?: string
}

/** 冲煮方式定义：不同方式记录不同参数 */
export interface BrewMethod {
  id: string
  name: string
  fields: BrewField[]
}

/** 一种冲煮方式的最佳参数记录（每袋豆、每种方式只留一份「最好喝」的） */
export interface GrindSettings {
  grinderId?: string
  grinderName?: string
  setting?: string
  unit?: string
}

export interface BrewRecipe {
  /** 冲煮方式 id，对应 BREW_METHODS */
  method: string
  /** 参数键值对，键见对应方式的 fields；统一存字符串，空串视为未填 */
  values: Record<string, string>
  /** 一句话备注，如「这个参数最平衡」 */
  note?: string
  /** 各冲煮方式独立保存；空对象表示明确选择不记录。 */
  grind?: GrindSettings
}

export const BREW_METHODS: BrewMethod[] = [
  {
    id: 'espresso',
    name: '意式',
    fields: [
      { key: 'dose', label: '粉量', unit: 'g', placeholder: '18' },
      { key: 'yield', label: '出液量', unit: 'g', placeholder: '36' },
      { key: 'time', label: '萃取时间', unit: '秒', placeholder: '28' },
      { key: 'temp', label: '水温', unit: '°C', placeholder: '93' },
    ],
  },
  {
    id: 'pour-over',
    name: '手冲',
    fields: [
      { key: 'dose', label: '粉量', unit: 'g', placeholder: '15' },
      { key: 'water', label: '注水量', unit: 'g', placeholder: '240' },
      { key: 'temp', label: '水温', unit: '°C', placeholder: '92' },
      { key: 'time', label: '冲煮时间', unit: '秒', placeholder: '150' },
    ],
  },
  {
    id: 'cold-brew',
    name: '冷萃',
    fields: [
      { key: 'dose', label: '粉量', unit: 'g', placeholder: '30' },
      { key: 'water', label: '水量', unit: 'g', placeholder: '300' },
      { key: 'hours', label: '冷藏时长', unit: '小时', placeholder: '12' },
    ],
  },
]

/** 一条每日记录：某天喝这袋豆子留下的照片、冲煮参数和札记（一天可多条） */
export interface DailyRecord {
  /** 这杯自己做的咖啡使用的豆库条目 */
  beanId?: string
  /** 名称快照：豆库条目被删除后仍能知道当时喝的是什么 */
  beanName?: string
  /** 旧记录未指定时视为自己做 */
  source?: 'home' | 'outside'
  locationName?: string
  location?: { latitude: number; longitude: number; accuracy?: number }
  id: string
  /** 日期 YYYY-MM-DD */
  date: string
  /**
   * 咖啡照片，存的是 IndexedDB 里的照片 id（不是图片本身）。
   * 用 usePhotoUrl(id) 取显示地址；旧数据的 dataURL 会在启动时自动迁移。
   */
  photoIds: string[]
  /** 这次用的冲煮方式 id，对应 BREW_METHODS；空表示没记参数 */
  method?: string
  /** 参数键值对，键见对应方式的 fields；统一存字符串 */
  values: Record<string, string>
  /** 一句话札记，如「今天这杯特别甜」 */
  note?: string
}

/** 没有真实照片时，用这些参数生成一只风格化豆袋 SVG */
export interface PlaceholderBag {
  color: string
  label: string
  sub?: string
}

export interface Bean {
  id: string
  /** 豆袋名称，如「分子咖啡-雪松可可」 */
  name: string
  /** 品牌或烘焙商，可不填 */
  brand?: string
  /** 咖啡豆品种，如瑰夏、波旁、卡杜拉 */
  variety?: string
  /** 黑咖风味；兼容原有风味记录 */
  flavor?: string
  /** 加奶后的风味描述 */
  milkFlavor?: string
  /** 咖啡豆处理法 */
  processingMethod?: string
  /** 国家、产区或庄园 */
  origin?: string
  roastLevel: RoastLevel
  status: DrinkStatus
  /** 0-5 星 */
  rating: number
  /** 自己看得懂的感受 */
  note: string
  /** 展示图：IndexedDB 照片 id；空表示用占位豆袋图 */
  photoId?: string
  /** 原照片：IndexedDB 照片 id，可为空（留住原图，以后可以重新处理） */
  originalPhotoId?: string
  /** 没有真实照片时，生成占位豆袋图用的参数 */
  placeholder?: PlaceholderBag
  /** 开袋日期 YYYY-MM-DD */
  openDate?: string
  /** 记录开袋日期开关 */
  trackOpenDate: boolean
  /** 回购次数 */
  repurchaseCount: number
  /** 值得回购清单 */
  inRepurchase: boolean
  /** 准备买清单 */
  inPlanToBuy: boolean
  /** 研磨：所用磨豆器 id（对应磨豆器档案） */
  grindGrinderId?: string
  /** 研磨：磨豆器名称快照，磨豆器被删除后仍能显示 */
  grindGrinderName?: string
  /** 研磨：刻度读数，如 "18" */
  grindSetting?: string
  /** 冲煮记录：每种冲煮方式一份最佳参数 */
  brews?: BrewRecipe[]
  createdAt: string
}

export const ROAST_LEVELS: RoastLevel[] = ['浅烘', '中浅烘', '中烘', '中深烘', '深烘']

export const DRINK_STATUS: DrinkStatus[] = ['未开袋', '正在喝', '已喝完']

/** 一袋豆子引用到的所有照片 id（导出、清理孤儿照片时用） */
export function beanPhotoIds(bean: Bean): string[] {
  return [bean.photoId, bean.originalPhotoId].filter((id): id is string => !!id)
}
