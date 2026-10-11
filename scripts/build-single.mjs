/**
 * 把 vite build 的产物（docs/）打成「单文件 HTML」。
 *
 * 适合这样用：把这个 HTML 丢到微信/网盘里发给别人，双击就能打开，
 * 不需要服务器。注意 file:// 下 Service Worker 无法注册（浏览器限制），
 * 所以离线安装能力只在用 http(s) 打开时才有。
 *
 * 用法：npm run build:single
 * 产物：single/豆袋小记.html
 */
import { readFile, writeFile, mkdir, readdir, cp } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'docs')
const out = path.join(root, 'single')
const OUT_NAME = '豆袋小记.html'

function formatBytes(n) {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`
}

/**
 * 注意：这里一律用「替换函数」而不是替换字符串。
 * 压缩后的代码里到处是 `$$`、`$&`、`$'` 这样的序列，
 * 直接当替换字符串传给 String.replace 会被当成特殊模式展开，
 * 把整个文件改坏（我们踩过这个坑）。
 */
function replaceOnce(html, needle, replacement) {
  const i = html.indexOf(needle)
  if (i < 0) throw new Error(`内联失败，HTML 里找不到：${needle.slice(0, 60)}`)
  return html.slice(0, i) + replacement + html.slice(i + needle.length)
}

/** 内联 <script type="module" src="./assets/xxx.js"> */
async function inlineScript(html) {
  const m = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)
  if (!m) return html
  const code = await readFile(path.join(dist, m[1]), 'utf8')
  // </script 出现在字符串里会提前结束脚本，转义掉
  const safe = code.replace(/<\/script/gi, () => '<\\/script')
  return replaceOnce(html, m[0], `<script type="module">${safe}</script>`)
}

/** 内联 <link rel="stylesheet" href="./assets/xxx.css"> */
async function inlineStyle(html) {
  const m = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/)
  if (!m) return html
  const css = await readFile(path.join(dist, m[1]), 'utf8')
  return replaceOnce(html, m[0], `<style>${css}</style>`)
}

/** 把外链图标换成 base64 */
async function inlineIcon(html) {
  const png = await readFile(path.join(dist, 'icon.png'))
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`
  return html.replace(/(href|src)="\.?\/?icon\.png"/g, (_, attr) => `${attr}="${dataUrl}"`)
}

/** manifest 内联成 data URL，图标仍指向同目录的文件 */
async function inlineManifest(html) {
  let manifest = (await readFile(path.join(dist, 'manifest.webmanifest'), 'utf8')).trim()
  const dataUrl = `data:application/manifest+json,${encodeURIComponent(manifest)}`
  return html.replace(/href="\.?\/?manifest\.webmanifest"/, () => `href="${dataUrl}"`)
}

async function main() {
  let html = await readFile(path.join(dist, 'index.html'), 'utf8')

  const scriptSrc = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)

  html = await inlineStyle(html)
  html = await inlineScript(html)
  html = await inlineIcon(html)
  html = await inlineManifest(html)
  html = replaceOnce(
    html,
    '<title>豆袋小记</title>',
    '<title>豆袋小记</title>\n    <!-- 单文件版：JS/CSS/图标已全部内联，可直接双击打开 -->',
  )

  await mkdir(out, { recursive: true })
  const target = path.join(out, OUT_NAME)
  await writeFile(target, html, 'utf8')

  // 单文件旁边放一份图标：iPhone「添加到主屏幕」会用得到
  for (const name of await readdir(dist)) {
    if (name.endsWith('.png')) await cp(path.join(dist, name), path.join(out, name))
  }

  const bytes = Buffer.byteLength(html, 'utf8')
  console.log(`\n单文件已生成：${path.relative(root, target)}  (${formatBytes(bytes)})`)
  console.log('可以直接双击打开，或连同 icon.png 一起分享。\n')

  // 自检：内联脚本长度必须和构建产物一致
  if (scriptSrc) {
    const code = (await readFile(path.join(dist, scriptSrc[1]), 'utf8')).replace(
      /<\/script/gi,
      () => '<\\/script',
    )
    if (!html.includes(code)) {
      throw new Error('自检失败：内联进去的脚本和构建产物不一致')
    }
    console.log(`自检通过：内联脚本 ${formatBytes(Buffer.byteLength(code))}`)
  }
}

main().catch((err) => {
  console.error('生成单文件失败：', err)
  process.exit(1)
})
