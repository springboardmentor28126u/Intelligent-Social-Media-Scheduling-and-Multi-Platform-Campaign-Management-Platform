import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminDashboardPage.css";

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get("/admin/stats");
        setStats(response.data);
      } catch (error) {
        setError(
          error.response?.data?.detail ||
            "Failed to load admin dashboard"
        );
      }
    };

    loadStats();
  }, []);

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  if (!stats) {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div className="admin-dashboard">

      {/* Top Bar */}
      <header className="admin-topbar">
        <div className="admin-search">
          🔍
          <input
            type="text"
            placeholder="Search users, posts, or accounts..."
          />
        </div>

        <div className="admin-topbar-right">
          <span className="notification">🔔</span>

          <div className="admin-user">
            <div className="admin-avatar">A</div>
            <span>Admin</span>
            <span>⌄</span>
          </div>
        </div>
      </header>

      <div className="admin-content">

        {/* Header */}
        <div className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>System overview and activity</p>
          </div>

          <button className="date-button">
            📅 &nbsp; Today
          </button>
        </div>

        {/* User Statistics */}
        <section className="admin-section">
          <div className="admin-card-grid three">

            <div className="admin-stat-card">
              <div className="stat-icon">👥</div>
              <div>
                <span>Total Users</span>
                <strong>{stats.users.total}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">🛡</div>
              <div>
                <span>Admins</span>
                <strong>{stats.users.admins}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">👤</div>
              <div>
                <span>Normal Users</span>
                <strong>{stats.users.normal_users}</strong>
              </div>
            </div>

          </div>
        </section>

        {/* Social Accounts */}
        <section className="admin-section">
          <div className="admin-card-grid two">

            <div className="admin-stat-card large">
              <div className="stat-icon">🔗</div>
              <div>
                <span>Total Social Accounts</span>
                <strong>{stats.social_accounts.total}</strong>
              </div>
            </div>

            <div className="admin-stat-card large">
              <div className="stat-icon">✓</div>
              <div>
                <span>Active Accounts</span>
                <strong>{stats.social_accounts.active}</strong>
              </div>
            </div>

          </div>
        </section>

        {/* Posts */}
        <section className="admin-section">
          <h2>Posts</h2>

          <div className="admin-card-grid six">

            <div className="admin-stat-card">
              <div className="stat-icon">▤</div>
              <div>
                <span>Total Posts</span>
                <strong>{stats.posts.total}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">□</div>
              <div>
                <span>Draft</span>
                <strong>{stats.posts.draft}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">◷</div>
              <div>
                <span>Scheduled</span>
                <strong>{stats.posts.scheduled}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">➤</div>
              <div>
                <span>Publishing</span>
                <strong>{stats.posts.publishing}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">✓</div>
              <div>
                <span>Published</span>
                <strong>{stats.posts.published}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">!</div>
              <div>
                <span>Failed</span>
                <strong>{stats.posts.failed}</strong>
              </div>
            </div>

          </div>
        </section>

        {/* Publishing Logs */}
        <section className="admin-section">
          <div className="logs-card">

            <div className="logs-header">
              <div>
                <h2>Publishing Logs</h2>
                <p>System publishing activity</p>
              </div>
            </div>

            <div className="logs-stats">

              <div>
                <span>Total Logs</span>
                <strong>{stats.publishing_logs.total}</strong>
              </div>

              <div>
                <span>Successful</span>
                <strong>{stats.publishing_logs.successful}</strong>
              </div>

              <div>
                <span>Failed</span>
                <strong>{stats.publishing_logs.failed}</strong>
              </div>

            </div>

          </div>
        </section>

        {/* Recent Users */}
        <section className="admin-section">
          <div className="recent-users-card">

            <div className="recent-users-header">
              <div>
                <h2>Recent Users</h2>
                <p>User details will appear here</p>
              </div>

              <button
                className="view-users-button"
                onClick={() => navigate("/admin/users")}
              >
                View all users →
              </button>
            </div>

            <div className="users-empty">
              <div className="users-empty-icon">👥</div>

              <p>
                User details will be connected to the Admin Users API
                next.
              </p>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}