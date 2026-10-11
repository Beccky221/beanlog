/** 磨豆器档案：可增删改，各自有独立的刻度体系 */
export interface Grinder {
  id: string
  /** 如「泰摩栗子电动磨豆器」 */
  name: string
  /** 刻度最小值 */
  min: number
  /** 刻度最大值 */
  max: number
  /** 最小调节步进，如 1 或 0.5 */
  step: number
  /** 刻度单位：格 / 档 / 圈… */
  unit: string
  /** 备注，如「意式常用 8-12」 */
  note?: string
}
