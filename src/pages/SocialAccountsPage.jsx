import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import api from "../services/api";

const DashboardPage = () => {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [postsResponse, accountsResponse] = await Promise.all([
        api.get("/posts"),
        api.get("/social-accounts/"),
      ]);

      setPosts(
        postsResponse.data.posts || postsResponse.data || []
      );

      setAccounts(accountsResponse.data || []);
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // POST STATISTICS
  // =========================

  const scheduledPosts = posts.filter(
    (post) => post.status?.toLowerCase() === "scheduled"
  );

  const publishedPosts = posts.filter(
    (post) => post.status?.toLowerCase() === "published"
  );

  const failedPosts = posts.filter(
    (post) => post.status?.toLowerCase() === "failed"
  );

  const draftPosts = posts.filter(
    (post) => post.status?.toLowerCase() === "draft"
  );

  const publishingPosts = posts.filter(
    (post) => post.status?.toLowerCase() === "publishing"
  );

  const connectedAccounts = accounts.filter(
    (account) =>
      account.is_active &&
      account.status?.toLowerCase() === "connected"
  );

  // =========================
  // RECENT POSTS
  // =========================

  const recentPosts = [...posts]
    .sort((a, b) => {
      const dateA = new Date(
        a.created_at || a.scheduled_at || 0
      );

      const dateB = new Date(
        b.created_at || b.scheduled_at || 0
      );

      return dateB - dateA;
    })
    .slice(0, 6);

  // =========================
  // UPCOMING POSTS
  // =========================

  const upcomingPosts = [...scheduledPosts]
    .sort(
      (a, b) =>
        new Date(a.scheduled_at) -
        new Date(b.scheduled_at)
    )
    .slice(0, 5);

  // =========================
  // DATE FORMATTER
  // =========================

  const formatDate = (date) => {
    if (!date) {
      return "No date";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "No date";
    }

    return parsedDate.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // =========================
  // STATUS FORMATTER
  // =========================

  const formatStatus = (status) => {
    if (!status) {
      return "Unknown";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase()
    );
  };

  // =========================
  // PLATFORM NAME
  // =========================

  const getPlatformName = (platform) => {
    if (!platform) {
      return "Social";
    }

    const names = {
      twitter: "X (Twitter)",
      x: "X (Twitter)",
      instagram: "Instagram",
      facebook: "Facebook",
      linkedin: "LinkedIn",
      youtube: "YouTube",
      pinterest: "Pinterest",
    };

    return (
      names[platform.toLowerCase()] ||
      platform
    );
  };

  // =========================
  // GET POST PLATFORMS
  // =========================

  const getPostPlatforms = (post) => {
    if (post.social_accounts?.length) {
      return post.social_accounts.map(
        (account) =>
          getPlatformName(account.platform)
      );
    }

    if (post.platform) {
      return [getPlatformName(post.platform)];
    }

    if (post.platforms?.length) {
      return post.platforms.map(
        (platform) =>
          getPlatformName(platform)
      );
    }

    return [];
  };

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
            onClick={() => navigate("/create-post")}
          >
            <span>✏️</span>
            Create Post
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/calendar")}
          >
            <span>📅</span>
            Calendar
          </button>

          <button
            className="nav-item"
            onClick={() =>
              alert("Campaigns page coming soon")
            }
          >
            <span>📢</span>
            Campaigns
          </button>

          <button
            className="nav-item"
            onClick={() =>
              alert("Analytics will be available in Milestone 3")
            }
          >
            <span>📈</span>
            Analytics
          </button>

          <button
            className="nav-item"
            onClick={() =>
              navigate("/social-accounts")
            }
          >
            <span>👥</span>
            Accounts
          </button>

          <button
            className="nav-item"
            onClick={() =>
              alert("Notifications page coming soon")
            }
          >
            <span>🔔</span>
            Notifications
          </button>

          <button
            className="nav-item"
            onClick={() =>
              alert("Team page coming soon")
            }
          >
            <span>🛡️</span>
            Team
          </button>

          <button
            className="nav-item"
            onClick={() =>
              navigate("/profile")
            }
          >
            <span>👤</span>
            Profile
          </button>

        </nav>

        {/* ================= SIDEBAR FOOTER ================= */}

        <div className="sidebar-footer">

          <div className="user-profile">

            <div className="avatar">
              H
            </div>

            <div className="user-info">

              <span className="user-name">
                Himaja
              </span>

              <span className="user-role">
                User
              </span>

            </div>

          </div>

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem(
                "access_token"
              );

              navigate("/login");
            }}
          >
            ↪ Logout
          </button>

        </div>

      </aside>

      {/* ================= MAIN CONTENT ================= */}

      <main className="main-content">

        {/* ================= HEADER ================= */}

        <header className="dash-header">

          <div>

            <h1>
              Dashboard
            </h1>

            <p className="subtitle">
              Manage your social media publishing
              workspace.
            </p>

          </div>

          <button
            className="action-btn"
            onClick={() =>
              navigate("/create-post")
            }
          >
            + Create Post
          </button>

        </header>

        {/* ================= WELCOME BANNER ================= */}

        <div className="welcome-banner">

          <span className="sparkle-icon">
            ✨
          </span>

          <div>

            <h3>
              Welcome back, Himaja!
            </h3>

            <p>
              Here's an overview of your
              social media activity.
            </p>

          </div>

        </div>

        {/* ================= ACTION GRID ================= */}

        <div className="action-grid">

          <div
            className="action-card"
            onClick={() =>
              navigate("/create-post")
            }
          >
            <span>✏️</span>
            Create Post
          </div>

          <div
            className="action-card"
            onClick={() =>
              navigate("/calendar")
            }
          >
            <span>📅</span>
            Calendar
          </div>

          <div
            className="action-card"
            onClick={() =>
              navigate("/social-accounts")
            }
          >
            <span>👥</span>
            Social Accounts
          </div>

          <div
            className="action-card"
            onClick={() =>
              navigate("/profile")
            }
          >
            <span>👤</span>
            Profile
          </div>

        </div>

        {/* ================= LOADING ================= */}

        {loading ? (

          <div
            style={{
              padding: "40px",
              textAlign: "center",
            }}
          >
            Loading dashboard...
          </div>

        ) : (

          <>

            {/* ================= METRICS GRID ================= */}

            <div className="metrics-grid">

              <div className="metric-card">

                <div className="metric-info">

                  <span className="metric-title">
                    SCHEDULED POSTS
                  </span>

                  <span className="metric-value">
                    {scheduledPosts.length}
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
                    {publishedPosts.length}
                  </span>

                </div>

                <div className="metric-icon">
                  ✓
                </div>

              </div>

              <div className="metric-card">

                <div className="metric-info">

                  <span className="metric-title">
                    FAILED POSTS
                  </span>

                  <span className="metric-value">
                    {failedPosts.length}
                  </span>

                </div>

                <div className="metric-icon">
                  ⚠️
                </div>

              </div>

              <div className="metric-card">

                <div className="metric-info">

                  <span className="metric-title">
                    CONNECTED ACCOUNTS
                  </span>

                  <span className="metric-value">
                    {connectedAccounts.length}
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

                <h2>
                  Recent Posts
                </h2>

                <button
                  className="link-btn"
                  onClick={() =>
                    navigate("/calendar")
                  }
                >
                  View Calendar ↗
                </button>

              </div>

              <div className="posts-list">

                {recentPosts.length === 0 ? (

                  <div
                    style={{
                      padding: "25px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No posts found.
                  </div>

                ) : (

                  recentPosts.map(
                    (post, idx) => {

                      const platforms =
                        getPostPlatforms(post);

                      return (

                        <div
                          className="post-item"
                          key={
                            post.id || idx
                          }
                        >

                          <div className="post-details">

                            <h4>
                              {post.content
                                ? post.content.length > 70
                                  ? `${post.content.substring(
                                      0,
                                      70
                                    )}...`
                                  : post.content
                                : "Untitled Post"}
                            </h4>

                            <span className="post-date">
                              {formatDate(
                                post.created_at ||
                                post.scheduled_at
                              )}
                            </span>

                          </div>

                          <div className="post-meta">

                            <div className="tags">

                              {platforms.length > 0 ? (

                                platforms.map(
                                  (
                                    platform,
                                    index
                                  ) => (

                                    <span
                                      className="tag-platform"
                                      key={
                                        index
                                      }
                                    >
                                      {platform}
                                    </span>

                                  )
                                )

                              ) : (

                                <span className="tag-platform">
                                  Social Media
                                </span>

                              )}

                            </div>

                            <span
                              className={`status-badge ${(
                                post.status ||
                                "unknown"
                              ).toLowerCase()}`}
                            >
                              {formatStatus(
                                post.status
                              )}
                            </span>

                          </div>

                        </div>

                      );
                    }
                  )

                )}

              </div>

            </section>

            {/* ================= UPCOMING POSTS ================= */}

            <section className="section-block">

              <div className="section-header">

                <h2>
                  Upcoming Scheduled Posts
                </h2>

                <button
                  className="link-btn"
                  onClick={() =>
                    navigate("/calendar")
                  }
                >
                  View Calendar ↗
                </button>

              </div>

              <div className="posts-list">

                {upcomingPosts.length === 0 ? (

                  <div
                    style={{
                      padding: "25px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No upcoming scheduled posts.
                  </div>

                ) : (

                  upcomingPosts.map(
                    (post, idx) => {

                      const platforms =
                        getPostPlatforms(post);

                      return (

                        <div
                          className="post-item"
                          key={
                            post.id || idx
                          }
                        >

                          <div className="post-details">

                            <h4>
                              {post.content
                                ? post.content.length > 70
                                  ? `${post.content.substring(
                                      0,
                                      70
                                    )}...`
                                  : post.content
                                : "Untitled Post"}
                            </h4>

                            <span className="post-date">
                              🕒{" "}
                              {formatDate(
                                post.scheduled_at
                              )}
                            </span>

                          </div>

                          <div className="post-meta">

                            <div className="tags">

                              {platforms.map(
                                (
                                  platform,
                                  index
                                ) => (

                                  <span
                                    className="tag-platform"
                                    key={
                                      index
                                    }
                                  >
                                    {platform}
                                  </span>

                                )
                              )}

                            </div>

                            <span className="status-badge scheduled">
                              Scheduled
                            </span>

                          </div>

                        </div>

                      );
                    }
                  )

                )}

              </div>

            </section>

            {/* ================= ACCOUNT SUMMARY ================= */}

            <section className="section-block">

              <div className="section-header">

                <h2>
                  Connected Accounts
                </h2>

                <button
                  className="link-btn"
                  onClick={() =>
                    navigate(
                      "/social-accounts"
                    )
                  }
                >
                  Manage Accounts ↗
                </button>

              </div>

              <div className="campaigns-list">

                {connectedAccounts.length ===
                0 ? (

                  <div
                    style={{
                      padding: "25px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    No connected accounts.
                  </div>

                ) : (

                  connectedAccounts.map(
                    (account) => (

                      <div
                        className="campaign-item"
                        key={
                          account.id
                        }
                      >

                        <div className="campaign-info">

                          <div>

                            <h4>
                              {getPlatformName(
                                account.platform
                              )}
                            </h4>

                            <span className="campaign-dates">
                              {account.account_name ||
                                "Connected account"}
                            </span>

                          </div>

                          <div className="campaign-status">

                            <span className="active-badge">
                              Connected
                            </span>

                          </div>

                        </div>

                      </div>

                    )
                  )

                )}

              </div>

            </section>

          </>

        )}

      </main>

    </div>
  );
};

export default DashboardPage;