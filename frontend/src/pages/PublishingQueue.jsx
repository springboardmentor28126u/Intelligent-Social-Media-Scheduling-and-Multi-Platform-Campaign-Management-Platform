import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PublishingQueue.css";

const API_URL = "http://127.0.0.1:8000";
const STATUS_OPTIONS = ["All", "Queued", "Processing", "Scheduled", "Published", "Failed", "Cancelled"];

function parseLocalDateTime(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2})?:?(\d{2})?/);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
  );
}

function formatScheduled(value, options) {
  if (!value) return "Not scheduled";
  const date = parseLocalDateTime(value);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString("en-IN", options)
    : value;
}

function statusLabel(status) {
  const normalized = String(status || "unknown").toLowerCase();
  if (normalized === "publishing") return "Processing";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function queueStatus(post) {
  const normalized = String(post.status || "unknown").toLowerCase();
  if (normalized === "publishing") return "processing";
  const scheduledTime = parseLocalDateTime(post.scheduled_at);
  if (normalized === "scheduled" && scheduledTime && scheduledTime.getTime() <= Date.now()) {
    return "queued";
  }
  return normalized;
}

function platformIcon(platform) {
  const normalized = String(platform || "").toLowerCase();
  if (normalized === "facebook") return "📘";
  if (normalized === "instagram") return "📷";
  if (normalized === "linkedin") return "💼";
  if (normalized === "twitter" || normalized === "x") return "𝕏";
  return "◉";
}

function PublishingQueue() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchQueue = useCallback(async ({ quiet = false } = {}) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (quiet) setRefreshing(true);

    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [queueResponse, accountsResponse, campaignsResponse] = await Promise.all([
        fetch(`${API_URL}/posts/publishing-queue`, { headers }),
        fetch(`${API_URL}/social-accounts/`, { headers }),
        fetch(`${API_URL}/campaigns`, { headers }),
      ]);

      if ([queueResponse, accountsResponse, campaignsResponse].some((response) => response.status === 401)) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        navigate("/login", { replace: true });
        return;
      }

      const queueData = await queueResponse.json();
      if (!queueResponse.ok) {
        throw new Error(queueData?.detail || "Failed to load the publishing queue.");
      }
      setError("");
      setPosts(Array.isArray(queueData) ? queueData : []);

      if (accountsResponse.ok) {
        const data = await accountsResponse.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
      if (campaignsResponse.ok) {
        const data = await campaignsResponse.json();
        setCampaigns(Array.isArray(data) ? data : []);
      }
    } catch (fetchError) {
      setError(fetchError.message || "Cannot connect to the backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) fetchQueue();
    });
    return () => {
      active = false;
    };
  }, [fetchQueue]);

  const filteredPosts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return [...posts]
      .filter((post) => {
        const matchesStatus = status === "all" || queueStatus(post) === status;
        const matchesSearch = !searchTerm || [post.content, post.platform, post.username, post.campaign_name]
          .some((value) => String(value || "").toLowerCase().includes(searchTerm));
        return matchesStatus
          && matchesSearch
          && (platform === "all" || String(post.platform || "").toLowerCase() === platform)
          && (campaign === "all" || String(post.campaign_id) === campaign)
          && (!date || String(post.scheduled_at || "").slice(0, 10) === date);
      })
      .sort((left, right) => {
        const leftTime = parseLocalDateTime(left.scheduled_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = parseLocalDateTime(right.scheduled_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime || Number(left.id) - Number(right.id);
      });
  }, [posts, search, platform, campaign, status, date]);

  async function runAction(post, action, method = "POST") {
    const prompts = {
      publish: "Publish this post now?",
      cancel: "Cancel this scheduled post?",
      delete: "Permanently delete this post?",
    };
    if (prompts[action] && !window.confirm(prompts[action])) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setNotice("");
    try {
      const endpoint = action === "delete" ? `${API_URL}/posts/${post.id}` : `${API_URL}/posts/${post.id}/${action}`;
      const response = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        navigate("/login", { replace: true });
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Could not ${action} this post.`);
      setNotice(data.message || `Post ${action === "publish" ? "sent for publishing" : `${action}d`} successfully.`);
      await fetchQueue({ quiet: true });
    } catch (actionError) {
      setError(actionError.message || "The action could not be completed.");
    }
  }

  function editPost(post, scheduleMode = false) {
    navigate("/create-post", {
      state: scheduleMode
        ? { editMode: true, rescheduleMode: true, post }
        : { editMode: true, post },
    });
  }

  const queueCount = posts.filter((post) => ["scheduled", "queued"].includes(queueStatus(post))).length;
  const processingCount = posts.filter((post) => ["publishing", "processing"].includes(String(post.status || "").toLowerCase())).length;
  const failedCount = posts.filter((post) => String(post.status || "").toLowerCase() === "failed").length;
  const selectedAccount = selectedPost && accounts.find((item) => String(item.id) === String(selectedPost.social_account_id));
  const selectedAccountPage = selectedAccount?.page_id || selectedAccount?.channel_id;

  if (loading) {
    return <main className="publishing-queue-page"><div className="queue-loading"><span className="queue-spinner" /><h2>Loading publishing queue</h2><p>Fetching your scheduled and pending posts.</p></div></main>;
  }

  return (
    <main className="publishing-queue-page">
      <header className="publishing-queue-header">
        <div><h1>Publishing Queue</h1><p>Review and manage posts waiting to publish.</p></div>
        <button className="queue-refresh-button" type="button" onClick={() => fetchQueue({ quiet: true })} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      {error && <div className="queue-error" role="alert">{error}</div>}
      {notice && <div className="queue-notice" role="status">{notice}</div>}

      <section className="queue-summary" aria-label="Queue summary">
        <div className="queue-summary-card"><span className="queue-summary-icon">◷</span><div><span className="queue-summary-label">Waiting</span><strong>{queueCount}</strong></div></div>
        <div className="queue-summary-card"><span className="queue-summary-icon">↻</span><div><span className="queue-summary-label">Processing</span><strong>{processingCount}</strong></div></div>
        <div className="queue-summary-card"><span className="queue-summary-icon">!</span><div><span className="queue-summary-label">Failed</span><strong>{failedCount}</strong></div></div>
      </section>

      <section className="queue-toolbar" aria-label="Filter publishing queue">
        <label className="queue-search"><span>Search</span><input type="search" placeholder="Content, account, campaign" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label><span>Platform</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="all">All platforms</option>{[...new Set([...accounts.map((account) => account.platform), ...posts.map((post) => post.platform)].filter(Boolean))].sort().map((item) => <option key={item} value={String(item).toLowerCase()}>{item}</option>)}</select></label>
        <label><span>Campaign</span><select value={campaign} onChange={(event) => setCampaign(event.target.value)}><option value="all">All campaigns</option>{campaigns.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></label>
        <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value.toLowerCase())}>{STATUS_OPTIONS.map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}</select></label>
        <label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </section>

      {filteredPosts.length === 0 ? (
        <div className="queue-empty"><span className="queue-empty-icon">◷</span><h2>{posts.length ? "No matching posts" : "Your queue is clear"}</h2><p>{posts.length ? "Try changing or clearing one of the filters." : "Scheduled and pending posts will appear here."}</p></div>
      ) : (
        <div className="publishing-queue-card"><div className="queue-table-wrapper">
          <table className="publishing-queue-table">
            <thead><tr><th>Position</th><th>Platform / account</th><th>Post</th><th>Campaign</th><th>Scheduled</th><th>Status</th><th>Retries</th><th>Actions</th></tr></thead>
            <tbody>{filteredPosts.map((post) => {
              const normalizedStatus = String(post.status || "unknown").toLowerCase();
              const visibleStatus = queueStatus(post);
              const canEdit = !["publishing", "processing", "published"].includes(normalizedStatus);
              const account = accounts.find((item) => String(item.id) === String(post.social_account_id));
              const accountPage = account?.page_id || account?.channel_id;
              const mediaUrl = post.media_url && (post.media_url.startsWith("http") ? post.media_url : `${API_URL}${post.media_url.startsWith("/") ? "" : "/"}${post.media_url}`);
              return <tr key={post.id}>
                <td>{post.queue_position ? <span className="queue-position">#{post.queue_position}</span> : <span className="queue-post-id">-</span>}</td>
                <td><div className="queue-platform"><span className="queue-platform-icon">{platformIcon(post.platform)}</span><span><strong>{post.platform || "Unknown"}</strong><small>{post.username || "Account unavailable"}{accountPage ? ` · Page ${accountPage}` : ""}</small></span></div></td>
                <td><div className="queue-post-preview">{mediaUrl && <img className="queue-media-thumb" src={mediaUrl} alt="Post media" />}{post.content || "No text content"}</div></td>
                <td>{post.campaign_name || <span className="queue-muted">No campaign</span>}</td>
                <td><strong className="queue-date">{formatScheduled(post.scheduled_at, { day: "2-digit", month: "short", year: "numeric" })}</strong><small className="queue-time">{formatScheduled(post.scheduled_at, { hour: "2-digit", minute: "2-digit", hour12: true })}</small></td>
                <td><span className={`queue-status ${visibleStatus}`}>{statusLabel(visibleStatus)}</span></td>
                <td>{post.retry_count || 0}</td>
                <td><div className="queue-row-actions">
                  <button type="button" onClick={() => setSelectedPost(post)}>View</button>
                  {canEdit && <button type="button" onClick={() => editPost(post)}>Edit</button>}
                  {canEdit && <button type="button" onClick={() => editPost(post, true)}>Reschedule</button>}
                  {!["publishing", "processing", "published", "cancelled"].includes(normalizedStatus) && <button type="button" onClick={() => runAction(post, "publish")}>Publish Now</button>}
                  {normalizedStatus === "scheduled" && <button type="button" onClick={() => runAction(post, "cancel")}>Cancel</button>}
                  {normalizedStatus === "failed" && <button type="button" onClick={() => runAction(post, "retry")}>Retry</button>}
                  {!['publishing', 'processing'].includes(normalizedStatus) && <button className="queue-delete-action" type="button" onClick={() => runAction(post, "delete", "DELETE")}>Delete</button>}
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div></div>
      )}

      {selectedPost && <div className="queue-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPost(null); }}>
        <section className="queue-detail-modal" role="dialog" aria-modal="true" aria-labelledby="queue-detail-title">
          <button className="queue-modal-close" type="button" aria-label="Close details" onClick={() => setSelectedPost(null)}>×</button>
          <span className={`queue-status ${queueStatus(selectedPost)}`}>{statusLabel(queueStatus(selectedPost))}</span>
          <h2 id="queue-detail-title">Post details</h2>
          {selectedPost.media_url && <img className="queue-detail-media" src={selectedPost.media_url.startsWith("http") ? selectedPost.media_url : `${API_URL}${selectedPost.media_url.startsWith("/") ? "" : "/"}${selectedPost.media_url}`} alt="Post media" />}
          <p className="queue-detail-content">{selectedPost.content}</p>
          <dl><div><dt>Platform</dt><dd>{selectedPost.platform || "Unknown"} · {selectedPost.username || "Account unavailable"}</dd></div>{selectedAccountPage && <div><dt>Page / channel</dt><dd>{selectedAccountPage}</dd></div>}<div><dt>Campaign</dt><dd>{selectedPost.campaign_name || "No campaign"}</dd></div><div><dt>Scheduled</dt><dd>{formatScheduled(selectedPost.scheduled_at, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</dd></div><div><dt>Queue position</dt><dd>{selectedPost.queue_position || "-"}</dd></div><div><dt>Retry count</dt><dd>{selectedPost.retry_count || 0}</dd></div></dl>
          {selectedPost.error_message && <p className="queue-detail-error">{selectedPost.error_message}</p>}
        </section>
      </div>}
    </main>
  );
}

export default PublishingQueue;