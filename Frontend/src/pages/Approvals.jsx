import { ApprovalBadge } from '../components/ApprovalBadge'
import { approvalLabel, canPublish, reviewActions } from '../workflowPolicy'
import { useEffect, useState } from 'react'
import { api } from '../api'
import './collaboration.css'

export function Approvals({ workspace, user, onChanged, onOpenPost }) {
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [comment, setComment] = useState('')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const [members, setMembers] = useState(null)
  useEffect(() => {
    if (!workspace) return
    const controller = new AbortController()
    api(`/teams/${workspace.id}/members`, { signal: controller.signal }).then(setMembers).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [workspace, version])
  useEffect(() => {
    const controller = new AbortController()
    api('/approvals', { signal: controller.signal }).then(setRows).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [version])
  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    api(`/posts/${selected}/reviews`, { signal: controller.signal }).then(setHistory).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [selected, version])
  const post = rows.find(r => r.id === selected)
  const creator = canPublish(workspace?.role || user.role)
  const reviewer = creator || (workspace?.role || user.role) === 'marketing_manager'
  const actions = reviewActions(workspace?.role || user.role, post?.approval_status, workspace?.can_manage)
  const noCreator = members !== null && !members.some(m => m.status === 'active' && m.role === 'content_creator')
  const disableApproval = async () => {
    if (!window.confirm('Turn off the team approval setting? Creator final approval remains mandatory for manager-authored content. Only creators can publish.')) return
    setBusy(true); setError('')
    try { await api(`/teams/${workspace.id}`, { method: 'PATCH', body: JSON.stringify({ name: workspace.name, require_approval: false }) }); await onChanged() }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const review = async action => {
    setBusy(true); setError('')
    try { await api(`/posts/${post.id}/reviews`, { method: 'POST', body: JSON.stringify({ action, revision: post.revision, comment }) }); setComment(''); setVersion(v => v + 1); await onChanged() }
    catch (e) { setError(e.message); setVersion(v => v + 1) }
    finally { setBusy(false) }
  }
  return <div className="cm-page collaboration"><h1 className="page-main-heading">Content Approval</h1>
    {!workspace ? <p className="info-callout-card">Choose a team workspace above to submit drafts and review content.</p> : <>
      <p className="page-main-sub">Managers approve drafts into Awaiting creator. A creator gives final approval and chooses when to publish. Creator-authored revisions can publish directly. Editing approved content starts a new revision.</p>
      {noCreator && <div className="info-callout-card" role="status"><p>No active content creator can publish for this team. In Teams, the owner can choose the creator role while keeping management rights, or invite a creator.</p></div>}
      {workspace.can_manage && workspace.require_approval && <button className="btn btn-secondary" disabled={busy} onClick={disableApproval}>Turn off team approval setting</button>}
      <button className="btn btn-secondary" aria-pressed={filter === 'awaiting_creator'} onClick={() => setFilter('awaiting_creator')}>Awaiting creator ({rows.filter(r => r.approval_status === 'awaiting_creator').length})</button>
      {error && <p role="alert" className="info-callout-card">{error}</p>}
      <label>Show<select className="form-input" value={filter} onChange={e => setFilter(e.target.value)}>{['all', 'draft', 'pending', 'awaiting_creator', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s === 'all' ? 'All' : approvalLabel(s)}</option>)}</select></label>
      <div className="collab-grid"><section className="dashboard-card"><h2>Drafts for review</h2>{rows.filter(r => filter === 'all' || r.approval_status === filter).map(p => <button key={p.id} className="approval-item" onClick={() => { setHistory([]); setComment(''); setSelected(p.id) }}><strong>{p.title}</strong><span><ApprovalBadge status={p.approval_status} /> · revision {p.revision}</span></button>)}{!rows.length && <p>Save a draft in Posts to begin.</p>}</section>
        {post && <section className="dashboard-card collab-form"><h2>{post.title}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>{post.image_url && <a href={post.image_url} target="_blank" rel="noreferrer">View image</a>}{post.video_url && <a href={post.video_url} target="_blank" rel="noreferrer">View video</a>}
          <p>Revision {post.revision} · <ApprovalBadge status={post.approval_status} /></p><button className="btn btn-secondary" onClick={() => onOpenPost(post.id)}>Open post / schedule</button>
          {reviewer && <><label>Review comment<textarea className="form-input" value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} /></label>
            <div className="cm-actions">{['draft', 'rejected'].includes(post.approval_status) && <button className="btn btn-primary" disabled={busy} onClick={() => review('submit')}>Submit for approval</button>}
              {actions.includes('approve') && <><button className="btn btn-primary" disabled={busy} onClick={() => review('approve')}>{creator ? 'Final approval' : 'Approve for creator review'}</button><button className="btn btn-secondary" disabled={busy || !comment.trim()} onClick={() => review('reject')}>Request changes</button></>}
              {['pending', 'awaiting_creator'].includes(post.approval_status) && (reviewer || post.creator_id === user.id) && <button className="btn btn-secondary" disabled={busy} onClick={() => review('withdraw')}>Withdraw submission</button>}
              <button className="btn btn-secondary" disabled={busy || !comment.trim()} onClick={() => review('comment')}>Add comment</button></div></>}
          <h3>Review history</h3>{history.map(h => <div key={h.id} className="review-event"><strong>{h.actor} · {h.action.replaceAll('_', ' ')} · revision {h.revision}</strong><p>{h.comment}</p><small>{new Date(h.created_at).toLocaleString()}</small></div>)}{!history.length && <p>No reviews yet.</p>}
        </section>}
      </div></>}
  </div>
}
