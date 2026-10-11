/**
 * 照片处理：读文件 → 压缩 → 交给 IndexedDB 保存。
 *
 * 上一版把照片以 dataURL 塞进 localStorage，5MB 配额十几张就爆了。
 * 现在统一存 Blob（体积约为 base64 的 3/4），压缩参数也放大了些，
 * 保证豆袋上的小字在海报和详情页里都看得清。
 */

export interface ProcessedPhoto {
  /** 压缩后用于展示的照片 */
  blob: Blob
  /** 原图（只有明显更大时才保留，避免占满空间） */
  original?: Blob
  width: number
  height: number
}

const MAX_EDGE = 1600
const QUALITY = 0.82
/** 原图上限：超过这个大小就不留原图了 */
const MAX_ORIGINAL_BYTES = 3 * 1024 * 1024

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/jpeg'
  if (head.includes('base64')) {
    const bin = atob(body)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }
  return new Blob([decodeURIComponent(body)], { type: mime })
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片无法解码'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      quality,
    )
  })
}

/** HEIC 等浏览器解不了的格式，或者压缩失败时，直接把原文件当照片用 */
function fallbackBlob(file: File): ProcessedPhoto {
  return { blob: file, width: 0, height: 0 }
}

/**
 * 把用户选的图片文件处理成「展示图 + 可选原图」。
 * 任何一步失败都不会让「保存」失败——最差情况就是原样存原文件。
 */
export async function processPhotoFile(file: File): Promise<ProcessedPhoto> {
  let dataUrl: string
  try {
    dataUrl = await blobToDataUrl(file)
  } catch {
    return fallbackBlob(file)
  }

  let img: HTMLImageElement
  try {
    img = await loadImage(dataUrl)
  } catch {
    // 浏览器解不开（比如 HEIC），原样留着
    return fallbackBlob(file)
  }

  const natural = Math.max(img.naturalWidth, img.naturalHeight)
  if (!natural) return fallbackBlob(file)

  const scale = Math.min(1, MAX_EDGE / natural)
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return fallbackBlob(file)
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await canvasToBlob(canvas, QUALITY)

    // 原图明显更大、又没大到离谱时，额外留一份原图
    const original =
      scale < 1 && file.size > blob.size * 1.3 && file.size <= MAX_ORIGINAL_BYTES
        ? file
        : undefined

    return { blob, original, width, height }
  } catch {
    return fallbackBlob(file)
  }
}
