"""给当前已确认的预览版本接入每日照片编辑及曲线工具，保留原有界面。"""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import hashlib, re, shutil, subprocess
root = Path(__file__).resolve().parent.parent
home = root.parent
stamp = datetime.now(ZoneInfo('Asia/Shanghai')).strftime('%Y-%m-%d-%H%M%S')
backup = home / '.backups' / ('每日曲线工具-' + stamp)
entry = (root / 'index.html').read_text()
old_name = re.findall(r'<script[^>]+src="(\./assets/preview-[^"]+\.js)"', entry)[-1]
old_js = (root / old_name).read_text()

def patch(script):
    if 'coffee-lab-curve' in script: return script
    pos = script.index('点击添加咖啡照片')
    start = script.rfind('function jt(', 0, pos)
    end = script.index('function ', pos)
    assert start >= 0
    part = script[start:end]
    begin = part.index('u=async M=>')
    finish = part.index(';return Q.jsxs(', begin)
    part = part[:begin] + '''u=async M=>{if(!M||t)return;const picked=Array.from(M).slice(0,cy-n.length);if(!picked.length)return;y(!0);const added=[];try{for(const file of picked){const edited=await globalThis.CoffeeLabDailyTools.editPhoto(file);if(!edited)continue;const saved=await c(edited);added.push(saved.id)}s({photoIds:[...n,...added]})}catch(error){added.length&&U(added);window.alert("照片未能保存，请重试。")}finally{y(!1)}},Y=M=>{s({photoIds:n.filter((q,v)=>v!==M)})},editDaily=async index=>{if(t||!r[index])return;y(!0);try{const blob=await(await fetch(r[index])).blob(),edited=await globalThis.CoffeeLabDailyTools.editPhoto(blob);if(!edited)return;const saved=await c(edited);s({photoIds:n.map((old,i)=>i===index?saved.id:old)})}catch(error){window.alert("照片编辑未完成，请重试。")}finally{y(!1)}}''' + part[finish:]
    remove = 'Q.jsx("button",{type:"button",onClick:()=>Y(q),"aria-label":`删除照片 ${q+1}`'
    assert part.count(remove) == 1
    edit = 'Q.jsx("button",{type:"button",disabled:t,onClick:()=>editDaily(q),"aria-label":`编辑照片 ${q+1}`,className:"absolute bottom-1 inset-x-1 rounded-full bg-[var(--c-ink)] text-[var(--c-primary-ink)] text-[11px] py-1",children:"编辑照片"}),'
    part = part.replace(remove, edit + remove, 1)
    ending = ']})})]})}'
    assert part.endswith(ending)
    part = part[:-len(ending)] + ',G.source!=="outside"&&Q.jsx("coffee-lab-curve",{config:{entry:G,bean:i.find(bean=>bean.id===G.beanId),urls:r,onPatch:s}})' + ending
    script = script[:start] + part + script[end:]
    old = 'function xt(i){return i.photoIds.length>0'
    assert script.count(old) == 1
    script = script.replace(old, 'function xt(i){return!!i.brewOptimization||i.photoIds.length>0', 1)
    for destination, variable in [('U','y'),('w','s')]:
        old = f'{destination}.push({{beanId:typeof {variable}.beanId'
        assert script.count(old) == 1
        script = script.replace(old, f'{destination}.push({{brewOptimization:globalThis.CoffeeLabDailyTools.normalizeAnalysis({variable}.brewOptimization),beanId:typeof {variable}.beanId', 1)
    old = 'onRemove:()=>n(Y.id),onSavePhoto:F,onDropPhotos:c'
    assert script.count(old) == 1
    script = script.replace(old, 'onRemove:()=>n(Y.id),onSavePhoto:async(...args)=>{const photo=await F(...args);(t.__createdPhotos??=new Set).add(photo.id);photo.originalId&&t.__createdPhotos.add(photo.originalId);return photo},onDropPhotos:c', 1)
    old = 'r(Y),s(Y)},u=()=>'
    assert script.count(old) == 1
    script = script.replace(old, 'r(Y);const kept=new Set(Y.flatMap(item=>item.photoIds??[])),removed=[...t.current].filter(id=>!kept.has(id));s(Y);removed.length&&c(removed)},u=()=>', 1)
    script = re.sub(r'new Set\(U\.flatMap\((\w+)=>\1\.photoIds\?\?\[\]\)\)', lambda m: 'new Set([...(t.__createdPhotos||[]),...U.flatMap('+m[1]+'=>'+m[1]+'.photoIds??[])])', script)
    return script

new_js = patch(old_js)
# 仅校验脚本语法，不启动浏览器、不调用模型。
check = root / '.daily-tools-build' / 'patched-preview.js'
check.write_text(new_js)
subprocess.run(['node', '--check', str(check)], check=True)
feature = (root / '.daily-tools-build/daily-tools.js').read_text()
style = (root / '.daily-tools-build/daily-tools.css').read_text()
js_name = 'preview-' + hashlib.sha256(new_js.encode()).hexdigest()[:12] + '.js'
feature_name = 'daily-tools-' + hashlib.sha256(feature.encode()).hexdigest()[:12] + '.js'
css_name = 'daily-tools-' + hashlib.sha256(style.encode()).hexdigest()[:12] + '.css'
for directory in ['assets','docs/assets']:
    for name, data in [(js_name,new_js),(feature_name,feature),(css_name,style)]: (root / directory / name).write_text(data)

def write(path, data):
    target = backup / path.relative_to(home)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, target)
    path.write_text(data)
for name in ['index.html','404.html','docs/index.html','docs/404.html']:
    path = root / name
    html = path.read_text()
    assert old_name.split('/')[-1] in html
    html = html.replace(old_name.split('/')[-1], js_name)
    html = re.sub(r'<link[^>]+href="\./assets/daily-tools-[^"]+\.css"[^>]*>\s*', '', html)
    html = re.sub(r'<script[^>]+src="\./assets/daily-tools-[^"]+\.js"[^>]*></script>\s*', '', html)
    html = html.replace('</head>', f'<link rel="stylesheet" href="./assets/{css_name}" />\n<script src="./assets/{feature_name}"></script>\n</head>', 1)
    write(path, html)
for path in [home/'咖啡实验室.html',home/'豆袋小记.html',root/'single/咖啡实验室.html',root/'single/豆袋小记.html']:
    html = patch(path.read_text())
    html = re.sub(r'<style id="bl-daily-tools-style">[\s\S]*?</style>\s*', '', html)
    html = re.sub(r'<script id="bl-daily-tools-script">[\s\S]*?</script>\s*', '', html)
    inline = '<style id="bl-daily-tools-style">' + style + '</style>\n<script id="bl-daily-tools-script">' + feature.replace('</script', '<\\/script') + '</script>\n'
    write(path, html.replace('</head>', inline + '</head>', 1))
for name in ['public/sw.js','sw.js','docs/sw.js']:
    path = root / name
    write(path, re.sub(r"beanlog-v(\d+)", lambda m: 'beanlog-v'+str(int(m[1])+1), path.read_text(), count=1))
print('已接入每日工具；当前预览布局保留，原版已备份。')
