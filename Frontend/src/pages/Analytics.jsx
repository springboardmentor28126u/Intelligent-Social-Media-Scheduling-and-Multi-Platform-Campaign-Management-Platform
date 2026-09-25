import { useState } from 'react'
import { BarChart3, CheckCircle2, Eye, MessageCircle, MousePointerClick, RefreshCw, ThumbsUp, Trophy, Users } from 'lucide-react'
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { MetricCard } from '../components/MetricCard'
import { LiveBadge } from '../components/LiveBadge'
import { Heatmap } from '../components/Heatmap'
import { PlatformBadge } from '../components/PlatformBadge'
import { useApiData } from '../hooks/useApiData'
import { num, percent, platformLabel as label, SERIES_COLORS, trendOf } from '../reportUtils'
import './campaigns.css'

const empty = { totals: {}, previous: {}, platforms: [], timeline: [], workflow: {}, top_campaigns: [], last_synced_at: null }
const emptyAudience = { accounts: [], totals: {}, timeline: [], series_keys: [] }
const emptyPerf = { heatmap: [], best_slot: null }
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const REFRESH_MS = 60000

function Spotlight({ posts }) {
  if (!posts.length) return <p className="page-main-sub">Publish and sync posts to see your best performer here.</p>
  const [top, ...rest] = posts
  const max = Math.max(...posts.map(p => p.engagements), 1)
  return <div>
    <div className="spotlight">
      {top.image_url ? <img src={top.image_url} alt="" /> : <div className="pv-media-missing" style={{ width: 140, height: 140, borderRadius: 10 }}>Text post</div>}
      <div>
        <div className="cm-card-top"><PlatformBadge platform={label(top.provider)} size="sm" />{top.account_name && <span className="cm-subtle">{top.account_name}</span>}</div>
        <h3 className="cm-card-title" style={{ marginTop: '0.4rem' }}>{top.campaign}</h3>
        <p className="spotlight-caption">{top.content}</p>
        <div className="spotlight-stats"><div><strong>{num(top.engagements)}</strong>engagements</div><div><strong>{num(top.likes)}</strong>likes</div><div><strong>{num(top.comments)}</strong>comments</div><div><strong>{num(top.reach)}</strong>reach</div></div>
      </div>
    </div>
    {rest.length > 0 && <ol className="rank-list">{rest.map((p, i) => <li key={p.job_id}><span className="rank">{i + 2}</span><span style={{ width: '38%' }} className="truncate">{p.campaign}</span><span className="bar"><i style={{ width: `${(p.engagements / max) * 100}%` }} /></span><strong>{num(p.engagements)}</strong></li>)}</ol>}
  </div>
}

export const Analytics = ({ canRefresh = false }) => {
  const [days, setDays] = useState(30)
  const [syncing, setSyncing] = useState(false)
  const summary = useApiData(`/analytics/summary?days=${days}`, empty, REFRESH_MS)
  const audience = useApiData(`/reports/audience?days=${days}`, emptyAudience, REFRESH_MS)
  const perf = useApiData(`/reports/performance?days=${Math.max(days, 30)}&timezone_name=${encodeURIComponent(tz)}`, emptyPerf, REFRESH_MS)
  const [notice, setNotice] = useState('')
  const data = summary.data
  const sync = async () => {
    setSyncing(true); setNotice('')
    try {
      const result = await api(`/analytics/refresh?days=${days}`, { method: 'POST' })
      await Promise.all([summary.reload(), audience.reload(), perf.reload()])
      const failures = (result.failed?.length || 0) + (result.audience_failed?.length || 0)
      if (failures) setNotice(`${result.refreshed} posts and ${result.audience_refreshed || 0} accounts refreshed; ${failures} need reconnection or additional permission.`)
    } catch (err) { setNotice(err.message) }
    finally { setSyncing(false) }
  }
  const totals = data.totals || {}
  const prev = data.previous || {}
  const aud = audience.data
  const series = data.timeline || []
  const followerSeries = aud.timeline?.map(row => ({ date: row.date, value: aud.series_keys.reduce((s, k) => s + (row[k] || 0), 0) })) || []
  const timeline = series.length ? series : [{ date: 'No data', campaigns: 0, published: 0, engagements: 0 }]
  const error = notice || summary.error
  const vs = `vs previous ${days} days`
  const engagementRate = totals.reach ? Math.round(totals.engagements * 1000 / totals.reach) / 10 : null
  return <div className="analytics-page-container">
    <div className="page-header-row"><div><h1 className="page-main-heading">Analytics Dashboard</h1><p className="page-main-sub">Engagement, reach and audience growth across your connected accounts.</p></div>
      <div className="analytics-controls-row"><LiveBadge syncedAt={data.last_synced_at} /><div className="time-range-picker">{[7, 30, 90].map(value => <button type="button" key={value} className={`range-pill ${days === value ? 'active' : ''}`} onClick={() => setDays(value)}>Last {value} Days</button>)}</div>{canRefresh && <button type="button" className="btn btn-primary" onClick={sync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} />{syncing ? 'Syncing…' : 'Sync now'}</button>}</div></div>
    {error && <div className="info-callout-card" role="alert">{error}</div>}
    <div className="metrics-grid">
      <MetricCard title="Total engagement" value={totals.engagements || 0} icon={ThumbsUp} accent="emerald" {...trendOf(totals.engagements || 0, prev.engagements || 0)} trendLabel={vs} spark={series} sparkKey="engagements" />
      <MetricCard title="Reach" value={totals.reach || 0} icon={Eye} accent="violet" {...trendOf(totals.reach || 0, prev.reach || 0)} trendLabel={vs} spark={series} sparkKey="reach" />
      <MetricCard title="Published" value={totals.published || 0} icon={CheckCircle2} accent="indigo" {...trendOf(totals.published || 0, prev.published || 0)} trendLabel={vs} spark={series} sparkKey="published" />
      <MetricCard title="Followers" value={aud.totals?.followers || 0} icon={Users} accent="sky" {...(aud.totals?.growth_pct !== null && aud.totals?.growth_pct !== undefined ? { trend: `${aud.totals.growth >= 0 ? '+' : ''}${num(aud.totals.growth)}`, trendUp: aud.totals.growth >= 0 } : {})} trendLabel={`in ${days} days`} spark={followerSeries} />
    </div>
    <div className="metrics-grid">
      <MetricCard title="Comments" value={totals.comments || 0} icon={MessageCircle} accent="amber" {...trendOf(totals.comments || 0, prev.comments || 0)} trendLabel={vs} />
      <MetricCard title="Engagement rate" value={percent(engagementRate)} icon={BarChart3} accent="indigo" subtitle={`${num(totals.impressions)} impressions`} />
      <MetricCard title="Clicks" value={totals.clicks || 0} icon={MousePointerClick} accent="violet" {...trendOf(totals.clicks || 0, prev.clicks || 0)} trendLabel={vs} />
    </div>
    {summary.loading ? <p role="status">Loading analytics…</p> : <div className="analytics-charts-grid">
      <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Engagement timeline</h3></div><div className="chart-body-wrapper" style={{ height: 290 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={timeline}><defs><linearGradient id="engFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} minTickGap={24} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Area type="monotone" dataKey="engagements" name="Engagements" stroke="#10b981" strokeWidth={2} fill="url(#engFill)" /><Area type="monotone" dataKey="published" name="Posts published" stroke="#6366f1" fill="#c7d2fe" /></AreaChart></ResponsiveContainer></div></div>
      <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title"><Trophy size={16} className="text-amber" /> Top post</h3></div><Spotlight posts={data.top_campaigns || []} /></div>
      <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Best time to post</h3></div>{perf.data.heatmap?.length ? <Heatmap cells={perf.data.heatmap} best={perf.data.best_slot} timezone={tz} /> : <p className="page-main-sub">Loading…</p>}</div>
      <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title">Performance by platform</h3></div><div className="chart-body-wrapper" style={{ height: 290 }}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={(data.platforms || []).filter(p => p.published || p.engagements)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="platform" tickFormatter={label} fontSize={11} interval={0} /><YAxis yAxisId="l" allowDecimals={false} /><YAxis yAxisId="r" orientation="right" allowDecimals={false} /><Tooltip labelFormatter={label} /><Legend /><Bar yAxisId="l" dataKey="published" name="Published" fill="#6366f1" radius={[5,5,0,0]} /><Bar yAxisId="r" dataKey="engagements" name="Engagements (right)" fill="#10b981" radius={[5,5,0,0]} /></ComposedChart></ResponsiveContainer></div></div>
      <div className="chart-card chart-span-2"><div className="chart-card-header"><h3 className="chart-title">Follower growth</h3></div>{aud.timeline?.length ? <div className="chart-body-wrapper" style={{ height: 290 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={aud.timeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} minTickGap={24} /><YAxis allowDecimals={false} domain={['auto', 'auto']} /><Tooltip /><Legend />{aud.series_keys.map((key, i) => <Line key={key} type="monotone" dataKey={key} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} connectNulls />)}</LineChart></ResponsiveContainer></div> : <p className="page-main-sub">No follower snapshots yet. Sync now, or keep the publishing worker running to record followers every few hours.</p>}</div>
      <div className="chart-card"><div className="chart-card-header"><h3 className="chart-title">Engagement workflow</h3></div><div className="status-overview-body">{[['Needs attention', data.workflow?.needs_attention, 'text-amber'], ['Monitoring', data.workflow?.monitoring, 'text-indigo'], ['Reviewed', data.workflow?.reviewed, 'text-emerald']].map(([name,value,style]) => <div className="status-metric-row" key={name}><span>{name}</span><strong className={style}>{value || 0}</strong></div>)}</div></div>
    </div>}
  </div>
}

export default Analytics
