/**
 * 用 CDP 驱动 headless Chrome 跑一遍主要界面，截图 + 检查报错。
 * 用法：node scripts/e2e-shots.mjs [baseUrl] [outDir]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5199/'
const OUT = process.argv[3] ?? '/tmp/beanlog-v2-shots'
const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function connect() {
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res)
    ws.addEventListener('error', rej)
  })
  let id = 0
  const pending = new Map()
  const logs = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      logs.push(`${m.params.type}: ` + m.params.args.map((a) => a.value ?? a.description).join(' '))
    }
    if (m.method === 'Runtime.exceptionThrown') {
      logs.push('exception: ' + m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description ?? ''))
    }
    if (m.id && pending.has(m.id)) {
      const { resolve } = pending.get(m.id)
      pending.delete(m.id)
      resolve(m.result)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, { resolve })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  return { send, logs }
}

const CLICK = [(text) => {
  const all = [...document.querySelectorAll('button, [role="button"], a')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  });
  const cands = all.filter((el) => ((el.innerText || '').replace(/\\s+/g, '')).includes(text.replace(/\\s+/g, '')));
  if (!cands.length) return 'NOT_FOUND:' + text;
  cands.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
  cands[0].click();
  return cands[0].innerText.trim().slice(0, 24);
}]

async function main() {
  await mkdir(OUT, { recursive: true })
  const { send, logs } = await connect()
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 430, height: 932, deviceScaleFactor: 2, mobile: true,
  })

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) return 'EVAL_ERROR: ' + r.exceptionDetails.text
    return r.result?.value
  }
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
    console.log('  shot →', name)
  }
  const clickLabel = async (label) => {
    const r = await ev(`(()=>{const b=document.querySelector('[aria-label=${JSON.stringify(label)}]');if(!b)return 'NOT_FOUND';b.click();return 'ok'})()`)
    console.log(`  click[aria-label=${label}] →`, r)
    await sleep(1000)
    return r
  }
  const click = async (text) => {
    const r = await ev(`(${CLICK[0].toString()})(${JSON.stringify(text)})`)
    console.log(`  click「${text}」→`, r)
    await sleep(1100)
    return r
  }

  console.log('\n▶ 打开应用')
  await send('Page.navigate', { url: BASE })
  await sleep(3500)
  await shot('green-01-library')

  console.log('\n▶ 详情页')
  await ev(`(()=>{const el=[...document.querySelectorAll('[role="button"]')].find(e=>e.querySelector('h3'));if(el){el.click();return 'ok'}return 'none'})()`)
  await sleep(1200)
  await shot('green-02-detail')

  console.log('\n▶ 每日记录')
  await clickLabel('返回')
  await click('每日记录')
  await shot('green-03-daily')
  await click('记录今天')
  await shot('green-04-daily-editor')
  await clickLabel('返回')

  console.log('\n▶ 豆袋墙')
  await click('豆袋墙')
  await sleep(2500)
  await shot('green-05-poster')

  console.log('\n▶ 我的 / 数据管理')
  await click('我的')
  await ev(`(()=>{const c=[...document.querySelectorAll('div')].find(d=>d.className.includes('overflow-y-auto'));if(c)c.scrollTop=c.scrollHeight;})()`)
  await sleep(700)
  await shot('green-06-profile-bottom')

  console.log('\n▶ 切到米色主题')
  await ev(`(()=>{const c=[...document.querySelectorAll('div')].find(d=>d.className.includes('overflow-y-auto'));if(c)c.scrollTop=0;})()`)
  await sleep(400)
  await click('米纸')
  await sleep(600)
  await shot('beige-07-theme')
  await ev(`(()=>{const c=[...document.querySelectorAll('div')].find(d=>d.className.includes('overflow-y-auto'));if(c)c.scrollTop=c.scrollHeight;})()`)
  await sleep(600)
  await shot('beige-08-profile-bottom')
  console.log('  html data-theme =', await ev(`document.documentElement.dataset.theme`))
  console.log('  theme-color meta =', await ev(`document.querySelector('meta[name=theme-color]').content`))
  console.log('  localStorage theme =', await ev(`localStorage.getItem('beanlog.theme.v1')`))

  console.log('\n▶ 米色下的豆库 / 海报')
  await click('豆库')
  await shot('beige-09-library')
  await click('豆袋墙')
  await sleep(2500)
  await shot('beige-10-poster')

  console.log('\n▶ 主题是否记忆（重载）')
  await send('Page.navigate', { url: BASE })
  await sleep(3000)
  console.log('  reload 后 data-theme =', await ev(`document.documentElement.dataset.theme`))

  console.log('\n▶ 旧数据迁移（写入 v1 形状的 localStorage 后重载）')
  await ev(`(() => {
    indexedDB.deleteDatabase('beanlog');
    localStorage.clear();
    const photo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#c33"/></svg>');
    localStorage.setItem('beanlog.beans.v1', JSON.stringify([
      { id:'old-1', name:'迁移测试豆', roastLevel:'中烘', status:'正在喝', rating:5, note:'来自旧版本', photo,
        trackOpenDate:false, grams:250, repurchaseCount:1, inRepurchase:true, inPlanToBuy:false, createdAt:'2026-01-01T00:00:00.000Z' }
    ]));
    localStorage.setItem('beanlog.dailyRecords.v1', JSON.stringify([
      { id:'old-rec', date:'2026-01-02', photos:[photo], method:'espresso', values:{dose:'18'}, note:'旧记录' }
    ]));
    return 'seeded';
  })()`)
  await send('Page.navigate', { url: BASE })
  await sleep(4000)
  console.log('  豆子数 =', await ev(`document.querySelectorAll('h3').length`))
  console.log('  豆名 =', await ev(`document.querySelector('h3')?.innerText`))
  console.log('  旧 localStorage 键还剩 =', await ev(`JSON.stringify(Object.keys(localStorage))`))
  console.log('  IndexedDB 照片数 =', await ev(`new Promise((res)=>{const r=indexedDB.open('beanlog');r.onsuccess=()=>{const db=r.result;const t=db.transaction('photos','readonly');const q=t.objectStore('photos').getAllKeys();q.onsuccess=()=>res(q.result.length)}})`))
  await shot('migrated-11-library')
  await click('每日记录')
  await shot('migrated-12-daily')

  console.log('\n▶ 新增一袋（无照片）')
  await click('豆库')
  await clickLabel('记一袋新豆子')
  await sleep(1000)
  await ev(`(()=>{const i=document.querySelector('input[aria-label="豆子名称"]');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'测试新豆-浅烘');i.dispatchEvent(new Event('input',{bubbles:true}));return i.value})()`)
  await sleep(500)
  await shot('new-13-detail')
  await click('保存')
  await sleep(900)
  console.log('  保存后豆子数 =', await ev(`document.querySelectorAll('h3').length`))
  console.log('  第一袋 =', await ev(`document.querySelector('h3')?.innerText`))
  await shot('new-14-library')

  console.log('\n▶ 控制台报错')
  const clean = logs.filter((l) => !/favicon|Download the React DevTools/i.test(l))
  console.log(clean.length ? clean.join('\n') : '  （无）')

  await send('Browser.close').catch(() => {})
  process.exit(0)
}

main().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
