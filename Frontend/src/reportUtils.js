export const PLATFORM_LABELS = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', youtube: 'YouTube', pinterest: 'Pinterest', unspecified: 'Unspecified' }
export const platformLabel = value => PLATFORM_LABELS[value] || value
export const OBJECTIVES = ['awareness', 'engagement', 'traffic', 'conversions', 'followers', 'sales']
export const titleCase = value => String(value || '').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
export const SERIES_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#e1306c', '#8b5cf6', '#14b8a6', '#ef4444']

export function money(value, currency = 'INR') {
  const amount = Number(value || 0)
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount) }
  catch { return `${currency} ${amount.toLocaleString()}` }
}
export const num = value => Number(value || 0).toLocaleString()
export const percent = value => (value === null || value === undefined ? '—' : `${value}%`)

function cell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  // Neutralise spreadsheet formula injection and quote every field.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function toCsv(columns, rows) {
  const header = columns.map(c => cell(c.label)).join(',')
  const body = rows.map(row => columns.map(c => cell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','))
  return [header, ...body].join('\r\n')
}

export function downloadCsv(filename, columns, rows) {
  const blob = new Blob(['﻿' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const stamp = () => new Date().toISOString().slice(0, 10)

/** Percentage change helper for "vs previous period" chips. */
export function trendOf(current, previous) {
  if (!previous && !current) return {}
  if (!previous) return { trend: 'New', trendUp: true }
  const change = ((current - previous) / previous) * 100
  return { trend: `${change >= 0 ? '+' : ''}${Math.abs(change) >= 100 ? Math.round(change) : change.toFixed(1)}%`, trendUp: change >= 0 }
}
