/**
 * 构建后处理：给 GitHub Pages 补两样东西。
 *
 * 1. 404.html —— Pages 找不到路径时用它，内容就是应用本身。
 *    产物里用的是相对路径（./assets/...），而 404 可能被深层路径触发
 *    （例如 /beanlog/a/b），相对路径会解析错，所以补一个 <base> 指回站点根。
 * 2. .nojekyll —— 别让 Pages 用 Jekyll 处理 assets 目录。
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docs = path.join(root, 'docs')

/** 部署路径；换了仓库名可以用 PAGES_BASE 覆盖 */
const PAGES_BASE = process.env.PAGES_BASE ?? '/beanlog/'
const base = PAGES_BASE.endsWith('/') ? PAGES_BASE : `${PAGES_BASE}/`

const html = await readFile(path.join(docs, 'index.html'), 'utf8')
const withBase = html.replace(
  '<meta charset="UTF-8" />',
  `<meta charset="UTF-8" />\n    <base href="${base}" />`,
)
await writeFile(path.join(docs, '404.html'), withBase, 'utf8')
await writeFile(path.join(docs, '.nojekyll'), '', 'utf8')

// 顺手校验一下：模板没被产物覆盖
const template = await readFile(path.join(root, 'index.html'), 'utf8')
if (!template.includes('src="/src/main.tsx"')) {
  console.warn('⚠️ 根目录的 index.html 不是 Vite 模板了，记得 git checkout -- index.html')
}

console.log(`已生成 docs/404.html（<base href="${base}">）与 docs/.nojekyll`)
