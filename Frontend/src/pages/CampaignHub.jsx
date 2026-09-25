import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, Archive, BarChart3, CalendarRange, CheckCircle2, Coins, Download, Edit3, Eye,
  Info, Megaphone, Pause, Play, Plus, Printer, Target, Trash2, TrendingUp, X,
} from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { MetricCard } from '../components/MetricCard'
import { PlatformBadge } from '../components/PlatformBadge'
import { EmptyState } from '../components/EmptyState'
import { useApiData } from '../hooks/useApiData'
import { statusLabel } from '../postUtils'
import { downloadCsv, money, num, OBJECTIVES, percent, platformLabel, stamp, titleCase } from '../reportUtils'
import './campaigns.css'

const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'pinterest']
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (iso, days) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
const blank = () => ({ name: '', description: '', objective: 'engagement', platforms: ['facebook', 'instagram'], start_date: today(), end_date: addDays(today(), 30), budget: '', revenue: '', currency: 'INR', target_engagements: '', target_posts: '', status: 'active' })
const phaseClass = { running: 'phase-running', upcoming: 'phase-upcoming', ended: 'phase-ended' }

export function ProgressBar({ label, value, hint }) {
  const width = Math.max(0, Math.min(Number(value) || 0, 100))
  return <div className="cm-progress"><div className="cm-progress-label"><span>{label}</span><strong>{value === null || value === undefined ? '—' : `${value}%`}</strong></div><div className="cm-progress-track"><div className="cm-progress-fill" style={{ width: `${width}%` }} /></div>{hint && <span className="cm-progress-hint">{hint}</span>}</div>
}

function StatusChip({ campaign }) {
  if (campaign.status === 'paused' || campaign.status === 'archived') return <span className={`cm-chip chip-${campaign.status}`}>{titleCase(campaign.status)}</span>
  if (campaign.status === 'completed') return <span className="cm-chip chip-completed">Completed</span>
  return <span className={`cm-chip ${phaseClass[campaign.phase]}`}>{titleCase(campaign.phase)}</span>
}

function CampaignForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? { ...initial, budget: initial.budget || '', revenue: initial.revenue || '', target_engagements: initial.target_engagements || '', target_posts: initial.target_posts || '' } : blank())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const togglePlatform = p => set('platforms', form.platforms.includes(p) ? form.platforms.filter(x => x !== p) : [...form.platforms, p])
  const submit = async event => {
    event.preventDefault(); setError('')
    if (!form.name.trim()) { setError('Enter a campaign name.'); return }
    if (form.end_date < form.start_date) { setError('End date must be on or after the start date.'); return }
    const body = {
      name: form.name.trim(), description: form.description, objective: form.objective, platforms: form.platforms,
      start_date: form.start_date, end_date: form.end_date, budget: Number(form.budget || 0), revenue: Number(form.revenue || 0),
      currency: form.currency, target_engagements: Number(form.target_engagements || 0), target_posts: Number(form.target_posts || 0), status: form.status,
    }
    setSaving(true)
    try { onSaved(await api(initial ? `/campaigns/${initial.id}` : '/campaigns', { method: initial ? 'PATCH' : 'POST', body: JSON.stringify(body) })) }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  return <div className="modal-backdrop"><form className="modal-container" role="dialog" aria-modal="true" aria-label="Campaign form" onSubmit={submit}>
    <div className="modal-header"><div className="modal-title-group"><Megaphone size={20} className="text-indigo" /><h3 className="modal-title">{initial ? 'Edit campaign' : 'New campaign'}</h3></div><button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <div className="modal-body">
      {error && <div className="info-callout-card" role="alert">{error}</div>}
      <fieldset disabled={saving} className="cm-fieldset">
        <div className="form-group-modern"><label className="form-label" htmlFor="cm-name">Campaign name</label><input id="cm-name" className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Diwali Festive Sale 2026" maxLength={200} /></div>
        <div className="form-row-2col">
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-objective">Objective</label><select id="cm-objective" className="form-input" value={form.objective} onChange={e => set('objective', e.target.value)}>{OBJECTIVES.map(o => <option key={o} value={o}>{titleCase(o)}</option>)}</select></div>
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-status">Status</label><select id="cm-status" className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>{['active', 'paused', 'completed', 'archived'].map(o => <option key={o} value={o}>{titleCase(o)}</option>)}</select></div>
        </div>
        <div className="form-group-modern"><span className="form-label">Platforms</span><div className="cm-platform-picks">{PLATFORMS.map(p => <label key={p} className={`cm-pick ${form.platforms.includes(p) ? 'active' : ''}`}><input type="checkbox" checked={form.platforms.includes(p)} onChange={() => togglePlatform(p)} />{platformLabel(p)}</label>)}</div></div>
        <div className="form-row-2col">
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-start">Start date</label><input id="cm-start" type="date" className="form-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-end">End date</label><input id="cm-end" type="date" className="form-input" value={form.end_date} min={form.start_date} onChange={e => set('end_date', e.target.value)} /></div>
        </div>
        <div className="form-row-2col">
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-budget">Budget</label><div className="cm-money-input"><select aria-label="Currency" className="form-input" value={form.currency} onChange={e => set('currency', e.target.value)}>{['INR', 'USD', 'GBP', 'EUR', 'AED', 'AUD', 'CAD'].map(c => <option key={c}>{c}</option>)}</select><input id="cm-budget" type="number" min="0" step="0.01" className="form-input" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" /></div></div>
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-revenue">Attributed revenue</label><input id="cm-revenue" type="number" min="0" step="0.01" className="form-input" value={form.revenue} onChange={e => set('revenue', e.target.value)} placeholder="Used for ROI" /></div>
        </div>
        <div className="form-row-2col">
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-target">Target engagements</label><input id="cm-target" type="number" min="0" className="form-input" value={form.target_engagements} onChange={e => set('target_engagements', e.target.value)} /></div>
          <div className="form-group-modern"><label className="form-label" htmlFor="cm-posts">Target posts</label><input id="cm-posts" type="number" min="0" className="form-input" value={form.target_posts} onChange={e => set('target_posts', e.target.value)} /></div>
        </div>
        <div className="form-group-modern"><label className="form-label" htmlFor="cm-desc">Description / goals</label><textarea id="cm-desc" className="form-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} maxLength={5000} /></div>
      </fieldset>
    </div>
    <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create campaign'}</button></div>
  </form></div>
}

function CampaignCardView({ campaign, onOpen }) {
  const m = campaign.metrics
  return <button type="button" className="cm-card" onClick={() => onOpen(campaign.id)}>
    <div className="cm-card-top"><StatusChip campaign={campaign} /><span className="cm-objective">{titleCase(campaign.objective)}</span></div>
    <h3 className="cm-card-title">{campaign.name}</h3>
    <div className="cm-card-dates"><CalendarRange size={13} />{campaign.start_date} → {campaign.end_date}{campaign.phase === 'running' && <em> · {campaign.days_left}d left</em>}</div>
    <div className="cm-card-platforms">{campaign.platforms.map(p => <PlatformBadge key={p} platform={platformLabel(p)} size="sm" />)}</div>
    <div className="cm-card-stats"><div><span>Posts</span><strong>{m.posts}</strong></div><div><span>Engagement</span><strong>{num(m.engagements)}</strong></div><div><span>Budget</span><strong>{money(campaign.budget, campaign.currency)}</strong></div><div><span>ROI</span><strong className={m.roi_pct < 0 ? 'neg' : 'pos'}>{percent(m.roi_pct)}</strong></div></div>
    <ProgressBar label="Engagement target" value={m.target_progress} />
    <ProgressBar label="Time elapsed" value={m.time_elapsed_pct} />
    {campaign.alerts.length > 0 && <div className="cm-card-alert"><AlertTriangle size={13} />{campaign.alerts[0].message}</div>}
  </button>
}

function exportCampaign(report) {
  const m = report.metrics
  const summary = [
    ['Campaign', report.name], ['Objective', titleCase(report.objective)], ['Status', titleCase(report.status)],
    ['Dates', `${report.start_date} to ${report.end_date}`], ['Platforms', report.platforms.map(platformLabel).join(' / ')],
    ['Budget', report.budget], ['Revenue', report.revenue], ['Currency', report.currency], ['ROI %', m.roi_pct ?? ''],
    ['Cost per engagement', m.cost_per_engagement ?? ''], ['Engagements', m.engagements], ['Likes', m.likes], ['Comments', m.comments],
    ['Shares', m.shares], ['Reach', m.reach], ['Impressions', m.impressions], ['Clicks', m.clicks], ['Engagement rate %', m.engagement_rate ?? ''],
    ['Published', m.published_jobs], ['Failed', m.failed_jobs], ['Success rate %', m.success_rate ?? ''], ['', ''], ['Post', 'Status / Engagements'],
    ...report.posts.map(p => [p.title, `${statusLabel(p.status)} / ${p.engagements}`]),
  ]
  downloadCsv(`campaign-${report.id}-${stamp()}.csv`, [{ label: 'Field', value: 0 }, { label: 'Value', value: 1 }], summary)
}

function CampaignDetail({ id, canManage, posts, onBack, onChanged }) {
  const { data: report, error, loading, reload, setError } = useApiData(`/campaigns/${id}`, null, 60000)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState([])
  const [busy, setBusy] = useState(false)
  const act = async (path, options) => {
    setBusy(true); setError('')
    try { await api(path, options); await reload(); onChanged() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  if (loading) return <p role="status">Loading campaign…</p>
  if (!report) return <div><button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft size={15} />Back</button><div className="info-callout-card" role="alert">{error || 'Campaign not found.'}</div></div>
  const m = report.metrics
  const assigned = new Set(report.posts.map(p => p.id))
  const available = posts.filter(p => !assigned.has(p.id))
  const setStatus = status => act(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
  const remove = async () => {
    if (!window.confirm(`Delete campaign “${report.name}”? Its posts are kept.`)) return
    setBusy(true)
    try { await api(`/campaigns/${id}`, { method: 'DELETE' }); onChanged(); onBack() }
    catch (err) { setError(err.message); setBusy(false) }
  }
  return <div className="cm-detail">
    <div className="cm-detail-head no-print"><button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft size={15} />All campaigns</button>
      <div className="cm-actions">
        <button type="button" className="btn btn-secondary" onClick={() => exportCampaign(report)}><Download size={15} />Export CSV</button>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}><Printer size={15} />Print / PDF</button>
        {canManage && <>
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)} disabled={busy}><Edit3 size={15} />Edit</button>
          {report.status === 'active' && <button type="button" className="btn btn-secondary" onClick={() => setStatus('paused')} disabled={busy}><Pause size={15} />Pause</button>}
          {report.status === 'paused' && <button type="button" className="btn btn-secondary" onClick={() => setStatus('active')} disabled={busy}><Play size={15} />Resume</button>}
          {report.status !== 'completed' && report.status !== 'archived' && <button type="button" className="btn btn-secondary" onClick={() => setStatus('completed')} disabled={busy}><CheckCircle2 size={15} />Mark complete</button>}
          {report.status !== 'archived' && <button type="button" className="btn btn-secondary" onClick={() => setStatus('archived')} disabled={busy}><Archive size={15} />Archive</button>}
          <button type="button" className="btn btn-ghost-danger" onClick={remove} disabled={busy}><Trash2 size={15} />Delete</button>
        </>}
      </div>
    </div>
    {error && <div className="info-callout-card" role="alert">{error}</div>}
    <div className="cm-report-title"><div><div className="cm-card-top"><StatusChip campaign={report} /><span className="cm-objective">{titleCase(report.objective)}</span></div><h1 className="page-main-heading">{report.name}</h1><p className="page-main-sub">{report.start_date} → {report.end_date} · {report.platforms.map(platformLabel).join(', ') || 'No platforms set'}</p>{report.description && <p className="cm-description">{report.description}</p>}</div></div>
    {report.alerts.length > 0 && <div className="cm-alerts">{report.alerts.map((a, i) => <div key={i} className={`cm-alert alert-${a.level}`}>{a.level === 'warning' ? <AlertTriangle size={15} /> : <Info size={15} />}{a.message}</div>)}</div>}
    <div className="metrics-grid">
      <MetricCard title="Engagements" value={num(m.engagements)} icon={TrendingUp} accent="emerald" subtitle={`${num(m.likes)} likes · ${num(m.comments)} comments · ${num(m.shares)} shares`} />
      <MetricCard title="Reach" value={num(m.reach)} icon={Eye} accent="violet" subtitle={`Engagement rate ${percent(m.engagement_rate)}`} />
      <MetricCard title="ROI" value={percent(m.roi_pct)} icon={Coins} accent="amber" subtitle={`${money(report.revenue, report.currency)} revenue on ${money(report.budget, report.currency)}`} />
      <MetricCard title="Cost / engagement" value={m.cost_per_engagement === null ? '—' : money(m.cost_per_engagement, report.currency)} icon={Target} accent="sky" subtitle={`Publishing success ${percent(m.success_rate)}`} />
    </div>
    <div className="analytics-charts-grid">
      <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title">Goal tracking</h3></div>
        <ProgressBar label="Engagement target" value={m.target_progress} hint={report.target_engagements ? `${num(m.engagements)} of ${num(report.target_engagements)}` : 'No target set'} />
        <ProgressBar label="Posts published" value={m.posts_progress} hint={report.target_posts ? `target ${report.target_posts} posts` : 'No target set'} />
        <ProgressBar label="Time elapsed" value={m.time_elapsed_pct} hint={report.phase === 'running' ? `${report.days_left} days left` : titleCase(report.phase)} />
        <div className="cm-mini-stats"><div><span>Published</span><strong>{m.published_jobs}</strong></div><div><span>Scheduled</span><strong>{m.scheduled_jobs}</strong></div><div><span>Failed</span><strong>{m.failed_jobs}</strong></div><div><span>Avg / post</span><strong>{m.avg_engagement_per_post}</strong></div></div>
      </div>
      <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Campaign timeline</h3></div>{report.timeline.length ? <div style={{ height: 260 }}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={report.timeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} /><YAxis yAxisId="l" allowDecimals={false} /><YAxis yAxisId="r" orientation="right" allowDecimals={false} /><Tooltip /><Legend /><Bar yAxisId="l" dataKey="published" name="Published" fill="#c7d2fe" radius={[4,4,0,0]} /><Line yAxisId="r" type="monotone" dataKey="engagements" name="Engagements" stroke="#10b981" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div> : <p className="page-main-sub">Nothing published yet for this campaign.</p>}</div>
      <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Platform comparison</h3></div>{report.platform_breakdown.length ? <div style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={report.platform_breakdown}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="platform" tickFormatter={platformLabel} fontSize={11} /><YAxis yAxisId="l" allowDecimals={false} /><YAxis yAxisId="r" orientation="right" allowDecimals={false} /><Tooltip labelFormatter={platformLabel} /><Legend /><Bar yAxisId="l" dataKey="published" name="Published" stackId="p" fill="#6366f1" /><Bar yAxisId="l" dataKey="failed" name="Failed" stackId="p" fill="#f87171" radius={[4,4,0,0]} /><Bar yAxisId="r" dataKey="engagements" name="Engagements (right axis)" fill="#10b981" radius={[4,4,0,0]} /></ComposedChart></ResponsiveContainer></div> : <p className="page-main-sub">Schedule posts in this campaign to compare platforms.</p>}</div>
      <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title">Reach & clicks</h3></div><div className="cm-mini-stats vertical"><div><span>Reach</span><strong>{num(m.reach)}</strong></div><div><span>Impressions</span><strong>{num(m.impressions)}</strong></div><div><span>Clicks</span><strong>{num(m.clicks)}</strong></div><div><span>Profit</span><strong className={m.profit < 0 ? 'neg' : 'pos'}>{money(m.profit, report.currency)}</strong></div></div><p className="cm-footnote">Reach, impressions and clicks show once your Meta app has insights permissions.</p></div>
    </div>
    <div className="dashboard-card p-0 cm-posts-card">
      <div className="cm-posts-head"><h3 className="chart-title">Posts in this campaign ({report.posts.length})</h3>
        {canManage && available.length > 0 && <div className="cm-add-posts no-print"><select multiple aria-label="Posts to add" className="form-input" value={adding.map(String)} onChange={e => setAdding(Array.from(e.target.selectedOptions, o => Number(o.value)))}>{available.map(p => <option key={p.id} value={p.id}>{p.title} — {statusLabel(p.status)}{p.campaign_id ? ' (in another campaign)' : ''}</option>)}</select><button type="button" className="btn btn-primary" disabled={!adding.length || busy} onClick={() => act(`/campaigns/${id}/posts`, { method: 'POST', body: JSON.stringify({ post_ids: adding }) }).then(() => setAdding([]))}><Plus size={15} />Add selected</button></div>}
      </div>
      <div className="table-responsive"><table className="modern-table"><thead><tr><th>Post</th><th>Platform</th><th>Status</th><th>Published</th><th>Reach</th><th>Engagements</th>{canManage && <th className="no-print" />}</tr></thead><tbody>
        {report.posts.length ? report.posts.map(p => <tr key={p.id}><td className="font-semibold">{p.title}</td><td>{p.platform ? platformLabel(p.platform) : 'Multiple'}</td><td>{statusLabel(p.status)}</td><td>{p.published}/{p.jobs}</td><td>{num(p.reach)}</td><td><strong>{num(p.engagements)}</strong></td>{canManage && <td className="no-print text-right"><button type="button" className="btn btn-ghost btn-xs" disabled={busy} onClick={() => act(`/campaigns/${id}/posts/${p.id}`, { method: 'DELETE' })}>Remove</button></td>}</tr>)
          : <tr><td colSpan={canManage ? 7 : 6}>No posts yet. Add existing posts here, or pick this campaign when creating a post.</td></tr>}
      </tbody></table></div>
    </div>
    {editing && <CampaignForm initial={report} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await reload(); onChanged() }} />}
  </div>
}

export const CampaignHub = ({ canManage = false, posts = [], onChanged = () => {} }) => {
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const { data: campaigns, error, loading, reload } = useApiData(`/campaigns${filter === 'archived' ? '?status=archived' : ''}`, [], 60000)
  const visible = useMemo(() => campaigns.filter(c => filter === 'all' || filter === 'archived' || (filter === 'paused' ? c.status === 'paused' : c.phase === filter && c.status !== 'paused')), [campaigns, filter])
  const totals = useMemo(() => ({
    running: campaigns.filter(c => c.phase === 'running' && c.status === 'active').length,
    engagements: campaigns.reduce((s, c) => s + c.metrics.engagements, 0),
    published: campaigns.reduce((s, c) => s + c.metrics.published_jobs, 0),
    currencies: [...new Set(campaigns.map(c => c.currency))],
    budget: campaigns.reduce((s, c) => s + c.budget, 0),
  }), [campaigns])
  const changed = () => { reload(); onChanged() }
  if (openId !== null) return <CampaignDetail id={openId} canManage={canManage} posts={posts} onBack={() => { setOpenId(null); reload() }} onChanged={changed} />
  return <div className="cm-page">
    <div className="page-header-row"><div><h1 className="page-main-heading">Campaigns</h1><p className="page-main-sub">Plan campaigns, group posts, track goals and measure ROI.</p></div>
      {canManage && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} />New campaign</button>}</div>
    {error && <div className="info-callout-card" role="alert">{error}</div>}
    <div className="metrics-grid">
      <MetricCard title="Running now" value={totals.running} icon={Megaphone} accent="indigo" subtitle={`${campaigns.length} campaigns in view`} />
      <MetricCard title="Campaign engagement" value={num(totals.engagements)} icon={TrendingUp} accent="emerald" subtitle={`${totals.published} publications`} />
      <MetricCard title="Total budget" value={totals.currencies.length === 1 ? money(totals.budget, totals.currencies[0]) : totals.currencies.length ? 'Mixed currencies' : money(0)} icon={Coins} accent="amber" />
      <MetricCard title="Needs attention" value={campaigns.filter(c => c.alerts.some(a => a.level === 'warning')).length} icon={AlertTriangle} accent="sky" subtitle="campaigns with warnings" />
    </div>
    <div className="time-range-picker cm-filter">{[['all', 'All'], ['running', 'Running'], ['upcoming', 'Upcoming'], ['ended', 'Ended'], ['paused', 'Paused'], ['archived', 'Archived']].map(([key, name]) => <button type="button" key={key} className={`range-pill ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{name}</button>)}</div>
    {loading ? <p role="status">Loading campaigns…</p> : visible.length === 0
      ? <EmptyState title={campaigns.length ? 'No campaigns match this filter' : 'No campaigns yet'} description="Campaigns group your posts with dates, budget and goals so you can track performance and ROI." actionLabel={canManage && !campaigns.length ? 'New campaign' : undefined} onAction={canManage && !campaigns.length ? () => setCreating(true) : undefined} icon={BarChart3} />
      : <div className="cm-grid">{visible.map(c => <CampaignCardView key={c.id} campaign={c} onOpen={setOpenId} />)}</div>}
    {creating && <CampaignForm onClose={() => setCreating(false)} onSaved={created => { setCreating(false); changed(); setOpenId(created.id) }} />}
  </div>
}

export default CampaignHub
