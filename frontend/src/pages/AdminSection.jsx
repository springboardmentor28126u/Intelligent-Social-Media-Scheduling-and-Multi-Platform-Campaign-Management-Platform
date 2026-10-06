import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import "./AdminSection.css";

const API_URL = "http://127.0.0.1:8000";
const resourceBySection = {
  users: "users",
  campaigns: "campaigns",
  posts: "posts",
  "publishing-queue": "queue",
  "publishing-logs": "logs",
  "social-accounts": "social-accounts",
  notifications: "logs",
};

const sectionInfo = {
  users: { title: "User management", eyebrow: "PEOPLE", description: "Review registered accounts and their assigned roles.", columns: [["name", "User"], ["email", "Email"], ["role", "Role"], ["status", "Account status"]], filter: "role" },
  campaigns: { title: "Campaigns", eyebrow: "WORKFLOWS", description: "Search and review campaigns across all workspace accounts.", columns: [["name", "Campaign"], ["owner", "Owner"], ["start_date", "Start date"], ["end_date", "End date"], ["posts", "Posts"], ["status", "Status"]] },
  posts: { title: "Posts", eyebrow: "CONTENT", description: "Review content and publishing state across the platform.", columns: [["content", "Post"], ["owner", "Owner"], ["platform", "Platform"], ["campaign", "Campaign"], ["scheduled_at", "Scheduled"], ["status", "Status"]] },
  "publishing-queue": { title: "Publishing queue", eyebrow: "PUBLISHING", description: "Scheduled and processing posts across all users.", columns: [["content", "Post"], ["owner", "Owner"], ["platform", "Platform"], ["campaign", "Campaign"], ["scheduled_at", "Scheduled"], ["status", "Status"]] },
  "publishing-logs": { title: "Publishing logs", eyebrow: "PUBLISHING", description: "Recent publishing outcomes recorded by the platform.", columns: [["post_id", "Post ID"], ["owner", "User"], ["platform", "Platform"], ["occurred_at", "Date"], ["status", "Status"]] },
  "social-accounts": { title: "Social accounts", eyebrow: "CONNECTED CHANNELS", description: "Connected platform accounts. Credentials are never exposed.", columns: [["platform", "Platform"], ["username", "Account"], ["owner", "Owner"], ["status", "Connection"]] },
  notifications: { title: "Notifications", eyebrow: "OPERATIONS", description: "Publishing failures requiring administrator attention.", columns: [["post_id", "Post ID"], ["owner", "User"], ["platform", "Platform"], ["occurred_at", "Date"], ["status", "Status"]] },
};

function tone(status) {
  const value = String(status || "").toLowerCase();
  if (["published", "active", "connected", "operational", "completed"].includes(value)) return "good";
  if (["failed", "error", "disconnected"].includes(value)) return "bad";
  if (["warning", "processing", "publishing"].includes(value)) return "warn";
  return "neutral";
}

function formatValue(key, value) {
  if (value == null || value === "") return "—";
  if (["scheduled_at", "occurred_at"].includes(key)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }
  if (["start_date", "end_date"].includes(key)) return new Date(`${value}T12:00:00`).toLocaleDateString();
  return value;
}

function AdminSection() {
  const { section = "analytics" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const info = sectionInfo[section];
  const resource = resourceBySection[section];
  const [items, setItems] = useState([]);
  const [overview, setOverview] = useState(null);
  const [total, setTotal] = useState(0);
  const search = searchParams.get("search") || "";
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (filter) params.set(section === "users" ? "role" : "status", filter);
        if (section === "notifications") params.set("status", "failed");
        const endpoint = resource ? `/admin/${resource}?${params}` : "/admin/overview";
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not load this admin view.");
        if (resource) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        } else {
          setOverview(data);
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message || "Could not connect to the SocialPilot API.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [filter, resource, search, section]);

  const title = info?.title || ({ analytics: "Global analytics", reports: "Admin reports", settings: "System status" }[section] || "Admin center");

  return <main className="admin-section-page">
    <div className="admin-section-heading"><div><p className="admin-eyebrow">{info?.eyebrow || "ADMINISTRATION"}</p><h2>{title}</h2><p>{info?.description || "System-wide reporting and operational visibility."}</p></div>
      <Link className="admin-section-back" to="/admin">← Overview</Link>
    </div>

    {info && <section className="admin-section-panel">
      <div className="admin-section-toolbar"><div><strong>{total.toLocaleString()}</strong><span>{section === "users" ? "registered users" : "records"}</span></div><div className="admin-section-controls">
        <label className="admin-search-box"><span aria-hidden="true">⌕</span><input aria-label={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={(event) => { const params = new URLSearchParams(searchParams); const value = event.target.value; if (value) params.set("search", value); else params.delete("search"); setSearchParams(params, { replace: true }); }} /></label>
        <select aria-label={section === "users" ? "Filter by role" : "Filter by status"} value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All {section === "users" ? "roles" : "statuses"}</option>
          {section === "users" ? <><option value="ADMIN">Admin</option><option value="USER">User</option></> : section === "campaigns" ? <>{["Draft", "Scheduled", "Active", "Paused", "Completed", "Archived"].map((status) => <option key={status} value={status}>{status}</option>)}</> : section === "social-accounts" ? <><option value="connected">Connected</option><option value="disconnected">Disconnected</option></> : <>{["draft", "scheduled", "publishing", "published", "failed", "cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}</>}
        </select>
      </div></div>
      {error && <div className="admin-section-error" role="alert">{error}</div>}
      {loading ? <div className="admin-section-empty" role="status">Loading {title.toLowerCase()}...</div> : items.length === 0 ? <div className="admin-section-empty">{section === "notifications" ? "No publishing failures are recorded." : "No matching records."}</div> : <div className="admin-section-table-wrap"><table className="admin-section-table"><thead><tr>{info.columns.map(([key, label]) => <th key={key}>{label}</th>)}<th>Details</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>{info.columns.map(([key]) => <td key={key}>{key === "status" || key === "role" ? <span className={`admin-badge ${key === "role" && item[key] === "ADMIN" ? "badge-purple" : `badge-${tone(item[key])}`}`}>{item[key]}</span> : <span className={key === "content" || key === "name" ? "admin-cell-strong" : ""}>{formatValue(key, item[key])}</span>}</td>)}<td><button type="button" className="admin-detail-button" onClick={() => setSelected(item)}>View</button></td></tr>)}</tbody></table></div>}
      {!loading && total > items.length && <p className="admin-section-limit">Showing {items.length} of {total.toLocaleString()} records.</p>}
      {section === "users" && <p className="admin-section-footnote">Account activation and last-activity fields are not available in the current database schema.</p>}
    </section>}

    {!info && section === "settings" && overview && <section className="admin-section-panel admin-status-panel"><p className="admin-eyebrow">SERVICE HEALTH</p>{Object.entries(overview.system_status).map(([name, status]) => <div className="admin-section-status" key={name}><span>{name.replaceAll("_", " ")}</span><span className={`admin-badge badge-${tone(status)}`}>{status}</span></div>)}<p className="admin-section-footnote">Publishing-worker and external social API health checks are not configured.</p></section>}

    {!info && ["analytics", "reports"].includes(section) && overview && <section className="admin-insights-grid">
      <article className="admin-section-panel"><p className="admin-eyebrow">PLATFORM TOTALS</p><h3>{section === "reports" ? "Operational report" : "Global activity"}</h3><div className="admin-insight-stats">{[["Users", overview.summary.total_users], ["Campaigns", overview.summary.total_campaigns], ["Posts", overview.summary.total_posts], ["Connected accounts", overview.summary.connected_accounts]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{Number(value).toLocaleString()}</strong></div>)}</div></article>
      <article className="admin-section-panel"><p className="admin-eyebrow">METRIC AVAILABILITY</p><h3>Social performance data</h3><p className="admin-section-footnote">Reach, impressions, engagement, clicks, audience growth and revenue are not currently persisted by the connected platform APIs. This view does not estimate or fabricate those metrics.</p><Link className="admin-text-link" to="/admin/reports">View report details →</Link></article>
    </section>}

    {error && !info && <div className="admin-section-error" role="alert">{error}</div>}
    {loading && !info && !error && <section className="admin-section-panel admin-section-empty" role="status">Loading system data...</section>}

    {selected && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="admin-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-detail-title"><div className="admin-detail-heading"><div><p className="admin-eyebrow">RECORD DETAILS</p><h3 id="admin-detail-title">{selected.name || selected.content || selected.platform || `Record #${selected.id}`}</h3></div><button type="button" aria-label="Close details" onClick={() => setSelected(null)}>×</button></div><dl>{Object.entries(selected).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{formatValue(key, value)}</dd></div>)}</dl></section></div>}
  </main>;
}

export default AdminSection;