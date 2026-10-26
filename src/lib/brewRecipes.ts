import type { Grinder } from '@/types/grinder'
import { BREW_METHODS, type Bean, type BrewRecipe } from '@/types/bean'

/** 旧版未区分用途的研磨数据保留到意式，不复制成其他方式的配方。 */
export function beanRecipes(bean: Bean): BrewRecipe[] {
  const recipes = (bean.brews || []).map((recipe, index) => ({ ...recipe, id: recipe.id || `recipe-${bean.id}-${index}` }))
  if (recipes.some(recipe => recipe.grind !== undefined)) return recipes
  if (!bean.grindGrinderId && !bean.grindGrinderName && !bean.grindSetting) return recipes
  const index = recipes.findIndex(recipe => recipe.method === 'espresso')
  const previous = index >= 0 ? recipes[index] : { id: `recipe-${bean.id}-legacy`, method: 'espresso', values: {} }
  const migrated = { ...previous, grind: { grinderId: bean.grindGrinderId, grinderName: bean.grindGrinderName, setting: bean.grindSetting } }
  if (index >= 0) recipes[index] = migrated
  else recipes.push(migrated)
  return recipes
}

export function grindSummary(bean: Bean, grinders: Grinder[]) {
  return beanRecipes(bean).flatMap(recipe => {
    const grind = recipe.grind
    if (!grind?.setting?.trim()) return []
    const grinder = grinders.find(item => item.id === grind.grinderId)
    const method = BREW_METHODS.find(item => item.id === recipe.method)?.name || recipe.method
    return [`${method}${recipe.label?.trim() ? `（${recipe.label.trim()}）` : ''} ${grind.setting} ${grinder?.unit || grind.unit || '格'}${grinder?.name || grind.grinderName ? ` · ${grinder?.name || grind.grinderName}` : ''}`]
  }).join(' / ')
}
