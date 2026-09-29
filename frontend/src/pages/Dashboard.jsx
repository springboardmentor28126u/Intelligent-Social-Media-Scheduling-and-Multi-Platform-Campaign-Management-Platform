import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatusBadge, EmptyState } from "../components/UI";
import "./Dashboard.css";

const API_URL = "http://127.0.0.1:8000";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/dashboard/stats`, { headers }),
      fetch(`${API_URL}/dashboard/recent-campaigns`, { headers }),
      fetch(`${API_URL}/dashboard/recent-posts`, { headers }),
    ])
      .then(async ([statsResponse, campaignsResponse, postsResponse]) => {
        if ([statsResponse, campaignsResponse, postsResponse].some((response) => response.status === 401)) {
          localStorage.removeItem("access_token");
          navigate("/login", { replace: true });
          return;
        }
        if (!statsResponse.ok || !campaignsResponse.ok || !postsResponse.ok) {
          throw new Error("Could not load your account overview.");
        }
        setStats(await statsResponse.json());
        setRecentCampaigns(await campaignsResponse.json());
        setRecentPosts(await postsResponse.json());
      })
      .catch((requestError) => setError(requestError.message || "Could not connect to SocialPilot."))
      .finally(() => setLoading(false));
  }, [navigate]);

  const actions = [
    { label: "Create Campaign", icon: "+", path: "/campaigns/create" },
    { label: "Create Post", icon: "+", path: "/create-post" },
    { label: "Connect Social Account", icon: "+", path: "/social-accounts" },
    { label: "View Reports", icon: "↗", path: "/analytics" },
  ];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="workspace-page dashboard-home">
        <PageHeader eyebrow="ACCOUNT OVERVIEW" title={`${greeting}${stats?.user_name ? `, ${stats.user_name}` : ""}`} description="Here is what is happening across your SocialPilot account." className="dashboard-heading" actions={<button className="primary-action" onClick={() => navigate("/create-post")}>＋ Create Post</button>} />

        {loading && <p className="dashboard-message">Loading your account overview...</p>}
        {error && <div className="dashboard-message dashboard-error" role="alert">{error}</div>}

        {!loading && !error && stats && <>
          <section className="account-stats" aria-label="Account summary">
            {[
              ["Total campaigns", stats.total_campaigns],
              ["Active campaigns", stats.active_campaigns],
              ["Scheduled posts", stats.scheduled_posts],
              ["Published posts", stats.published_posts],
              ["Connected accounts", stats.connected_accounts],
            ].map(([label, value]) => (
              <article className="account-stat" key={label}>
                <span>{label}</span>
                <strong>{value ?? 0}</strong>
              </article>
            ))}
          </section>

          <section className="quick-actions-section">
            <div className="section-heading-row"><div><p className="eyebrow">GET MOVING</p><h2>Quick actions</h2></div></div>
            <div className="dashboard-actions">
              {actions.map((action) => (
                <button key={action.label} className="dashboard-action" onClick={() => navigate(action.path)}>
                  <span className="action-symbol" aria-hidden="true">{action.icon}</span>
                  <span>{action.label}</span>
                  <span className="action-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>

          <div className="recent-grid">
            <section className="recent-section">
              <div className="section-heading-row">
                <div><p className="eyebrow">WORK IN PROGRESS</p><h2>Recent campaigns</h2></div>
                <button className="text-action" onClick={() => navigate("/campaigns")}>All campaigns →</button>
              </div>
              {recentCampaigns.length ? <div className="recent-table-wrap"><table className="recent-campaign-table"><thead><tr><th>Campaign</th><th>Status</th><th>Start</th><th>End</th><th>Posts</th><th>Actions</th></tr></thead><tbody>
                {recentCampaigns.map((campaign) => <tr key={campaign.id}>
                  <td><strong>{campaign.name}</strong><small>{campaign.platforms?.join(", ") || "No platforms"}</small></td>
                  <td><StatusBadge value={campaign.status} /></td>
                  <td>{formatDate(campaign.start_date)}</td><td>{formatDate(campaign.end_date)}</td><td>{campaign.posts || 0}</td>
                  <td><button className="activity-view" onClick={() => navigate(`/campaigns/${campaign.id}`)} aria-label={`View ${campaign.name}`}>View</button></td>
                </tr>)}
              </tbody></table></div> : <p className="empty-activity">No campaigns yet. Create one to start organizing your content.</p>}
            </section>

            <section className="recent-section">
              <div className="section-heading-row">
                <div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent posts</h2></div>
                <button className="text-action" onClick={() => navigate("/posts")}>All posts →</button>
              </div>
              {recentPosts.length ? <ul className="activity-list">
                {recentPosts.map((post) => <li key={post.id}>
                  <span className="activity-marker post-marker" aria-hidden="true" />
                  <span className="activity-copy"><strong>{post.content || "Untitled post"}</strong><small>{[post.platform, post.campaign_name].filter(Boolean).join(" · ") || "Post"}</small><small>{post.status?.toLowerCase() === "scheduled" && post.scheduled_at ? `Scheduled ${new Date(post.scheduled_at).toLocaleString()}` : post.created_at ? new Date(post.created_at).toLocaleDateString() : ""}</small></span>
                  <span className={`status-pill status-${post.status?.toLowerCase()}`}>{post.status}</span>
                </li>)}
              </ul> : <EmptyState title="No recent posts" description="Create your first post to see activity here." />}
            </section>
          </div>
        </>}
      </div>
    </>
  );
}

export default Dashboard;