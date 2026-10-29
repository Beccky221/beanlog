"""生成现有阿里云函数的部署包，仅列入明确的源码文件。"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil

root = Path(__file__).resolve().parent.parent
output = root.parent / '部署文件'
output.mkdir(exist_ok=True)
with ZipFile(output / '咖啡实验室-千问识图-FC.zip', 'w', ZIP_DEFLATED) as archive:
    # FC 事件函数根目录入口，改写共用模块的相对位置。
    entry = (root / 'server/vision/index.mjs').read_text().replace("from '../invite-access.mjs'", "from './invite-access.mjs'")
    archive.writestr('index.mjs', entry)
    archive.write(root / 'server/invite-access.mjs', 'invite-access.mjs')
    archive.write(root / 'server/vision/brew-analysis.mjs', 'brew-analysis.mjs')

recommend = output / '千问推荐云端'
with ZipFile(output / '千问推荐云端.zip', 'w', ZIP_DEFLATED) as archive:
    for name in ('recommend.mjs', 'onebound.mjs', 'invite-access.mjs'):
        relative = Path('server') / name
        destination = recommend / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / relative, destination)
        archive.write(root / relative, str(relative))

print('两个函数部署包已生成，不含密钥、邀请码或用户数据。')
