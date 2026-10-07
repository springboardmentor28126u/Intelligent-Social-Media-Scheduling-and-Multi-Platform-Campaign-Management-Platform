import { RolesMatrix } from './RolesMatrix'
import { switchWorkspace } from '../workspace'
import { useEffect, useState } from 'react'
import { api } from '../api'
import './collaboration.css'

const roles = ['content_creator', 'marketing_manager', 'business_user', 'administrator']
const label = value => ({ business_user: 'Business User (view only)', administrator: 'Administrator (view only)' }[value] || value.replaceAll('_', ' '))

export function Teams({ user, teams, onChanged }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('content_creator')
  const [selected, setSelected] = useState(null)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const team = teams.find(t => t.id === selected)
  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    api(`/teams/${selected}/members`, { signal: controller.signal }).then(setMembers).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    if (team?.can_manage) api(`/teams/${selected}/invitations`, { signal: controller.signal }).then(setInvitations).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [selected, version, team?.can_manage])
  const act = async action => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); await onChanged(); setVersion(v => v + 1); setNotice('Team updated.') }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <div className="cm-page collaboration"><RolesMatrix />
    <h1 className="page-main-heading">Teams</h1><p className="page-main-sub">Share accounts, posts, campaigns and reports. Your personal workspace stays private.</p>
    {error && <p className="info-callout-card" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {['content_creator', 'marketing_manager', 'user'].includes(user.role) && <form className="dashboard-card collab-form" onSubmit={e => { e.preventDefault(); act(async () => { const result = await api('/teams', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); setSelected(result.id) }) }}>
      <h2>Create a team</h2><label>Team name<input className="form-input" value={name} onChange={e => setName(e.target.value)} required maxLength={100} /></label>
      <p>Only content creators connect accounts and publish. Your team role starts as your account role; as owner, you keep team-management rights when changing roles.</p><button className="btn btn-primary" disabled={busy}>Create team</button>
    </form>}
    <div className="collab-grid">{teams.map(t => <section className="dashboard-card" key={t.id}>
      <h2>{t.name}</h2><p>{label(t.role)} · {t.status}</p><p>{t.can_manage ? "Can manage this team. " : ""}{t.role === "content_creator" ? "Can connect accounts and publish." : "Cannot connect accounts or publish."}</p>
      {t.status === 'expired' ? <p>This invitation expired. Ask an administrator to invite you again.</p> : t.status === 'invited' ? <div className="cm-actions"><button className="btn btn-primary" disabled={busy} onClick={() => act(() => api(`/teams/${t.id}/accept`, { method: 'POST' }))}>Accept invitation</button><button className="btn btn-secondary" disabled={busy} onClick={() => act(() => api(`/teams/${t.id}/members/${user.id}`, { method: 'DELETE' }))}>Decline</button></div> : <div className="cm-actions">
        <button className="btn btn-primary" onClick={() => switchWorkspace(t.id)}>Open workspace</button>
        <button className="btn btn-secondary" disabled={busy} onClick={() => { setMembers([]); setSelected(t.id) }}>Manage members</button>
        {t.owner_id !== user.id && <button className="btn btn-secondary" disabled={busy} onClick={() => { if (window.confirm(`Leave ${t.name}?`)) act(async () => { await api(`/teams/${t.id}/members/${user.id}`, { method: 'DELETE' }); if (selected === t.id) setSelected(null) }) }}>Leave team</button>}
      </div>}
    </section>)}</div>
    {team?.status === 'active' && <section className="dashboard-card collab-form"><h2>{team.name} members</h2>{!team.can_manage && <p role="status">Team management is view only for your role.</p>}
      {team.can_manage && invitations.length > 0 && <div><h3>Email invitations</h3>{invitations.map(i => <p key={i.email}>{i.email} · {i.status} · expires {new Date(i.expires_at).toLocaleDateString()}</p>)}</div>}
      {team.can_manage && <><label className="collab-checkbox"><input type="checkbox" checked={team.require_approval} disabled={busy} onChange={e => { const checked = e.target.checked; if (checked || window.confirm('Change the team approval setting? Manager-authored posts still require creator final approval. Creators can always publish their own content.')) act(() => api(`/teams/${team.id}`, { method: 'PATCH', body: JSON.stringify({ name: team.name, require_approval: checked }) })) }} />Require approval for non-creator content</label><p>Manager approval sends content to a creator for final approval. Only a creator can schedule or publish, regardless of this setting.</p>
        <form className="collab-form" onSubmit={e => { e.preventDefault(); act(async () => { await api(`/teams/${team.id}/invitations`, { method: 'POST', body: JSON.stringify({ email, role }) }); setEmail('') }) }}>
          <label>Email address<input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <p>Only content creators connect accounts and publish. Business User and Administrator are view-only. Only owners or delegated admin flags grant team management.</p><label>Team role<select className="form-input" value={role} onChange={e => setRole(e.target.value)}>{roles.map(r => <option key={r} value={r}>{label(r)}</option>)}</select></label>
          <button className="btn btn-primary" disabled={busy}>Invite member</button><p>Invitations expire after 7 days. New users see the invitation after registering with this email. No email is sent.</p>
        </form></>}
      <p>Only content creators connect accounts and publish. Business User and Administrator are view-only. Only owners or delegated admin flags grant team management.</p><div className="table-responsive"><table className="modern-table"><thead><tr><th>Member</th><th>Role</th><th>Team management</th><th>Status</th><th>Actions</th></tr></thead><tbody>{members.map(m => <tr key={m.user_id}><td>{m.name}<br /><small>{m.email}</small></td><td>{team.can_manage && (m.user_id !== team.owner_id || user.id === team.owner_id) ? <select aria-label={`Role for ${m.name}`} value={m.role} disabled={busy} onChange={e => act(() => api(`/teams/${team.id}/members/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ role: e.target.value }) }))}>{roles.map(r => <option key={r} value={r}>{label(r)}</option>)}</select> : label(m.role)}</td><td>{m.user_id === team.owner_id ? "Owner - always keeps manage rights" : team.can_manage ? <label><input type="checkbox" aria-label={`Team management for ${m.name}`} checked={m.is_admin} disabled={busy} onChange={e => act(() => api(`/teams/${team.id}/members/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ is_admin: e.target.checked }) }))} /> Admin flag</label> : m.can_manage ? "Yes" : "No"}</td><td>{m.status}</td><td>{team.can_manage && m.user_id !== team.owner_id && <button className="btn btn-secondary" disabled={busy} onClick={() => { if (window.confirm(`Remove ${m.name} from this team?`)) act(() => api(`/teams/${team.id}/members/${m.user_id}`, { method: 'DELETE' })) }}>Remove</button>}</td></tr>)}</tbody></table></div>
    </section>}
  </div>
}
