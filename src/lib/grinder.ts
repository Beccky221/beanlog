import type { Grinder } from '@/types/grinder'

/** 新建一台磨豆器档案时用的默认值 */
export function newGrinder(): Grinder {
  return {
    id: `grinder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    min: 1,
    max: 10,
    step: 1,
    unit: '格',
  }
}
