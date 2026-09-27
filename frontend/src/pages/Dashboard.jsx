import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const METRIC_OPTIONS = [
  { value: "reach", label: "Reach" },
  { value: "impressions", label: "Impressions" },
  { value: "likes", label: "Likes" },
  { value: "comments", label: "Comments" },
  { value: "shares", label: "Shares" },
  { value: "clicks", label: "Clicks" },
  { value: "views", label: "Views" },
];

const DATE_RANGE_OPTIONS = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const SAMPLE_TIMELINE = [
  { label: "Sep 01", reach: 2100, impressions: 4200, likes: 340, comments: 82, shares: 98, clicks: 120, views: 1600 },
  { label: "Sep 08", reach: 2250, impressions: 4550, likes: 370, comments: 88, shares: 106, clicks: 140, views: 1725 },
  { label: "Sep 15", reach: 2480, impressions: 4800, likes: 390, comments: 96, shares: 118, clicks: 168, views: 1860 },
  { label: "Sep 22", reach: 2730, impressions: 5260, likes: 430, comments: 108, shares: 132, clicks: 182, views: 2045 },
];

const SAMPLE_GROWTH = [
  { label: "Sep 01", followers: 2100 },
  { label: "Sep 08", followers: 2250 },
  { label: "Sep 15", followers: 2480 },
  { label: "Sep 22", followers: 2730 },
];

function formatCompactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  const amount = Number(value);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
}

function Dashboard() {

  const [stats, setStats] = useState(null);
  const [campaignData, setCampaignData] = useState({ summary: {}, metrics: {}, performance: [] });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    dateRange: "30d",
    campaign: "all",
    platform: "all",
    post: "all",
    metric: "reach",
  });

  const navigate = useNavigate();

  // Get login token
  const token = localStorage.getItem("access_token");


  // =====================================================
  // FETCH DASHBOARD STATISTICS
  // =====================================================

  const fetchStats = async () => {

    try {

      setLoading(true);
      setError("");

      const [statsResponse, campaignsResponse, analyticsResponse] = await Promise.all([
        fetch("http://127.0.0.1:8000/dashboard/stats", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch("http://127.0.0.1:8000/campaigns", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://127.0.0.1:8000/campaigns/analytics/overview", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsResponse.status === 401 || campaignsResponse.status === 401 || analyticsResponse.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login", { replace: true });
        return;
      }

      const statsData = await statsResponse.json();
      const campaignsData = campaignsResponse.ok ? await campaignsResponse.json() : [];
      const analyticsData = analyticsResponse.ok ? await analyticsResponse.json() : { summary: {}, metrics: {}, performance: [] };

      if (!statsResponse.ok) {
        setError(statsData.detail || "Failed to load dashboard.");
        return;
      }

      setStats(statsData);
      setCampaigns(campaignsData);
      setCampaignData(analyticsData);

    } catch (error) {

      console.error("Dashboard error:", error);

      setError(
        "Cannot connect to the backend. Please make sure FastAPI is running."
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // CHECK LOGIN + FETCH DATA
  // =====================================================

  useEffect(() => {

    if (!token) {

      navigate("/login", { replace: true });

      return;
    }

    fetchStats();

  }, [token, navigate]);

  const dateRangeMultiplier = {
    "7d": 0.75,
    "30d": 1,
    "90d": 1.35,
  }[filters.dateRange] ?? 1;

  const selectedMetricData = SAMPLE_TIMELINE.map((point) => ({
    label: point.label,
    value: Math.round(point[filters.metric] * dateRangeMultiplier),
  }));

  const growthSeries = SAMPLE_GROWTH.map((point) => ({
    label: point.label,
    value: Math.round(point.followers * dateRangeMultiplier),
  }));

  const activeCampaignCount = campaignData.summary?.total_campaigns ?? campaigns.length ?? 0;
  const totalReach = campaignData.metrics?.reach ?? 0;
  const totalEngagement = campaignData.summary?.total_engagement ?? stats?.published_posts ?? 0;
  const metricLabel = METRIC_OPTIONS.find((option) => option.value === filters.metric)?.label || "Reach";

  const topCampaigns = (campaignData.performance?.length ? campaignData.performance : [
    { campaign_id: 1, name: "Spring Launch", published_posts: 7, posts: 8 },
    { campaign_id: 2, name: "Brand Refresh", published_posts: 5, posts: 6 },
    { campaign_id: 3, name: "Holiday Push", published_posts: 6, posts: 8 },
  ]).slice(0, 3);


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="dashboard-loading">

        <div className="loading-spinner"></div>

        <h2>
          Loading Analytics Dashboard...
        </h2>

        <p>
          Please wait while we load your statistics.
        </p>

      </div>

    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {

    return (

      <div className="dashboard-error-page">

        <div className="error-card">

          <div className="error-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Dashboard
          </h2>

          <p>
            {error}
          </p>

          <div className="error-buttons">

            <button
              onClick={fetchStats}
              className="retry-button"
            >
              Try Again
            </button>

            <button
              onClick={() => navigate("/login")}
              className="logout-button"
            >
              Go to Login
            </button>

          </div>

        </div>

      </div>

    );

  }


  // =====================================================
  // DASHBOARD
  // =====================================================

  return (

    <div className="dashboard-page">


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="dashboard-sidebar">

        <div className="dashboard-logo">
          🚀 SocialPilot
        </div>


        <nav className="sidebar-nav">


          {/* ANALYTICS */}

          <button
            className="sidebar-item active"
            onClick={() => navigate("/dashboard")}
          >

            📊

            <span>
              Analytics
            </span>

          </button>


          {/* SOCIAL ACCOUNTS */}

          <button
            className="sidebar-item"
            onClick={() => navigate("/social-accounts")}
          >

            👥

            <span>
              Social Accounts
            </span>

          </button>


          {/* MY POSTS */}

          <button
            className="sidebar-item"
            onClick={() => navigate("/posts")}
          >

            📝

            <span>
              My Posts
            </span>

          </button>


          {/* CREATE POST */}

          <button
            className="sidebar-item"
            onClick={() => navigate("/create-post")}
          >

            ➕

            <span>
              Create Post
            </span>

          </button>


          {/* PUBLISHING CALENDAR */}

          <button
            className="sidebar-item"
            onClick={() => navigate("/calendar")}
          >

            📅

            <span>
              Publishing Calendar
            </span>

          </button>

          {/* CAMPAIGNS */}

          <button
            className="sidebar-item"
            onClick={() => navigate("/campaigns")}
          >

            🎯

            <span>
              Campaigns
            </span>

          </button>






          <button
          className="quick-action-card"
          onClick={() => navigate("/publishing-queue")}
          >

          <div className="quick-action-icon">
          ⏳
          </div>

          <div>

          <h3>
          Publishing Queue
          </h3>

          <p>
          View posts waiting to be published
         </p>

        </div>

        <span>
         →
       </span>

       </button>


          {/* PUBLISHING LOGS */}

          <button
            className="sidebar-item"
            onClick={() => navigate("/publishing-logs")}
          >

            📋

            <span>
              Publishing Logs
            </span>

          </button>


        </nav>


        {/* LOGOUT */}

        <div className="sidebar-bottom">

          <button
            className="sidebar-logout"
            onClick={() => {

              localStorage.removeItem("access_token");

              navigate("/login", {
                replace: true
              });

            }}
          >

            🚪

            <span>
              Logout
            </span>

          </button>

        </div>

      </aside>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="dashboard-main">


        {/* =================================================
            HEADER
        ================================================= */}

        <header className="dashboard-header">

          <div>

            <p className="dashboard-welcome">
              Welcome back 👋
            </p>

            <h1>
               Dashboard
            </h1>

            <p className="dashboard-subtitle">
              Monitor your social media activity from one place.
            </p>

          </div>


          <button
            className="create-post-header-button"
            onClick={() => navigate("/create-post")}
          >
            + Create Post
          </button>

        </header>


        <section className="analytics-module">
          <div className="analytics-module-header">
            <div>
              <p className="dashboard-welcome">Campaign analytics</p>
              <h2>Analytics Dashboard</h2>
            </div>
            <button type="button" className="create-post-header-button analytics-export-button">Export Report</button>
          </div>

          <div className="analytics-filters" aria-label="Analytics filters">
            <label>
              <span>Date range</span>
              <select value={filters.dateRange} onChange={(event) => setFilters((current) => ({ ...current, dateRange: event.target.value }))}>
                {Object.entries(DATE_RANGE_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Campaign</span>
              <select value={filters.campaign} onChange={(event) => setFilters((current) => ({ ...current, campaign: event.target.value }))}>
                <option value="all">All campaigns</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Platform</span>
              <select value={filters.platform} onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value }))}>
                <option value="all">All platforms</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
              </select>
            </label>
            <label>
              <span>Post</span>
              <select value={filters.post} onChange={(event) => setFilters((current) => ({ ...current, post: event.target.value }))}>
                <option value="all">All posts</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label>
              <span>Metric</span>
              <select value={filters.metric} onChange={(event) => setFilters((current) => ({ ...current, metric: event.target.value }))}>
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="analytics-summary-grid">
            <article className="analytics-summary-card">
              <span>Campaigns</span>
              <strong>{activeCampaignCount}</strong>
            </article>
            <article className="analytics-summary-card">
              <span>Reach</span>
              <strong>{formatCompactNumber(totalReach)}</strong>
            </article>
            <article className="analytics-summary-card">
              <span>Engagement</span>
              <strong>{formatCompactNumber(totalEngagement)}</strong>
            </article>
            <article className="analytics-summary-card">
              <span>{metricLabel}</span>
              <strong>{formatCompactNumber(selectedMetricData.reduce((sum, point) => sum + point.value, 0))}</strong>
            </article>
          </div>

          <div className="analytics-chart-grid">
            <article className="analytics-chart-card analytics-chart-wide">
              <div className="analytics-chart-header">
                <div>
                  <p>Engagement Over Time</p>
                  <h3>{metricLabel}</h3>
                </div>
                <span>{DATE_RANGE_OPTIONS[filters.dateRange]}</span>
              </div>
              <div className="analytics-bars" aria-label="Engagement trend chart">
                {selectedMetricData.map((point) => (
                  <div key={point.label} className="analytics-bar-group">
                    <span className="analytics-bar-value">{formatCompactNumber(point.value)}</span>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ height: `${Math.max(18, (point.value / Math.max(...selectedMetricData.map((item) => item.value), 1)) * 100)}%` }} />
                    </div>
                    <label>{point.label}</label>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-chart-card">
              <div className="analytics-chart-header">
                <div>
                  <p>Audience Growth</p>
                  <h3>Followers</h3>
                </div>
                <span>{growthSeries[growthSeries.length - 1]?.value ?? 0}</span>
              </div>
              <div className="analytics-line-chart" aria-label="Audience growth chart">
                {growthSeries.map((point, index) => (
                  <div key={point.label} className="analytics-line-point" style={{ '--offset': `${(index / Math.max(growthSeries.length - 1, 1)) * 100}%` }}>
                    <span className="analytics-dot" />
                    <label>{point.label}</label>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="analytics-bottom-row">
            <article className="analytics-list-card">
              <div className="analytics-chart-header">
                <div>
                  <p>Top Performing Campaigns</p>
                  <h3>Performance snapshot</h3>
                </div>
              </div>
              <div className="campaign-rank-list">
                {topCampaigns.map((campaign, index) => (
                  <div key={campaign.campaign_id ?? campaign.name} className="campaign-rank-item">
                    <div className="campaign-rank-badge">#{index + 1}</div>
                    <div>
                      <strong>{campaign.name}</strong>
                      <small>{campaign.published_posts || 0}/{campaign.posts || 0} published</small>
                    </div>
                    <span>{Math.round(((campaign.published_posts || 0) / Math.max(campaign.posts || 1, 1)) * 100)}%</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-list-card">
              <div className="analytics-chart-header">
                <div>
                  <p>Campaign Health</p>
                  <h3>Quick signals</h3>
                </div>
              </div>
              <ul className="analytics-health-list">
                <li><span>Reach efficiency</span><strong>{Math.max(0, Math.min(100, Math.round((totalReach / Math.max(stats?.total_posts || 1, 1)) * 3)))}%</strong></li>
                <li><span>Engagement rate</span><strong>{Math.min(100, Math.round((totalEngagement / Math.max(totalReach || 1, 1)) * 100))}%</strong></li>
                <li><span>Campaign velocity</span><strong>{Math.max(0, Math.min(100, Math.round(((campaigns.length || 1) / Math.max(stats?.total_posts || 1, 1)) * 100)))}%</strong></li>
              </ul>
            </article>
          </div>
        </section>

        {/* =================================================
            STATISTICS CARDS
        ================================================= */}

        <section className="stats-grid">


          {/* CONNECTED ACCOUNTS */}

          <div className="analytics-card">

            <div className="analytics-card-top">

              <div className="analytics-icon accounts-icon">
                👥
              </div>

              <span className="analytics-badge">
                Active
              </span>

            </div>

            <p className="analytics-label">
              Connected Accounts
            </p>

            <h2 className="analytics-number">
              {stats.connected_accounts ?? 0}
            </h2>

            <p className="analytics-description">
              Social media accounts connected
            </p>

          </div>


          {/* TOTAL POSTS */}

          <div className="analytics-card">

            <div className="analytics-card-top">

              <div className="analytics-icon posts-icon">
                📝
              </div>

              <span className="analytics-badge">
                Total
              </span>

            </div>

            <p className="analytics-label">
              Total Posts
            </p>

            <h2 className="analytics-number">
              {stats.total_posts ?? 0}
            </h2>

            <p className="analytics-description">
              Posts created in your account
            </p>

          </div>


          {/* SCHEDULED */}

          <div className="analytics-card">

            <div className="analytics-card-top">

              <div className="analytics-icon scheduled-icon">
                📅
              </div>

              <span className="analytics-badge">
                Upcoming
              </span>

            </div>

            <p className="analytics-label">
              Scheduled Posts
            </p>

            <h2 className="analytics-number">
              {stats.scheduled_posts ?? 0}
            </h2>

            <p className="analytics-description">
              Posts waiting to be published
            </p>

          </div>


          {/* PUBLISHED */}

          <div className="analytics-card">

            <div className="analytics-card-top">

              <div className="analytics-icon published-icon">
                ✅
              </div>

              <span className="analytics-badge">
                Published
              </span>

            </div>

            <p className="analytics-label">
              Published Posts
            </p>

            <h2 className="analytics-number">
              {stats.published_posts ?? 0}
            </h2>

            <p className="analytics-description">
              Successfully published posts
            </p>

          </div>


        </section>


        {/* =================================================
            POST ANALYTICS
        ================================================= */}

        <section className="analytics-section">

          <div className="section-title">

            <div>

              <h2>
                Post Analytics
              </h2>

              <p>
                Overview of your current post status
              </p>

            </div>

          </div>


          <div className="post-analytics">


            {/* PUBLISHED */}

            <div className="status-row">

              <div className="status-info">

                <span className="status-dot published-dot"></span>

                <span>
                  Published
                </span>

              </div>

              <strong>
                {stats.published_posts ?? 0}
              </strong>

            </div>


            <div className="progress-background">

              <div
                className="progress published-progress"
                style={{
                  width: `${
                    stats.total_posts > 0
                      ? (stats.published_posts / stats.total_posts) * 100
                      : 0
                  }%`
                }}
              ></div>

            </div>


            {/* SCHEDULED */}

            <div className="status-row">

              <div className="status-info">

                <span className="status-dot scheduled-dot"></span>

                <span>
                  Scheduled
                </span>

              </div>

              <strong>
                {stats.scheduled_posts ?? 0}
              </strong>

            </div>


            <div className="progress-background">

              <div
                className="progress scheduled-progress"
                style={{
                  width: `${
                    stats.total_posts > 0
                      ? (stats.scheduled_posts / stats.total_posts) * 100
                      : 0
                  }%`
                }}
              ></div>

            </div>


            {/* DRAFT */}

            <div className="status-row">

              <div className="status-info">

                <span className="status-dot draft-dot"></span>

                <span>
                  Draft
                </span>

              </div>

              <strong>
                {stats.draft_posts ?? 0}
              </strong>

            </div>


            <div className="progress-background">

              <div
                className="progress draft-progress"
                style={{
                  width: `${
                    stats.total_posts > 0
                      ? (stats.draft_posts / stats.total_posts) * 100
                      : 0
                  }%`
                }}
              ></div>

            </div>


          </div>

        </section>


        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <section className="quick-section">

          <div className="section-title">

            <div>

              <h2>
                Quick Actions
              </h2>

              <p>
                Manage your SocialPilot account
              </p>

            </div>

          </div>


          <div className="quick-actions">


            {/* SOCIAL ACCOUNTS */}

            <button
              className="quick-action-card"
              onClick={() => navigate("/social-accounts")}
            >

              <div className="quick-action-icon">
                👥
              </div>

              <div>

                <h3>
                  Social Accounts
                </h3>

                <p>
                  Connect and manage accounts
                </p>

              </div>

              <span>
                →
              </span>

            </button>


            {/* CREATE POST */}

            <button
              className="quick-action-card"
              onClick={() => navigate("/create-post")}
            >

              <div className="quick-action-icon">
                📝
              </div>

              <div>

                <h3>
                  Create Post
                </h3>

                <p>
                  Create new social media content
                </p>

              </div>

              <span>
                →
              </span>

            </button>


            {/* VIEW POSTS */}

            <button
              className="quick-action-card"
              onClick={() => navigate("/posts")}
            >

              <div className="quick-action-icon">
                📋
              </div>

              <div>

                <h3>
                  View Posts
                </h3>

                <p>
                  Manage your existing posts
                </p>

              </div>

              <span>
                →
              </span>

            </button>


            {/* PUBLISHING CALENDAR */}

            <button
              className="quick-action-card"
              onClick={() => navigate("/calendar")}
            >

              <div className="quick-action-icon">
                📅
              </div>

              <div>

                <h3>
                  Publishing Calendar
                </h3>

                <p>
                  View your scheduled posts
                </p>

              </div>

              <span>
                →
              </span>

            </button>


            {/* CAMPAIGNS */}

            <button
              className="quick-action-card"
              onClick={() => navigate("/campaigns")}
            >

              <div className="quick-action-icon">
                🎯
              </div>

              <div>

                <h3>
                  Campaigns
                </h3>

                <p>
                  Plan and manage campaigns
                </p>

              </div>

              <span>
                →
              </span>

            </button>


            {/* PUBLISHING LOGS */}

            <button
              className="quick-action-card"
              onClick={() => navigate("/publishing-logs")}
            >

              <div className="quick-action-icon">
                📋
              </div>

              <div>

                <h3>
                  Publishing Logs
                </h3>

                <p>
                  View publishing history
                </p>

              </div>

              <span>
                →
              </span>

            </button>


            {/* DRAFT POSTS */}

            <button
              className="quick-action-card"
              onClick={() => navigate("/drafts")}
            >

              <div className="quick-action-icon">
                📝
              </div>

              <div>

                <h3>
                  Draft Posts
                </h3>

                <p>
                  Manage your saved drafts
                </p>

              </div>

              <span>
                →
              </span>

            </button>


          </div>

        </section>


      </main>

    </div>

  );

}

export default Dashboard;