import { useState } from 'react'
import { KeyRound, Save, UserRound } from 'lucide-react'
import { api } from '../api'
import { getRoleConfig } from '../config/roles'

export const Profile = ({ user, onUpdated }) => {
  const [name, setName] = useState(user.name || '')
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [message, setMessage] = useState({ profile: '', password: '' })
  const [error, setError] = useState({ profile: '', password: '' })
  const [busy, setBusy] = useState('')
  const role = getRoleConfig(user.role)

  const saveName = async event => {
    event.preventDefault()
    setBusy('profile'); setError(e => ({ ...e, profile: '' })); setMessage(m => ({ ...m, profile: '' }))
    try {
      if (!name.trim()) throw new Error('Name cannot be empty.')
      const updated = await api('/me', { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) })
      onUpdated(updated)
      setMessage(m => ({ ...m, profile: 'Profile saved.' }))
    } catch (err) { setError(e => ({ ...e, profile: err.message })) }
    finally { setBusy('') }
  }
  const savePassword = async event => {
    event.preventDefault()
    setBusy('password'); setError(e => ({ ...e, password: '' })); setMessage(m => ({ ...m, password: '' }))
    try {
      if (passwords.next.length < 8) throw new Error('New password must be at least 8 characters.')
      if (passwords.next !== passwords.confirm) throw new Error('New passwords do not match.')
      await api('/me/password', { method: 'POST', body: JSON.stringify({ current_password: passwords.current, new_password: passwords.next }) })
      setPasswords({ current: '', next: '', confirm: '' })
      setMessage(m => ({ ...m, password: 'Password changed. Use it next time you sign in.' }))
    } catch (err) { setError(e => ({ ...e, password: err.message })) }
    finally { setBusy('') }
  }
  return <div className="cm-page">
    <div className="page-header-row"><div><h1 className="page-main-heading">Profile & account settings</h1><p className="page-main-sub">Update your name and password. Your role is managed by an administrator.</p></div></div>
    <div className="analytics-charts-grid">
      <form className="chart-card" onSubmit={saveName}>
        <div className="chart-card-header"><h3 className="chart-title"><UserRound size={16} /> Profile</h3></div>
        {error.profile && <div className="info-callout-card" role="alert">{error.profile}</div>}
        {message.profile && <div className="info-callout-card" role="status">{message.profile}</div>}
        <div className="cm-fieldset">
          <div className="form-group-modern"><label className="form-label" htmlFor="profile-name">Full name</label><input id="profile-name" className="form-input" value={name} maxLength={100} onChange={e => setName(e.target.value)} /></div>
          <div className="form-group-modern"><label className="form-label" htmlFor="profile-email">Email</label><input id="profile-email" className="form-input" value={user.email || ''} disabled /></div>
          <div className="form-group-modern"><span className="form-label">Workspace role</span><span className={`role-pill ${role.badgeClass}`} style={{ alignSelf: 'flex-start' }}>{role.label}</span></div>
          <button type="submit" className="btn btn-primary" disabled={busy === 'profile'} style={{ alignSelf: 'flex-start' }}><Save size={15} />{busy === 'profile' ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>
      <form className="chart-card" onSubmit={savePassword}>
        <div className="chart-card-header"><h3 className="chart-title"><KeyRound size={16} /> Change password</h3></div>
        {error.password && <div className="info-callout-card" role="alert">{error.password}</div>}
        {message.password && <div className="info-callout-card" role="status">{message.password}</div>}
        <div className="cm-fieldset">
          <div className="form-group-modern"><label className="form-label" htmlFor="pw-current">Current password</label><input id="pw-current" type="password" autoComplete="current-password" className="form-input" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} /></div>
          <div className="form-group-modern"><label className="form-label" htmlFor="pw-new">New password</label><input id="pw-new" type="password" autoComplete="new-password" className="form-input" value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} /></div>
          <div className="form-group-modern"><label className="form-label" htmlFor="pw-confirm">Confirm new password</label><input id="pw-confirm" type="password" autoComplete="new-password" className="form-input" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} /></div>
          <button type="submit" className="btn btn-primary" disabled={busy === 'password' || !passwords.current} style={{ alignSelf: 'flex-start' }}><KeyRound size={15} />{busy === 'password' ? 'Updating…' : 'Update password'}</button>
        </div>
      </form>
    </div>
  </div>
}

export default Profile
