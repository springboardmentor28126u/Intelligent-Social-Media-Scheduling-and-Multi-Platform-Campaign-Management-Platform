export const platformName = value => ({ instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X', youtube: 'YouTube' }[value] || value || '')
export const statusLabel = status => (status || 'draft').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
export const isPending = status => ['scheduled', 'retry', 'publishing', 'processing'].includes(status)
export function localFields(timestamp) {
  if (!timestamp) return { date: '', time: '' }
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) return { date: '', time: '' }
  const pad = part => String(part).padStart(2, '0')
  return { date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`, time: `${pad(value.getHours())}:${pad(value.getMinutes())}` }
}
export function scheduledInstant(date, time) {
  if (!date || !time) throw new Error('Choose a schedule date and time.')
  const value = new Date(`${date}T${time}`)
  const roundtrip = localFields(value)
  if (roundtrip.date !== date || roundtrip.time !== time) throw new Error('This local time does not exist. Choose another time.')
  if (value.getTime() <= Date.now()) throw new Error('Schedule must be in the future.')
  return value.toISOString()
}
export function postCampaign(post, jobs) {
  const own = jobs.filter(job => job.post_id === post.id)
  const next = own.filter(job => isPending(job.status)).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0]
  const last = [...own].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))[0]
  const timestamp = post.status === 'draft' ? null : next?.scheduled_at || last?.scheduled_at
  return { ...post, name: post.title, platform: platformName(post.platform || next?.provider || last?.provider), ...localFields(timestamp), jobs: own }
}
export function statusTone(status) {
  if (status === 'published') return 'success'
  if (['failed', 'partially_published', 'needs_review', 'uncertain'].includes(status)) return 'danger'
  if (['draft', 'cancelled'].includes(status)) return 'muted'
  return 'pending'
}
