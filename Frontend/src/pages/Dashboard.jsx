import { useState } from 'react'
import { isPending, statusLabel } from '../postUtils'
import { api } from '../api'
import {
  Megaphone,
  Clock,
  Share2,
  TrendingUp,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Activity,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { MetricCard } from '../components/MetricCard'
import { PlatformBadge, PlatformIcon } from '../components/PlatformBadge'
import { EmptyState } from '../components/EmptyState'

export const Dashboard = ({
  name,
  campaigns = [],
  connectedAccounts = [],
  onOpenCreateCampaign,
  canCreateCampaign,
  onNavigate,
  onEditCampaign,
  onRefresh,
}) => {
  const [timeRange, setTimeRange] = useState('7d')
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoError, setDemoError] = useState('')
  const hasDemo = campaigns.some(c => c.is_demo)
  const toggleDemo = async () => {
    if (hasDemo && !window.confirm('Remove all sample posts, campaigns and metrics? Your real data is not touched.')) return
    setDemoBusy(true); setDemoError('')
    try { await api('/demo', { method: hasDemo ? 'DELETE' : 'POST' }); if (onRefresh) await onRefresh() }
    catch (err) { setDemoError(err.message) }
    finally { setDemoBusy(false) }
  }

  // Determine time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Calculate upcoming campaigns

  const upcomingCampaigns = [...campaigns]
    .filter(c => isPending(c.status))
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))

  // The range pills filter the activity metrics below (created / published within the range).
  const rangeStart = (() => {
    const start = new Date()
    if (timeRange === 'today') start.setHours(0, 0, 0, 0)
    else start.setDate(start.getDate() - (timeRange === '7d' ? 7 : 30))
    return start
  })()
  const createdInRange = campaigns.filter(c => c.created_at && new Date(c.created_at) >= rangeStart)
  const publishedInRange = campaigns.filter(c => (c.jobs || []).some(j => j.status === 'published' && new Date(j.scheduled_at) >= rangeStart))
  const failedInRange = campaigns.filter(c => (c.jobs || []).some(j => j.status === 'failed' && new Date(j.scheduled_at) >= rangeStart))
  const rangeLabel = { today: 'today', '7d': 'in the last 7 days', '30d': 'in the last 30 days' }[timeRange]

  // Platforms supported
  const ALL_PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'X']

  const isPlatformConnected = (platformName) => {
    return connectedAccounts.some(
      (acc) => (acc.platform || '').toLowerCase() === platformName.toLowerCase()
    )
  }

  return (
    <div className="dashboard-page-container">
      {/* Top Banner & Header */}
      <div className="dashboard-welcome-banner">
        <div className="banner-left">
          <h1 className="welcome-heading">
            {getGreeting()}, {name || 'Creator'} 👋
          </h1>
          <p className="welcome-sub">
            Here's what's happening across your connected social channels today.
          </p>
        </div>

        <div className="banner-right">
          {canCreateCampaign && <button type="button" className={`btn ${hasDemo ? 'btn-secondary' : 'btn-demo'}`} onClick={toggleDemo} disabled={demoBusy} title={hasDemo ? 'Remove the sample data' : 'Fill every screen with realistic sample data (never published)'}>
            {hasDemo ? <Trash2 size={15} /> : <Sparkles size={15} />}{demoBusy ? 'Working…' : hasDemo ? 'Remove demo data' : 'Load demo data'}
          </button>}
          <div className="time-range-picker">
            <button
              type="button"
              className={`range-pill ${timeRange === 'today' ? 'active' : ''}`}
              onClick={() => setTimeRange('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`range-pill ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => setTimeRange('7d')}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={`range-pill ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => setTimeRange('30d')}
            >
              Last 30 Days
            </button>
          </div>

        </div>
      </div>

      {demoError && <div className="info-callout-card" role="alert">{demoError}</div>}
      {hasDemo && <div className="info-callout-card demo-banner" role="status"><Sparkles size={16} /> Sample data is loaded. Posts marked <span className="demo-chip">Sample</span> are never published. Remove it any time from this button.</div>}

      {/* KPI Metric Cards */}
      <div className="metrics-grid">
        <MetricCard
          title="Posts Created"
          value={createdInRange.length}
          icon={Megaphone}
          accent="indigo"
          subtitle={`${rangeLabel} · ${campaigns.length} total`}
          onClick={() => onNavigate('campaigns')}
        />
        <MetricCard
          title="Scheduled Posts"
          value={upcomingCampaigns.length}
          icon={Clock}
          subtitle="Waiting to publish"
          accent="amber"
          onClick={() => onNavigate('schedule')}
        />
        <MetricCard
          title="Connected Accounts"
          value={connectedAccounts.length}
          icon={Share2}
          subtitle="Connected social platforms"
          accent="emerald"
          onClick={() => onNavigate('accounts')}
        />
        <MetricCard
          title="Published Posts"
          value={publishedInRange.length}
          icon={TrendingUp}
          accent="violet"
          subtitle={failedInRange.length ? `${rangeLabel} · ${failedInRange.length} failed` : rangeLabel}
          onClick={() => onNavigate('analytics')}
        />
      </div>

      {/* Main Grid: Left side (Upcoming + Recent) & Right side (Connected Platforms + Activity) */}
      <div className="dashboard-sections-grid">
        {/* Left Column */}
        <div className="section-col-main">
          {/* Section A: Upcoming Scheduled Content */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="header-title-group">
                <Clock size={18} className="text-amber" />
                <h3 className="section-title">Upcoming Scheduled Content</h3>
              </div>
              <button
                type="button"
                className="btn-link text-sm"
                onClick={() => onNavigate('schedule')}
              >
                View Schedule <ArrowRight size={14} />
              </button>
            </div>

            <div className="dashboard-card-body">
              {upcomingCampaigns.length === 0 ? (
                <EmptyState
                  title="No upcoming posts scheduled"
                  description="Schedule a post and it will appear here until it is published."
                  actionLabel={canCreateCampaign ? 'New Post' : undefined}
                  onAction={canCreateCampaign ? onOpenCreateCampaign : undefined}
                />
              ) : (
                <div className="upcoming-list">
                  {upcomingCampaigns.slice(0, 3).map((campaign, idx) => (
                    <div key={idx} className="upcoming-item-row">
                      <div className="upcoming-date-box">
                        <span className="u-day">{campaign.date ? campaign.date.split('-')[2] || '—' : '—'}</span>
                        <span className="u-month">{campaign.date ? campaign.date.split('-')[1] || 'SCH' : 'SCH'}</span>
                      </div>
                      <div className="upcoming-details">
                        <div className="u-top">
                          <h4 className="u-name">{campaign.name}</h4>
                          <PlatformBadge platform={campaign.platform} size="sm" />
                        </div>
                        <p className="u-text">{campaign.content}</p>
                        <div className="u-time-tag">
                          <Clock size={12} />
                          <span>{campaign.time || '12:00 PM'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section B: Recent Posts Table/List */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="header-title-group">
                <Megaphone size={18} className="text-indigo" />
                <h3 className="section-title">Recent Posts</h3>
              </div>
              <button
                type="button"
                className="btn-link text-sm"
                onClick={() => onNavigate('campaigns')}
              >
                All Posts ({campaigns.length}) <ArrowRight size={14} />
              </button>
            </div>

            <div className="dashboard-card-body p-0">
              {campaigns.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No posts created yet"
                    description="Posts created in this workspace will appear here."
                    actionLabel={canCreateCampaign ? 'New Post' : undefined}
                    onAction={canCreateCampaign ? onOpenCreateCampaign : undefined}
                  />
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Post</th>
                        <th>Platform</th>
                        <th>Scheduled Date</th>
                        <th>Time</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.slice(0, 4).map((c, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-slate-800">{c.name}</td>
                          <td>
                            <PlatformBadge platform={c.platform} size="sm" />
                          </td>
                          <td>
                            <div className="date-cell">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{c.date || '—'}</span>
                            </div>
                          </td>
                          <td>{c.time || '—'}</td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => onEditCampaign(i)}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Connected Channels & Activity */}
        <div className="section-col-side">
          {/* Section C: Connected Platforms */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="header-title-group">
                <Share2 size={18} className="text-emerald" />
                <h3 className="section-title">Connected Platforms</h3>
              </div>
              <button
                type="button"
                className="btn-link text-sm"
                onClick={() => onNavigate('accounts')}
              >
                Manage <ArrowRight size={14} />
              </button>
            </div>

            <div className="dashboard-card-body">
              <div className="platform-status-list">
                {ALL_PLATFORMS.map((plat) => {
                  const connected = isPlatformConnected(plat)
                  return (
                    <div key={plat} className="platform-status-row">
                      <div className="platform-info">
                        <div className={`p-mini-icon p-${plat.toLowerCase()}`}>
                          <PlatformIcon platform={plat} size={16} />
                        </div>
                        <span className="p-label">{plat}</span>
                      </div>
                      <div className="p-badge">
                        {connected ? (
                          <span className="status-live-chip">
                            <CheckCircle2 size={13} />
                            <span>Connected</span>
                          </span>
                        ) : (
                          <span className="status-offline-chip">
                            <span>Not connected</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Section D: Recent System & Account Activity */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="header-title-group">
                <Activity size={18} className="text-sky" />
                <h3 className="section-title">Activity Feed</h3>
              </div>
            </div>

            <div className="dashboard-card-body">
              <div className="activity-timeline">
                {connectedAccounts.length > 0 && (
                  <div className="timeline-item">
                    <div className="timeline-bullet bg-emerald" />
                    <div className="timeline-content">
                      <p className="timeline-title">
                        {connectedAccounts.length} Social Account(s) Connected
                      </p>
                      <span className="timeline-time">Available across your sessions</span>
                    </div>
                  </div>
                )}

                {campaigns.slice(0, 4).map((c, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-bullet ${c.status === 'published' ? 'bg-emerald' : c.status === 'failed' ? 'bg-rose' : 'bg-indigo'}`} />
                    <div className="timeline-content">
                      <p className="timeline-title">
                        <strong>"{c.name}"</strong> — {statusLabel(c.status).toLowerCase()}{c.platform ? ` on ${c.platform}` : ''}
                      </p>
                      <span className="timeline-time">
                        {c.date ? `${c.date} at ${c.time}` : 'Not scheduled yet'}
                      </span>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

