import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 构建产物输出到 docs/，GitHub Pages 从这里发布（main 分支 / docs 目录）。
 *
 * 为什么不用仓库根目录当输出目录：Vite 明确不推荐 outDir 与项目根目录重合
 * （会覆盖源文件），而且根目录同时是 publicDir 时会拒绝复制图标等静态文件。
 * 独立目录最稳，也不会出现「模板被产物覆盖」的坑。
 */
export default defineConfig({
  // 相对路径，方便部署在 GitHub Pages 子路径（/beanlog/）下
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'docs',
    // docs 里只有构建产物，可以放心清空
    emptyOutDir: true,
    target: 'es2022',
    // 单文件版会把所有资源内联进 HTML，关掉体积警告
    chunkSizeWarningLimit: 1200,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
