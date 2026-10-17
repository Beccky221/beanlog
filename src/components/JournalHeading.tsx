import { useScrollToTop } from '@/lib/useScrollToTop'

/** 四个主页面共用的侧边竖排题签。 */
export function JournalHeading({ title, eyebrow, library = false }: { title: string; eyebrow: string; library?: boolean }) {
  const scrollToTop = useScrollToTop()
  return (
    <header className="bl-vertical-heading">
      <span className="bl-vertical-heading-eyebrow">{eyebrow}</span>
      <h1 className={library ? 'bl-library-title' : 'bl-journal-title'}>
        <button type="button" onClick={scrollToTop} className="bl-vertical-heading-trigger" aria-label={`${title}，回到顶部`}>{title}</button>
      </h1>
    </header>
  )
}
