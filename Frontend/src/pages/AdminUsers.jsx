import { useMemo, useState } from 'react'
import { Search, ShieldCheck, Users } from 'lucide-react'
import { api } from '../api'
import { MetricCard } from '../components/MetricCard'
import { ROLE_CONFIG, getRoleConfig } from '../config/roles'
import { useApiData } from '../hooks/useApiData'

const ROLE_OPTIONS = Object.values(ROLE_CONFIG)

export const AdminUsers = ({ currentUserId }) => {
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const { data: users, error, loading, reload, setError } = useApiData(`/admin/users?limit=100&offset=${page * 100}`, [])
  const visible = useMemo(() => users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())), [users, query])
  const counts = useMemo(() => ROLE_OPTIONS.map(r => ({ ...r, count: users.filter(u => getRoleConfig(u.role).id === r.id).length })), [users])
  const changeRole = async (user, role) => {
    if (!window.confirm(`Change ${user.name}'s role to ${ROLE_CONFIG[role].label}?`)) return
    setBusyId(user.id); setNotice(''); setError('')
    try { await api(`/admin/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); await reload(); setNotice(`${user.name} is now ${ROLE_CONFIG[role].label}. They get the new access on their next request.`) }
    catch (err) { setError(err.message) }
    finally { setBusyId(null) }
  }
  return <div className="cm-page">
    <div className="page-header-row"><div><h1 className="page-main-heading">User Management</h1><p className="page-main-sub">Everyone registered in this workspace and their access level.</p></div></div>
    {error && <div className="info-callout-card" role="alert">{error}</div>}
    {notice && <div className="info-callout-card" role="status">{notice}</div>}
    <div className="metrics-grid">
      <MetricCard title="Users" value={users.length} icon={Users} accent="indigo" subtitle={page ? `page ${page + 1}` : 'on this page'} />
      {counts.map(r => <MetricCard key={r.id} title={r.label} value={r.count} icon={ShieldCheck} accent={{ administrator: 'amber', marketing_manager: 'violet', business_user: 'sky' }[r.id] || 'emerald'} />)}
    </div>
    <div className="search-input-wrapper" style={{ maxWidth: 420 }}><Search size={16} className="search-icon" /><input className="filter-search-input" placeholder="Search by name or email…" value={query} onChange={e => setQuery(e.target.value)} /></div>
    {loading ? <p role="status">Loading users…</p> : <div className="dashboard-card p-0 cm-posts-card"><div className="table-responsive"><table className="modern-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Change role</th></tr></thead><tbody>
      {visible.length ? visible.map(u => { const role = getRoleConfig(u.role); const self = u.id === currentUserId; return <tr key={u.id}>
        <td><strong>{u.name}</strong>{self && <span className="cm-best">You</span>}</td><td>{u.email}</td>
        <td><span className={`role-pill ${role.badgeClass}`}>{role.label}</span>{u.role === 'user' && <div className="cm-subtle">Default signup role</div>}</td>
        <td><select className="custom-select" aria-label={`Role for ${u.name}`} value={role.id} disabled={busyId === u.id || self} title={self ? 'You cannot change your own role' : undefined} onChange={e => changeRole(u, e.target.value)}>{ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></td>
      </tr> }) : <tr><td colSpan="4">No users match.</td></tr>}
    </tbody></table></div></div>}
    <div className="cm-actions"><button type="button" className="btn btn-secondary" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</button><button type="button" className="btn btn-secondary" disabled={users.length < 100} onClick={() => setPage(p => p + 1)}>Next</button></div>
  </div>
}

export default AdminUsers
