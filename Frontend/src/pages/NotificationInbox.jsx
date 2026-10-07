import { useEffect, useState } from 'react'
import { api } from '../api'
import './collaboration.css'

export function Notifications({ notifications = [], onOpen, onChanged }) {
  const [preferences, setPreferences] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api('/notifications/preferences', { signal: controller.signal }), api('/notifications/deliveries', { signal: controller.signal })])
      .then(([prefs, rows]) => { setPreferences(prefs); setDeliveries(rows) })
      .catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [])
  const save = async next => {
    setBusy(true); setError(''); setNotice('')
    try { setPreferences(await api('/notifications/preferences', { method: 'PUT', body: JSON.stringify({ email: next.email, push: next.push }) })); setNotice('Notification preferences saved.') }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const push = async () => {
    setBusy(true); setError('')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('This browser does not support push notifications.')
      if (await Notification.requestPermission() !== 'granted') throw new Error('Allow notifications in your browser settings to enable push.')
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const key = preferences.vapid_public_key
      const bytes = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4)), c => c.charCodeAt(0))
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes })
      await api('/notifications/subscriptions', { method: 'POST', body: JSON.stringify(subscription.toJSON()) })
      await save({ ...preferences, push: true })
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const disablePush = async () => {
    setBusy(true); setError('')
    try {
      await api('/notifications/subscriptions', { method: 'DELETE' })
      const registration = await navigator.serviceWorker?.getRegistration('/sw.js')
      const subscription = await registration?.pushManager.getSubscription()
      await subscription?.unsubscribe()
      await save({ ...preferences, push: false })
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const items = notifications.filter(n => filter === 'all' || (filter === 'unread' ? !n.read : n.category === filter))
  return <div className="cm-page collaboration"><h1 className="page-main-heading">Notifications</h1><p className="page-main-sub">Saved updates for your personal work and teams. Read status follows your account across devices.</p>
    {error && <p role="alert" className="info-callout-card">{error}</p>}{notice && <p role="status">{notice}</p>}
    {preferences && <section className="dashboard-card collab-form"><h2>Delivery preferences</h2>
      <label className="collab-checkbox"><input type="checkbox" disabled={busy || !preferences.email_configured} checked={preferences.email} onChange={e => save({ ...preferences, email: e.target.checked })} />Email notifications</label>
      {!preferences.email_configured && <p>Email delivery needs mail-server settings before it can be enabled.</p>}
      <button className="btn btn-secondary" disabled={busy || !preferences.push_configured} onClick={preferences.push ? disablePush : push}>{preferences.push ? 'Disable push on all browsers' : 'Enable browser push'}</button>
      {!preferences.push_configured && <p>Browser push needs server push keys. In-app notifications remain available.</p>}
      <p>New notifications are delivered only through channels you enable.</p>
    </section>}
    <div className="cm-actions"><label>Filter <select className="form-input" value={filter} onChange={e => setFilter(e.target.value)}>{['all', 'unread', 'approval', 'team', 'publishing', 'reminder', 'campaign', 'account'].map(f => <option key={f}>{f}</option>)}</select></label><button className="btn btn-secondary" disabled={busy} onClick={async () => { try { await api('/notifications/read-all', { method: 'POST' }); await onChanged() } catch (e) { setError(e.message) } }}>Mark all read</button></div>
    <section className="dashboard-card">{items.length ? items.map(n => <button key={n.id} className={`approval-item ${n.read ? '' : 'notification-unread'}`} onClick={() => onOpen(n)}><strong>{n.title}</strong><span>{n.detail}</span><small>{new Date(n.at).toLocaleString()} · {n.category} · {n.read ? 'Read' : 'Unread'}</small></button>) : <p>No notifications in this filter.</p>}<p>Showing the latest 100 updates.</p></section>
    {!!deliveries.length && <section className="dashboard-card"><h2>Recent delivery status</h2>{deliveries.slice(0, 10).map(d => <p key={d.id}>{d.channel}: {d.status}{d.error && ` — ${d.error}`}</p>)}</section>}
  </div>
}
