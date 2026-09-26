import { useEffect, useState } from "react";
import api from "../services/api";
import "./AnalyticsPage.css";

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/campaigns/comparison"
      );

      setCampaigns(response.data);

      const campaignWithHistory = response.data.find(
        (campaign) => campaign.campaign_id === 1
      );

      if (campaignWithHistory) {
        const historyResponse = await api.get(
          `/campaigns/${campaignWithHistory.campaign_id}/performance-history`
        );

        setPerformanceHistory(
          historyResponse.data
        );
      } else {
        setPerformanceHistory([]);
      }
    } catch (err) {
      console.error(
        "Failed to load analytics:",
        err
      );

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CALCULATE SUMMARY VALUES
  // ==========================================

  const totalBudget = campaigns.reduce(
    (total, campaign) =>
      total + (campaign.budget || 0),
    0
  );

  const totalSpent = campaigns.reduce(
    (total, campaign) =>
      total + (campaign.spent || 0),
    0
  );

  const totalReach = campaigns.reduce(
    (total, campaign) =>
      total + (campaign.actual_reach || 0),
    0
  );

  const totalClicks = campaigns.reduce(
    (total, campaign) =>
      total + (campaign.actual_clicks || 0),
    0
  );

  const averageEngagement =
    campaigns.length > 0
      ? campaigns.reduce(
          (total, campaign) =>
            total +
            (campaign.actual_engagement || 0),
          0
        ) / campaigns.length
      : 0;

  const averageRoi =
    campaigns.length > 0
      ? campaigns.reduce(
          (total, campaign) =>
            total + (campaign.roi || 0),
          0
        ) / campaigns.length
      : 0;

  // ==========================================
  // PAGE
  // ==========================================
  const exportCampaignReport = () => {
  if (campaigns.length === 0) {
    alert("No campaign data available to export.");
    return;
  }

  const headers = [
    "Campaign",
    "Platform",
    "Status",
    "Budget",
    "Spent",
    "Reach",
    "Engagement",
    "Clicks",
    "ROI",
    "Start Date",
    "End Date",
  ];

  const rows = campaigns.map((campaign) => [
    campaign.campaign_name || campaign.name || "",
    campaign.platform || "",
    campaign.status || "Unknown",
    campaign.budget || 0,
    campaign.spent || 0,
    campaign.actual_reach || 0,
    campaign.actual_engagement ?? 0,
    campaign.actual_clicks || 0,
    campaign.roi ?? 0,
    campaign.start_date
      ? new Date(campaign.start_date).toLocaleDateString()
      : "",
    campaign.end_date
      ? new Date(campaign.end_date).toLocaleDateString()
      : "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "socialpilot-campaign-report.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
   
  

  return (
    <div className="analytics-page">
      <div className="analytics-container">

        {/* ==================================
            HEADER
        ================================== */}

        <div className="analytics-header">
          <div>
            <h1>Analytics Dashboard</h1>

            <p>
              Track campaign performance,
              engagement, audience reach, and ROI.
            </p>
          </div>

          <button
            className="analytics-refresh-btn"
            onClick={fetchAnalytics}
          >
            Refresh
          </button>
        </div>

        {/* ==================================
            LOADING
        ================================== */}

        {loading && (
          <div className="analytics-message">
            Loading analytics...
          </div>
        )}

        {/* ==================================
            ERROR
        ================================== */}

        {error && (
          <div className="analytics-error">
            {error}
          </div>
        )}

        {/* ==================================
            DASHBOARD
        ================================== */}

        {!loading && !error && (
          <>

            {/* ==================================
                SUMMARY CARDS
            ================================== */}

            <div className="analytics-summary-grid">

              <div className="analytics-summary-card">
                <span className="analytics-card-label">
                  Total Campaigns
                </span>

                <strong>
                  {campaigns.length}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span className="analytics-card-label">
                  Total Budget
                </span>

                <strong>
                  ₹
                  {totalBudget.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span className="analytics-card-label">
                  Total Spent
                </span>

                <strong>
                  ₹
                  {totalSpent.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span className="analytics-card-label">
                  Total Reach
                </span>

                <strong>
                  {totalReach.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span className="analytics-card-label">
                  Total Clicks
                </span>

                <strong>
                  {totalClicks.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span className="analytics-card-label">
                  Avg. Engagement
                </span>

                <strong>
                  {averageEngagement.toFixed(2)}%
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span className="analytics-card-label">
                  Avg. ROI
                </span>

                <strong>
                  {averageRoi.toFixed(2)}%
                </strong>
              </div>

            </div>


            {/* ==================================
                PERFORMANCE TREND
            ================================== */}

            <div className="analytics-section">

              <div className="analytics-section-header">
                <div>
                  <h2>
                    Campaign Performance Trend
                  </h2>

                  <p>
                    Track reach over time using
                    historical campaign data.
                  </p>
                </div>
              </div>

              {performanceHistory.length === 0 ? (

                <div className="analytics-empty">
                  No historical performance data
                  available.
                </div>

              ) : (

                <div className="analytics-trend-wrapper">

                  {/* ==================================
                      SVG GRAPH
                  ================================== */}

                  <div className="analytics-trend-chart">

                    <svg
                      viewBox="0 0 800 320"
                      className="analytics-trend-svg"
                      preserveAspectRatio="none"
                    >

                      {/* Horizontal grid lines */}

                      <line
                        x1="60"
                        y1="40"
                        x2="760"
                        y2="40"
                        className="analytics-grid-line"
                      />

                      <line
                        x1="60"
                        y1="120"
                        x2="760"
                        y2="120"
                        className="analytics-grid-line"
                      />

                      <line
                        x1="60"
                        y1="200"
                        x2="760"
                        y2="200"
                        className="analytics-grid-line"
                      />

                      <line
                        x1="60"
                        y1="280"
                        x2="760"
                        y2="280"
                        className="analytics-grid-line"
                      />


                      {/* Y-axis */}

                      <line
                        x1="60"
                        y1="40"
                        x2="60"
                        y2="280"
                        className="analytics-axis-line"
                      />


                      {/* X-axis */}

                      <line
                        x1="60"
                        y1="280"
                        x2="760"
                        y2="280"
                        className="analytics-axis-line"
                      />


                      {/* Y-axis labels */}

                      <text
                        x="50"
                        y="45"
                        textAnchor="end"
                        className="analytics-axis-label"
                      >
                        {Number(
                          Math.max(
                            ...performanceHistory.map(
                              (point) =>
                                point.reach || 0
                            )
                          )
                        ).toLocaleString("en-IN")}
                      </text>


                      <text
                        x="50"
                        y="125"
                        textAnchor="end"
                        className="analytics-axis-label"
                      >
                        {Number(
                          Math.round(
                            (
                              Math.max(
                                ...performanceHistory.map(
                                  (point) =>
                                    point.reach || 0
                                )
                              ) +
                              Math.min(
                                ...performanceHistory.map(
                                  (point) =>
                                    point.reach || 0
                                )
                              )
                            ) / 2
                          )
                        ).toLocaleString("en-IN")}
                      </text>


                      <text
                        x="50"
                        y="285"
                        textAnchor="end"
                        className="analytics-axis-label"
                      >
                        {Number(
                          Math.min(
                            ...performanceHistory.map(
                              (point) =>
                                point.reach || 0
                            )
                          )
                        ).toLocaleString("en-IN")}
                      </text>


                      {/* X-axis labels */}

                      {performanceHistory.map(
                        (item, index) => {

                          const x =
                            performanceHistory.length === 1
                              ? 400
                              : 60 +
                                (index /
                                  (performanceHistory.length -
                                    1)) *
                                  700;

                          return (
                            <text
                              key={`x-label-${item.id}`}
                              x={x}
                              y="305"
                              textAnchor="middle"
                              className="analytics-axis-label"
                            >
                              {new Date(
                                item.recorded_at
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                }
                              )}
                            </text>
                          );
                        }
                      )}


                      {/* Trend line */}

                      {performanceHistory.length > 1 && (
                        <polyline
                          className="analytics-trend-line"
                          fill="none"
                          points={performanceHistory
                            .map(
                              (
                                item,
                                index
                              ) => {

                                const maxReach =
                                  Math.max(
                                    ...performanceHistory.map(
                                      (point) =>
                                        point.reach ||
                                        0
                                    )
                                  );

                                const minReach =
                                  Math.min(
                                    ...performanceHistory.map(
                                      (point) =>
                                        point.reach ||
                                        0
                                    )
                                  );

                                const range =
                                  maxReach -
                                    minReach ||
                                  1;

                                const x =
                                  60 +
                                  (index /
                                    (performanceHistory.length -
                                      1)) *
                                    700;

                                const y =
                                  280 -
                                  ((item.reach -
                                    minReach) /
                                    range) *
                                    220;

                                return `${x},${y}`;
                              }
                            )
                            .join(" ")}
                        />
                      )}


                      {/* Data points */}

                      {performanceHistory.map(
                        (
                          item,
                          index
                        ) => {

                          const maxReach =
                            Math.max(
                              ...performanceHistory.map(
                                (point) =>
                                  point.reach ||
                                  0
                              )
                            );

                          const minReach =
                            Math.min(
                              ...performanceHistory.map(
                                (point) =>
                                  point.reach ||
                                  0
                              )
                            );

                          const range =
                            maxReach -
                              minReach ||
                            1;

                          const x =
                            performanceHistory.length ===
                            1
                              ? 400
                              : 60 +
                                (index /
                                  (performanceHistory.length -
                                    1)) *
                                  700;

                          const y =
                            280 -
                            ((item.reach -
                              minReach) /
                              range) *
                              220;

                          return (
                            <g
                              key={
                                item.id
                              }
                            >

                              <circle
                                cx={x}
                                cy={y}
                                r="6"
                                className="analytics-trend-point"
                              />

                              <text
                                x={x}
                                y={y - 14}
                                textAnchor="middle"
                                className="analytics-trend-value"
                              >
                                {Number(
                                  item.reach ||
                                    0
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </text>

                            </g>
                          );
                        }
                      )}

                    </svg>

                  </div>


                  {/* ==================================
                      TREND DETAILS
                  ================================== */}

                  <div className="analytics-trend-details">

                    {performanceHistory.map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          className="analytics-trend-detail"
                          key={`detail-${item.id}`}
                        >

                          <strong>
                            Point{" "}
                            {index + 1}
                          </strong>

                          <span>
                            Reach:{" "}
                            {Number(
                              item.reach ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>

                          <span>
                            Engagement:{" "}
                            {item.engagement !=
                            null
                              ? `${item.engagement}%`
                              : "N/A"}
                          </span>

                          <span>
                            Clicks:{" "}
                            {item.clicks !=
                            null
                              ? Number(
                                  item.clicks
                                ).toLocaleString(
                                  "en-IN"
                                )
                              : "N/A"}
                          </span>

                          <span>
                            ROI:{" "}
                            {item.roi !=
                            null
                              ? `${item.roi}%`
                              : "N/A"}
                          </span>

                          <small>
                            {new Date(
                              item.recorded_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </small>

                        </div>

                      )
                    )}

                  </div>

                </div>
              )}

            </div>


            {/* ==================================
                ENGAGEMENT ANALYTICS
            ================================== */}

            <div className="analytics-section">

              <div className="analytics-section-header">
                <div>

                  <h2>
                    Engagement Analytics
                  </h2>

                  <p>
                    Track engagement rate across
                    historical campaign performance.
                  </p>

                </div>
              </div>


              {performanceHistory.length === 0 ? (

                <div className="analytics-empty">
                  No engagement data available.
                </div>

              ) : (

                <div className="analytics-engagement-chart">

                  {performanceHistory.map(
                    (item, index) => {

                      const engagement =
                        Number(
                          item.engagement || 0
                        );

                      const maxEngagement =
                        Math.max(
                          ...performanceHistory.map(
                            (point) =>
                              Number(
                                point.engagement ||
                                  0
                              )
                          ),
                          1
                        );

                      const barHeight =
                        (engagement /
                          maxEngagement) *
                        220;


                      return (
                        <div
                          className="analytics-engagement-item"
                          key={`engagement-${item.id}`}
                        >

                          <div className="analytics-engagement-value">
                            {engagement}%
                          </div>


                          <div className="analytics-engagement-bar-wrapper">

                            <div
                              className="analytics-engagement-bar"
                              style={{
                                height: `${barHeight}px`,
                              }}
                            />

                          </div>


                          <div className="analytics-engagement-label">
                            Point {index + 1}
                          </div>


                          <small>
                            {new Date(
                              item.recorded_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </small>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>


            {/* ==================================
                AUDIENCE / REACH ANALYTICS
            ================================== */}

            <div className="analytics-section">

              <div className="analytics-section-header">

                <div>

                  <h2>
                    Audience / Reach Analytics
                  </h2>

                  <p>
                    Track audience reach and growth
                    across historical campaign
                    performance.
                  </p>

                </div>

              </div>


              {performanceHistory.length === 0 ? (

                <div className="analytics-empty">
                  No audience reach data available.
                </div>

              ) : (

                <>

                  {/* Audience summary */}

                  <div className="analytics-audience-summary">

                    <div className="analytics-audience-card">

                      <span>
                        Latest Reach
                      </span>

                      <strong>
                        {Number(
                          performanceHistory[
                            performanceHistory.length - 1
                          ].reach || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>


                    <div className="analytics-audience-card">

                      <span>
                        First Recorded Reach
                      </span>

                      <strong>
                        {Number(
                          performanceHistory[0].reach ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>


                    <div className="analytics-audience-card">

                      <span>
                        Reach Growth
                      </span>

                      <strong>
                        {(
                          Number(
                            performanceHistory[
                              performanceHistory.length - 1
                            ].reach || 0
                          ) -
                          Number(
                            performanceHistory[0].reach ||
                              0
                          )
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>

                  </div>


                  {/* Audience history */}

                  <div className="analytics-audience-list">

                    {performanceHistory.map(
                      (item, index) => {

                        const reach =
                          Number(
                            item.reach || 0
                          );

                        const previousReach =
                          index > 0
                            ? Number(
                                performanceHistory[
                                  index - 1
                                ].reach || 0
                              )
                            : null;

                        const growth =
                          previousReach !== null
                            ? reach -
                              previousReach
                            : 0;


                        return (
                          <div
                            className="analytics-audience-row"
                            key={`audience-${item.id}`}
                          >

                            <div>

                              <strong>
                                Point {index + 1}
                              </strong>

                              <small>
                                {new Date(
                                  item.recorded_at
                                ).toLocaleDateString(
                                  "en-IN"
                                )}
                              </small>

                            </div>


                            <div>

                              <span>
                                Reach
                              </span>

                              <strong>
                                {reach.toLocaleString(
                                  "en-IN"
                                )}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Growth
                              </span>

                              <strong>
                                {index === 0
                                  ? "—"
                                  : `+${growth.toLocaleString(
                                      "en-IN"
                                    )}`}
                              </strong>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                </>

              )}

            </div>
  
             {/* Click Analytics */}
<section className="analytics-section">
  <div className="analytics-section-header">
    <h2>Click Analytics</h2>
    <p>Track campaign clicks and click growth over time.</p>
  </div>

  <div className="analytics-click-summary">
    <div className="analytics-click-card">
      <span>Total Clicks</span>
      <strong>
        {performanceHistory.length > 0
          ? performanceHistory[performanceHistory.length - 1].clicks?.toLocaleString() || 0
          : 0}
      </strong>
    </div>

    <div className="analytics-click-card">
      <span>First Recorded Clicks</span>
      <strong>
        {performanceHistory.length > 0
          ? performanceHistory[0].clicks?.toLocaleString() || 0
          : 0}
      </strong>
    </div>

    <div className="analytics-click-card">
      <span>Click Growth</span>
      <strong>
        {performanceHistory.length > 1
          ? `${(
              ((
                performanceHistory[performanceHistory.length - 1].clicks -
                performanceHistory[0].clicks
              ) /
                performanceHistory[0].clicks) *
              100
            ).toFixed(2)}%`
          : "0%"}
      </strong>
    </div>
  </div>

  <div className="analytics-click-list">
    {performanceHistory.length === 0 ? (
      <p>No click history available.</p>
    ) : (
      performanceHistory.map((item, index) => (
        <div className="analytics-click-row" key={item.id}>
          <div>
            <span>Performance Point {index + 1}</span>
            <small>
              {new Date(item.recorded_at).toLocaleString()}
            </small>
          </div>

          <strong>
            {(item.clicks || 0).toLocaleString()} clicks
          </strong>
        </div>
      ))
    )}
  </div>
</section>
{/* ROI Analytics */}
<section className="analytics-section">
  <div className="analytics-section-header">
    <h2>ROI Analytics</h2>
    <p>Track return on investment and ROI growth over time.</p>
  </div>

  <div className="analytics-roi-summary">
    <div className="analytics-roi-card">
      <span>Average ROI</span>
      <strong>
        {performanceHistory.length > 0
          ? (
              performanceHistory.reduce(
                (sum, item) => sum + (item.roi || 0),
                0
              ) / performanceHistory.length
            ).toFixed(2)
          : "0.00"}
        %
      </strong>
    </div>

    <div className="analytics-roi-card">
      <span>Starting ROI</span>
      <strong>
        {performanceHistory.length > 0
          ? `${performanceHistory[0].roi || 0}%`
          : "0%"}
      </strong>
    </div>

    <div className="analytics-roi-card">
      <span>Current ROI</span>
      <strong>
        {performanceHistory.length > 0
          ? `${performanceHistory[performanceHistory.length - 1].roi || 0}%`
          : "0%"}
      </strong>
    </div>

    <div className="analytics-roi-card">
      <span>ROI Growth</span>
      <strong>
        {performanceHistory.length > 1 &&
        performanceHistory[0].roi
          ? `${(
              ((performanceHistory[performanceHistory.length - 1].roi -
                performanceHistory[0].roi) /
                performanceHistory[0].roi) *
              100
            ).toFixed(2)}%`
          : "0%"}
      </strong>
    </div>
  </div>

  <div className="analytics-roi-list">
    {performanceHistory.length === 0 ? (
      <p>No ROI history available.</p>
    ) : (
      performanceHistory.map((item, index) => (
        <div className="analytics-roi-row" key={item.id}>
          <div>
            <span>Performance Point {index + 1}</span>
            <small>
              {new Date(item.recorded_at).toLocaleString()}
            </small>
          </div>

          <strong>{item.roi || 0}% ROI</strong>
        </div>
      ))
    )}
  </div>
</section>
{/* Campaign Comparison */}
<section className="analytics-section">
  <div className="analytics-section-header">
    <h2>Campaign Comparison</h2>
    <p>Compare campaign performance across key marketing metrics.</p>
  </div>

  <div className="analytics-comparison-table-wrapper">
    <table className="analytics-comparison-table">
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Platform</th>
          <th>Budget</th>
          <th>Spent</th>
          <th>Reach</th>
          <th>Engagement</th>
          <th>Clicks</th>
          <th>ROI</th>
        </tr>
      </thead>

      <tbody>
        {campaigns.length === 0 ? (
          <tr>
            <td colSpan="8">No campaigns available.</td>
          </tr>
        ) : (
          campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td>
                <strong>{campaign.name}</strong>
              </td>

              <td>{campaign.platform || "—"}</td>

              <td>
                ₹{(campaign.budget || 0).toLocaleString()}
              </td>

              <td>
                ₹{(campaign.spent || 0).toLocaleString()}
              </td>

              <td>
                {(campaign.actual_reach || campaign.target_reach || 0).toLocaleString()}
              </td>

              <td>
                {campaign.actual_engagement ?? campaign.target_engagement ?? 0}%
              </td>

              <td>
                {(campaign.actual_clicks || campaign.target_clicks || 0).toLocaleString()}
              </td>

              <td>
                {campaign.roi ?? 0}%
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</section>
{/* Campaign Reports */}
<section className="analytics-section">
  <div className="analytics-report-title-row">
    <div>
      <h2>Campaign Reports</h2>
      <p>Detailed performance summary for all campaigns.</p>
    </div>

    <button
      className="analytics-export-button"
      onClick={exportCampaignReport}
    >
      Export CSV
    </button>
  </div>

  <div className="analytics-report-grid">
    {campaigns.length === 0 ? (
      <p>No campaign reports available.</p>
    ) : (
      campaigns.map((campaign) => (
        <div className="analytics-report-card" key={campaign.id}>
          <div className="analytics-report-header">
            <div>
              <h3>{campaign.name}</h3>
              <span>{campaign.platform || "Platform not specified"}</span>
            </div>

            <span className="analytics-report-status">
              {campaign.status || "Unknown"}
            </span>
          </div>

          <div className="analytics-report-metrics">
            <div>
              <span>Budget</span>
              <strong>
                ₹{(campaign.budget || 0).toLocaleString()}
              </strong>
            </div>

            <div>
              <span>Spent</span>
              <strong>
                ₹{(campaign.spent || 0).toLocaleString()}
              </strong>
            </div>

            <div>
              <span>Reach</span>
              <strong>
                {(
                  campaign.actual_reach ||
                  campaign.target_reach ||
                  0
                ).toLocaleString()}
              </strong>
            </div>

            <div>
              <span>Engagement</span>
              <strong>
                {campaign.actual_engagement ??
                  campaign.target_engagement ??
                  0}
                %
              </strong>
            </div>

            <div>
              <span>Clicks</span>
              <strong>
                {(
                  campaign.actual_clicks ||
                  campaign.target_clicks ||
                  0
                ).toLocaleString()}
              </strong>
            </div>

            <div>
              <span>ROI</span>
              <strong>{campaign.roi ?? 0}%</strong>
            </div>
          </div>

          <div className="analytics-report-footer">
            <span>
              {campaign.start_date
                ? new Date(campaign.start_date).toLocaleDateString()
                : "No start date"}
            </span>

            <span>→</span>

            <span>
              {campaign.end_date
                ? new Date(campaign.end_date).toLocaleDateString()
                : "No end date"}
            </span>
          </div>
        </div>
      ))
    )}
  </div>
</section>



            {/* ==================================
                CAMPAIGN PERFORMANCE TABLE
                ================================== */}

            <div className="analytics-section">

              <div className="analytics-section-header">

                <div>

                  <h2>
                    Campaign Performance
                  </h2>

                  <p>
                    Compare performance across
                    your campaigns.
                  </p>

                </div>

              </div>


              {campaigns.length === 0 ? (

                <div className="analytics-empty">
                  No campaign analytics
                  available.
                </div>

              ) : (

                <div className="analytics-table-wrapper">

                  <table className="analytics-table">

                    <thead>

                      <tr>

                        <th>
                          Campaign
                        </th>

                        <th>
                          Platform
                        </th>

                        <th>
                          Budget
                        </th>

                        <th>
                          Spent
                        </th>

                        <th>
                          Reach
                        </th>

                        <th>
                          Engagement
                        </th>

                        <th>
                          Clicks
                        </th>

                        <th>
                          ROI
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {campaigns.map(
                        (campaign) => (

                          <tr
                            key={
                              campaign.campaign_id
                            }
                          >

                            <td>
                              <strong>
                                {
                                  campaign.campaign_name
                                }
                              </strong>
                            </td>


                            <td>
                              <span className="platform-badge">
                                {
                                  campaign.platform
                                }
                              </span>
                            </td>


                            <td>
                              {campaign.budget !=
                              null
                                ? `₹${Number(
                                    campaign.budget
                                  ).toLocaleString(
                                    "en-IN"
                                  )}`
                                : "N/A"}
                            </td>


                            <td>
                              {campaign.spent !=
                              null
                                ? `₹${Number(
                                    campaign.spent
                                  ).toLocaleString(
                                    "en-IN"
                                  )}`
                                : "N/A"}
                            </td>


                            <td>
                              {campaign.actual_reach !=
                              null
                                ? Number(
                                    campaign.actual_reach
                                  ).toLocaleString(
                                    "en-IN"
                                  )
                                : "N/A"}
                            </td>


                            <td>
                              {campaign.actual_engagement !=
                              null
                                ? `${campaign.actual_engagement}%`
                                : "N/A"}
                            </td>


                            <td>
                              {campaign.actual_clicks !=
                              null
                                ? Number(
                                    campaign.actual_clicks
                                  ).toLocaleString(
                                    "en-IN"
                                  )
                                : "N/A"}
                            </td>


                            <td>
                              {campaign.roi !=
                              null
                                ? `${campaign.roi}%`
                                : "N/A"}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </>
        )}

      </div>
    </div>
  );
}