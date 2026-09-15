import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./SocialAccounts.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const platformMeta = {
  instagram: {
    name: "Instagram",
    icon: "◎",
    className: "instagram",
    description: "Visual posts, reels and stories",
  },

  facebook: {
    name: "Facebook",
    icon: "f",
    className: "facebook",
    description: "Pages and audience engagement",
  },

  linkedin: {
    name: "LinkedIn",
    icon: "in",
    className: "linkedin",
    description: "Professional content and updates",
  },

  twitter: {
    name: "X / Twitter",
    icon: "𝕏",
    className: "twitter",
    description: "Short-form posts and updates",
  },

  youtube: {
    name: "YouTube",
    icon: "▶",
    className: "youtube",
    description: "Videos and channel publishing",
  },
};

function SocialAccounts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState("instagram");
  const [username, setUsername] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [connecting, setConnecting] = useState("");

  const token = localStorage.getItem("access_token");

  // --------------------------------------------------
  // FETCH SOCIAL ACCOUNTS
  // --------------------------------------------------

  const fetchAccounts = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/social-accounts/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load social accounts");
      }

      const data = await response.json();

      setAccounts(data);
    } catch (err) {
      console.error("Fetch accounts error:", err);

      setError("Unable to load social accounts");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    fetchAccounts();
  }, []);

  // --------------------------------------------------
  // HANDLE OAUTH CALLBACK
  // --------------------------------------------------

  useEffect(() => {
    const statusMap = {
      linkedin: {
        connected: "LinkedIn account connected successfully!",
        error: "LinkedIn connection failed",
      },

      youtube: {
        connected: "YouTube channel connected successfully!",
        error: "YouTube connection failed",
      },

      instagram: {
        connected: "Instagram account connected successfully!",
        error: "Instagram connection failed",
      },
    };

    ["linkedin", "youtube", "instagram"].forEach((service) => {
      const status = searchParams.get(service);

      if (!status) {
        return;
      }

      // Successful OAuth connection
      if (status === "connected") {
        setMessage(
          statusMap[service].connected
        );

        setError("");

        fetchAccounts();
      }

      // Failed OAuth connection
      if (status === "error") {
        setError(
          searchParams.get("message") ||
            statusMap[service].error
        );

        setMessage("");
      }
    });
  }, [searchParams]);

  // --------------------------------------------------
  // GENERIC OAUTH FUNCTION
  // --------------------------------------------------

  const startOAuth = async (
    service,
    endpoint
  ) => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setConnecting(service);

      setMessage("");
      setError("");

      const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("access_token");

        navigate("/login");

        return;
      }

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            `Unable to connect ${service}`
        );
      }

      if (!data.authorization_url) {
        throw new Error(
          `${service} authorization URL was not returned`
        );
      }

      // Redirect user to OAuth provider
      window.location.href =
        data.authorization_url;

    } catch (err) {
      console.error(
        `${service} connection error:`,
        err
      );

      setError(
        err.message ||
          `Unable to connect ${service}`
      );
    } finally {
      setConnecting("");
    }
  };

  // --------------------------------------------------
  // LINKEDIN
  // --------------------------------------------------

  const connectLinkedIn = () => {
    startOAuth(
      "LinkedIn",
      "/social-accounts/linkedin/login"
    );
  };

  // --------------------------------------------------
  // YOUTUBE
  // --------------------------------------------------

  const connectYouTube = () => {
    startOAuth(
      "YouTube",
      "/social-accounts/youtube/login"
    );
  };

  // --------------------------------------------------
  // ADD MANUAL ACCOUNT
  // --------------------------------------------------

  const handleAddAccount = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!username.trim()) {
      setError(
        "Please enter a username or channel name."
      );

      return;
    }

    try {
      setConnecting("manual");

      const body = new URLSearchParams();

      body.append(
        "platform",
        platform
      );

      body.append(
        "username",
        username.trim()
      );

      if (accessToken.trim()) {
        body.append(
          "access_token",
          accessToken.trim()
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/social-accounts/`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body: body.toString(),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to add account"
        );
      }

      setMessage(
        "Social account added successfully."
      );

      setUsername("");

      setAccessToken("");

      await fetchAccounts();

    } catch (err) {
      console.error(
        "Add account error:",
        err
      );

      setError(
        err.message ||
          "Failed to add social account"
      );

    } finally {
      setConnecting("");
    }
  };

  // --------------------------------------------------
  // CONNECT DISCONNECTED ACCOUNT
  // --------------------------------------------------

  const handleConnect = async (
    accountId,
    enteredToken
  ) => {
    if (!enteredToken?.trim()) {
      setError(
        "Please enter an access token."
      );

      return;
    }

    try {
      setConnecting(
        `account-${accountId}`
      );

      setMessage("");
      setError("");

      const body = new URLSearchParams();

      body.append(
        "access_token",
        enteredToken.trim()
      );

      const response = await fetch(
        `${API_BASE_URL}/social-accounts/${accountId}/connect`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body: body.toString(),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to connect account"
        );
      }

      setMessage(
        "Account connected successfully."
      );

      await fetchAccounts();

    } catch (err) {
      console.error(
        "Connect account error:",
        err
      );

      setError(
        err.message ||
          "Failed to connect account"
      );

    } finally {
      setConnecting("");
    }
  };

  // --------------------------------------------------
  // DISCONNECT ACCOUNT
  // --------------------------------------------------

  const handleDisconnect = async (
    accountId
  ) => {
    try {
      setConnecting(
        `account-${accountId}`
      );

      setMessage("");
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/social-accounts/${accountId}/disconnect`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to disconnect account"
        );
      }

      setMessage(
        "Account disconnected successfully."
      );

      await fetchAccounts();

    } catch (err) {
      console.error(
        "Disconnect error:",
        err
      );

      setError(
        err.message ||
          "Failed to disconnect account"
      );

    } finally {
      setConnecting("");
    }
  };

  // --------------------------------------------------
  // DELETE ACCOUNT
  // --------------------------------------------------

  const handleDelete = async (
    accountId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this social account?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setConnecting(
        `account-${accountId}`
      );

      setMessage("");
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/social-accounts/${accountId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to delete account"
        );
      }

      setMessage(
        "Social account deleted successfully."
      );

      await fetchAccounts();

    } catch (err) {
      console.error(
        "Delete account error:",
        err
      );

      setError(
        err.message ||
          "Failed to delete account"
      );

    } finally {
      setConnecting("");
    }
  };

  // --------------------------------------------------
  // GET PLATFORM INFORMATION
  // --------------------------------------------------

  const getMeta = (name) => {
    return (
      platformMeta[
        name?.toLowerCase()
      ] || {
        name: name,

        icon: "•",

        className: "default",

        description:
          "Connected social account",
      }
    );
  };

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="social-accounts-page">
        <div className="social-loading">

          <div className="loading-orb"></div>

          <h2>
            Loading your social workspace
          </h2>

          <p>
            Checking connected accounts...
          </p>

        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ACCOUNT STATISTICS
  // --------------------------------------------------

  const connectedCount =
    accounts.filter(
      (account) =>
        account.connected
    ).length;

  const disconnectedCount =
    accounts.length -
    connectedCount;

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <div className="social-accounts-page">

      <div className="social-shell">

        {/* =========================================
            PAGE HEADER
        ========================================== */}

        <header className="social-hero">

          <div>

            <span className="eyebrow">
              SOCIALPILOT • CONNECTION CENTER
            </span>

            <h1>
              Social Accounts
            </h1>

            <p>
              Connect your social channels
              once and manage publishing
              from one workspace.
            </p>

          </div>

          <button
            className="back-dashboard-btn"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>←</span>

            Dashboard
          </button>

        </header>

        {/* =========================================
            MESSAGE / ERROR
        ========================================== */}

        {(message || error) && (
          <div
            className={
              message
                ? "notice success-message"
                : "notice error-message"
            }
          >

            <span className="notice-dot"></span>

            {message || error}

          </div>
        )}

        {/* =========================================
            OVERVIEW CARDS
        ========================================== */}

        <section className="connection-overview">

          {/* Connected */}

          <div className="overview-card overview-primary">

            <span className="overview-icon">
              ◉
            </span>

            <div>

              <strong>
                {connectedCount}
              </strong>

              <span>
                Connected accounts
              </span>

            </div>

          </div>

          {/* Attention */}

          <div className="overview-card">

            <span className="overview-icon muted">
              ○
            </span>

            <div>

              <strong>
                {disconnectedCount}
              </strong>

              <span>
                Needs attention
              </span>

            </div>

          </div>

          {/* Total */}

          <div className="overview-card">

            <span className="overview-icon">
              ✦
            </span>

            <div>

              <strong>
                {accounts.length}
              </strong>

              <span>
                Total channels
              </span>

            </div>

          </div>

        </section>

        {/* =========================================
            OAUTH CONNECTION SECTION
        ========================================== */}

        <section className="oauth-section">

          <div className="section-heading">

            <div>

              <span className="section-kicker">
                RECOMMENDED
              </span>

              <h2>
                Connect securely
              </h2>

              <p>
                Use OAuth for supported
                platforms so SocialPilot
                never needs your password.
              </p>

            </div>

          </div>

          <div className="oauth-cards">

            {/* =====================================
                LINKEDIN
            ====================================== */}

            <article className="oauth-card linkedin-card">

              <div className="platform-brand linkedin-brand">
                in
              </div>

              <div className="oauth-info">

                <div className="card-title-row">

                  <h3>
                    LinkedIn
                  </h3>

                  <span className="available-badge">
                    OAuth
                  </span>

                </div>

                <p>
                  Publish professional
                  content directly to your
                  LinkedIn profile.
                </p>

              </div>

              <button
                className="oauth-btn linkedin-btn"
                onClick={connectLinkedIn}
                disabled={
                  connecting ===
                  "LinkedIn"
                }
              >

                {connecting ===
                "LinkedIn"
                  ? "Connecting..."
                  : "Connect"}

              </button>

            </article>

            {/* =====================================
                YOUTUBE
            ====================================== */}

            <article className="oauth-card youtube-card">

              <div className="platform-brand youtube-brand">
                ▶
              </div>

              <div className="oauth-info">

                <div className="card-title-row">

                  <h3>
                    YouTube
                  </h3>

                  <span className="available-badge">
                    OAuth
                  </span>

                </div>

                <p>
                  Connect your channel
                  with Google OAuth for
                  secure publishing.
                </p>

              </div>

              <button
                className="oauth-btn youtube-btn"
                onClick={connectYouTube}
                disabled={
                  connecting ===
                  "YouTube"
                }
              >

                {connecting ===
                "YouTube"
                  ? "Connecting..."
                  : "Connect"}

              </button>

            </article>

            {/* =====================================
                INSTAGRAM
            ====================================== */}

            <article className="oauth-card coming-card">

              <div className="platform-brand instagram-brand">
                ◎
              </div>

              <div className="oauth-info">

                <div className="card-title-row">

                  <h3>
                    Instagram
                  </h3>

                  <span className="soon-badge">
                    Setup next
                  </span>

                </div>

                <p>
                  Professional account
                  connection is ready for
                  the Meta OAuth setup.
                </p>

              </div>

              <span className="coming-label">
                Coming next
              </span>

            </article>

          </div>

        </section>

        {/* =========================================
            ACCOUNTS + ADD ACCOUNT
        ========================================== */}

        <section className="accounts-layout">

          {/* =======================================
              CONNECTED ACCOUNTS
          ======================================== */}

          <div className="accounts-panel">

            <div className="section-heading compact">

              <div>

                <span className="section-kicker">
                  YOUR CHANNELS
                </span>

                <h2>
                  Connected accounts
                </h2>

              </div>

              <span className="count-pill">
                {accounts.length}
              </span>

            </div>

            {/* No accounts */}

            {accounts.length === 0 ? (

              <div className="empty-accounts">

                <div className="empty-icon">
                  ◎
                </div>

                <h3>
                  No social accounts yet
                </h3>

                <p>
                  Connect a platform above
                  to start publishing through
                  SocialPilot.
                </p>

              </div>

            ) : (

              <div className="account-list">

                {accounts.map(
                  (account) => {

                    const meta =
                      getMeta(
                        account.platform
                      );

                    const busy =
                      connecting ===
                      `account-${account.id}`;

                    return (

                      <article
                        className="account-item"
                        key={account.id}
                      >

                        {/* Platform Icon */}

                        <div
                          className={`account-icon ${meta.className}`}
                        >
                          {meta.icon}
                        </div>

                        {/* Account Information */}

                        <div className="account-main">

                          <div className="account-name-row">

                            <h3>
                              {meta.name}
                            </h3>

                            <span
                              className={`status-badge ${
                                account.connected
                                  ? "connected"
                                  : "disconnected"
                              }`}
                            >

                              <span></span>

                              {account.connected
                                ? "Connected"
                                : "Disconnected"}

                            </span>

                          </div>

                          <p>
                            @{account.username}
                          </p>

                        </div>

                        {/* Account Actions */}

                        <div className="account-actions">

                          {/* Connect */}

                          {!account.connected && (

                            <button
                              className="small-action primary"
                              disabled={busy}
                              onClick={() => {

                                const enteredToken =
                                  window.prompt(
                                    `Enter ${account.platform} access token:`
                                  );

                                if (
                                  enteredToken?.trim()
                                ) {

                                  handleConnect(
                                    account.id,
                                    enteredToken
                                  );

                                }

                              }}
                            >

                              {busy
                                ? "..."
                                : "Connect"}

                            </button>

                          )}

                          {/* Disconnect */}

                          {account.connected && (

                            <button
                              className="small-action secondary"
                              disabled={busy}
                              onClick={() =>
                                handleDisconnect(
                                  account.id
                                )
                              }
                            >

                              {busy
                                ? "..."
                                : "Disconnect"}

                            </button>

                          )}

                          {/* Delete */}

                          <button
                            className="delete-icon-btn"
                            disabled={busy}
                            title="Delete account"
                            onClick={() =>
                              handleDelete(
                                account.id
                              )
                            }
                          >
                            ×
                          </button>

                        </div>

                      </article>

                    );
                  }
                )}

              </div>

            )}

          </div>

          {/* =======================================
              MANUAL ADD ACCOUNT
          ======================================== */}

          <aside className="manual-panel">

            <div className="manual-header">

              <span className="section-kicker">
                ADVANCED
              </span>

              <h2>
                Add an account
              </h2>

              <p>
                Use this form for platforms
                that are not yet connected
                through OAuth.
              </p>

            </div>

            <form
              onSubmit={
                handleAddAccount
              }
            >

              {/* Platform */}

              <label>

                Platform

                <select
                  value={platform}
                  onChange={(e) =>
                    setPlatform(
                      e.target.value
                    )
                  }
                >

                  <option value="instagram">
                    Instagram
                  </option>

                  <option value="facebook">
                    Facebook
                  </option>

                  <option value="linkedin">
                    LinkedIn
                  </option>

                  <option value="twitter">
                    Twitter / X
                  </option>

                  <option value="youtube">
                    YouTube
                  </option>

                </select>

              </label>

              {/* Username */}

              <label>

                Username / channel

                <input
                  type="text"
                  placeholder="e.g. socialpilot"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                    )
                  }
                />

              </label>

              {/* Access Token */}

              <label>

                Access token

                <input
                  type="password"
                  placeholder="Paste token if required"
                  value={accessToken}
                  onChange={(e) =>
                    setAccessToken(
                      e.target.value
                    )
                  }
                />

              </label>

              {/* Add Button */}

              <button
                className="add-account-btn"
                type="submit"
                disabled={
                  connecting ===
                  "manual"
                }
              >

                {connecting ===
                "manual"
                  ? "Adding account..."
                  : "+ Add account"}

              </button>

            </form>

            {/* Security Information */}

            <div className="security-note">

              <span>
                ✓
              </span>

              <p>
                For production use, prefer
                OAuth connections instead of
                manually entering tokens.
              </p>

            </div>

          </aside>

        </section>

      </div>

    </div>
  );
}

export default SocialAccounts;