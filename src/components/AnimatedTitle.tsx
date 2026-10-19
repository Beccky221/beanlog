/** 只在标题挂载时播放，输入或普通重绘不会重新触发。父元素提供完整的无障碍名称。 */
export function AnimatedTitle({ text, delay = 60 }: { text: string; delay?: number }) {
  return (
    <span className="bl-title-letters" aria-hidden="true">
      {Array.from(text).map((letter, index) => (
        <span className="bl-title-letter" key={index} style={{ animationDelay: `${delay + index * 65}ms` }}>{letter}</span>
      ))}
    </span>
  )
}
