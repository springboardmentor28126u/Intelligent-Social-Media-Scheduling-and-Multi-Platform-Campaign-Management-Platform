import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatusBadge, EmptyState } from "../components/UI";
import "./Analytics.css";

const API_URL = "http://127.0.0.1:8000";
const METRICS = ["likes", "comments", "shares", "clicks", "views", "reach", "impressions"];
const RANGES = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };
const number = (value) => value == null ? "Not tracked" : Number(value).toLocaleString();

function Analytics() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [overview, setOverview] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [audience, setAudience] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [platformBreakdown, setPlatformBreakdown] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [roi, setRoi] = useState(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [filters, setFilters] = useState({ range: "30d", campaign: "all", platform: "all", metric: "reach" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function updateFilters(updater) {
    setLoading(true);
    setError("");
    setFilters(updater);
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/campaigns`, { headers }),
      fetch(`${API_URL}/social-accounts/`, { headers }),
    ])
      .then(async ([campaignResponse, accountResponse]) => {
        if (campaignResponse.status === 401 || accountResponse.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/login", { replace: true });
          return null;
        }
        if (!campaignResponse.ok || !accountResponse.ok) throw new Error("Could not load campaigns and connected accounts.");
        return Promise.all([campaignResponse.json(), accountResponse.json()]);
      })
      .then((data) => {
        if (!data) return;
        setCampaigns(data[0]);
        setPlatforms([...new Set(data[1].map((account) => account.platform).filter(Boolean))]);
      })
      .catch((requestError) => setError(requestError.message));
  }, [navigate]);

  const dates = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Number(filters.range.replace("d", "")) + 1);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }, [filters.range]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const query = new URLSearchParams({ start_date: dates.start, end_date: dates.end });
    if (filters.campaign !== "all") query.set("campaign_id", filters.campaign);
    if (filters.platform !== "all") query.set("platform", filters.platform);
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/analytics/overview?${query}`, { headers }),
      fetch(`${API_URL}/analytics/engagement?${query}&metric=${filters.metric}`, { headers }),
      fetch(`${API_URL}/analytics/audience?${query}`, { headers }),
      fetch(`${API_URL}/analytics/campaigns?${query}`, { headers }),
      fetch(`${API_URL}/analytics/roi${filters.campaign === "all" ? "" : `?campaign_id=${filters.campaign}`}`, { headers }),
    ])
      .then(async (responses) => {
        if (responses.some((response) => response.status === 401)) {
          localStorage.removeItem("access_token");
          navigate("/login", { replace: true });
          return null;
        }
        const failed = responses.find((response) => !response.ok);
        if (failed) throw new Error("Could not load analytics data.");
        return Promise.all(responses.map((response) => response.json()));
      })
      .then((data) => {
        if (!data) return;
        setOverview(data[0]);
        setEngagement(data[1]);
        setAudience(data[2]);
        setPerformance(data[3].campaigns || []);
        setRoi(data[4]);
      })
      .catch((requestError) => setError(requestError.message || "Could not connect to SocialPilot."))
      .finally(() => setLoading(false));
  }, [dates, filters.campaign, filters.metric, filters.platform, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !platforms.length) return;
    let current = true;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all(platforms.map(async (platform) => {
      const query = new URLSearchParams({ start_date: dates.start, end_date: dates.end, platform });
      if (filters.campaign !== "all") query.set("campaign_id", filters.campaign);
      const response = await fetch(`${API_URL}/analytics/overview?${query}`, { headers });
      return response.ok ? { platform, ...(await response.json()) } : null;
    }))
      .then((rows) => { if (current) setPlatformBreakdown(rows.filter(Boolean)); })
      .catch(() => { if (current) setPlatformBreakdown([]); });
    return () => { current = false; };
  }, [dates, filters.campaign, platforms]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    if (!selectedCampaigns.length) {
      return;
    }
    const query = new URLSearchParams();
    selectedCampaigns.forEach((id) => query.append("campaign_ids", id));
    if (filters.platform !== "all") query.set("platform", filters.platform);
    const range = new URLSearchParams({ start_date: dates.start, end_date: dates.end });
    const comparisonQuery = new URLSearchParams(query);
    range.forEach((value, key) => comparisonQuery.set(key, value));
    fetch(`${API_URL}/analytics/comparison?${comparisonQuery}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) return { campaigns: [] };
        return response.json();
      })
      .then((data) => setComparison(data.campaigns || []))
      .catch(() => setComparison([]));
  }, [dates, filters.platform, selectedCampaigns]);

  const timeline = engagement?.timeline || [];
    const comparisonRows = selectedCampaigns.length ? comparison : [];
  const chartMetric = filters.metric;
  const peak = Math.max(1, ...timeline.map((point) => point[chartMetric] || 0));
  const metricLabel = chartMetric.charAt(0).toUpperCase() + chartMetric.slice(1);

  function toggleCampaign(id) {
    setSelectedCampaigns((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return <>
    <div className="workspace-page analytics-page">
      <PageHeader eyebrow="MEASURE PERFORMANCE" title="Analytics" description="Campaign and social performance for the selected period." className="analytics-heading" actions={<span className="metric-source">Estimated engagement metrics</span>} />

      <section className="analytics-filters" aria-label="Analytics filters">
        <label><span>Date range</span><select value={filters.range} onChange={(event) => updateFilters((current) => ({ ...current, range: event.target.value }))}>
          {Object.entries(RANGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label><span>Campaign</span><select value={filters.campaign} onChange={(event) => updateFilters((current) => ({ ...current, campaign: event.target.value }))}>
          <option value="all">All campaigns</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select></label>
        <label><span>Platform</span><select value={filters.platform} onChange={(event) => updateFilters((current) => ({ ...current, platform: event.target.value }))}>
          <option value="all">All platforms</option>{platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
        </select></label>
        <label><span>Metric</span><select value={filters.metric} onChange={(event) => updateFilters((current) => ({ ...current, metric: event.target.value }))}>
          {METRICS.map((metric) => <option key={metric} value={metric}>{metric[0].toUpperCase() + metric.slice(1)}</option>)}
        </select></label>
      </section>

      {error && <p className="analytics-error" role="alert">{error}</p>}
      {loading && <p className="analytics-loading">Updating analytics...</p>}

      <section className="analytics-kpis" aria-label="Performance overview">
        {[["Total reach", overview?.reach], ["Impressions", overview?.impressions], ["Engagement", overview?.engagement], ["Engagement rate", overview ? `${overview.engagement_rate}%` : null], ["Total clicks", overview?.clicks], ["Audience growth", audience?.available ? audience.net_growth : null]].map(([label, value]) => <article className="analytics-kpi" key={label}>
          <span>{label}</span><strong>{typeof value === "string" ? value : number(value)}</strong>
        </article>)}
      </section>

      <section className="analytics-panel engagement-panel">
        <div className="analytics-panel-heading"><div><p className="eyebrow">ENGAGEMENT ANALYTICS</p><h2>{metricLabel} over time</h2></div><span>{RANGES[filters.range]}</span></div>
        {timeline.length ? <div className="timeline-chart" role="img" aria-label={`${metricLabel} over time`}>
          {timeline.map((point) => <div className="timeline-column" key={point.date}>
            <strong>{number(point[chartMetric])}</strong><div className="timeline-track"><span style={{ height: `${Math.max(4, (point[chartMetric] / peak) * 100)}%` }} /></div><small>{point.date.slice(5)}</small>
          </div>)}
        </div> : <p className="analytics-empty">No published post activity for this period.</p>}
        <div className="metric-legend">{METRICS.map((metric) => <button key={metric} className={metric === chartMetric ? "selected" : ""} onClick={() => updateFilters((current) => ({ ...current, metric }))}>{metric}</button>)}</div>
        {timeline.length > 0 && <div className="metric-breakdown" aria-label="All engagement metrics">
          {METRICS.map((metric) => {
            const metricPeak = Math.max(1, ...timeline.map((point) => point[metric] || 0));
            return <article key={metric} className="metric-breakdown-item"><span>{metric}</span><div>{timeline.map((point) => <i key={point.date} title={`${point.date}: ${number(point[metric])}`} style={{ height: `${Math.max(4, (point[metric] / metricPeak) * 100)}%` }} />)}</div></article>;
          })}
        </div>}
      </section>

      <section className="analytics-panel audience-panel">
        <div className="analytics-panel-heading"><div><p className="eyebrow">AUDIENCE</p><h2>Audience growth</h2></div></div>
        <div className="audience-values">
          {[["Current followers", audience?.current_followers], ["New followers", audience?.new_followers], ["Lost followers", audience?.lost_followers], ["Net growth", audience?.net_growth], ["Growth", audience?.growth_percentage == null ? null : `${audience.growth_percentage}%`]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{typeof value === "string" ? value : number(value)}</strong></div>)}
        </div>
        {!audience?.available && <p className="data-note">{audience?.message || "Follower history is not available yet."}</p>}
      </section>

      <section className="analytics-panel performance-panel">
        <div className="analytics-panel-heading"><div><p className="eyebrow">PLATFORM PERFORMANCE</p><h2>Results by platform</h2></div><span>Estimated</span></div>
        {platformBreakdown.length ? <div className="platform-performance-list">{platformBreakdown.map((row) => <article key={row.platform}>
          <div className="platform-performance-heading"><strong>{row.platform}</strong><span>{number(row.reach)} reach</span></div>
          <div className="platform-performance-track"><span style={{ width: `${Math.max(2, (row.reach / Math.max(...platformBreakdown.map((item) => item.reach), 1)) * 100)}%` }} /></div>
          <small>{number(row.impressions)} impressions · {number(row.engagement)} engagement · {number(row.clicks)} clicks</small>
        </article>)}</div> : <p className="analytics-empty">No platform performance data is available for this filter.</p>}
      </section>

      <section className="analytics-panel performance-panel">
        <div className="analytics-panel-heading"><div><p className="eyebrow">CAMPAIGN PERFORMANCE</p><h2>Campaign results</h2></div><span>Published posts only · estimated</span></div>
        <div className="analytics-table-wrap"><table><thead><tr><th>Campaign</th><th>Platform</th><th>Posts</th><th>Reach</th><th>Engagement</th><th>Clicks</th><th>Engagement rate</th><th>Status</th></tr></thead>
          <tbody>{performance.map((row) => <tr key={row.campaign_id}><td>{row.campaign_name}</td><td>{row.platform}</td><td>{row.posts}</td><td>{number(row.reach)}</td><td>{number(row.engagement)}</td><td>{number(row.clicks)}</td><td>{row.engagement_rate}%</td><td><StatusBadge value={row.status} /></td></tr>)}</tbody>
        </table></div>
        {!performance.length && <EmptyState title="No campaign performance" description="No published results match these filters." />}
      </section>

      <section className="analytics-panel comparison-panel">
        <div className="analytics-panel-heading"><div><p className="eyebrow">COMPARE CAMPAIGNS</p><h2>Campaign comparison</h2></div><span>Select campaigns to compare</span></div>
        <div className="campaign-selector">{campaigns.map((campaign) => <label key={campaign.id}><input type="checkbox" checked={selectedCampaigns.includes(campaign.id)} onChange={() => toggleCampaign(campaign.id)} /><span>{campaign.name}</span></label>)}</div>
        <div className="analytics-table-wrap"><table><thead><tr><th>Campaign</th><th>Reach</th><th>Engagement</th><th>Clicks</th><th>Impressions</th><th>Audience growth</th></tr></thead>
          <tbody>{comparisonRows.map((row) => <tr key={row.campaign_id}><td>{row.campaign_name}</td><td>{number(row.reach)}</td><td>{number(row.engagement)}</td><td>{number(row.clicks)}</td><td>{number(row.impressions)}</td><td>{number(row.audience_growth)}</td></tr>)}</tbody>
        </table></div>
        {!comparisonRows.length && <p className="analytics-empty">Select one or more campaigns to compare.</p>}
      </section>

      <section className="analytics-panel roi-panel">
        <div className="analytics-panel-heading"><div><p className="eyebrow">ROI REPORT</p><h2>Campaign costs and returns</h2></div></div>
        {roi?.campaigns?.some((item) => item.campaign_cost != null) ? <div className="analytics-table-wrap"><table><thead><tr><th>Campaign</th><th>Campaign cost</th><th>Revenue</th><th>Profit</th><th>ROI</th></tr></thead><tbody>
          {roi.campaigns.filter((item) => item.campaign_cost != null).map((item) => <tr key={item.campaign_id}><td>{item.campaign_name}</td><td>{Number(item.campaign_cost).toLocaleString()}</td><td>{number(item.revenue)}</td><td>{number(item.profit)}</td><td>{number(item.roi)}</td></tr>)}
        </tbody></table></div> : <p className="analytics-empty">No campaign cost data is available.</p>}
        {!roi?.available && <p className="data-note">{roi?.message || "Revenue tracking is not available yet. ROI will appear when financial data is connected."}</p>}
      </section>
    </div>
  </>;
}

export default Analytics;