import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function apiSource(value = '/api') {
  if (value.startsWith('/') && !value.startsWith('//') && !/[\s;"'\\]/.test(value)) return "'self'"
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /[\s;"'*\\]/.test(value + url.origin)) {
    throw new Error('VITE_API_URL must be a relative path or an explicit HTTP(S) API URL')
  }
  return url.origin
}

export function configure(apiUrl) {
  const source = apiSource(apiUrl)
  const nginx = readFileSync(new URL('./nginx.conf', import.meta.url), 'utf8')
    .replace(/connect-src [^;]+;/, `connect-src ${source};`)
  const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
  const csp = vercel.headers[0].headers.find(header => header.key === 'Content-Security-Policy')
  csp.value = csp.value.replace(/connect-src [^;]+;/, `connect-src ${source};`)
  writeFileSync(new URL('./nginx.conf', import.meta.url), nginx)
  writeFileSync(new URL('./vercel.json', import.meta.url), JSON.stringify(vercel, null, 2) + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  configure(process.env.VITE_API_URL || '/api')
}
