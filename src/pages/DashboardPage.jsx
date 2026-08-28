
import React from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";

const DashboardPage = () => {
  const navigate = useNavigate();

  const recentPosts = [
    {
      title: "Weekly Tips: 5 Ways to Boost Engagement",
      date: "Aug 26, 4:30 PM",
      platforms: ["Instagram", "LinkedIn"],
      status: "Scheduled",
    },
    {
      title: "Product Feature Spotlight: Analytics Dashboard",
      date: "Aug 27, 8:30 PM",
      platforms: ["X (Twitter)", "LinkedIn"],
      status: "Scheduled",
    },
    {
      title: "Community Spotlight: Top Creators",
      date: "Aug 28, 5:30 PM",
      platforms: ["Instagram", "Facebook"],
      status: "Scheduled",
    },
    {
      title: "Draft: September Newsletter",
      date: "Aug 25",
      platforms: ["Facebook", "LinkedIn"],
      status: "Draft",
    },
    {
      title: "Webinar Announcement: Social Media Masterclass",
      date: "Aug 15, 9:30 PM",
      platforms: ["Instagram", "Facebook"],
      status: "Failed",
    },
    {
      title: "Partnership Announcement",
      date: "Aug 29, 3:30 PM",
      platforms: ["X (Twitter)", "LinkedIn"],
      status: "Pending",
    },
  ];

  const activeCampaigns = [
    {
      name: "Summer Product Launch",
      dates: "Aug 1 – Aug 31, 2026",
      progress: "57%",
    },
    {
      name: "Customer Stories Q3",
      dates: "Jul 15 – Sep 15, 2026",
      progress: "63%",
    },
  ];

  return (
    <div className="dashboard-container">

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">

        <div className="brand">
          <span className="brand-icon">⚡</span>
          <h2>SocialPilot</h2>
        </div>

        <nav className="nav-menu">

          <button
            className="nav-item active"
            onClick={() => navigate("/dashboard")}
          >
            <span>📊</span>
            Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() => alert("Create Post page coming soon")}
          >
            <span>✏️</span>
            Create Post
          </button>

          <button
            className="nav-item"
            onClick={() => alert("Calendar page coming soon")}
          >
            <span>📅</span>
            Calendar
          </button>

          <button
            className="nav-item"
            onClick={() => alert("Campaigns page coming soon")}
          >
            <span>📢</span>
            Campaigns
          </button>

          <button
            className="nav-item"
            onClick={() => alert("Analytics page coming soon")}
          >
            <span>📈</span>
            Analytics
          </button>

          <button
            className="nav-item"
            onClick={() => alert("Accounts page coming soon")}
          >
            <span>👥</span>
            Accounts
          </button>

          <button
            className="nav-item"
            onClick={() => alert("Notifications page coming soon")}
          >
            <span>🔔</span>
            Notifications
          </button>

          <button
            className="nav-item"
            onClick={() => alert("Team page coming soon")}
          >
            <span>🛡️</span>
            Team
          </button>

          {/* PROFILE */}
          <button
            className="nav-item"
            onClick={() => navigate("/profile")}
          >
            <span>👤</span>
            Profile
          </button>

        </nav>

        {/* ================= SIDEBAR FOOTER ================= */}
        <div className="sidebar-footer">

          <div className="user-profile">
            <div className="avatar">K</div>

            <div className="user-info">
              <span className="user-name">Himaja</span>
              <span className="user-role">Admin</span>
            </div>
          </div>
          

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("access_token");
              navigate("/login");
            }}
          >
            ↪ Logout
          </button>

        </div>

      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="main-content">

        {/* HEADER */}
        <header className="dash-header">

          <div>
            <h1>Admin Dashboard</h1>

            <p className="subtitle">
              Full control over your workspace. Tuesday, August 25, 2026
            </p>
          </div>

          <button
            className="action-btn"
            onClick={() => alert("Create Post page coming soon")}
          >
            + Create Post
          </button>

        </header>

        {/* ================= WELCOME BANNER ================= */}
        <div className="welcome-banner">

          <span className="sparkle-icon">✨</span>

          <div>
            <h3>Welcome back, Himaja!</h3>
            <p>Your admin workspace is ready.</p>
          </div>

        </div>

        {/* ================= ACTION GRID ================= */}
        <div className="action-grid">

          <div
            className="action-card"
            onClick={() => alert("Create Post page coming soon")}
          >
            <span>✏️</span>
            Create Post
          </div>

          <div
            className="action-card"
            onClick={() => alert("Campaigns page coming soon")}
          >
            <span>📢</span>
            Campaigns
          </div>

          <div
            className="action-card"
            onClick={() => alert("Analytics page coming soon")}
          >
            <span>📈</span>
            Analytics
          </div>

          <div
            className="action-card"
            onClick={() => alert("Manage Team page coming soon")}
          >
            <span>🛡️</span>
            Manage Team
          </div>

        </div>

        {/* ================= METRICS GRID ================= */}
        <div className="metrics-grid">

          <div className="metric-card">

            <div className="metric-info">
              <span className="metric-title">
                SCHEDULED POSTS
              </span>

              <span className="metric-value">
                3
              </span>
            </div>

            <div className="metric-icon">
              🕒
            </div>

          </div>

          <div className="metric-card">

            <div className="metric-info">
              <span className="metric-title">
                PUBLISHED
              </span>

              <span className="metric-value">
                3
              </span>
            </div>

            <div className="metric-icon">
              ✓
            </div>

          </div>

          <div className="metric-card">

            <div className="metric-info">
              <span className="metric-title">
                ACTIVE CAMPAIGNS
              </span>

              <span className="metric-value">
                2
              </span>
            </div>

            <div className="metric-icon">
              📢
            </div>

          </div>

          <div className="metric-card">

            <div className="metric-info">
              <span className="metric-title">
                CONNECTED ACCOUNTS
              </span>

              <span className="metric-value">
                5
              </span>
            </div>

            <div className="metric-icon">
              👥
            </div>

          </div>

        </div>

        {/* ================= RECENT POSTS ================= */}
        <section className="section-block">

          <div className="section-header">

            <h2>Recent Posts</h2>

            <a
              href="#view-all"
              className="link-btn"
            >
              View all ↗
            </a>

          </div>

          <div className="posts-list">

            {recentPosts.map((post, idx) => (

              <div
                className="post-item"
                key={idx}
              >

                <div className="post-details">

                  <h4>
                    {post.title}
                  </h4>

                  <span className="post-date">
                    {post.date}
                  </span>

                </div>

                <div className="post-meta">

                  <div className="tags">

                    {post.platforms.map((platform, index) => (

                      <span
                        className="tag-platform"
                        key={index}
                      >
                        {platform}
                      </span>

                    ))}

                  </div>

                  <span
                    className={`status-badge ${post.status.toLowerCase()}`}
                  >
                    {post.status}
                  </span>

                </div>

              </div>

            ))}

          </div>

        </section>

        {/* ================= ACTIVE CAMPAIGNS ================= */}
        <section className="section-block">

          <div className="section-header">

            <h2>Active Campaigns</h2>

            <a
              href="#view-all"
              className="link-btn"
            >
              View all ↗
            </a>

          </div>

          <div className="campaigns-list">

            {activeCampaigns.map((campaign, idx) => (

              <div
                className="campaign-item"
                key={idx}
              >

                <div className="campaign-info">

                  <div>

                    <h4>
                      {campaign.name}
                    </h4>

                    <span className="campaign-dates">
                      {campaign.dates}
                    </span>

                  </div>

                  <div className="campaign-status">

                    <span className="active-badge">
                      Active
                    </span>

                    <span className="percentage">
                      {campaign.progress}
                    </span>

                  </div>

                </div>

                <div className="progress-bar-bg">

                  <div
                    className="progress-bar-fill"
                    style={{
                      width: campaign.progress,
                    }}
                  ></div>

                </div>

              </div>

            ))}

          </div>

        </section>

      </main>

    </div>
  );
};

export default DashboardPage;

