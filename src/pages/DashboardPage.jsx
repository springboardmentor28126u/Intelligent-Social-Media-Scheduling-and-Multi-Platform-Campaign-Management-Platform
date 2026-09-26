import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./DashboardPage.css";

const DashboardPage = () => {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [postsResponse, accountsResponse] = await Promise.all([
          api.get("/posts"),
          api.get("/social-accounts/"),
        ]);

        setPosts(
          Array.isArray(postsResponse.data)
            ? postsResponse.data
            : postsResponse.data.posts || []
        );

        setAccounts(
          Array.isArray(accountsResponse.data)
            ? accountsResponse.data
            : []
        );
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const getPostStatus = (post) => {
    return String(post.status || "draft").toLowerCase();
  };

  const scheduledCount = posts.filter(
    (post) => getPostStatus(post) === "scheduled"
  ).length;

  const publishedCount = posts.filter(
    (post) => getPostStatus(post) === "published"
  ).length;

  const failedCount = posts.filter(
    (post) => getPostStatus(post) === "failed"
  ).length;

  const connectedAccounts = accounts.filter(
    (account) =>
      account.is_active === true &&
      String(account.status || "").toLowerCase() === "connected"
  ).length;

  const formatDate = (dateValue) => {
    if (!dateValue) return "No date";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPlatform = (platform) => {
    if (!platform) return "Unknown";

    const value = String(platform).toLowerCase();

    if (value === "twitter" || value === "x") {
      return "X (Twitter)";
    }

    return (
      String(platform).charAt(0).toUpperCase() +
      String(platform).slice(1)
    );
  };

  const getPlatforms = (post) => {
    if (Array.isArray(post.social_accounts)) {
      return post.social_accounts.map(
        (account) => account.platform || account
      );
    }

    if (Array.isArray(post.platforms)) {
      return post.platforms;
    }

    if (post.platform) {
      return [post.platform];
    }

    return [];
  };

  const recentPosts = [...posts]
    .sort((a, b) => {
      const dateA = new Date(
        a.created_at || a.scheduled_at || 0
      ).getTime();

      const dateB = new Date(
        b.created_at || b.scheduled_at || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 6);

  const upcomingPosts = [...posts]
    .filter(
      (post) => getPostStatus(post) === "scheduled"
    )
    .sort((a, b) => {
      return (
        new Date(a.scheduled_at || 0).getTime() -
        new Date(b.scheduled_at || 0).getTime()
      );
    })
    .slice(0, 5);

  const getStatusLabel = (status) => {
    if (!status) return "Draft";

    return (
      String(status).charAt(0).toUpperCase() +
      String(status).slice(1)
    );
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
            <span>✍️</span>
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
            onClick={() => navigate("/campaigns")}
          >
            <span>📢</span>
            Campaigns
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/analytics")}
          >
            <span>📊</span>
            Analytics
</button>

          <button
            className="nav-item"
            onClick={() => navigate("/social-accounts")}
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

            <div className="avatar">
              H
            </div>

            <div className="user-info">
              <span className="user-name">
                Himaja
              </span>

              <span className="user-role">
                Admin
              </span>
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

        {/* ================= HEADER ================= */}

        <header className="dash-header">

          <div>
            <h1>
              Admin Dashboard
            </h1>

            <p className="subtitle">
              Full control over your workspace.
            </p>
          </div>

          <button
            className="action-btn"
            onClick={() => navigate("/create-post")}
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
              Your admin workspace is ready.
            </p>
          </div>

        </div>

        {/* ================= ACTION GRID ================= */}

        <div className="action-grid">

          <div
            className="action-card"
            onClick={() => navigate("/create-post")}
          >
            <span>✍️</span>
            Create Post
          </div>

          <div
            className="action-card"
            onClick={() => navigate("/calendar")}
          >
            <span>📅</span>
            Calendar
          </div>

          <div
            className="action-card"
            onClick={() => navigate("/social-accounts")}
          >
            <span>👥</span>
            Social Accounts
          </div>

          <div
            className="action-card"
            onClick={() => navigate("/profile")}
          >
            <span>👤</span>
            Profile
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
                {loading ? "..." : scheduledCount}
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
                {loading ? "..." : publishedCount}
              </span>

            </div>

            <div className="metric-icon">
              ✓
            </div>

          </div>

          <div className="metric-card">

            <div className="metric-info">

              <span className="metric-title">
                FAILED
              </span>

              <span className="metric-value">
                {loading ? "..." : failedCount}
              </span>

            </div>

            <div className="metric-icon">
              ⚠
            </div>

          </div>

          <div className="metric-card">

            <div className="metric-info">

              <span className="metric-title">
                CONNECTED ACCOUNTS
              </span>

              <span className="metric-value">
                {loading ? "..." : connectedAccounts}
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
              onClick={() => navigate("/calendar")}
            >
              View calendar →
            </button>

          </div>

          <div className="posts-list">

            {loading ? (

              <div className="post-item">
                Loading posts...
              </div>

            ) : recentPosts.length === 0 ? (

              <div className="post-item">
                No posts found.
              </div>

            ) : (

              recentPosts.map((post, idx) => {

                const status = getPostStatus(post);
                const platforms = getPlatforms(post);

                return (
                  <div
                    className="post-item"
                    key={post.id || idx}
                  >

                    <div className="post-details">

                      <h4>
                        {post.content
                          ? post.content.length > 70
                            ? `${post.content.slice(0, 70)}...`
                            : post.content
                          : "Untitled Post"}
                      </h4>

                      <span className="post-date">
                        {formatDate(
                          post.scheduled_at ||
                          post.created_at
                        )}
                      </span>

                    </div>

                    <div className="post-meta">

                      <div className="tags">

                        {platforms.length > 0 ? (

                          platforms.map(
                            (platform, index) => (
                              <span
                                className="tag-platform"
                                key={index}
                              >
                                {formatPlatform(platform)}
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
                        className={`status-badge ${status}`}
                      >
                        {getStatusLabel(status)}
                      </span>

                    </div>

                  </div>
                );
              })

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
              onClick={() => navigate("/calendar")}
            >
              Open calendar →
            </button>

          </div>

          <div className="posts-list">

            {loading ? (

              <div className="post-item">
                Loading scheduled posts...
              </div>

            ) : upcomingPosts.length === 0 ? (

              <div className="post-item">
                No upcoming scheduled posts.
              </div>

            ) : (

              upcomingPosts.map((post, idx) => {

                const platforms = getPlatforms(post);

                return (
                  <div
                    className="post-item"
                    key={post.id || idx}
                  >

                    <div className="post-details">

                      <h4>
                        {post.content
                          ? post.content.length > 70
                            ? `${post.content.slice(0, 70)}...`
                            : post.content
                          : "Scheduled Post"}
                      </h4>

                      <span className="post-date">
                        {formatDate(post.scheduled_at)}
                      </span>

                    </div>

                    <div className="post-meta">

                      <div className="tags">

                        {platforms.map(
                          (platform, index) => (
                            <span
                              className="tag-platform"
                              key={index}
                            >
                              {formatPlatform(platform)}
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
              })

            )}

          </div>

        </section>

      </main>

    </div>
  );
};

export default DashboardPage;