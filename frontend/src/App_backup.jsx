import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./index.css";

const API = "http://127.0.0.1:5000";

const platforms = [
  { name: "Instagram", icon: "📸", className: "instagram" },
  { name: "Facebook", icon: "📘", className: "facebook" },
  { name: "LinkedIn", icon: "💼", className: "linkedin" },
  { name: "Twitter / X", icon: "🐦", className: "twitter" },
];

function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [activePage, setActivePage] = useState("dashboard");

  const [connected, setConnected] = useState([]);
  const [posts, setPosts] = useState([]);

  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [scheduleDate, setScheduleDate] = useState("");

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // ==============================
  // LOAD POSTS
  // ==============================

  const loadPosts = async () => {
    setLoadingPosts(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Posts error:", error);
    } else {
      setPosts(data || []);
    }

    setLoadingPosts(false);
  };

  // ==============================
  // LOAD SOCIAL ACCOUNTS
  // ==============================

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .order("connected_at", {
        ascending: false,
      });

    if (error) {
      console.error("Accounts error:", error);
      return;
    }

    setConnected(
      (data || []).map(
        (account) => account.platform
      )
    );
  };

  // ==============================
  // INITIAL LOAD
  // ==============================

  useEffect(() => {
    if (loggedIn) {
      loadPosts();
      loadAccounts();
    }
  }, [loggedIn]);

  // ==============================
  // LOGIN / REGISTER
  // ==============================

  const submitForm = async (event) => {
    event.preventDefault();

    setMessage("Please wait...");

    try {
      const endpoint = isLogin
        ? `${API}/api/login`
        : `${API}/api/register`;

      const body = isLogin
        ? {
            email,
            password,
          }
        : {
            name,
            email,
            password,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          "❌ " +
            (data.message ||
              "Something went wrong")
        );
        return;
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setLoggedIn(true);
      setMessage("");

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Backend connection failed. Start Flask backend."
      );
    }
  };

  // ==============================
  // LOGOUT
  // ==============================

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setLoggedIn(false);
    setPosts([]);
    setConnected([]);
    setActivePage("dashboard");
  };

  // ==============================
  // CONNECT PLATFORM
  // ==============================

  const togglePlatform = async (platformName) => {
    setLoadingAccounts(true);
    setMessage("");

    const isConnected =
      connected.includes(platformName);

    if (isConnected) {
      const { error } = await supabase
        .from("social_accounts")
        .delete()
        .eq("platform", platformName);

      if (error) {
        setMessage("❌ " + error.message);
      } else {
        setConnected(
          connected.filter(
            (item) => item !== platformName
          )
        );

        setMessage(
          `✅ ${platformName} disconnected successfully`
        );
      }
    } else {
      const { error } = await supabase
        .from("social_accounts")
        .insert([
          {
            platform: platformName,
            account_name:
              user?.name ||
              user?.email ||
              "Demo Account",
            access_token: "demo-token",
            connected_at:
              new Date().toISOString(),
          },
        ]);

      if (error) {
        setMessage("❌ " + error.message);
      } else {
        setConnected([
          ...connected,
          platformName,
        ]);

        setMessage(
          `✅ ${platformName} connected successfully`
        );
      }
    }

    setLoadingAccounts(false);
  };

  // ==============================
  // SAVE POST
  // ==============================

  const savePost = async (status) => {
    if (!content.trim()) {
      setMessage(
        "❌ Please enter post content."
      );
      return;
    }

    if (
      status === "scheduled" &&
      !scheduleDate
    ) {
      setMessage(
        "❌ Please select date and time."
      );
      return;
    }

    setMessage("Saving...");

    const postData = {
      content: content.trim(),
      post_type: platform,
      status,
      scheduled_at:
        status === "scheduled"
          ? new Date(
              scheduleDate
            ).toISOString()
          : null,
    };

    const { data, error } = await supabase
      .from("posts")
      .insert([postData])
      .select();

    if (error) {
      setMessage("❌ " + error.message);
      return;
    }

    setPosts([
      ...(data || []),
      ...posts,
    ]);

    setContent("");
    setScheduleDate("");

    setMessage(
      status === "draft"
        ? "✅ Draft saved successfully!"
        : "✅ Post scheduled successfully!"
    );

    if (status === "scheduled") {
      setActivePage("scheduled");
    }
  };

  // ==============================
  // LOGIN PAGE
  // ==============================

  if (!loggedIn) {
    return (
      <div className="login-page">

        <div className="login-decoration decoration-one" />
        <div className="login-decoration decoration-two" />

        <div className="login-card">

          <div className="brand-icon">
            🚀
          </div>

          <h1 className="login-title">
            SocialPilot
          </h1>

          <p className="login-subtitle">
            Intelligent Social Media Scheduling
          </p>

          <form onSubmit={submitForm}>

            {!isLogin && (
              <div className="form-group">
                <label>Name</label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="primary-button login-button"
            >
              {isLogin
                ? "Login"
                : "Create Account"}
            </button>

          </form>

          <button
            className="switch-button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
            }}
          >
            {isLogin
              ? "Create new account"
              : "Already have an account? Login"}
          </button>

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ==============================
  // MAIN APPLICATION
  // ==============================

  return (
    <div className="app">

      {/* HEADER */}

      <header className="top-header">

        <div className="header-brand">

          <div className="header-logo">
            🚀
          </div>

          <div>
            <h1>SocialPilot</h1>

            <p>
              Intelligent Social Media Scheduling
            </p>
          </div>

        </div>

        <div className="header-right">

          <div className="user-info">
            <span className="online-dot" />
            {user?.name || "User"}
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>

      <div className="layout">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <div className="sidebar-title">
            WORKSPACE
          </div>

          <NavButton
            icon="🏠"
            text="Dashboard"
            active={
              activePage === "dashboard"
            }
            onClick={() =>
              setActivePage("dashboard")
            }
          />

          <NavButton
            icon="📱"
            text="Social Accounts"
            active={
              activePage === "accounts"
            }
            onClick={() => {
              setActivePage("accounts");
              loadAccounts();
            }}
          />

          <NavButton
            icon="✍️"
            text="Create Post"
            active={
              activePage === "create"
            }
            onClick={() =>
              setActivePage("create")
            }
          />

          <NavButton
            icon="📅"
            text="Scheduled Posts"
            active={
              activePage === "scheduled"
            }
            onClick={() => {
              setActivePage("scheduled");
              loadPosts();
            }}
          />

          <div className="sidebar-bottom">
            <div className="sidebar-user">

              <div className="avatar">
                {(user?.name || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {user?.name || "User"}
                </strong>

                <small>
                  {user?.email}
                </small>
              </div>

            </div>
          </div>

        </aside>

        {/* MAIN CONTENT */}

        <main className="main-content">

          {/* DASHBOARD */}

          {activePage === "dashboard" && (
            <>
              <section className="welcome-section">

                <div>
                  <span className="page-label">
                    DASHBOARD
                  </span>

                  <h2>
                    Welcome,{" "}
                    {user?.name || "User"} 👋
                  </h2>

                  <p>
                    Here's what's happening
                    with your social media
                    today.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setActivePage("create")
                  }
                >
                  + Create Post
                </button>

              </section>

              {/* STATS */}

              <section className="stats-grid">

                <StatCard
                  icon="📝"
                  title="Total Posts"
                  value={posts.length}
                />

                <StatCard
                  icon="📅"
                  title="Scheduled"
                  value={
                    posts.filter(
                      (post) =>
                        post.status ===
                        "scheduled"
                    ).length
                  }
                />

                <StatCard
                  icon="📄"
                  title="Drafts"
                  value={
                    posts.filter(
                      (post) =>
                        post.status ===
                        "draft"
                    ).length
                  }
                />

                <StatCard
                  icon="🚀"
                  title="Published"
                  value={
                    posts.filter(
                      (post) =>
                        post.status ===
                        "published"
                    ).length
                  }
                />

                <StatCard
                  icon="⚠️"
                  title="Failed"
                  value={
                    posts.filter(
                      (post) =>
                        post.status ===
                        "failed"
                    ).length
                  }
                />

                <StatCard
                  icon="🔗"
                  title="Connected Accounts"
                  value={connected.length}
                />

              </section>

              {/* ANALYTICS */}

              <section className="dashboard-card">

                <div className="section-heading">

                  <div>
                    <h3>
                      📊 Analytics Overview
                    </h3>

                    <p>
                      Your content activity
                      across platforms
                    </p>
                  </div>

                </div>

                <div className="platform-grid">

                  {platforms.map((item) => {

                    const count =
                      posts.filter(
                        (post) =>
                          post.post_type ===
                          item.name
                      ).length;

                    return (
                      <div
                        className={`platform-card ${item.className}`}
                        key={item.name}
                      >

                        <div className="platform-icon">
                          {item.icon}
                        </div>

                        <div className="platform-name">
                          {item.name}
                        </div>

                        <div className="platform-count">
                          {count}
                        </div>

                        <div className="platform-label">
                          Posts
                        </div>

                      </div>
                    );
                  })}

                </div>

              </section>

              {/* QUICK ACTION */}

              <section className="dashboard-card scheduling-card">

                <div className="scheduling-icon">
                  📅
                </div>

                <div className="scheduling-text">

                  <h3>
                    Content Scheduling
                  </h3>

                  <p>
                    Plan, create and schedule
                    content for multiple social
                    media platforms from one
                    place.
                  </p>

                </div>

                <button
                  className="secondary-button"
                  onClick={() =>
                    setActivePage("create")
                  }
                >
                  Start Scheduling →
                </button>

              </section>

            </>
          )}

          {/* ACCOUNTS */}

          {activePage === "accounts" && (
            <>

              <section className="page-header">

                <span className="page-label">
                  SOCIAL MEDIA
                </span>

                <h2>
                  Social Accounts
                </h2>

                <p>
                  Connect and manage your
                  social media platforms.
                </p>

              </section>

              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}

              <div className="accounts-grid">

                {platforms.map((item) => {

                  const isConnected =
                    connected.includes(
                      item.name
                    );

                  return (
                    <div
                      className="account-card"
                      key={item.name}
                    >

                      <div className="account-top">

                        <div
                          className={`account-icon ${item.className}`}
                        >
                          {item.icon}
                        </div>

                        <div
                          className={
                            isConnected
                              ? "status connected"
                              : "status"
                          }
                        >
                          <span />
                          {isConnected
                            ? "Connected"
                            : "Not Connected"}
                        </div>

                      </div>

                      <h3>
                        {item.name}
                      </h3>

                      <p>
                        {isConnected
                          ? "Your account is connected and ready for scheduling."
                          : "Connect this platform to start publishing content."}
                      </p>

                      <button
                        className={
                          isConnected
                            ? "danger-button"
                            : "primary-button"
                        }
                        onClick={() =>
                          togglePlatform(
                            item.name
                          )
                        }
                        disabled={
                          loadingAccounts
                        }
                      >
                        {isConnected
                          ? "Disconnect"
                          : "Connect Account"}
                      </button>

                    </div>
                  );
                })}

              </div>

            </>
          )}

          {/* CREATE POST */}

          {activePage === "create" && (
            <>

              <section className="page-header">

                <span className="page-label">
                  CONTENT
                </span>

                <h2>
                  Create & Schedule Post
                </h2>

                <p>
                  Create content and schedule
                  it for your audience.
                </p>

              </section>

              <div className="create-layout">

                <div className="dashboard-card">

                  <div className="form-group">
                    <label>
                      Select Platform
                    </label>

                    <select
                      value={platform}
                      onChange={(event) =>
                        setPlatform(
                          event.target.value
                        )
                      }
                    >
                      {platforms.map(
                        (item) => (
                          <option
                            key={
                              item.name
                            }
                            value={
                              item.name
                            }
                          >
                            {item.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-group">

                    <label>
                      Post Content
                    </label>

                    <textarea
                      value={content}
                      onChange={(event) =>
                        setContent(
                          event.target.value
                        )
                      }
                      placeholder="Write something amazing..."
                      rows="9"
                    />

                    <div className="character-count">
                      {content.length} characters
                    </div>

                  </div>

                  <div className="form-group">

                    <label>
                      Schedule Date & Time
                    </label>

                    <input
                      type="datetime-local"
                      value={
                        scheduleDate
                      }
                      onChange={(event) =>
                        setScheduleDate(
                          event.target.value
                        )
                      }
                    />

                  </div>

                  <div className="form-actions">

                    <button
                      className="secondary-button"
                      onClick={() =>
                        savePost("draft")
                      }
                    >
                      Save Draft
                    </button>

                    <button
                      className="primary-button"
                      onClick={() =>
                        savePost(
                          "scheduled"
                        )
                      }
                    >
                      📅 Schedule Post
                    </button>

                  </div>

                  {message && (
                    <div
                      className={
                        message.startsWith(
                          "❌"
                        )
                          ? "error-message"
                          : "success-message"
                      }
                    >
                      {message}
                    </div>
                  )}

                </div>

                {/* PREVIEW */}

                <div className="preview-card">

                  <div className="preview-header">
                    <span>
                      LIVE PREVIEW
                    </span>
                  </div>

                  <div className="preview-content">

                    <div className="preview-user">

                      <div className="preview-avatar">
                        {(user?.name ||
                          "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {user?.name ||
                            "Your Account"}
                        </strong>

                        <small>
                          {platform}
                        </small>
                      </div>

                    </div>

                    <p>
                      {content ||
                        "Your post preview will appear here..."}
                    </p>

                  </div>

                </div>

              </div>

            </>
          )}

          {/* SCHEDULED POSTS */}

          {activePage === "scheduled" && (
            <>

              <section className="page-header">

                <span className="page-label">
                  CONTENT
                </span>

                <h2>
                  Scheduled Posts
                </h2>

                <p>
                  Manage your drafts and
                  scheduled content.
                </p>

              </section>

              {loadingPosts ? (
                <div className="empty-card">
                  <div className="loading">
                    Loading posts...
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className="empty-card">

                  <div className="empty-icon">
                    📅
                  </div>

                  <h3>
                    No posts yet
                  </h3>

                  <p>
                    Create your first post
                    to get started.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setActivePage(
                        "create"
                      )
                    }
                  >
                    Create Post
                  </button>

                </div>
              ) : (
                <div className="posts-list">

                  {posts.map((post) => (
                    <div
                      className="post-card"
                      key={post.id}
                    >

                      <div className="post-platform">

                        <span className="post-icon">
                          {platforms.find(
                            (item) =>
                              item.name ===
                              post.post_type
                          )?.icon || "📱"}
                        </span>

                        <div>
                          <strong>
                            {post.post_type}
                          </strong>

                          <small>
                            {post.created_at
                              ? new Date(
                                  post.created_at
                                ).toLocaleString()
                              : ""}
                          </small>
                        </div>

                      </div>

                      <span
                        className={`post-status ${post.status}`}
                      >
                        {post.status}
                      </span>

                      <p className="post-content">
                        {post.content}
                      </p>

                      {post.scheduled_at && (
                        <div className="scheduled-time">
                          📅{" "}
                          {new Date(
                            post.scheduled_at
                          ).toLocaleString()}
                        </div>
                      )}

                    </div>
                  ))}

                </div>
              )}

            </>
          )}

        </main>

      </div>
    </div>
  );
}


// ==============================
// NAV BUTTON
// ==============================

function NavButton({
  icon,
  text,
  active,
  onClick,
}) {
  return (
    <button
      className={
        active
          ? "nav-button active"
          : "nav-button"
      }
      onClick={onClick}
    >
      <span>{icon}</span>
      {text}
    </button>
  );
}


// ==============================
// STAT CARD
// ==============================

function StatCard({
  icon,
  title,
  value,
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div className="stat-title">
        {title}
      </div>

      <div className="stat-value">
        {value}
      </div>

    </div>
  );
}


export default App;