export const BACKEND_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
export async function api(path, options = {}) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${BACKEND_URL}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && token && token === localStorage.getItem('token')) window.dispatchEvent(new Event('session-expired'))
    const detail = data?.detail
    throw new Error(Array.isArray(detail) ? detail.map(item => `${item.loc?.at(-1) || 'Input'}: ${item.msg}`).join('; ') : detail || `Request failed (${response.status})`)
  }
  return data
}
export async function allPages(path, signal) {
  const result = []
  for (let offset = 0; ; offset += 100) {
    const page = await api(`${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${offset}`, { signal })
    result.push(...page)
    if (page.length < 100) return result
  }
}
