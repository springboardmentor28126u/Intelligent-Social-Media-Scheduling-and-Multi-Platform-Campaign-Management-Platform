
import { useEffect, useState } from "react";
import "./App.css";
import Calendar from "./Calendar";

const API_URL = "http://localhost:5000/api";

function App() {
  // ================= LOGIN =================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [page, setPage] = useState("dashboard");

  // ================= SOCIAL ACCOUNTS =================
  const [accounts, setAccounts] = useState([]);
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");

  // ================= CAMPAIGNS =================
  const [campaigns, setCampaigns] = useState([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingCampaignId, setEditingCampaignId] = useState(null);

  // ================= POSTS =================
  const [posts, setPosts] = useState([]);
  const [postCampaignId, setPostCampaignId] = useState("");
  const [postAccountId, setPostAccountId] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postMediaUrl, setPostMediaUrl] = useState("");
  const [postScheduledTime, setPostScheduledTime] = useState("");

  // ================= SCHEDULED POSTS =================
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [schedulePostId, setSchedulePostId] = useState("");
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("Logging in...");

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);

      setMessage("");
      setLoggedIn(true);
      setPage("dashboard");
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to backend");
    }
  };

  // =========================================================
  // SOCIAL ACCOUNTS
  // =========================================================

  const loadAccounts = async () => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/social-accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load accounts");
        return;
      }

      setAccounts(data.accounts || []);
      setPage("accounts");
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const addAccount = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/social-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform,
          username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to add account");
        return;
      }

      alert("Social account added successfully!");

      setPlatform("");
      setUsername("");

      loadAccounts();
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const deleteAccount = async (accountId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this account?"
    );

    if (!confirmDelete) return;

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_URL}/social-accounts/${accountId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete account");
        return;
      }

      alert("Social account deleted successfully!");

      loadAccounts();
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  // =========================================================
  // CAMPAIGNS
  // =========================================================

  const loadCampaigns = async () => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load campaigns");
        return;
      }

      setCampaigns(data.campaigns || []);
      setPage("campaigns");
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const addCampaign = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaign_name: campaignName,
          description: campaignDescription,
          status: campaignStatus,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to create campaign");
        return;
      }

      alert("Campaign created successfully!");

      clearCampaignForm();
      loadCampaigns();
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const startEditCampaign = (campaign) => {
    setEditingCampaignId(campaign.campaign_id);

    setCampaignName(campaign.campaign_name);
    setCampaignDescription(campaign.description || "");
    setCampaignStatus(campaign.status || "draft");

    setStartDate(
      campaign.start_date
        ? campaign.start_date.substring(0, 10)
        : ""
    );

    setEndDate(
      campaign.end_date
        ? campaign.end_date.substring(0, 10)
        : ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const updateCampaign = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_URL}/campaigns/${editingCampaignId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            campaign_name: campaignName,
            description: campaignDescription,
            status: campaignStatus,
            start_date: startDate || null,
            end_date: endDate || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update campaign");
        return;
      }

      alert("Campaign updated successfully!");

      clearCampaignForm();
      loadCampaigns();
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const deleteCampaign = async (campaignId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this campaign?"
    );

    if (!confirmDelete) return;

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_URL}/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete campaign");
        return;
      }

      alert("Campaign deleted successfully!");

      loadCampaigns();
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const clearCampaignForm = () => {
    setEditingCampaignId(null);
    setCampaignName("");
    setCampaignDescription("");
    setCampaignStatus("draft");
    setStartDate("");
    setEndDate("");
  };

  // =========================================================
  // POSTS
  // =========================================================

  const loadPosts = async () => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load posts");
        return;
      }

      setPosts(data.posts || []);
      setPage("posts");
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const createPost = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaign_id: Number(postCampaignId),
          account_id: Number(postAccountId),
          content: postContent,
          media_url: postMediaUrl || null,
          scheduled_time: postScheduledTime || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to create post");
        return;
      }

      alert("Post created successfully!");

      setPostCampaignId("");
      setPostAccountId("");
      setPostContent("");
      setPostMediaUrl("");
      setPostScheduledTime("");

      loadPosts();
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  // =========================================================
  // SCHEDULED POSTS
  // =========================================================

  const loadScheduledPosts = async () => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_URL}/scheduled-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load scheduled posts");
        return;
      }

      setScheduledPosts(data.scheduled_posts || []);
      setPage("scheduled");
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  // =========================================================
  // PUBLISHING CALENDAR
  // =========================================================

  const loadCalendar = async () => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_URL}/scheduled-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to load calendar");
        return;
      }

      setScheduledPosts(data.scheduled_posts || []);
      setPage("calendar");
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  const schedulePost = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_URL}/scheduled-posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            post_id: Number(schedulePostId),
            scheduled_at: scheduleDateTime,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to schedule post");
        return;
      }

      alert("Post scheduled successfully!");

      setSchedulePostId("");
      setScheduleDateTime("");

      loadScheduledPosts();
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("token");

    setLoggedIn(false);
    setPage("dashboard");

    setEmail("");
    setPassword("");
    setMessage("");
  };

  // =========================================================
  // INITIAL DATA
  // =========================================================

  useEffect(() => {
    if (loggedIn) {
      loadDashboardData();
    }
  }, [loggedIn]);

  const loadDashboardData = async () => {
    const token = localStorage.getItem("token");

    try {
      const [
        campaignResponse,
        accountResponse,
        postResponse,
        scheduleResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/campaigns`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/social-accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/posts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/scheduled-posts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const campaignData = await campaignResponse.json();
      const accountData = await accountResponse.json();
      const postData = await postResponse.json();
      const scheduleData = await scheduleResponse.json();

      setCampaigns(campaignData.campaigns || []);
      setAccounts(accountData.accounts || []);
      setPosts(postData.posts || []);
      setScheduledPosts(scheduleData.scheduled_posts || []);
    } catch (error) {
      console.error(error);
    }
  };

  // =========================================================
  // LOGIN PAGE
  // =========================================================

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">📱</div>

          <h1>SocialFlow</h1>

          <p className="login-subtitle">
            Social Media Campaign Management
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="primary-btn full-btn" type="submit">
              LOGIN
            </button>
          </form>

          {message && (
            <p className="error-message">{message}</p>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // SIDEBAR
  // =========================================================

  const Sidebar = () => (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">📱</div>

        <div>
          <h2>SocialFlow</h2>
          <span>Management Platform</span>
        </div>
      </div>

      <nav>
        <button
          className={page === "dashboard" ? "nav-active" : ""}
          onClick={() => setPage("dashboard")}
        >
          <span>🏠</span> Dashboard
        </button>

        <button
          className={page === "campaigns" ? "nav-active" : ""}
          onClick={loadCampaigns}
        >
          <span>📢</span> Campaigns
        </button>

        <button
          className={page === "accounts" ? "nav-active" : ""}
          onClick={loadAccounts}
        >
          <span>🔗</span> Social Accounts
        </button>

        <button
          className={page === "posts" ? "nav-active" : ""}
          onClick={loadPosts}
        >
          <span>📝</span> Posts
        </button>

        <button
          className={page === "scheduled" ? "nav-active" : ""}
          onClick={loadScheduledPosts}
        >
          <span>📅</span> Scheduled Posts
        </button>

        {/* NEW CALENDAR BUTTON */}
        <button
          className={page === "calendar" ? "nav-active" : ""}
          onClick={loadCalendar}
        >
          <span>🗓️</span> Publishing Calendar
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="user-mini">
          <div className="avatar">
            {email.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{email}</strong>
            <small>Logged in</small>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );

  // =========================================================
  // DASHBOARD
  // =========================================================

  if (page === "dashboard") {
    return (
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <div className="topbar">
            <div>
              <h1>Dashboard</h1>

              <p>
                Manage your social media activities from one place.
              </p>
            </div>

            <div className="top-user">
              <span>Welcome back,</span>
              <strong>{email}</strong>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">📢</div>

              <div>
                <span>Total Campaigns</span>
                <h2>{campaigns.length}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">🔗</div>

              <div>
                <span>Social Accounts</span>
                <h2>{accounts.length}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">📝</div>

              <div>
                <span>Total Posts</span>
                <h2>{posts.length}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">📅</div>

              <div>
                <span>Scheduled Posts</span>
                <h2>{scheduledPosts.length}</h2>
              </div>
            </div>
          </div>

          <div className="content-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Quick Actions</h2>
                  <p>Start managing your content</p>
                </div>
              </div>

              <div className="quick-actions">
                <button onClick={loadCampaigns}>
                  <span>📢</span>
                  <strong>Manage Campaigns</strong>
                  <small>Create and edit campaigns</small>
                </button>

                <button onClick={loadAccounts}>
                  <span>🔗</span>
                  <strong>Social Accounts</strong>
                  <small>Manage connected platforms</small>
                </button>

                <button onClick={loadPosts}>
                  <span>📝</span>
                  <strong>Manage Posts</strong>
                  <small>Create your social posts</small>
                </button>

                <button onClick={loadScheduledPosts}>
                  <span>📅</span>
                  <strong>Scheduled Posts</strong>
                  <small>View scheduled content</small>
                </button>

                {/* NEW CALENDAR QUICK ACTION */}
                <button onClick={loadCalendar}>
                  <span>🗓️</span>
                  <strong>Publishing Calendar</strong>
                  <small>View scheduled content on calendar</small>
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Recent Campaigns</h2>
                  <p>Your latest campaigns</p>
                </div>

                <button
                  className="text-btn"
                  onClick={loadCampaigns}
                >
                  View All →
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="empty-state">
                  <span>📢</span>
                  <p>No campaigns created yet.</p>
                </div>
              ) : (
                <div className="recent-list">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div
                      className="recent-item"
                      key={campaign.campaign_id}
                    >
                      <div>
                        <strong>{campaign.campaign_name}</strong>

                        <small>
                          {campaign.description ||
                            "No description"}
                        </small>
                      </div>

                      <span
                        className={`status-badge ${campaign.status}`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // ACCOUNTS PAGE
  // =========================================================

  if (page === "accounts") {
    return (
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <PageHeader
            title="Social Accounts"
            description="Connect and manage your social media accounts."
          />

          <div className="form-panel">
            <h2>➕ Add Social Account</h2>

            <form onSubmit={addAccount} className="form-grid">
              <div className="form-group">
                <label>Platform</label>

                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  required
                >
                  <option value="">Select Platform</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter">Twitter / X</option>
                  <option value="LinkedIn">LinkedIn</option>
                </select>
              </div>

              <div className="form-group">
                <label>Username</label>

                <input
                  type="text"
                  placeholder="@username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <button className="primary-btn" type="submit">
                ADD ACCOUNT
              </button>
            </form>
          </div>

          <div className="section-title">
            <h2>Connected Accounts</h2>
            <span>{accounts.length} accounts</span>
          </div>

          <div className="cards-grid">
            {accounts.length === 0 ? (
              <EmptyState text="No social accounts connected." />
            ) : (
              accounts.map((account) => (
                <div
                  className="account-card-new"
                  key={account.account_id}
                >
                  <div className="platform-icon">
                    {account.platform === "Instagram"
                      ? "📸"
                      : account.platform === "Facebook"
                      ? "👥"
                      : account.platform === "LinkedIn"
                      ? "💼"
                      : "🐦"}
                  </div>

                  <div className="account-info">
                    <h3>{account.platform}</h3>
                    <p>{account.username}</p>
                    <span className="connected">
                      ● Connected
                    </span>
                  </div>

                  <button
                    className="danger-btn"
                    onClick={() =>
                      deleteAccount(account.account_id)
                    }
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // CAMPAIGNS PAGE
  // =========================================================

  if (page === "campaigns") {
    return (
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <PageHeader
            title="Campaign Management"
            description="Create, edit and manage your marketing campaigns."
          />

          <div className="form-panel">
            <h2>
              {editingCampaignId
                ? "✏️ Edit Campaign"
                : "➕ Create Campaign"}
            </h2>

            <form
              onSubmit={
                editingCampaignId
                  ? updateCampaign
                  : addCampaign
              }
            >
              <div className="form-grid">
                <div className="form-group">
                  <label>Campaign Name</label>

                  <input
                    type="text"
                    placeholder="Enter campaign name"
                    value={campaignName}
                    onChange={(e) =>
                      setCampaignName(e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    value={campaignStatus}
                    onChange={(e) =>
                      setCampaignStatus(e.target.value)
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">
                      Completed
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>

                <textarea
                  placeholder="Enter campaign description"
                  value={campaignDescription}
                  onChange={(e) =>
                    setCampaignDescription(e.target.value)
                  }
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Start Date</label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  type="submit"
                >
                  {editingCampaignId
                    ? "UPDATE CAMPAIGN"
                    : "CREATE CAMPAIGN"}
                </button>

                {editingCampaignId && (
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={clearCampaignForm}
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="section-title">
            <h2>My Campaigns</h2>
            <span>{campaigns.length} campaigns</span>
          </div>

          <div className="campaign-grid">
            {campaigns.length === 0 ? (
              <EmptyState text="No campaigns found." />
            ) : (
              campaigns.map((campaign) => (
                <div
                  className="campaign-card"
                  key={campaign.campaign_id}
                >
                  <div className="campaign-top">
                    <div className="campaign-icon">
                      📢
                    </div>

                    <span
                      className={`status-badge ${campaign.status}`}
                    >
                      {campaign.status}
                    </span>
                  </div>

                  <h3>{campaign.campaign_name}</h3>

                  <p>
                    {campaign.description ||
                      "No description available."}
                  </p>

                  <div className="date-row">
                    <span>
                      📅 Start:{" "}
                      {campaign.start_date
                        ? campaign.start_date.substring(0, 10)
                        : "Not set"}
                    </span>

                    <span>
                      🏁 End:{" "}
                      {campaign.end_date
                        ? campaign.end_date.substring(0, 10)
                        : "Not set"}
                    </span>
                  </div>

                  <div className="card-actions">
                    <button
                      className="edit-btn"
                      onClick={() =>
                        startEditCampaign(campaign)
                      }
                    >
                      ✏️ Edit
                    </button>

                    <button
                      className="danger-btn"
                      onClick={() =>
                        deleteCampaign(
                          campaign.campaign_id
                        )
                      }
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // POSTS PAGE
  // =========================================================

  if (page === "posts") {
    return (
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <PageHeader
            title="Post Management"
            description="Create and manage your social media posts."
          />

          <div className="form-panel">
            <h2>📝 Create Post</h2>

            <form onSubmit={createPost}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Campaign ID</label>

                  <input
                    type="number"
                    placeholder="Enter Campaign ID"
                    value={postCampaignId}
                    onChange={(e) =>
                      setPostCampaignId(e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Social Account ID</label>

                  <input
                    type="number"
                    placeholder="Enter Account ID"
                    value={postAccountId}
                    onChange={(e) =>
                      setPostAccountId(e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Post Content</label>

                <textarea
                  placeholder="Write your post content..."
                  value={postContent}
                  onChange={(e) =>
                    setPostContent(e.target.value)
                  }
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Media URL</label>

                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={postMediaUrl}
                    onChange={(e) =>
                      setPostMediaUrl(e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Scheduled Time</label>

                  <input
                    type="datetime-local"
                    value={postScheduledTime}
                    onChange={(e) =>
                      setPostScheduledTime(e.target.value)
                    }
                  />
                </div>
              </div>

              <button
                className="primary-btn"
                type="submit"
              >
                CREATE POST
              </button>
            </form>
          </div>

          <div className="section-title">
            <h2>My Posts</h2>
            <span>{posts.length} posts</span>
          </div>

          <div className="post-list">
            {posts.length === 0 ? (
              <EmptyState text="No posts found." />
            ) : (
              posts.map((post) => (
                <div
                  className="post-card"
                  key={post.post_id}
                >
                  <div className="post-header">
                    <div className="post-number">
                      #{post.post_id}
                    </div>

                    <span
                      className={`status-badge ${
                        post.status || "draft"
                      }`}
                    >
                      {post.status || "draft"}
                    </span>
                  </div>

                  <p className="post-content">
                    {post.content}
                  </p>

                  <div className="post-details">
                    <span>
                      📢 Campaign:{" "}
                      {post.campaign_name ||
                        post.campaign_id}
                    </span>

                    <span>
                      🔗 Platform:{" "}
                      {post.platform ||
                        "Not available"}
                    </span>

                    <span>
                      👤 Username:{" "}
                      {post.username ||
                        "Not available"}
                    </span>

                    <span>
                      📅 Scheduled:{" "}
                      {post.scheduled_time ||
                        "Not scheduled"}
                    </span>
                  </div>

                  {post.media_url && (
                    <div className="media-url">
                      🔗 {post.media_url}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // SCHEDULED POSTS PAGE
  // =========================================================

  if (page === "scheduled") {
    return (
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <PageHeader
            title="Scheduled Posts"
            description="Schedule and track your upcoming social media posts."
          />

          <div className="form-panel">
            <h2>📅 Schedule a Post</h2>

            <form onSubmit={schedulePost}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Post ID</label>

                  <input
                    type="number"
                    placeholder="Enter Post ID"
                    value={schedulePostId}
                    onChange={(e) =>
                      setSchedulePostId(e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Scheduled Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) =>
                      setScheduleDateTime(e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <button
                className="primary-btn"
                type="submit"
              >
                SCHEDULE POST
              </button>
            </form>
          </div>

          <div className="section-title">
            <h2>My Scheduled Posts</h2>
            <span>
              {scheduledPosts.length} scheduled
            </span>
          </div>

          <div className="schedule-list">
            {scheduledPosts.length === 0 ? (
              <EmptyState text="No scheduled posts found." />
            ) : (
              scheduledPosts.map((schedule) => (
                <div
                  className="schedule-card"
                  key={schedule.schedule_id}
                >
                  <div className="schedule-icon">
                    📅
                  </div>

                  <div className="schedule-content">
                    <div className="schedule-title">
                      <h3>
                        Schedule #{schedule.schedule_id}
                      </h3>

                      <span
                        className={`status-badge ${
                          schedule.status ||
                          "scheduled"
                        }`}
                      >
                        {schedule.status ||
                          "scheduled"}
                      </span>
                    </div>

                    <p>
                      {schedule.content ||
                        `Post #${schedule.post_id}`}
                    </p>

                    <div className="schedule-details">
                      <span>
                        📝 Post ID:{" "}
                        {schedule.post_id}
                      </span>

                      <span>
                        🕐 Scheduled:{" "}
                        {schedule.scheduled_at}
                      </span>

                      <span>
                        ✅ Published:{" "}
                        {schedule.published_at ||
                          "Not published"}
                      </span>
                    </div>

                    {schedule.error_message && (
                      <div className="error-box">
                        ⚠️ {schedule.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // PUBLISHING CALENDAR PAGE
  // =========================================================

  if (page === "calendar") {
    return (
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <Calendar
            scheduledPosts={scheduledPosts}
          />
        </main>
      </div>
    );
  }

  return null;
}

// =========================================================
// REUSABLE COMPONENTS
// =========================================================

function PageHeader({ title, description }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state large">
      <span>📭</span>
      <h3>{text}</h3>
      <p>Start adding content to see it here.</p>
    </div>
  );
}

export default App;
