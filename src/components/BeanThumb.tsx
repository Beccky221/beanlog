import { useMemo } from 'react'
import type { Bean } from '@/types/bean'
import { bagImage } from '@/lib/bagImage'
import { usePhotoUrl } from '@/lib/usePhoto'

interface BeanThumbProps {
  bean: Bean
  /** 没有真实照片时生成的占位豆袋图 */
  className?: string
  alt?: string
}

/**
 * 豆袋缩略图：有照片就显示照片，没有就用占位豆袋 SVG。
 * 占位图按需生成并缓存，避免列表滚动时反复拼 SVG。
 */
export function BeanThumb({ bean, className, alt }: BeanThumbProps) {
  const url = usePhotoUrl(bean.photoId)

  const placeholder = useMemo(
    () =>
      bagImage({
        color: bean.placeholder?.color ?? '#8A4B2A',
        label: bean.placeholder?.label ?? '新豆袋',
        sub: bean.placeholder?.sub ?? 'BEANLOG',
      }),
    [bean.placeholder?.color, bean.placeholder?.label, bean.placeholder?.sub],
  )

  return (
    <img
      src={url ?? placeholder}
      alt={alt ?? bean.name}
      className={className}
      draggable={false}
    />
  )
}
