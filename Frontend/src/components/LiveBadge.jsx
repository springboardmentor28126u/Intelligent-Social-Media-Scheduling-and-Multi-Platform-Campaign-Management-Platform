import { useEffect, useState } from 'react'

function ago(ms) {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.floor(hours / 24)} d ago`
}

/** Pulsing "Live" indicator: fresh (<30 min) data pulses green, older data turns amber. */
export const LiveBadge = ({ syncedAt, label = 'Live' }) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const time = syncedAt ? new Date(syncedAt).getTime() : null
  const fresh = time && now - time < 30 * 60000
  return <span className={`live-badge ${fresh ? 'is-fresh' : 'is-stale'}`} title={syncedAt ? new Date(syncedAt).toLocaleString() : 'Not synced yet'}>
    <span className="live-dot" />
    <strong>{fresh ? label : 'Idle'}</strong>
    <span>{time ? `synced ${ago(now - time)}` : 'waiting for first sync'}</span>
  </span>
}

export default LiveBadge
