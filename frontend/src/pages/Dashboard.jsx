import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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


      const response = await fetch(
        "http://127.0.0.1:8000/dashboard/stats",
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );


      // =================================================
      // TOKEN EXPIRED / UNAUTHORIZED
      // =================================================

      if (response.status === 401) {

        localStorage.removeItem("access_token");

        navigate("/login", { replace: true });

        return;
      }


      // =================================================
      // READ RESPONSE
      // =================================================

      const data = await response.json();


      if (!response.ok) {

        setError(
          data.detail || "Failed to load dashboard."
        );

        return;
      }


      // =================================================
      // SAVE STATS
      // =================================================

      setStats(data);

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

  }, []);


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


          <button
            className="sidebar-item active"
            onClick={() => navigate("/dashboard")}
          >
            📊
            <span>
              Analytics
            </span>
          </button>


          <button
            className="sidebar-item"
            onClick={() => navigate("/social-accounts")}
          >
            👥
            <span>
              Social Accounts
            </span>
          </button>


          <button
            className="sidebar-item"
            onClick={() => navigate("/posts")}
          >
            📝
            <span>
              My Posts
            </span>
          </button>


          <button
            className="sidebar-item"
            onClick={() => navigate("/create-post")}
          >
            ➕
            <span>
              Create Post
            </span>
          </button>

        </nav>


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
              Analytics Dashboard
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

          </div>

        </section>


      </main>

    </div>

  );

}

export default Dashboard;