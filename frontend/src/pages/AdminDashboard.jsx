import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./AdminDashboard.css";

const API_URL = "http://127.0.0.1:8000";
const numberFormat = new Intl.NumberFormat();

const summaryCards = [
  { key: "total_users", label: "Total users", icon: "♙", tone: "mint", note: "Across the workspace" },
  { key: "active_users", label: "Active users", icon: "◉", tone: "blue", note: "Activity tracking unavailable" },
  { key: "total_campaigns", label: "Total campaigns", icon: "◎", tone: "amber", note: "All campaign statuses" },
  { key: "active_campaigns", label: "Active campaigns", icon: "↗", tone: "mint", note: "Currently running" },
  { key: "total_posts", label: "Total posts", icon: "▤", tone: "blue", note: "Across all users" },
  { key: "scheduled_posts", label: "Scheduled posts", icon: "◷", tone: "amber", note: "Awaiting publication" },
  { key: "published_posts", label: "Published posts", icon: "✓", tone: "mint", note: "Successfully published" },
  { key: "connected_accounts", label: "Social accounts", icon: "⌘", tone: "coral", note: "Connected platform accounts" },
];

const platformNames = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

async function requestAdminOverview(signal) {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch(`${API_URL}/admin/overview`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Could not load platform overview.");
  return data;
}

function displayDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function statusTone(value) {
  const status = String(value || "unknown").toLowerCase();
  if (["published", "active", "operational", "success", "completed"].includes(status)) return "good";
  if (["failed", "error", "cancelled"].includes(status)) return "bad";
  if (["warning", "processing", "publishing"].includes(status)) return "warn";
  return "neutral";
}

function EmptyState({ children }) {
  return <div className="admin-empty">{children}</div>;
}

function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await requestAdminOverview());
    } catch (requestError) {
      setError(requestError.message || "Could not connect to the SocialPilot API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestAdminOverview(controller.signal)
      .then(setOverview)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message || "Could not connect to the SocialPilot API.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const maxTrend = Math.max(1, ...(overview?.publishing_trend || []).map((point) => point.count));

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-container">
        <section className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">PLATFORM OVERVIEW</p>
            <h2>Good day, admin</h2>
            <p>System-wide activity and publishing health at a glance.</p>
          </div>
          <button className="admin-refresh-button" type="button" onClick={loadOverview} disabled={loading}>
            <span aria-hidden="true">↻</span> Refresh data
          </button>
        </section>

        {error && <div className="admin-error" role="alert"><span>{error}</span><button type="button" onClick={loadOverview}>Retry</button></div>}
        {loading && !overview && <div className="admin-loading" role="status"><span className="admin-spinner" />Loading platform data...</div>}

        {overview && <>
          <section className="admin-summary-grid" aria-label="Platform summary">
            {summaryCards.map((card) => <article className="admin-summary-card" key={card.key}>
              <div className={`admin-summary-icon tone-${card.tone}`} aria-hidden="true">{card.icon}</div>
              <div className="admin-summary-copy"><span>{card.label}</span><strong>{overview.summary[card.key] == null ? "—" : numberFormat.format(overview.summary[card.key])}</strong><small>{card.note}</small></div>
            </article>)}
          </section>

          <section className="admin-overview-grid">
            <article className="admin-panel admin-user-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">PEOPLE</p><h3>User overview</h3></div><Link to="/admin/users" className="admin-text-link">View all users <span aria-hidden="true">→</span></Link></div>
              <div className="admin-user-total"><strong>{numberFormat.format(overview.summary.total_users)}</strong><span>registered accounts</span><small>Registration dates and active status are not tracked in the current user schema.</small></div>
              <div className="admin-mini-list">
                {overview.recent_users.length ? overview.recent_users.map((user) => <div className="admin-mini-row" key={user.id}>
                  <span className="admin-avatar">{user.name?.slice(0, 1)?.toUpperCase() || "U"}</span><span className="admin-mini-person"><strong>{user.name}</strong><small>{user.email}</small></span><span className={`admin-badge ${user.role === "ADMIN" ? "badge-purple" : "badge-neutral"}`}>{user.role}</span>
                </div>) : <EmptyState>No registered users yet.</EmptyState>}
              </div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">CAMPAIGNS</p><h3>Status breakdown</h3></div><Link to="/admin/campaigns" className="admin-text-link">All campaigns <span aria-hidden="true">→</span></Link></div>
              <div className="admin-breakdown-list">
                {Object.entries(overview.campaign_statuses).length ? Object.entries(overview.campaign_statuses).map(([status, count]) => {
                  const total = Math.max(overview.summary.total_campaigns, 1);
                  return <div className="admin-breakdown-row" key={status}><div className="admin-breakdown-label"><span>{status}</span><strong>{numberFormat.format(count)}</strong></div><div className="admin-track"><span style={{ width: `${Math.max(count ? 5 : 0, (count / total) * 100)}%` }} /></div></div>;
                }) : <EmptyState>No campaigns created yet.</EmptyState>}
              </div>
              <div className="admin-panel-footnote">Draft, scheduled, active, paused, completed and archived campaigns.</div>
            </article>
          </section>

          <section className="admin-overview-grid admin-overview-grid-equal">
            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">PUBLISHING</p><h3>Activity · last 7 days</h3></div><Link to="/admin/publishing-logs" className="admin-text-link">Publishing logs <span aria-hidden="true">→</span></Link></div>
              <div className="admin-trend-chart" role="img" aria-label="Publishing activity for the last seven days">
                {overview.publishing_trend.map((point) => <div className="admin-trend-column" key={point.date}>
                  <div className="admin-trend-bar-wrap"><span className="admin-trend-value">{point.count || ""}</span><span className="admin-trend-bar" style={{ height: `${point.count ? Math.max(9, (point.count / maxTrend) * 100) : 3}%` }} /></div>
                  <span className="admin-trend-label">{new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span>
                </div>)}
              </div>
              <div className="admin-chart-caption">Publishing log entries per day</div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">CONNECTED CHANNELS</p><h3>Social accounts</h3></div><Link to="/admin/social-accounts" className="admin-text-link">Manage <span aria-hidden="true">→</span></Link></div>
              <div className="admin-platform-list">
                {Object.entries(platformNames).map(([key, name]) => <div className="admin-platform-row" key={key}><span className={`admin-platform-mark platform-${key}`}>{name.slice(0, 1)}</span><span>{name}</span><strong>{numberFormat.format(overview.platform_counts[key] || 0)}</strong></div>)}
              </div>
              <div className="admin-panel-footnote">Account credentials and access tokens are never shown.</div>
            </article>

            <article className="admin-panel admin-post-status-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">CONTENT</p><h3>Post status</h3></div><Link to="/admin/posts" className="admin-text-link">View posts <span aria-hidden="true">→</span></Link></div>
              <div className="admin-post-status-grid">
                {[["scheduled", "Scheduled"], ["publishing", "Processing"], ["published", "Published"], ["failed", "Failed"], ["cancelled", "Cancelled"], ["draft", "Drafts"]].map(([key, label]) => <div key={key}><span>{label}</span><strong>{numberFormat.format(overview.post_statuses[key] || 0)}</strong></div>)}
              </div>
            </article>
          </section>

          <section className="admin-overview-grid admin-overview-grid-equal">
            <article className="admin-panel admin-wide-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">LATEST WORK</p><h3>Recent campaigns</h3></div><Link to="/admin/campaigns" className="admin-text-link">View campaigns <span aria-hidden="true">→</span></Link></div>
              {overview.recent_campaigns.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Campaign</th><th>Owner</th><th>Dates</th><th>Posts</th><th>Status</th></tr></thead><tbody>{overview.recent_campaigns.map((campaign) => <tr key={campaign.id}><td><strong>{campaign.name}</strong></td><td>{campaign.owner}</td><td>{campaign.start_date || "—"}{campaign.end_date ? ` – ${campaign.end_date}` : ""}</td><td>{campaign.post_count}</td><td><span className={`admin-badge badge-${statusTone(campaign.status)}`}>{campaign.status}</span></td></tr>)}</tbody></table></div> : <EmptyState>No campaigns to display.</EmptyState>}
            </article>
            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">UP NEXT</p><h3>Publishing queue</h3></div><Link to="/admin/publishing-queue" className="admin-text-link">Open queue <span aria-hidden="true">→</span></Link></div>
              {overview.queue.length ? <div className="admin-queue-list">{overview.queue.slice(0, 4).map((post) => <div className="admin-queue-item" key={post.id}><div className="admin-queue-time">{displayDate(post.scheduled_at)}</div><strong>{post.content || "Untitled post"}</strong><div className="admin-queue-meta"><span>{post.platform}</span><span>{post.owner}</span><span className={`admin-badge badge-${statusTone(post.status)}`}>{post.status}</span></div></div>)}</div> : <EmptyState>The queue is clear.</EmptyState>}
            </article>
          </section>

          <section className="admin-overview-grid admin-overview-grid-equal">
            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">LATEST EVENTS</p><h3>Publishing activity</h3></div><Link to="/admin/publishing-logs" className="admin-text-link">All logs <span aria-hidden="true">→</span></Link></div>
              {overview.publishing_activity.length ? <div className="admin-activity-list">{overview.publishing_activity.map((activity) => <div className="admin-activity-row" key={activity.id}><span className={`admin-activity-dot dot-${statusTone(activity.status)}`} /><span className="admin-activity-copy"><strong>{activity.platform} · {activity.status}</strong><small>{activity.owner} · {displayDate(activity.occurred_at)}</small></span></div>)}</div> : <EmptyState>No publishing events have been logged.</EmptyState>}
            </article>
            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p className="admin-eyebrow">OPERATIONS</p><h3>System status</h3></div><span className="admin-live-label"><i /> Live</span></div>
              <div className="admin-system-list">{Object.entries(overview.system_status).map(([name, status]) => <div className="admin-system-row" key={name}><span>{name.replaceAll("_", " ")}</span><span className={`admin-badge badge-${statusTone(status)}`}>{status}</span></div>)}</div>
              <div className="admin-panel-footnote">External API and worker health checks are not configured in this deployment.</div>
            </article>
          </section>

          <section className="admin-analytics-note"><div><p className="admin-eyebrow">ANALYTICS</p><h3>Performance insights</h3><p>Reach, impressions, engagement and audience growth are not currently persisted by the platform APIs, so no estimates are shown.</p></div><Link to="/admin/analytics" className="admin-text-link">Analytics <span aria-hidden="true">→</span></Link></section>
        </>}
      </div>
    </main>
  );
}

export default AdminDashboard;