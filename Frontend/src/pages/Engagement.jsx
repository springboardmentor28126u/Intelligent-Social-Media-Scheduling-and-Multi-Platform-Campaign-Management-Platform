import { useState } from 'react'
import { MessageCircle, RefreshCw } from 'lucide-react'
import { api } from '../api'
import { useApiData } from '../hooks/useApiData'
import { LiveBadge } from '../components/LiveBadge'

const title = value => value.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())

export const Engagement = ({ canManage = false }) => {
  const [status, setStatus] = useState('all')
  const [busy, setBusy] = useState(false)
  const { data: items, error, loading, reload: load, setError } = useApiData(`/engagement?days=90${status === 'all' ? '' : `&status=${status}`}`, [], 60000)
  const sync = async () => { setBusy(true); setError(''); try { await api('/analytics/refresh?days=90', { method: 'POST' }); await load() } catch (err) { setError(err.message) } finally { setBusy(false) } }
  const update = async (item, next) => { setBusy(true); setError(''); try { await api(`/engagement/${item.job_id}`, { method: 'PATCH', body: JSON.stringify({ status: next, note: item.note || '' }) }); await load() } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <div><div className="page-header-row"><div><h1 className="page-main-heading">Engagement Tracking</h1><p className="page-main-sub">Monitor likes, comments, shares and views on published posts across Facebook, Instagram, LinkedIn, X and YouTube. New comments flag a post as needing attention.</p></div><div className="analytics-controls-row"><LiveBadge syncedAt={items.reduce((latest, item) => (item.last_synced_at && (!latest || item.last_synced_at > latest) ? item.last_synced_at : latest), null)} /><select className="custom-select" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All workflows</option><option value="needs_attention">Needs attention</option><option value="monitoring">Monitoring</option><option value="reviewed">Reviewed</option></select>{canManage && <button type="button" className="btn btn-primary" onClick={sync} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} />Sync now</button>}</div></div>{error && <div className="info-callout-card" role="alert">{error}</div>}{loading ? <p role="status">Loading engagement…</p> : items.length === 0 ? <div className="dashboard-card"><MessageCircle size={28} /><h3>No engagement items yet</h3><p>Publish a post, then sync engagement.</p></div> : <div className="dashboard-card p-0"><div className="table-responsive"><table className="modern-table"><thead><tr><th>Post</th><th>Network</th><th>Engagement</th><th>Last sync</th><th>Workflow</th></tr></thead><tbody>{items.map(item => <tr key={item.job_id}><td><strong>{item.campaign}</strong><div className="text-xs text-slate-500">{item.account_name}</div>{item.last_error && <div className="text-xs text-amber">{item.last_error}</div>}</td><td>{title(item.provider)}</td><td><div className="engagement-metrics"><span>Likes {item.metrics.likes}</span><span>Comments {item.metrics.comments}</span><span>Shares {item.metrics.shares}</span>{item.metrics.impressions > 0 && <span>{item.provider === 'youtube' ? 'Views' : 'Impressions'} {item.metrics.impressions}</span>}</div></td><td>{item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : 'Not synced'}</td><td><select className="custom-select" value={item.status} disabled={!canManage || busy} onChange={e => update(item, e.target.value)}><option value="monitoring">Monitoring</option><option value="needs_attention">Needs attention</option><option value="reviewed">Reviewed</option></select></td></tr>)}</tbody></table></div></div>}</div>
}

export default Engagement
