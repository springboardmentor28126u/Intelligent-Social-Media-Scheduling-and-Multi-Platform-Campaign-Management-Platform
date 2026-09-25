import { useEffect, useState } from 'react'
import { api } from '../api'
import { statusLabel, scheduledInstant } from '../postUtils'

export function PublishingDetails({ post, busy, canManage, onClose, onAction, onEdit, campaignOptions = [], onCampaignChange }) {
  const [logState, setLogState] = useState({ id: null, entries: [], error: '' })
  const [jobId, setJobId] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')
  const signature = post?.jobs.map(job => `${job.id}:${job.status}:${job.attempts}`).join(',')
  useEffect(() => {
    if (jobId === null) return
    const controller = new AbortController()
    api(`/queue/${jobId}/logs`, { signal: controller.signal }).then(entries => {
      if (!controller.signal.aborted) setLogState({ id: jobId, entries, error: '' })
    }).catch(error => { if (!controller.signal.aborted) setLogState({ id: jobId, entries: [], error: error.message }) })
    return () => controller.abort()
  }, [jobId, signature])
  if (!post) return null
  const history = post.jobs || []
  const processing = history.some(job => job.status === 'processing')
  const pending = history.filter(job => ['scheduled', 'retry'].includes(job.status))
  const restorable = post.status !== 'draft' && history.every(job => job.status === 'cancelled')
  const reschedulable = pending.length > 0 && history.every(job => ['scheduled', 'retry', 'cancelled'].includes(job.status))
  const reschedule = () => {
    try {
      const start = scheduledInstant(date, time)
      // Only active jobs count; cancelled jobs belong to earlier schedules.
      const occurrences = new Set(pending.map(job => job.scheduled_at)).size
      onAction(`/posts/${post.id}/schedule`, { scheduled_at: start, timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone, account_ids: [...new Set(pending.map(job => job.account_id))], recurrence: pending[0].recurrence, occurrences })
      setError('')
    } catch (error) { setError(error.message) }
  }
  return <div className="modal-backdrop"><div className="modal-container" role="dialog" aria-modal="true" aria-label="Publishing details">
    <div className="modal-header"><h3 className="modal-title">{post.name}</h3><button className="btn btn-ghost" onClick={onClose} disabled={busy}>Close</button></div>
    <div className="modal-body">
      <p><strong>Status:</strong> {statusLabel(post.status)}</p>
      <p className="post-text-preview" style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
      {post.image_url && <p><a href={post.image_url} target="_blank" rel="noreferrer">View attached image</a></p>}
      {canManage && onCampaignChange && <div className="form-group-modern"><label className="form-label" htmlFor="details-campaign">Campaign</label><select id="details-campaign" className="form-input" disabled={busy} value={post.campaign_id ? String(post.campaign_id) : ''} onChange={e => onCampaignChange(post.id, e.target.value ? Number(e.target.value) : null)}><option value="">No campaign</option>{campaignOptions.filter(c => c.status !== 'archived' || c.id === post.campaign_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
      {post.status !== 'draft' && canManage && <p className="page-main-sub">Scheduled and published posts can't be edited directly. Cancel the remaining occurrences and return the post to draft to change its content.</p>}
      {!history.length && <p>No publishing jobs yet. Edit this draft to schedule it.</p>}
      {canManage && post.status === 'draft' && <button className="btn btn-primary" disabled={busy} onClick={() => onEdit(post.id)}>Edit Draft</button>}
      {canManage && pending.length > 0 && <button className="btn btn-secondary" disabled={busy || processing} onClick={() => { if (window.confirm('Cancel all remaining occurrences for this post?')) onAction(`/posts/${post.id}/cancel`) }}>Cancel remaining occurrences</button>}
      {canManage && restorable && <button className="btn btn-secondary" disabled={busy} onClick={() => onAction(`/posts/${post.id}/restore-draft`)}>Return to draft</button>}
      {canManage && reschedulable && <div className="form-group-modern">
        <p className="form-label">Reschedule all occurrences ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
        <div className="form-row-2col"><input aria-label="New schedule date" type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} /><input aria-label="New schedule time" type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} /></div>
        <button className="btn btn-secondary" disabled={busy} onClick={reschedule}>Apply new start time</button>
        {error && <p role="alert">{error}</p>}
      </div>}
      {history.map(job => <div className="dashboard-card" key={job.id}>
        <p><strong>{job.provider} · Account #{job.account_id || 'disconnected'}</strong> — {statusLabel(job.status)}</p>
        <p>{new Date(job.scheduled_at).toLocaleString()} · {job.timezone_name} · Attempt {job.attempts}</p>
        {job.status === 'retry' && <p>Next attempt: {new Date(job.run_at).toLocaleString()}</p>}
        {job.provider_post_id && <p>Published ID: {job.provider_post_id}</p>}
        {job.error && <p role="status">{job.error}</p>}
        {job.status === 'uncertain' && <p>Check the platform before creating a replacement. This job will not retry automatically.</p>}
        <button className="btn btn-ghost" onClick={() => setJobId(job.id)}>View logs #{job.id}</button>
        {canManage && job.status === 'failed' && <button className="btn btn-secondary" disabled={busy} onClick={() => { if (window.confirm('Retry this failed job now? This may publish to the selected account.')) onAction(`/queue/${job.id}/retry`) }}>Retry</button>}
      </div>)}
      {jobId !== null && <section aria-label="Job logs"><h4>Logs for job #{jobId}</h4>{logState.id !== jobId ? <p>Loading logs…</p> : <>{logState.error && <p role="alert">{logState.error}</p>}{logState.entries.map(entry => <p key={entry.id}>{new Date(entry.created_at).toLocaleString()} · {entry.event}: {entry.message}</p>)}</>}</section>}
    </div>
  </div></div>
}
