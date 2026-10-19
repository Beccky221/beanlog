# 咖啡实验室 · Coffee Lab

**我的咖啡收藏与饮用档案。** 整体风格靠近清爽的咖啡实验室。

管理与收藏豆子，记录便于复现的冲煮参数，也留下每天这一杯的味道与感受。
产品方向与后续修订原则见 [产品定位与设计方向](./产品定位与设计方向.md)；改名发布步骤见 [线上改名操作说明](./线上改名操作说明.md)。

档案和照片保存在自己的设备上。主动使用千问识图时会发送所选图片；使用附近咖啡馆搜索时会发送定位坐标；使用千问找豆时会发送所选偏好。这些服务不会自动上传整个豆库。

**在线使用**：<https://beccky221.github.io/beanlog/>

iPhone / Android 用浏览器打开后「添加到主屏幕」，就会像一个独立 App 一样全屏运行，
断网也能打开。

---

## 功能

| 页面 | 做什么 |
| --- | --- |
| **豆库** | 收藏豆袋与照片，记录产区、品种、处理法、烘焙度、黑咖/奶咖风味、研磨刻度与感受；按烘焙度、产区、处理法或店铺筛选 |
| **每日记录** | 月历视图，每天可以记多条；自己做时关联豆库、打开豆袋详情对照参数，返回保留编辑内容；外面喝时记店铺与地点，配上照片或一句札记 |
| **豆库 → 展示墙** | 把收藏的豆袋排成一张 1080px 宽的海报，保存到相册或分享 |
| **首页 → 风味捕手** | 凭邀请码进入商品豆与烘焙商推荐，按个人偏好寻找下一袋 |
| **我的** | 收藏统计、值得回购 / 准备买清单、磨豆器管理、主题切换、识图设置与数据管理 |

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

六套传统色配色，在「我的 → 配色与纸感」切换并自动保存：青白玉（默认）、月白蓝、丁香紫、桃花粉、凝脂白、烟雨灰。

界面使用细腻纸纹和柔和浮雕按钮；海报背景、边框与文字跟随主题。标题和搜索文字保持平面样式。

## 技术栈

React 19 + TypeScript + Vite 7 + Tailwind CSS 3。核心档案使用本机存储；千问识图、商品豆推荐通过独立后端调用外部服务，模型密钥只放在后端。
图标用 [lucide-react](https://lucide.dev/)。

```
src/
  App.tsx                 应用外壳：标签切换、详情页、主题
  sections/               四个标签页 + 回购清单
  components/             可复用组件（含数据管理面板、错误边界）
  lib/
    brand.ts              展示名称、定位和英文落款
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
cp index.template.html index.html
npm install
npm run dev          # http://localhost:3000
```

其他命令：

```bash
npm run build        # 构建到 docs/（GitHub Pages 的发布目录）
npm run build:single # 额外产出一个可双击打开的单文件 HTML（single/咖啡实验室.html）
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

当前 GitHub Pages 的发布源是 **`main` 分支 / 根目录**，所以 `npm run build` 会把产物
**同时**写到两个地方，提交后即可生效：

| 位置 | 用途 |
| --- | --- |
| 根目录（`index.html` + `assets/` + 图标 + `manifest.webmanifest` + `sw.js` + `404.html`） | 当前 Pages 发布源，改完推上去就生效 |
| `docs/` | 标准输出目录，如果你想改用 GitHub Actions 或把发布源设成 `/docs`，用它 |

```bash
cp index.template.html index.html
npm run build
git add -A && git commit -m "更新构建产物" && git push
```

> ⚠️ 注意：为了兼容根目录发布，**仓库里的 `index.html` 是构建产物，不是开发用的模板**。
> 想跑 `npm run dev`（热更新开发）时，先恢复模板：
> ```bash
> cp index.template.html index.html   # f0bf920 是模板还在时的提交
> npm run dev
> ```
> 也可以自己新建一个最小模板（内容就是标准 Vite 模板：`<script type="module" src="/src/main.tsx">`）。
> 如果你把 Pages 发布源改成 `/docs`，就可以把根目录的产物删掉、`index.html` 恢复成模板，
> 那样开发体验最干净。

改动 `public/sw.js` 的缓存策略或换了一批静态资源时，
记得把 `sw.js` 里的 `CACHE` 版本号 +1，否则老用户会继续用缓存里的旧文件。

## 单文件版

`npm run build:single` 会产出 `single/咖啡实验室.html`（包含字体、纹理等资源，实际大小以构建输出为准），
可以直接双击打开或者发给别人。注意：

- `file://` 下浏览器不允许注册 Service Worker，所以离线安装能力只在 http(s) 下才有；
- 数据和在线版是各自独立的（不同来源，localStorage / IndexedDB 不互通），
  需要搬数据的话用「我的 → 数据管理」导出再导入。

## 名称与旧数据兼容

APP 名称已统一为“咖啡实验室”。`beanlog` 仓库与站点路径、数据库名、存储键、备份格式标识、现有服务地址仍沿用旧技术标识，确保原档案和已部署服务继续使用。旧格式备份仍可导入；新备份文件名使用新名称。

## 兼容性

面向手机浏览器（iOS Safari 15+ / Android Chrome），桌面端会显示成一个居中的手机壳。
用到了 IndexedDB、`structuredClone`、`navigator.storage.estimate`（取不到会自动降级）。
