import { useCallback } from 'react'

/**
 * 桌面端页面不会像手机那样「往下滚就把标题挤走」——
 * 标题会一直停在左边，所以给它一个点击回到顶部的行为，
 * 手机上这个行为也无害（本来就已经在顶部）。
 */
export function useScrollToTop() {
  return useCallback(() => {
    const scroller = document.querySelector('.page-scroll')
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
}
