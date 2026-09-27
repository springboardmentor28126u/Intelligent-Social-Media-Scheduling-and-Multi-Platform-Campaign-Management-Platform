import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Campaigns.css";
import "./CampaignWorkspace.css";
import "./Dashboard.css";

const API_URL = "http://127.0.0.1:8000";
const STATUSES = ["Draft", "Scheduled", "Active", "Paused", "Completed", "Archived"];

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function getPostCount(campaign) {
  return campaign.number_of_posts ?? campaign.post_count ?? campaign.posts?.length ?? 0;
}

function emptyForm() {
  return {
    name: "",
    objective: "",
    status: "Draft",
    start_date: "",
    end_date: "",
    budget: "",
  };
}

function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "", objective: "", start_date: "", end_date: "" });
  const [analytics, setAnalytics] = useState({ summary: {}, metrics: {}, performance: [] });
  const [comparison, setComparison] = useState({ summary: {}, comparison: [] });
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);

  const handleUnauthorized = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  const fetchCampaigns = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setLoading(true);
      setError("");
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [response, analyticsResponse, comparisonResponse] = await Promise.all([
        fetch(`${API_URL}/campaigns?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/campaigns/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/campaigns/analytics/comparison`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to load campaigns.");
      }
      setCampaigns(data);
      if (analyticsResponse.ok) setAnalytics(await analyticsResponse.json());
      if (comparisonResponse.ok) setComparison(await comparisonResponse.json());
    } catch (requestError) {
      setError(requestError.message || "Unable to load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  const toggleCompareCampaign = (campaignId) => {
    setSelectedCompareIds((current) => {
      const exists = current.includes(campaignId);
      const next = exists ? current.filter((id) => id !== campaignId) : [...current, campaignId];
      return next;
    });
  };

  const compareSelectedCampaigns = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      handleUnauthorized();
      return;
    }

    if (selectedCompareIds.length === 0) {
      setComparison({ summary: {}, comparison: [] });
      return;
    }

    try {
      const params = new URLSearchParams();
      selectedCompareIds.forEach((id) => params.append("campaign_ids", String(id)));
      const response = await fetch(`${API_URL}/campaigns/analytics/comparison?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to compare campaigns.");
      }
      setComparison(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to compare campaigns.");
    }
  };

  useEffect(() => {
    // Data loading is intentionally started after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditor = (campaign) => {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name || "",
      objective: campaign.objective || "",
      status: campaign.status || "Draft",
      start_date: campaign.start_date || "",
      end_date: campaign.end_date || "",
      budget: campaign.budget ?? "",
    });
  };

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveCampaign = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        budget: form.budget === "" ? null : form.budget,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      const response = await fetch(`${API_URL}/campaigns/${editingCampaign.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to update campaign.");
      }
      setCampaigns((current) => current.map((item) => (item.id === data.id ? data : item)));
      setEditingCampaign(null);
    } catch (requestError) {
      setError(requestError.message || "Unable to update campaign.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCampaign = async (campaign) => {
    if (!window.confirm(`Delete ${campaign.name}?`)) {
      return;
    }

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`${API_URL}/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Unable to delete campaign.");
      }
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign(null);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to delete campaign.");
    }
  };

  return (
    <div className="dashboard-page campaigns-dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">🚀 SocialPilot</div>
        <nav className="sidebar-nav">
          <button className="sidebar-item" type="button" onClick={() => navigate("/dashboard")}>📊 <span>Analytics</span></button>
          <button className="sidebar-item" type="button" onClick={() => navigate("/social-accounts")}>👥 <span>Social Accounts</span></button>
          <button className="sidebar-item" type="button" onClick={() => navigate("/posts")}>📝 <span>My Posts</span></button>
          <button className="sidebar-item" type="button" onClick={() => navigate("/create-post")}>➕ <span>Create Post</span></button>
          <button className="sidebar-item" type="button" onClick={() => navigate("/calendar")}>📅 <span>Publishing Calendar</span></button>
          <button className="sidebar-item active" type="button" onClick={() => navigate("/campaigns")}>🎯 <span>Campaigns</span></button>
          <button className="sidebar-item" type="button" onClick={() => navigate("/publishing-logs")}>📋 <span>Publishing Logs</span></button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-logout" type="button" onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("role"); navigate("/login"); }}>🚪 <span>Logout</span></button>
        </div>
      </aside>
      <main className="campaigns-page">
      <section className="campaigns-shell">
        <header className="campaigns-header">
          <div>
            <p className="campaigns-eyebrow">Planning workspace</p>
            <h1>Campaigns</h1>
            <p className="campaigns-subtitle">Keep every launch, audience, and objective in view.</p>
          </div>
          <div className="campaigns-header-actions">
            <button className="campaigns-back-button" type="button" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </button>
            <button className="campaigns-create-button" type="button" onClick={() => navigate("/campaigns/create")}>
              Create Campaign
            </button>
          </div>
        </header>

        {error && <div className="campaigns-alert" role="alert">{error}</div>}

        <section className="campaign-dashboard-summary" aria-label="Campaign dashboard summary">
          {[["Total Campaigns", analytics.summary.total_campaigns], ["Active Campaigns", analytics.summary.active_campaigns], ["Scheduled Campaigns", analytics.summary.scheduled_campaigns], ["Completed Campaigns", analytics.summary.completed_campaigns], ["Total Posts", analytics.summary.total_posts], ["Total Engagement", analytics.summary.total_engagement]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value ?? 0}</strong></article>)}
        </section>

        <section className="campaign-analytics-panel">
          <div className="campaigns-panel-heading"><div><h2>Campaign analytics</h2><span>Provider engagement insights</span></div></div>
          <div className="campaign-metric-grid">
            {[["Reach", analytics.metrics.reach], ["Impressions", analytics.metrics.impressions], ["Views", analytics.metrics.views], ["Likes", analytics.metrics.likes], ["Comments", analytics.metrics.comments], ["Shares", analytics.metrics.shares], ["Clicks", analytics.metrics.clicks], ["Engagement Rate", `${analytics.metrics.engagement_rate ?? 0}%`]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? 0}</strong></div>)}
          </div>
          <div className="campaign-performance-chart" aria-label="Campaign performance chart">
            {analytics.performance.map((item) => <div className="performance-bar" key={item.campaign_id}><div><span>{item.name}</span><strong>{item.published_posts}/{item.posts}</strong></div><i style={{ "--bar-size": `${item.posts ? Math.max(8, (item.published_posts / item.posts) * 100) : 8}%` }} /></div>)}
          </div>
        </section>

        <section className="campaign-analytics-panel" aria-label="Campaign ROI comparison panel">
          <div className="campaigns-panel-heading">
            <div>
              <h2>ROI &amp; campaign comparison</h2>
              <span>{comparison.summary.total_campaigns ?? 0} campaign{(comparison.summary.total_campaigns ?? 0) === 1 ? "" : "s"}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button className="campaigns-refresh-button" type="button" onClick={compareSelectedCampaigns} disabled={selectedCompareIds.length === 0}>
                Compare selected
              </button>
            </div>
          </div>
          <div className="campaign-metric-grid">
            {[["Total Cost", `₹${Number(comparison.summary.total_cost ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`], ["Total Revenue", `₹${Number(comparison.summary.total_revenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`], ["Average ROI", `${Number(comparison.summary.average_roi ?? 0).toFixed(2)}%`], ["Best Campaign", comparison.summary.best_campaign?.name || "N/A"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? 0}</strong></div>)}
          </div>
          <div className="campaign-performance-chart" aria-label="Campaign ROI comparison chart">
            {comparison.comparison.map((item) => {
              const maxRoi = Math.max(...comparison.comparison.map((entry) => Number(entry.roi || 0)), 1);
              const width = Math.max(12, (Number(item.roi || 0) / maxRoi) * 100);
              return (
                <div className="performance-bar" key={item.campaign_id}>
                  <div>
                    <span>{item.name}</span>
                    <strong>{Number(item.roi || 0).toFixed(2)}% ROI</strong>
                  </div>
                  <i style={{ "--bar-size": `${Math.min(100, width)}%` }} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "18px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#dfeae6", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #20433e" }}>
                  <th style={{ textAlign: "left", padding: "10px 8px", color: "#6f9289" }}>Campaign</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", color: "#6f9289" }}>Cost</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", color: "#6f9289" }}>Revenue</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", color: "#6f9289" }}>ROI</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", color: "#6f9289" }}>Reach</th>
                </tr>
              </thead>
              <tbody>
                {comparison.comparison.map((item) => (
                  <tr key={item.campaign_id} style={{ borderBottom: "1px solid rgba(32, 67, 62, 0.6)" }}>
                    <td style={{ padding: "8px 8px" }}>{item.name}</td>
                    <td style={{ textAlign: "right", padding: "8px 8px" }}>₹{Number(item.cost || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: "right", padding: "8px 8px" }}>₹{Number(item.revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: "right", padding: "8px 8px" }}>{Number(item.roi || 0).toFixed(2)}%</td>
                    <td style={{ textAlign: "right", padding: "8px 8px" }}>{Number(item.reach || 0).toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="campaigns-panel" aria-label="Campaign list">
          <div className="campaigns-panel-heading">
            <div>
              <h2>All campaigns</h2>
              <span>{campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}</span>
            </div>
            <button className="campaigns-refresh-button" type="button" onClick={fetchCampaigns}>
              Refresh
            </button>
          </div>
          <div className="campaign-filters">
            <input name="search" value={filters.search} onChange={updateFilter} placeholder="Search Campaign" />
            <select name="status" value={filters.status} onChange={updateFilter}><option value="">Status</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
            <input name="objective" value={filters.objective} onChange={updateFilter} placeholder="Objective" />
            <input name="start_date" type="date" value={filters.start_date} onChange={updateFilter} aria-label="Start Date" />
            <input name="end_date" type="date" value={filters.end_date} onChange={updateFilter} aria-label="End Date" />
            <button className="campaigns-refresh-button" type="button" onClick={fetchCampaigns}>Apply filters</button>
          </div>

          {loading ? (
            <div className="campaigns-state">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="campaigns-state campaigns-empty">
              <strong>No campaigns yet</strong>
              <span>Your campaigns will appear here once they are created.</span>
            </div>
          ) : (
            <div className="campaigns-table-wrap">
              <table className="campaigns-table">
                <thead>
                  <tr>
                    <th style={{ width: "48px" }}>Compare</th>
                    <th>Campaign name</th>
                    <th>Objective</th>
                    <th>Status</th>
                    <th>Start date</th>
                    <th>End date</th>
                    <th>Posts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedCompareIds.includes(campaign.id)}
                          onChange={() => toggleCompareCampaign(campaign.id)}
                          aria-label={`Select ${campaign.name} for comparison`}
                        />
                      </td>
                      <td className="campaign-name-cell">{campaign.name}</td>
                      <td className="campaign-objective-cell">{campaign.objective || "No objective"}</td>
                      <td><span className={`campaign-status ${campaign.status?.toLowerCase()}`}>{campaign.status}</span></td>
                      <td>{formatDate(campaign.start_date)}</td>
                      <td>{formatDate(campaign.end_date)}</td>
                      <td className="campaign-post-count">{getPostCount(campaign)}</td>
                      <td>
                        <div className="campaign-actions">
                          <button type="button" onClick={() => navigate(`/campaigns/${campaign.id}`)}>View</button>
                          <button type="button" onClick={() => openEditor(campaign)}>Edit</button>
                          <button className="danger-action" type="button" onClick={() => deleteCampaign(campaign)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {selectedCampaign && (
        <div className="campaign-modal-backdrop" role="presentation" onClick={() => setSelectedCampaign(null)}>
          <section className="campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-view-title" onClick={(event) => event.stopPropagation()}>
            <div className="campaign-modal-header">
              <div>
                <p className="campaigns-eyebrow">Campaign details</p>
                <h2 id="campaign-view-title">{selectedCampaign.name}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setSelectedCampaign(null)} aria-label="Close details">×</button>
            </div>
            <dl className="campaign-detail-grid">
              <div><dt>Objective</dt><dd>{selectedCampaign.objective || "-"}</dd></div>
              <div><dt>Status</dt><dd>{selectedCampaign.status}</dd></div>
              <div><dt>Start date</dt><dd>{formatDate(selectedCampaign.start_date)}</dd></div>
              <div><dt>End date</dt><dd>{formatDate(selectedCampaign.end_date)}</dd></div>
              <div><dt>Number of posts</dt><dd>{getPostCount(selectedCampaign)}</dd></div>
            </dl>
          </section>
        </div>
      )}

      {editingCampaign && (
        <div className="campaign-modal-backdrop" role="presentation" onClick={() => setEditingCampaign(null)}>
          <form className="campaign-modal campaign-edit-form" onSubmit={saveCampaign} onClick={(event) => event.stopPropagation()}>
            <div className="campaign-modal-header">
              <div>
                <p className="campaigns-eyebrow">Campaign editor</p>
                <h2>Edit campaign</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setEditingCampaign(null)} aria-label="Close editor">×</button>
            </div>
            <label>Campaign name<input name="name" value={form.name} onChange={updateForm} required maxLength="150" /></label>
            <label>Objective<textarea name="objective" value={form.objective} onChange={updateForm} rows="3" /></label>
            <div className="campaign-form-grid">
              <label>Status<select name="status" value={form.status} onChange={updateForm}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Budget<input name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={updateForm} /></label>
              <label>Start date<input name="start_date" type="date" value={form.start_date} onChange={updateForm} /></label>
              <label>End date<input name="end_date" type="date" value={form.end_date} onChange={updateForm} /></label>
            </div>
            <div className="campaign-form-actions">
              <button className="campaign-cancel-button" type="button" onClick={() => setEditingCampaign(null)}>Cancel</button>
              <button className="campaign-save-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
      </main>
    </div>
  );
}

export default Campaigns;