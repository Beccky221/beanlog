/** 展示品牌；存储键、备份协议和已部署的服务标识保持兼容。 */
export const APP_NAME = '咖啡实验室'
export const APP_POSITIONING = '我的咖啡收藏与饮用档案'
export const APP_BRAND_EN = 'Coffee Lab'

/** 旧豆袋的默认落款只在展示时更新，不改写用户档案。 */
export function placeholderBrand(value?: string): string {
  return !value || value === 'BEANLOG' || value === 'COFFEE LAB' || value === '豆袋小记' ? APP_BRAND_EN : value
}
