/**
 * 旧版备份（v1 形状：照片是嵌在豆子/记录里的 dataURL）导入测试。
 * 用法：node scripts/test-v1-import.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://localhost:5199/'
const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => {
  ws.addEventListener('open', res)
  ws.addEventListener('error', rej)
})
let id = 0
const pending = new Map()
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
})
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id
    pending.set(i, r)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const ev = async (expr) => {
  const m = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (m.exceptionDetails) throw new Error(m.exceptionDetails.text + ' ' + (m.exceptionDetails.exception?.description ?? ''))
  return m.result?.result?.value
}

await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: BASE })
await sleep(4000)

// 造一份 v1 形状的备份：豆子带 photo（dataURL）、记录带 photos 数组
const v1 = await ev(`(() => {
  const svg = (color, text) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">' +
    '<rect width="300" height="400" fill="' + color + '"/>' +
    '<text x="150" y="200" font-size="40" fill="#fff" text-anchor="middle">' + text + '</text></svg>');
  const backup = {
    schema: 'beanlog.backup',
    version: 1,
    app: '豆袋小记',
    exportedAt: '2026-10-01T00:00:00.000Z',
    counts: { beans: 2, grinders: 1, dailyRecords: 1, photos: 3 },
    data: {
      beans: [
        { id:'v1-1', name:'旧版备份豆A', roastLevel:'深烘', status:'正在喝', rating:5, note:'来自 v1 备份',
          photo: svg('#2B4C7E','A'), originalPhoto: svg('#173A6B','A原图'),
          trackOpenDate:true, openDate:'2026-09-01', grams:454, repurchaseCount:2,
          inRepurchase:true, inPlanToBuy:false, createdAt:'2026-09-01T00:00:00.000Z' },
        { id:'v1-2', name:'旧版备份豆B', roastLevel:'浅烘', status:'未开袋', rating:0, note:'',
          photo: svg('#C0392B','B'),
          trackOpenDate:false, grams:200, repurchaseCount:0,
          inRepurchase:false, inPlanToBuy:true, createdAt:'2026-09-02T00:00:00.000Z' }
      ],
      grinders: [ { id:'g1', name:'旧磨豆器', min:1, max:20, step:1, unit:'格', note:'旧数据' } ],
      dailyRecords: [
        { id:'v1-rec', date:'2026-09-03', photos:[svg('#4F8A67','c1'), svg('#E5A23B','c2')],
          method:'pour-over', values:{ dose:'15', water:'240' }, note:'v1 的每日记录' }
      ]
    }
  };
  return JSON.stringify(backup);
})()`)
console.log('v1 备份大小:', (v1.length / 1024).toFixed(1), 'KB')

console.log('\n▶ 清空当前数据')
await ev(`(async () => { indexedDB.deleteDatabase('beanlog'); localStorage.clear() })()`)
await send('Page.navigate', { url: BASE })
await sleep(4000)

console.log('▶ 用 v1 备份导入')
const imported = await ev(`(async () => {
  const tabs = [...document.querySelectorAll('nav button')];
  const me = tabs.find(t => t.innerText.includes('我的')); me && me.click();
  await new Promise(r => setTimeout(r, 1200));
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('从备份恢复'));
  if (!b) return 'NO_BUTTON';
  window.confirm = () => true;
  const input = document.querySelector('input[accept*="json"]');
  const dt = new DataTransfer();
  dt.items.add(new File([${JSON.stringify(v1)}], 'v1-backup.json', { type: 'application/json' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 8000));
  return document.body.innerText.includes('旧版备份') || document.body.innerText.includes('已恢复') ? 'ok' : 'done';
})()`)
console.log('  结果:', imported)
await sleep(1500)

const check = await ev(`(async () => {
  const db = await new Promise(r => { const q = indexedDB.open('beanlog'); q.onsuccess = () => r(q.result) });
  const photos = await new Promise(r => { const q = db.transaction('photos','readonly').objectStore('photos').getAll(); q.onsuccess = () => r(q.result) });
  const kv = await new Promise(r => { const q = db.transaction('kv','readonly').objectStore('kv').get('appData'); q.onsuccess = () => r(q.result?.value) });
  const b = kv.beans.find(x => x.id === 'v1-1');
  const rec = kv.dailyRecords[0];
  return JSON.stringify({
    beans: kv.beans.length,
    names: kv.beans.map(x => x.name),
    beanA: { photoId: !!b.photoId, originalPhotoId: !!b.originalPhotoId, hasInlinePhoto: 'photo' in b, hasGrams: 'grams' in b },
    grinders: kv.grinders.map(g => g.name),
    dailyRecords: kv.dailyRecords.length,
    dailyPhotoIds: rec ? rec.photoIds.length : 0,
    dailyNote: rec ? rec.note : null,
    dailyValues: rec ? rec.values : null,
    photosInDB: photos.length,
    photoBytes: photos.reduce((n,p) => n + p.blob.size, 0),
  });
})()`)
console.log('\n▶ 导入结果:', check)

const r = JSON.parse(check)
const ok =
  r.beans === 2 &&
  r.beanA.photoId && r.beanA.originalPhotoId && !r.beanA.hasInlinePhoto && !r.beanA.hasGrams &&
  r.grinders[0] === '旧磨豆器' &&
  r.dailyRecords === 1 && r.dailyPhotoIds === 2 && r.dailyNote === 'v1 的每日记录' &&
  r.photosInDB === 5

console.log(ok ? '\n✅ v1 备份导入正确：内联照片转成了 IndexedDB 照片，旧字段已清理' : '\n❌ v1 备份导入有问题')

// 界面上是否正常渲染（在同一个会话里看，别开新页面）
await ev(`(()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.innerText.includes('豆库'));b&&b.click()})()`)
await sleep(1600)
const ui = await ev(`JSON.stringify({
  beans: [...document.querySelectorAll('h3')].map(h => h.innerText),
  blobImages: [...document.querySelectorAll('img')].filter(i => i.src.startsWith('blob:')).length,
})`)
console.log('  豆库界面:', ui)
await ev(`(()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.innerText.includes('每日记录'));b&&b.click()})()`)
await sleep(1600)
const daily = await ev(`JSON.stringify({
  hasDayCount: document.body.innerText.includes('已在 1 天留下记录'),
  text: document.body.innerText.replace(/\\n+/g, ' ').slice(0, 200),
})`)
console.log('  每日记录界面:', daily)

const uiOk = JSON.parse(ui).beans.length === 2 && JSON.parse(ui).blobImages >= 2 && JSON.parse(daily).hasDayCount
console.log(uiOk ? '✅ 界面渲染正常（占位图/照片、记录统计都对）' : '❌ 界面渲染不对')

const shot = await send('Page.captureScreenshot', { format: 'png' })
await (await import('node:fs/promises')).writeFile(
  '/tmp/v1-import-daily.png',
  Buffer.from(shot.result.data, 'base64'),
)

await send('Browser.close').catch(() => {})
process.exit(ok && uiOk ? 0 : 1)
