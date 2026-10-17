import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile, chmod } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(root, '.env.local')
let env = ''
try { env = await readFile(file, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
const read = key => env.split(/\r?\n/).find(line => line.startsWith(key + '='))?.slice(key.length + 1).trim() || ''
const put = (key, value) => {
  const lines = env.split(/\r?\n/).filter(line => !line.startsWith(key + '='))
  env = lines.join('\n').trimEnd() + `\n${key}=${value}\n`
}
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const plain = [...randomBytes(20)].map(byte => alphabet[byte % alphabet.length]).join('')
const code = plain.match(/.{4}/g).join('-')
const hash = createHash('sha256').update(plain).digest('hex')
const hashes = [...new Set([...read('RECOMMEND_INVITE_HASHES').split(',').filter(Boolean), hash])]
put('RECOMMEND_INVITE_HASHES', hashes.join(','))
if (read('RECOMMEND_INVITE_SESSION_SECRET').length < 32) put('RECOMMEND_INVITE_SESSION_SECRET', randomBytes(48).toString('base64url'))
await writeFile(file, env, { mode: 0o600 })
await chmod(file, 0o600)
const output = path.join(root, '..', `推荐邀请码-${new Date().toISOString().replace(/[:.]/g, '-')}.local`)
await writeFile(output, `咖啡实验室 · 找一袋喜欢的豆\n\n邀请码：${code}\n\n把邀请码发给受邀用户，在 APP 中点击该功能后输入。一个邀请码可以多人使用，也可以再次运行生成命令为不同用户生成独立邀请码。\n\n此邀请码的服务端摘要：${hash}\n停用方法：从推荐服务环境变量 RECOMMEND_INVITE_HASHES 中删除该摘要，然后重新启动/部署推荐服务。\n\n本机 .env.local 已更新。手机端需部署新版推荐服务，并把相同的邀请配置填入云端环境变量；不要使用识图函数地址。\n`, { mode: 0o600 })
console.log('邀请码已生成并写入私有文件：' + output)
console.log('本机推荐服务配置已更新；启动或重启后生效。')
