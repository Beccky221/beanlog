/**
 * 备份往返测试：导出 → 清空 → 导入 → 校验数据一致。
 * 需要先跑一个 preview 服务。用法：node scripts/test-backup-roundtrip.mjs [baseUrl]
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
const click = async (text) => {
  const r = await ev(`(() => {
    const all = [...document.querySelectorAll('button,[role="button"],a')];
    const c = all.filter((el) => (el.innerText || '').replace(/\\s+/g,'').includes(${JSON.stringify(text)}.replace(/\\s+/g,'')));
    if (!c.length) return 'NONE';
    c.sort((a,b) => (a.innerText||'').length - (b.innerText||'').length);
    c[0].click();
    return 'ok';
  })()`)
  await sleep(1200)
  return r
}

await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: BASE })
await sleep(4000)

console.log('1) 清空并造一份带照片的数据')
await ev(`(async () => {
  indexedDB.deleteDatabase('beanlog');
  localStorage.clear();
})()`)
await send('Page.navigate', { url: BASE })
await sleep(4000)

// 给第一袋豆子加照片
await ev(`(()=>{const el=[...document.querySelectorAll('[role="button"]')].find(e=>e.querySelector('h3'));el&&el.click()})()`)
await sleep(1200)
await ev(`(async () => {
  const c = document.createElement('canvas'); c.width = 1000; c.height = 1400;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0,0,1000,1400); g.addColorStop(0,'#1F5FA8'); g.addColorStop(1,'#E5A23B');
  x.fillStyle = g; x.fillRect(0,0,1000,1400);
  x.fillStyle = '#fff'; x.font = 'bold 90px serif'; x.fillText('往返测试', 80, 700);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  const input = document.querySelector('input[type=file]');
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'rt.jpg', { type: 'image/jpeg' }));
  input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
})()`)
await sleep(3500)
await click('保存')
// 记一条每日记录
await click('每日记录')
await click('记录今天')
await ev(`(async () => {
  const c = document.createElement('canvas'); c.width = 800; c.height = 800;
  const x = c.getContext('2d'); x.fillStyle = '#4F8A67'; x.fillRect(0,0,800,800);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  const input = document.querySelector('input[type=file]');
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'day.jpg', { type: 'image/jpeg' }));
  input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
})()`)
await sleep(3000)
await ev(`(() => { const i = document.querySelector('input[placeholder*="札记"]'); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(i,'往返测试札记'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'typed' })()`)
await sleep(400)
await click('保存')

const before = await ev(`(async () => {
  const db = await new Promise(r => { const q = indexedDB.open('beanlog'); q.onsuccess = () => r(q.result) });
  const photos = await new Promise(r => { const q = db.transaction('photos','readonly').objectStore('photos').getAll(); q.onsuccess = () => r(q.result) });
  const kv = await new Promise(r => { const q = db.transaction('kv','readonly').objectStore('kv').get('appData'); q.onsuccess = () => r(q.result?.value) });
  return JSON.stringify({
    beans: kv.beans.length,
    beansWithPhoto: kv.beans.filter(b => b.photoId).length,
    dailyRecords: kv.dailyRecords.length,
    dailyPhotos: kv.dailyRecords.reduce((n, r) => n + r.photoIds.length, 0),
    photosInDB: photos.length,
    photoBytes: photos.reduce((n, p) => n + p.blob.size, 0),
    firstBean: kv.beans[0].name,
    note: kv.dailyRecords[0]?.note,
  });
})()`)
console.log('   导入前:', before)

console.log('2) 导出备份')
const backupText = await ev(`(async () => {
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){ if(this.download){ window.__href = this.href } };
  // 切到「我的」
  const tabs = [...document.querySelectorAll('nav button')];
  const me = tabs.find(t => t.innerText.includes('我的')); me && me.click();
  await new Promise(r => setTimeout(r, 1200));
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('导出备份'));
  if (!b) return 'NO_BUTTON';
  b.click();
  await new Promise(r => setTimeout(r, 8000));
  HTMLAnchorElement.prototype.click = origClick;
  if (!window.__href) return 'NO_DOWNLOAD';
  return await (await fetch(window.__href)).text();
})()`)
if (backupText === 'NO_BUTTON' || backupText === 'NO_DOWNLOAD') throw new Error('导出失败: ' + backupText)
const parsed = JSON.parse(backupText)
console.log('   备份:', JSON.stringify({ version: parsed.version, counts: parsed.counts, photos: Object.keys(parsed.data.photos).length, mb: (backupText.length/1048576).toFixed(2) }))

console.log('3) 清空数据（模拟换手机）')
await ev(`(async () => {
  indexedDB.deleteDatabase('beanlog');
  localStorage.clear();
  return 'cleared';
})()`)
await send('Page.navigate', { url: BASE })
await sleep(4000)
const afterClear = await ev(`(async () => {
  const db = await new Promise(r => { const q = indexedDB.open('beanlog'); q.onsuccess = () => r(q.result) });
  const photos = await new Promise(r => { const q = db.transaction('photos','readonly').objectStore('photos').getAll(); q.onsuccess = () => r(q.result) });
  const kv = await new Promise(r => { const q = db.transaction('kv','readonly').objectStore('kv').get('appData'); q.onsuccess = () => r(q.result?.value) });
  return JSON.stringify({ beans: kv?.beans.length, photosInDB: photos.length });
})()`)
console.log('   清空后:', afterClear)

console.log('4) 导入备份（走真实 UI + File）')
const importResult = await ev(`(async () => {
  const tabs = [...document.querySelectorAll('nav button')];
  const me = tabs.find(t => t.innerText.includes('我的')); me && me.click();
  await new Promise(r => setTimeout(r, 1200));
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('从备份恢复'));
  if (!b) return 'NO_BUTTON';
  window.confirm = () => true;
  const input = document.querySelector('input[accept*="json"]');
  const dt = new DataTransfer();
  dt.items.add(new File([${JSON.stringify(backupText)}], 'backup.json', { type: 'application/json' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 9000));
  return 'imported';
})()`)
console.log('   ', importResult)
await sleep(1500)

const after = await ev(`(async () => {
  const db = await new Promise(r => { const q = indexedDB.open('beanlog'); q.onsuccess = () => r(q.result) });
  const photos = await new Promise(r => { const q = db.transaction('photos','readonly').objectStore('photos').getAll(); q.onsuccess = () => r(q.result) });
  const kv = await new Promise(r => { const q = db.transaction('kv','readonly').objectStore('kv').get('appData'); q.onsuccess = () => r(q.result?.value) });
  return JSON.stringify({
    beans: kv.beans.length,
    beansWithPhoto: kv.beans.filter(b => b.photoId).length,
    dailyRecords: kv.dailyRecords.length,
    dailyPhotos: kv.dailyRecords.reduce((n, r) => n + r.photoIds.length, 0),
    photosInDB: photos.length,
    photoBytes: photos.reduce((n, p) => n + p.blob.size, 0),
    firstBean: kv.beans[0].name,
    note: kv.dailyRecords[0]?.note,
  });
})()`)
console.log('   导入后:', after)

const b = JSON.parse(before), a = JSON.parse(after)
const same =
  b.beans === a.beans && b.dailyRecords === a.dailyRecords &&
  b.photosInDB === a.photosInDB && b.dailyPhotos === a.dailyPhotos &&
  b.firstBean === a.firstBean && b.note === a.note
console.log(same ? '\n✅ 往返一致（豆子数/每日记录/照片数/内容都相同）' : '\n❌ 往返不一致')

// 界面是否真的显示出了照片
console.log('   界面照片地址:', await ev(`(()=>{const i=[...document.querySelectorAll('img')].find(x=>x.src.startsWith('blob:'));return i? 'blob 地址已生成' : '没有找到 blob 图片'})()`))

await send('Browser.close').catch(() => {})
process.exit(same ? 0 : 1)
