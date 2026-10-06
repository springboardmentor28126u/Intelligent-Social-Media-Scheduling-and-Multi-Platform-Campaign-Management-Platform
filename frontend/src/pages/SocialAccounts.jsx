import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SocialAccounts.css";

const API_BASE = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

export default function SocialAccounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Platform configuration
  // --------------------------------------------------

  const platforms = [
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "in",
      color: "linkedin",
      badge: "OAUTH",
      description:
        "Publish professional content directly to your LinkedIn profile.",
      oauth: true,
      endpoint: "/social-accounts/linkedin/login",
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: "▶",
      color: "youtube",
      badge: "OAUTH",
      description:
        "Connect your channel with Google OAuth for secure publishing.",
      oauth: true,
      endpoint: "/social-accounts/youtube/login",
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: "f",
      color: "facebook",
      badge: "OAUTH",
      description:
        "Connect your Facebook Page through Meta OAuth for publishing.",
      oauth: true,
      endpoint: "/social-accounts/facebook/login",
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: "◎",
      color: "instagram",
      badge: "OAUTH",
      description:
        "Connect your Instagram Creator account through Instagram OAuth.",
      oauth: true,
      endpoint: "/social-accounts/instagram/login",
    },
    {
      id: "twitter",
      name: "X / Twitter",
      icon: "𝕏",
      color: "twitter",
      badge: "OAUTH",
      description:
        "Connect your X account and publish text posts directly.",
      oauth: true,
      endpoint: "/social-accounts/x/login",
    },
  ];

  // --------------------------------------------------
  // Load connected accounts
  // --------------------------------------------------

  useEffect(() => {
    // Check OAuth callback messages
    const params = new URLSearchParams(window.location.search);

    const linkedinStatus = params.get("linkedin");
    const youtubeStatus = params.get("youtube");
    const facebookStatus = params.get("facebook");
    const instagramStatus = params.get("instagram");
    const twitterStatus = params.get("twitter");

    const callbackError = params.get("error");
    const callbackMessage = params.get("message");

    const isOAuthCallback =
      linkedinStatus ||
      youtubeStatus ||
      facebookStatus ||
      instagramStatus ||
      twitterStatus ||
      callbackError;

    if (linkedinStatus === "connected") {
      setMessage("LinkedIn account connected successfully.");
    }

    if (youtubeStatus === "connected") {
      setMessage("YouTube channel connected successfully.");
    }

    if (facebookStatus === "connected") {
      setMessage("Facebook Page connected successfully.");
    }

    if (instagramStatus === "connected") {
      setMessage("Instagram account connected successfully.");
    }

    if (twitterStatus === "connected") {
      setMessage("X account connected successfully.");
    }

    if (
      linkedinStatus === "error" ||
      youtubeStatus === "error" ||
      facebookStatus === "error" ||
      instagramStatus === "error" ||
      twitterStatus === "error" ||
      callbackError
    ) {
      setError(
        callbackMessage
          ? decodeURIComponent(callbackMessage)
          : decodeURIComponent(
              callbackError || "Social account connection failed."
            )
      );
    }

    // Remove OAuth query parameters from browser URL
    if (isOAuthCallback || callbackMessage) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    // Load accounts after OAuth callback
    loadAccounts();
  }, []);

  // --------------------------------------------------
  // Fetch accounts
  // --------------------------------------------------

  async function loadAccounts() {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/social-accounts`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your login session has expired.");
        }

        const data = await response.json().catch(() => null);

        throw new Error(
          data?.detail || "Unable to load connected social accounts."
        );
      }

      const data = await response.json();

      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD ACCOUNTS ERROR:", err);
      setError(err.message || "Unable to load social accounts.");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // OAuth Connect
  // --------------------------------------------------

  async function connectOAuth(platform) {
    if (!platform.oauth || !platform.endpoint) {
      return;
    }

    setConnecting(platform.id);
    setMessage("");
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please login before connecting a social account.");
      }

      const endpoint = new URL(`${API_BASE}${platform.endpoint}`);
      if (platform.id === "facebook" || platform.id === "twitter") {
        endpoint.searchParams.set("frontend_origin", window.location.origin);
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.detail ||
            `Unable to start ${platform.name} OAuth connection.`
        );
      }

      const data = await response.json();

      if (!data.authorization_url) {
        throw new Error(
          `${platform.name} authorization URL was not returned by the backend.`
        );
      }

      // Redirect browser to LinkedIn / Google / Meta
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error(`${platform.name} CONNECT ERROR:`, err);

      setError(
        err.message ||
          `Unable to connect your ${platform.name} account.`
      );

      setConnecting("");
    }
  }

  // --------------------------------------------------
  // Disconnect account
  // --------------------------------------------------

  async function disconnectAccount(accountId) {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect this social account?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch(
        `${API_BASE}/social-accounts/${accountId}/disconnect`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.detail || "Unable to disconnect the account."
        );
      }

      setMessage("Social account disconnected successfully.");

      await loadAccounts();
    } catch (err) {
      console.error("DISCONNECT ERROR:", err);
      setError(err.message || "Unable to disconnect account.");
    }
  }

  // --------------------------------------------------
  // Delete account
  // --------------------------------------------------

  async function deleteAccount(accountId) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently remove this social account?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch(
        `${API_BASE}/social-accounts/${accountId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.detail || "Unable to delete the social account."
        );
      }

      setMessage("Social account removed successfully.");

      await loadAccounts();
    } catch (err) {
      console.error("DELETE ACCOUNT ERROR:", err);
      setError(err.message || "Unable to delete account.");
    }
  }

  // --------------------------------------------------
  // Platform icon
  // --------------------------------------------------

  function renderIcon(platform) {
    return (
      <div className={`platform-icon ${platform.color}`}>
        {platform.icon}
      </div>
    );
  }

  // --------------------------------------------------
  // Get platform information
  // --------------------------------------------------

  function getPlatform(platformName) {
    if (!platformName) {
      return null;
    }

    return platforms.find(
      (platform) =>
        platform.id.toLowerCase() === platformName.toLowerCase()
    );
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="social-accounts-page">
      {/* --------------------------------------------- */}
      {/* Page Header */}
      {/* --------------------------------------------- */}

      <div className="social-page-header">
        <div>
          <div className="social-eyebrow">SOCIAL INTEGRATIONS</div>

          <h1>Social Accounts</h1>

          <p>
            Connect your social media accounts and publish scheduled
            content directly from SocialPilot.
          </p>
        </div>

        <div className="social-header-actions">
          <button
            className="back-dashboard-button"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>

          <button
            className="refresh-button"
            onClick={loadAccounts}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* --------------------------------------------- */}
      {/* Messages */}
      {/* --------------------------------------------- */}

      {message && (
        <div className="success-message">
          <span>✓</span>
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>!</span>
          {error}
        </div>
      )}

      {/* --------------------------------------------- */}
      {/* OAuth Platform Cards */}
      {/* --------------------------------------------- */}

      <div className="platform-grid">
        {platforms
          .filter(
            (platform) =>
              platform.id === "linkedin" ||
              platform.id === "youtube" ||
              platform.id === "facebook" ||
              platform.id === "instagram" ||
              platform.id === "twitter"
          )
          .map((platform) => {
            const isConnecting = connecting === platform.id;
            const isConnected = accounts.some(
              (account) =>
                account.platform === platform.id && account.connected
            );

            return (
              <div
                className={`platform-card ${platform.color}`}
                key={platform.id}
              >
                <div className="platform-card-top">
                  {renderIcon(platform)}

                  <span className="platform-badge">
                    {platform.badge}
                  </span>
                </div>

                <h2>{platform.name}</h2>

                <p>{platform.description}</p>

                <button
                  className={`connect-button ${platform.color}`}
                  onClick={() => connectOAuth(platform)}
                  disabled={isConnecting}
                >
                  {isConnecting
                    ? "Connecting..."
                    : isConnected
                      ? "Reconnect"
                      : "Connect"}
                </button>
              </div>
            );
          })}

      </div>

      {/* --------------------------------------------- */}
      {/* Connected Accounts */}
      {/* --------------------------------------------- */}

      <div className="accounts-section">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">YOUR CHANNELS</div>

            <h2>Connected accounts</h2>
          </div>

          <div className="account-count">
            {accounts.length}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner"></div>

            <p>Loading connected accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◎</div>

            <h3>No connected accounts</h3>

            <p>
              Connect LinkedIn, Facebook, YouTube, Instagram, or X
              using the OAuth buttons above.
            </p>
          </div>
        ) : (
          <div className="connected-account-list">
            {accounts.map((account) => {
              const platform =
                getPlatform(account.platform) || {
                  id: account.platform,
                  name: account.platform,
                  icon: "?",
                  color: "default",
                };

              return (
                <div
                  className="connected-account"
                  key={account.id}
                >
                  <div className="connected-account-left">
                    {renderIcon(platform)}

                    <div className="connected-account-info">
                      <div className="account-title-row">
                        <h3>
                          {platform.name ||
                            account.platform}
                        </h3>

                        <span className="connected-badge">
                          <span className="status-dot"></span>
                          CONNECTED
                        </span>
                      </div>

                      <p>
                        {account.username ||
                          account.channel_id ||
                          "Connected account"}
                      </p>

                      {account.page_id && (
                        <small>
                          Page ID: {account.page_id}
                        </small>
                      )}

                      {account.channel_id && (
                        <small>
                          Account ID: {account.channel_id}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="connected-account-actions">
                    <button
                      className="disconnect-button"
                      onClick={() =>
                        disconnectAccount(account.id)
                      }
                    >
                      Disconnect
                    </button>

                    <button
                      className="delete-account-button"
                      onClick={() =>
                        deleteAccount(account.id)
                      }
                      title="Remove account"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --------------------------------------------- */}
      {/* OAuth Information */}
      {/* --------------------------------------------- */}

      <div className="oauth-info-card">
        <div className="oauth-info-icon">🔐</div>

        <div>
          <h3>Secure OAuth connections</h3>

          <p>
            SocialPilot uses OAuth authentication for supported
            platforms. You don't need to manually copy or paste
            access tokens. You authorize SocialPilot through the
            platform's official login page, and the backend securely
            stores the required authorization information.
          </p>
        </div>
      </div>

      {/* --------------------------------------------- */}
      {/* Supported / Coming Soon */}
      {/* --------------------------------------------- */}

      <div className="integration-status-section">
        <div className="section-eyebrow">
          INTEGRATION STATUS
        </div>

        <div className="integration-status-grid">
          <div className="integration-status-item">
            <span className="status-dot active"></span>

            <div>
              <strong>LinkedIn</strong>
              <small>OAuth + publishing</small>
            </div>
          </div>

          <div className="integration-status-item">
            <span className="status-dot active"></span>

            <div>
              <strong>Facebook</strong>
              <small>Meta OAuth + Page publishing setup</small>
            </div>
          </div>

          <div className="integration-status-item">
            <span className="status-dot active"></span>

            <div>
              <strong>YouTube</strong>
              <small>Google OAuth setup</small>
            </div>
          </div>

          <div className="integration-status-item">
            <span className="status-dot active"></span>

            <div>
              <strong>Instagram</strong>
              <small>Instagram OAuth setup</small>
            </div>
          </div>

          <div className="integration-status-item">
            <span className="status-dot active"></span>

            <div>
              <strong>X / Twitter</strong>
              <small>OAuth + text publishing</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}