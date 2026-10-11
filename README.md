# 豆袋小记 · beanlog

留住每一袋的名字，也留住喜欢的理由。

一个纯前端的咖啡豆记录应用：拍下豆袋、记下烘焙度和研磨刻度、写下喝过之后的感受，
做成一张可以分享的收藏海报。数据全部存在你自己的设备上，不上传任何服务器。

**在线使用**：<https://beccky221.github.io/beanlog/>

iPhone / Android 用浏览器打开后「添加到主屏幕」，就会像一个独立 App 一样全屏运行，
断网也能打开。

---

## 功能

| 页面 | 做什么 |
| --- | --- |
| **豆库** | 记录每一袋豆子：照片、烘焙度、饮用状态、研磨刻度、评分、笔记；搜索和按烘焙度筛选；左滑删除 |
| **每日记录** | 月历视图，每天可以记多条：咖啡照片、冲煮参数（意式 / 手冲 / 冷萃）、一句札记 |
| **豆袋墙** | 把收藏的豆袋排成一张 1080px 宽的海报，保存到相册或分享 |
| **我的** | 收藏统计、值得回购 / 准备买清单、磨豆器档案管理、主题切换、数据管理 |

## 数据是怎么存的

这是这一版最关键的改动，值得单独说明。

- **照片存在 IndexedDB**（存的是 Blob），不是 localStorage。
  localStorage 只有约 5MB，一张压缩后的咖啡照片就有 200～600KB，十几张就满了；
  而超配额时 `setItem` 抛出的 `QuotaExceededError` 很容易被静默吞掉，
  结果就是「以为存上了，其实没有」。IndexedDB 的配额通常是几百 MB 起步。
- **元数据也存在 IndexedDB**（`beanlog` 数据库的 `kv` 表）。
  启动时一次性读出来，界面里改动走 350ms 防抖写入。
- **照片压缩**：长边压到 1600px、JPEG 质量 0.82；原图明显更大时会额外留一份
  （上限 3MB），方便以后重新处理。
- **旧数据自动迁移**：如果你之前用的是把 dataURL 塞进 localStorage 的版本，
  第一次打开这一版时，照片会被搬进 IndexedDB，localStorage 里的旧键会被清掉，
  腾出空间。整个过程不需要你操作。
- **删除会回收空间**：删豆子 / 换照片 / 删每日记录时，对应的照片会一起删掉；
  启动时也会清理一次没有任何引用的孤儿照片。
- **导出 / 导入备份**：「我的 → 数据管理」。导出的 JSON 里包含所有豆子、每日记录、
  磨豆器设置和照片，换手机或清理浏览器数据之前记得导一份。
  旧版本导出的备份也能导入（照片会自动转成新格式）。
- **写入失败会提示**：空间不够等情况下，界面顶部会出现醒目提示，不会再静默丢数据。

> 数据只在本机。清理浏览器数据、卸载浏览器、换手机都会丢，**请定期导出备份**。

## 主题

两套配色，在「我的 → 外观」里切换，会记住你的选择：

- **苔绿**：原来的浅绿配色
- **米纸**：偏暖的纸感配色，和海报、参考稿更接近

所有界面颜色都走 `src/index.css` 里的 CSS 变量（`--c-*`），
在海报 canvas 里也是读同一份变量，所以海报和界面永远同色。
**新增颜色请在 `:root[data-theme='beige']` 里一起补上，不要写死十六进制值。**

## 技术栈

React 19 + TypeScript + Vite 7 + Tailwind CSS 3，无后端、无第三方请求。
图标用 [lucide-react](https://lucide.dev/)。

```
src/
  App.tsx                 应用外壳：标签切换、详情页、主题
  sections/               四个标签页 + 回购清单
  components/             可复用组件（含数据管理面板、错误边界）
  lib/
    idb.ts                IndexedDB 封装（kv 表 + photos 表）
    store.ts              应用状态、防抖写入、旧数据迁移
    backup.ts             导出 / 导入备份
    image.ts              照片压缩
    theme.ts              主题读写
    poster.ts             海报 canvas 绘制
  types/                  数据模型
```

## 本地开发

```bash
npm install
npm run dev          # http://localhost:3000
```

其他命令：

```bash
npm run build        # 构建到 docs/（GitHub Pages 的发布目录）
npm run build:single # 额外产出一个可双击打开的单文件 HTML（single/豆袋小记.html）
npm run typecheck    # TypeScript 检查
npm run lint         # ESLint
npm run e2e          # 用 headless Chrome 逐屏截图（需要先 npm run preview）
npm run test:backup  # 备份往返测试：导出 → 清空 → 导入 → 校验一致
npm run test:v1      # 旧版备份导入测试：内联照片是否正确转进 IndexedDB
```

> 跑 `e2e` / `test:backup` 前先起本地预览：
> `npm run preview -- --port 5199`，并确保有一个 headless Chrome 监听 9333 端口：
> ```bash
> "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
>   --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/beanlog-chrome about:blank
> ```

## 部署

构建产物提交在 **`docs/`** 目录，GitHub Pages 从这里发布（分支 `main` / 目录 `/docs`）。

```bash
npm run build
git add -A && git commit -m "更新构建产物" && git push
```

改动 `public/sw.js` 的缓存策略或换了一批静态资源时，
记得把 `sw.js` 里的 `CACHE` 版本号 +1，否则老用户会继续用缓存里的旧文件。

## 单文件版

`npm run build:single` 会产出 `single/豆袋小记.html`（约 330KB，JS/CSS/图标全部内联），
可以直接双击打开或者发给别人。注意：

- `file://` 下浏览器不允许注册 Service Worker，所以离线安装能力只在 http(s) 下才有；
- 数据和在线版是各自独立的（不同来源，localStorage / IndexedDB 不互通），
  需要搬数据的话用「我的 → 数据管理」导出再导入。

## 兼容性

面向手机浏览器（iOS Safari 15+ / Android Chrome），桌面端会显示成一个居中的手机壳。
用到了 IndexedDB、`structuredClone`、`navigator.storage.estimate`（取不到会自动降级）。
