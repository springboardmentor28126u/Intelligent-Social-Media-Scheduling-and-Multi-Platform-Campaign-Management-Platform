import { useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Clock3 } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'

const FILTERS = [['all', 'All'], ['danger', 'Needs action'], ['success', 'Published'], ['pending', 'Upcoming']]

export const Notifications = ({ notifications = [], onOpen }) => {
  const [filter, setFilter] = useState('all')
  const items = notifications.filter(n => filter === 'all' || n.tone === filter)
  return <div className="cm-page">
    <div className="page-header-row"><div><h1 className="page-main-heading">Notifications</h1><p className="page-main-sub">Publishing results, failures that need action, and posts going out in the next 24 hours.</p></div></div>
    <div className="time-range-picker cm-filter">{FILTERS.map(([key, name]) => <button type="button" key={key} className={`range-pill ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{name} ({key === 'all' ? notifications.length : notifications.filter(n => n.tone === key).length})</button>)}</div>
    {items.length === 0 ? <EmptyState icon={Bell} title="Nothing here" description="Notifications appear when posts are published, fail, or are about to go out." /> :
      <div className="dashboard-card p-0 cm-posts-card">{items.map(n => {
        const Icon = n.tone === 'success' ? CheckCircle2 : n.tone === 'danger' ? AlertTriangle : Clock3
        return <button type="button" key={n.id} className="notification-item notif-button notif-row" onClick={() => onOpen(n)}>
          <div className={`notif-icon ${n.tone === 'success' ? 'bg-emerald-light' : n.tone === 'danger' ? 'bg-rose-light' : 'bg-indigo-light'}`}><Icon size={16} className={n.tone === 'success' ? 'text-emerald' : n.tone === 'danger' ? 'text-rose' : 'text-indigo'} /></div>
          <div className="notif-content"><p className="notif-text">{n.title}</p><span className="notif-time">{n.detail}</span></div>
          <span className="cm-subtle">{new Date(n.at).toLocaleString()}</span>
        </button>
      })}</div>}
  </div>
}

export default Notifications
