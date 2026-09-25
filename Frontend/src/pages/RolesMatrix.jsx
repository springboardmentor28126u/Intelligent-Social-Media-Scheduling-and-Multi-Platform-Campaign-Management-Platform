import { Check, Minus } from 'lucide-react'
import { getRoleConfig } from '../config/roles'
import { useApiData } from '../hooks/useApiData'

const LABELS = {
  'accounts:read': 'View social accounts', 'accounts:write': 'Connect / disconnect accounts',
  'posts:read': 'View posts, campaigns, schedule', 'posts:write': 'Create, schedule and manage posts & campaigns',
  'analytics:read': 'View analytics and reports', 'analytics:write': 'Sync engagement and followers',
  'users:read': 'View users', 'users:write': 'Assign user roles', 'roles:read': 'View this matrix',
}

export const RolesMatrix = () => {
  const { data: roles, error, loading } = useApiData('/admin/roles', [])
  const permissions = [...new Set(roles.flatMap(r => r.permissions))].sort()
  return <div className="cm-page">
    <div className="page-header-row"><div><h1 className="page-main-heading">Roles & Permissions</h1><p className="page-main-sub">What each role can do. The backend enforces these on every request. Data stays private to its owner.</p></div></div>
    {error && <div className="info-callout-card" role="alert">{error}</div>}
    {loading ? <p role="status">Loading roles…</p> : <div className="dashboard-card p-0 cm-posts-card"><div className="table-responsive"><table className="modern-table"><thead><tr><th>Permission</th>{roles.map(r => { const c = getRoleConfig(r.role); return <th key={r.role}><span className={`role-pill ${c.badgeClass}`}>{c.label}</span></th> })}</tr></thead><tbody>
      {permissions.map(p => <tr key={p}><td><strong>{LABELS[p] || p}</strong><div className="cm-subtle">{p}</div></td>{roles.map(r => <td key={r.role}>{r.permissions.includes(p) ? <Check size={18} className="pos" aria-label="Allowed" /> : <Minus size={18} className="cm-subtle" aria-label="Not allowed" />}</td>)}</tr>)}
    </tbody></table></div></div>}
  </div>
}

export default RolesMatrix
