import { useMemo, useState } from 'react'
import { Award, CheckCircle2, Clock, Coins, Download, Printer, RefreshCw, TrendingUp, Users, XCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { MetricCard } from '../components/MetricCard'
import { Heatmap } from '../components/Heatmap'
import { useApiData } from '../hooks/useApiData'
import { downloadCsv, money, num, percent, platformLabel, SERIES_COLORS, stamp, titleCase } from '../reportUtils'
import './campaigns.css'

const TABS = [['campaigns', 'Campaign comparison & ROI'], ['audience', 'Audience growth'], ['performance', 'Publishing performance']]
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

function Toolbar({ onCsv, extra }) {
  return <div className="cm-actions no-print">{extra}<button type="button" className="btn btn-secondary" onClick={onCsv}><Download size={15} />Export CSV</button><button type="button" className="btn btn-secondary" onClick={() => window.print()}><Printer size={15} />Print / PDF</button></div>
}

function CampaignComparison({ days }) {
  const { data, error, loading } = useApiData(`/reports/campaigns?days=${days}`, { campaigns: [], totals: {}, best: {} }, 60000)
  const [excluded, setExcluded] = useState([])
  const rows = useMemo(() => data.campaigns.filter(c => !excluded.includes(c.id)), [data, excluded])
  const currencies = [...new Set(rows.map(r => r.currency))]
  const currency = currencies.length === 1 ? currencies[0] : null
  const budget = rows.reduce((s, r) => s + r.budget, 0)
  const revenue = rows.reduce((s, r) => s + r.revenue, 0)
  const engagements = rows.reduce((s, r) => s + r.metrics.engagements, 0)
  const chart = rows.map(r => ({ name: r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name, engagements: r.metrics.engagements, reach: r.metrics.reach, roi: r.metrics.roi_pct ?? 0 }))
  const csv = () => downloadCsv(`campaign-comparison-${stamp()}.csv`, [
    { label: 'Campaign', value: 'name' }, { label: 'Objective', value: r => titleCase(r.objective) }, { label: 'Status', value: 'status' },
    { label: 'Start', value: 'start_date' }, { label: 'End', value: 'end_date' }, { label: 'Currency', value: 'currency' },
    { label: 'Budget', value: 'budget' }, { label: 'Revenue', value: 'revenue' }, { label: 'ROI %', value: r => r.metrics.roi_pct },
    { label: 'Cost per engagement', value: r => r.metrics.cost_per_engagement }, { label: 'Posts', value: r => r.metrics.posts },
    { label: 'Published', value: r => r.metrics.published_jobs }, { label: 'Failed', value: r => r.metrics.failed_jobs },
    { label: 'Engagements', value: r => r.metrics.engagements }, { label: 'Reach', value: r => r.metrics.reach },
    { label: 'Engagement rate %', value: r => r.metrics.engagement_rate }, { label: 'Target progress %', value: r => r.metrics.target_progress },
  ], rows)
  if (loading) return <p role="status">Loading campaign report…</p>
  return <>
    {error && <div className="info-callout-card" role="alert">{error}</div>}
    <div className="cm-section-head"><p className="page-main-sub">Campaigns active in the last {days} days. Untick a campaign to leave it out of the comparison.</p><Toolbar onCsv={csv} /></div>
    <div className="metrics-grid">
      <MetricCard title="Campaigns compared" value={rows.length} icon={Award} accent="indigo" />
      <MetricCard title="Total engagement" value={num(engagements)} icon={TrendingUp} accent="emerald" />
      <MetricCard title="Budget → revenue" value={currency ? money(budget, currency) : 'Mixed'} icon={Coins} accent="amber" subtitle={currency ? `${money(revenue, currency)} revenue` : 'Campaigns use different currencies'} />
      <MetricCard title="Overall ROI" value={currency && budget ? percent(Math.round((revenue - budget) * 1000 / budget) / 10) : '—'} icon={Coins} accent="sky" subtitle={currency && budget && engagements ? `${money(budget / engagements, currency)} per engagement` : undefined} />
    </div>
    {data.campaigns.length === 0 ? <div className="dashboard-card"><p>No campaigns in this period. Create a campaign in Campaigns and assign posts to it.</p></div> : <>
      <div className="analytics-charts-grid">
        <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Engagement comparison</h3></div><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="engagements" name="Engagements" fill="#10b981" radius={[4,4,0,0]} /><Bar dataKey="reach" name="Reach" fill="#a5b4fc" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title">ROI by campaign (%)</h3></div><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip formatter={v => `${v}%`} /><Bar dataKey="roi" name="ROI %" radius={[0,4,4,0]}>{chart.map((row, i) => <Cell key={i} fill={row.roi < 0 ? '#f87171' : '#6366f1'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
      </div>
      <div className="dashboard-card p-0 cm-posts-card"><div className="table-responsive"><table className="modern-table"><thead><tr><th className="no-print" /><th>Campaign</th><th>Dates</th><th>Budget</th><th>Revenue</th><th>ROI</th><th>Cost / eng.</th><th>Published</th><th>Engagements</th><th>Eng. rate</th><th>Target</th></tr></thead><tbody>
        {data.campaigns.map(r => { const off = excluded.includes(r.id); return <tr key={r.id} className={off ? 'cm-row-off' : ''}><td className="no-print"><input type="checkbox" aria-label={`Include ${r.name}`} checked={!off} onChange={() => setExcluded(off ? excluded.filter(x => x !== r.id) : [...excluded, r.id])} /></td><td><strong>{r.name}</strong>{data.best.roi === r.id && <span className="cm-best">Best ROI</span>}{data.best.engagement === r.id && <span className="cm-best">Most engagement</span>}<div className="cm-subtle">{titleCase(r.objective)} · {titleCase(r.status)}</div></td><td className="cm-nowrap">{r.start_date}<br />→ {r.end_date}</td><td>{money(r.budget, r.currency)}</td><td>{money(r.revenue, r.currency)}</td><td className={r.metrics.roi_pct < 0 ? 'neg' : 'pos'}>{percent(r.metrics.roi_pct)}</td><td>{r.metrics.cost_per_engagement === null ? '—' : money(r.metrics.cost_per_engagement, r.currency)}</td><td>{r.metrics.published_jobs}{r.metrics.failed_jobs ? <span className="neg"> / {r.metrics.failed_jobs} failed</span> : ''}</td><td><strong>{num(r.metrics.engagements)}</strong></td><td>{percent(r.metrics.engagement_rate)}</td><td>{percent(r.metrics.target_progress)}</td></tr> })}
      </tbody></table></div></div>
    </>}
  </>
}

function AudienceGrowth({ days, canManage }) {
  const { data, error, loading, reload, setError } = useApiData(`/reports/audience?days=${days}`, { accounts: [], totals: {}, timeline: [], series_keys: [] }, 60000)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const sync = async () => {
    setBusy(true); setNote(''); setError('')
    try { const r = await api('/analytics/audience/refresh', { method: 'POST' }); await reload(); setNote(`${r.refreshed} account(s) updated${r.failed.length ? `; ${r.failed.length} need reconnection or permission` : ''}.`) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const csv = () => downloadCsv(`audience-growth-${stamp()}.csv`, [
    { label: 'Account', value: 'account_name' }, { label: 'Platform', value: r => platformLabel(r.provider) },
    { label: 'Followers', value: 'followers' }, { label: `Followers ${days} days ago`, value: 'start_followers' },
    { label: 'Growth', value: 'growth' }, { label: 'Growth %', value: 'growth_pct' }, { label: 'Following', value: 'following' },
    { label: 'Media count', value: 'media_count' }, { label: 'Last synced', value: 'last_synced_at' },
  ], data.accounts)
  if (loading) return <p role="status">Loading audience report…</p>
  const t = data.totals
  return <>
    {(error || note) && <div className="info-callout-card" role={error ? 'alert' : 'status'}>{error || note}</div>}
    <div className="cm-section-head"><p className="page-main-sub">Follower counts are recorded on every sync and every few hours by the publishing worker.</p><Toolbar onCsv={csv} extra={canManage && <button type="button" className="btn btn-primary" onClick={sync} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} />Sync followers</button>} /></div>
    <div className="metrics-grid">
      <MetricCard title="Total followers" value={num(t.followers)} icon={Users} accent="indigo" subtitle={`${t.accounts || 0} accounts tracked`} />
      <MetricCard title={`Growth (${days}d)`} value={`${t.growth >= 0 ? '+' : ''}${num(t.growth)}`} icon={TrendingUp} accent={t.growth < 0 ? 'amber' : 'emerald'} subtitle={percent(t.growth_pct)} />
    </div>
    {data.accounts.length === 0 ? <div className="dashboard-card"><p>No follower data yet. Connect Facebook or Instagram and sync followers.</p></div> : <>
      <div className="chart-card cm-gap"><div className="chart-card-header"><h3 className="chart-title">Followers over time</h3></div><div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.timeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} /><YAxis allowDecimals={false} domain={['auto', 'auto']} /><Tooltip /><Legend />{data.series_keys.map((key, i) => <Line key={key} type="monotone" dataKey={key} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} connectNulls />)}</LineChart></ResponsiveContainer></div></div>
      <div className="dashboard-card p-0 cm-posts-card"><div className="table-responsive"><table className="modern-table"><thead><tr><th>Account</th><th>Platform</th><th>Followers</th><th>Growth</th><th>Following</th><th>Media</th><th>Last synced</th></tr></thead><tbody>
        {data.accounts.map(a => <tr key={a.account_id}><td><strong>{a.account_name}</strong></td><td>{platformLabel(a.provider)}</td><td>{num(a.followers)}</td><td className={a.growth < 0 ? 'neg' : 'pos'}>{a.growth >= 0 ? '+' : ''}{num(a.growth)} ({percent(a.growth_pct)})</td><td>{a.provider === 'instagram' ? num(a.following) : '—'}</td><td>{a.provider === 'instagram' ? num(a.media_count) : '—'}</td><td>{new Date(a.last_synced_at).toLocaleString()}</td></tr>)}
      </tbody></table></div></div>
    </>}
  </>
}

function PublishingPerformance({ days }) {
  const { data, error, loading } = useApiData(`/reports/performance?days=${days}&timezone_name=${encodeURIComponent(tz)}`, { totals: {}, platforms: [], daily: [], hours: [], weekdays: [], heatmap: [] }, 60000)
  const t = data.totals
  const csv = () => downloadCsv(`publishing-performance-${stamp()}.csv`, [
    { label: 'Platform', value: r => platformLabel(r.platform) }, { label: 'Published', value: 'published' }, { label: 'Failed', value: 'failed' },
    { label: 'Success rate %', value: 'success_rate' }, { label: 'Engagements', value: 'engagements' }, { label: 'Likes', value: 'likes' },
    { label: 'Comments', value: 'comments' }, { label: 'Shares', value: 'shares' }, { label: 'Reach', value: 'reach' },
    { label: 'Avg engagement per post', value: 'avg_engagement' }, { label: 'Engagement rate %', value: 'engagement_rate' },
  ], data.platforms)
  if (loading) return <p role="status">Loading publishing report…</p>
  return <>
    {error && <div className="info-callout-card" role="alert">{error}</div>}
    <div className="cm-section-head"><p className="page-main-sub">Publishing reliability, platform comparison and when your audience engages ({tz}).</p><Toolbar onCsv={csv} /></div>
    <div className="metrics-grid">
      <MetricCard title="Success rate" value={percent(t.success_rate)} icon={CheckCircle2} accent="emerald" subtitle={`${t.published || 0} published of ${(t.published || 0) + (t.failed || 0)} attempted`} />
      <MetricCard title="Failed" value={t.failed || 0} icon={XCircle} accent="amber" subtitle={`${t.uncertain || 0} need review · ${t.pending || 0} pending`} />
      <MetricCard title="Avg engagement / post" value={t.avg_engagement_per_post || 0} icon={TrendingUp} accent="sky" subtitle={`${num(t.engagements)} total`} />
      <MetricCard title="Best time to post" value={data.best_slot?.label || data.best_hour || '—'} icon={Clock} accent="indigo" subtitle={data.best_weekday ? `Best day: ${data.best_weekday}` : 'Needs published posts with engagement'} />
    </div>
    <div className="analytics-charts-grid">
      <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Daily publishing</h3></div>{data.daily.length ? <div style={{ height: 260 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="published" name="Published" stackId="s" fill="#6366f1" /><Bar dataKey="failed" name="Failed" stackId="s" fill="#f87171" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div> : <p className="page-main-sub">No publishing activity in this period.</p>}</div>
      <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title">Platform comparison</h3></div>{data.platforms.length ? <div style={{ height: 260 }}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.platforms}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="platform" tickFormatter={platformLabel} fontSize={11} /><YAxis yAxisId="l" allowDecimals={false} /><YAxis yAxisId="r" orientation="right" /><Tooltip labelFormatter={platformLabel} /><Legend /><Bar yAxisId="l" dataKey="published" name="Published" fill="#a5b4fc" radius={[4,4,0,0]} /><Bar yAxisId="r" dataKey="avg_engagement" name="Avg engagement (right)" fill="#10b981" radius={[4,4,0,0]} /></ComposedChart></ResponsiveContainer></div> : <p className="page-main-sub">No data yet.</p>}</div>
      <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Best time to post (weekday × hour)</h3></div><Heatmap cells={data.heatmap} best={data.best_slot} timezone={tz} /></div>
      <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title">By weekday</h3></div><div style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.weekdays}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="weekday" fontSize={11} /><YAxis /><Tooltip /><Bar dataKey="avg_engagement" name="Avg engagement per post" radius={[4,4,0,0]}>{data.weekdays.map(d => <Cell key={d.weekday} fill={d.weekday === data.best_weekday ? '#f59e0b' : '#10b981'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
    </div>
    <div className="dashboard-card p-0 cm-posts-card"><div className="table-responsive"><table className="modern-table"><thead><tr><th>Platform</th><th>Published</th><th>Failed</th><th>Success</th><th>Engagements</th><th>Avg / post</th><th>Reach</th><th>Eng. rate</th></tr></thead><tbody>
      {data.platforms.length ? data.platforms.map(p => <tr key={p.platform}><td><strong>{platformLabel(p.platform)}</strong></td><td>{p.published}</td><td>{p.failed}</td><td>{percent(p.success_rate)}</td><td>{num(p.engagements)}</td><td>{p.avg_engagement}</td><td>{num(p.reach)}</td><td>{percent(p.engagement_rate)}</td></tr>) : <tr><td colSpan="8">No publishing data in this period.</td></tr>}
    </tbody></table></div></div>
  </>
}

export const Reports = ({ canManage = false }) => {
  const [tab, setTab] = useState('campaigns')
  const [days, setDays] = useState(30)
  return <div className="cm-page">
    <div className="page-header-row"><div><h1 className="page-main-heading">Reports</h1><p className="page-main-sub">Campaign ROI, audience growth and publishing performance, ready to export.</p></div>
      <div className="time-range-picker no-print">{[7, 30, 90, 365].map(v => <button type="button" key={v} className={`range-pill ${days === v ? 'active' : ''}`} onClick={() => setDays(v)}>{v === 365 ? '1 year' : `${v} days`}</button>)}</div></div>
    <div className="cm-tabs no-print" role="tablist">{TABS.map(([key, name]) => <button type="button" role="tab" aria-selected={tab === key} key={key} className={`cm-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{name}</button>)}</div>
    <h2 className="print-only">{TABS.find(t => t[0] === tab)[1]} — last {days} days — generated {new Date().toLocaleString()}</h2>
    {tab === 'campaigns' && <CampaignComparison days={days} />}
    {tab === 'audience' && <AudienceGrowth days={days} canManage={canManage} />}
    {tab === 'performance' && <PublishingPerformance days={days} />}
  </div>
}

export default Reports
