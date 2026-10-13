export interface ImageCrop { x: number; y: number; width: number; height: number; vertical?: boolean; characterCount?: number }

/** 只在识别副本上裁剪，始终保留展示用原图。 */
export async function readableImage(blob: Blob, crop?: ImageCrop): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    let x = 0, y = 0, width = image.naturalWidth, height = image.naturalHeight
    if (crop) {
      x = Math.max(0, Math.min(.99, crop.x)) * width
      y = Math.max(0, Math.min(.99, crop.y)) * height
      width = Math.max(1, Math.min(width - x, crop.width * width))
      height = Math.max(1, Math.min(height - y, crop.height * height))
    } else {
      // 手机截图常有很大的黑色查看器边框。低分辨率扫描连续亮色区域。
      const probe = document.createElement('canvas')
      probe.width = 180
      probe.height = Math.max(1, Math.round(image.naturalHeight * 180 / image.naturalWidth))
      const pc = probe.getContext('2d')
      if (pc && probe.height > probe.width * 1.5) {
        pc.drawImage(image, 0, 0, probe.width, probe.height)
        const pixels = pc.getImageData(0, 0, probe.width, probe.height).data
        let start = 0, bestStart = 0, bestEnd = 0, darkRows = 0
        for (let row = 0; row <= probe.height; row++) {
          let lit = 0
          if (row < probe.height) for (let col = 0; col < probe.width; col++) {
            const i = (row * probe.width + col) * 4
            if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 45) lit++
          }
          if (lit > probe.width * .65) {
            if (row - start + 1 > bestEnd - bestStart) { bestStart = start; bestEnd = row + 1 }
          } else { start = row + 1; if (lit < probe.width * .15) darkRows++ }
        }
        if (darkRows > probe.height * .22 && bestEnd - bestStart > probe.height * .2 && bestEnd - bestStart < probe.height * .85) {
          y = Math.max(0, bestStart - 2) / probe.height * image.naturalHeight
          height = Math.min(image.naturalHeight - y, (bestEnd - bestStart + 4) / probe.height * image.naturalHeight)
        }
      }
    }
    const scale = Math.min(crop ? 3 : 2, 2800 / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale)) + 24
    canvas.height = Math.max(1, Math.round(height * scale)) + 24
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器无法处理这张照片，请换用 JPEG 或 PNG 图片。')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, x, y, width, height, 12, 12, canvas.width - 24, canvas.height - 24)
    if (crop?.vertical) {
      // 将单列竖排字逐字摆成横排，仅作用于 OCR 副本。
      const count = Math.max(1, Math.min(24, Math.round(crop.characterCount ?? height / width)))
      const tileHeight = (canvas.height - 24) / count
      const tileWidth = canvas.width - 24
      const reflow = document.createElement('canvas')
      const scale = Math.min(1, 2600 / (count * (tileWidth + 16)))
      reflow.width = Math.ceil(count * (tileWidth + 16) * scale) + 24
      reflow.height = Math.ceil(tileHeight * scale) + 24
      const rc = reflow.getContext('2d')
      if (rc) {
        rc.fillStyle = '#ffffff'
        rc.fillRect(0, 0, reflow.width, reflow.height)
        for (let i = 0; i < count; i++) rc.drawImage(canvas, 12, 12 + tileHeight * i, tileWidth, tileHeight,
          12 + i * (tileWidth + 16) * scale, 12, tileWidth * scale, tileHeight * scale)
        return reflow
      }
    }
    return canvas
  } finally { URL.revokeObjectURL(url) }
}
