import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import api from "../services/api";

const platforms = [
  { key: "instagram", name: "Instagram", icon: "📷" },
  { key: "facebook", name: "Facebook", icon: "📘" },
  { key: "twitter", name: "X (Twitter)", icon: "𝕏" },
  { key: "linkedin", name: "LinkedIn", icon: "💼" },
  { key: "youtube", name: "YouTube", icon: "▶️" },
  { key: "pinterest", name: "Pinterest", icon: "📌" },
];

const SocialAccountsPage = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const loadAccounts = async () => {
    try {
      setError("");

      const response = await api.get("/social-accounts/");
      setAccounts(response.data || []);
    } catch (err) {
      console.error("Social accounts loading error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load social accounts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const getAccount = (platform) => {
    return accounts.find(
      (account) =>
        account.platform?.toLowerCase() === platform.toLowerCase() &&
        account.is_active !== false
    );
  };

  const handleConnect = async (platform) => {
    try {
      setActionLoading(platform);
      setError("");

      const response = await api.get(
        `/social-auth/${platform}/authorize`
      );

      if (!response.data?.authorization_url) {
        throw new Error(
          "Authorization URL was not returned by the server."
        );
      }

      window.location.href = response.data.authorization_url;
    } catch (err) {
      console.error("Social account connection error:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          `Unable to connect ${platform}.`
      );

      setActionLoading(null);
    }
  };

  const handleDisconnect = async (account) => {
    const confirmed = window.confirm(
      `Are you sure you want to disconnect ${
        account.account_name || account.platform
      }?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(account.id);
      setError("");

      await api.delete(`/social-accounts/${account.id}`);

      await loadAccounts();
    } catch (err) {
      console.error("Social account disconnect error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to disconnect the social account."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <h2>SocialPilot</h2>
        </div>

        <nav className="nav-menu">
          <button
            className="nav-item"
            onClick={() => navigate("/dashboard")}
          >
            🏠 Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/create-post")}
          >
            ✏️ Create Post
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/calendar")}
          >
            📅 Calendar
          </button>

          <button
            className="nav-item active"
            onClick={() => navigate("/social-accounts")}
          >
            🔗 Social Accounts
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/campaigns")}
          >
            📣 Campaigns
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/analytics")}
          >
            📊 Analytics
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/profile")}
          >
            👤 Profile
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("access_token");
              navigate("/");
            }}
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="dash-header">
          <div>
            <h1>Social Accounts</h1>

            <p className="subtitle">
              Connect and manage your social media accounts
            </p>
          </div>

          <button
            className="action-btn"
            onClick={handleBack}
          >
            ← Dashboard
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Loading social accounts...
          </div>
        ) : (
          <section className="section-block">
            <div className="section-header">
              <div>
                <h2>Connected Accounts</h2>

                <p className="subtitle">
                  Manage your connected social platforms.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {platforms.map((platform) => {
                const account = getAccount(platform.key);

                const isConnected = Boolean(account);

                const busy =
                  actionLoading === platform.key ||
                  actionLoading === account?.id;

                return (
                  <div
                    key={platform.key}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "22px",
                      background: "#ffffff",
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "18px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "28px",
                          }}
                        >
                          {platform.icon}
                        </span>

                        <div>
                          <h3
                            style={{
                              marginBottom: "4px",
                              color: "#111827",
                            }}
                          >
                            {platform.name}
                          </h3>

                          <span
                            style={{
                              fontSize: "13px",
                              color: "#6b7280",
                            }}
                          >
                            {isConnected
                              ? account.account_name ||
                                "Connected account"
                              : "Not connected"}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: isConnected
                            ? "#d1fae5"
                            : "#f3f4f6",
                          color: isConnected
                            ? "#047857"
                            : "#6b7280",
                        }}
                      >
                        {isConnected
                          ? "Connected"
                          : "Not Connected"}
                      </span>
                    </div>

                    {isConnected && (
                      <div
                        style={{
                          marginBottom: "16px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Account ID: {account.id}
                      </div>
                    )}

                    {isConnected ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleDisconnect(account)
                        }
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          border: "1px solid #fecaca",
                          background: "#ffffff",
                          color: "#dc2626",
                          fontWeight: "600",
                          cursor: busy
                            ? "not-allowed"
                            : "pointer",
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        {busy
                          ? "Disconnecting..."
                          : "Disconnect"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleConnect(platform.key)
                        }
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#10b981",
                          color: "#ffffff",
                          fontWeight: "600",
                          cursor: busy
                            ? "not-allowed"
                            : "pointer",
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        {busy
                          ? "Connecting..."
                          : `Connect ${platform.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default SocialAccountsPage;