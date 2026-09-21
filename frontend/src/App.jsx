import { useEffect, useState } from "react";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./index.css";

const API = "http://127.0.0.1:5000";

const platforms = [
  { name: "Instagram", icon: "📸", className: "instagram" },
  { name: "Facebook", icon: "📘", className: "facebook" },
  { name: "LinkedIn", icon: "💼", className: "linkedin" },
  { name: "Twitter / X", icon: "🐦", className: "twitter" },
  { name: "YouTube", icon: "▶️", className: "youtube" },
  { name: "Telegram", icon: "✈️", className: "telegram" },
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
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [connected, setConnected] = useState([]);
  const [posts, setPosts] = useState([]);

  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [scheduleDate, setScheduleDate] = useState("");

  // MILESTONE 2 - RECURRING POSTS
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("daily");
  const [recurrenceCount, setRecurrenceCount] = useState(3);
  const [showPreview, setShowPreview] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [lastPublishCheck, setLastPublishCheck] = useState(null);

  // MILESTONE 3 - CAMPAIGN MANAGEMENT
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignStartDate, setCampaignStartDate] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("active");

  // MILESTONE 2 - DRAFT MANAGEMENT
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [draftEditContent, setDraftEditContent] = useState("");
  const [draftEditPlatform, setDraftEditPlatform] = useState("Instagram");

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
      .select("*");

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
  // LOAD CAMPAIGNS
  // ==============================

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Campaigns error:", error);
      setMessage("❌ " + error.message);
    } else {
      setCampaigns(data || []);
    }

    setLoadingCampaigns(false);
  };

  // ==============================
  // INITIAL LOAD
  // ==============================

  useEffect(() => {
    if (loggedIn) {
      loadPosts();
      loadAccounts();
      loadCampaigns();
    }
  }, [loggedIn]);

  // ==============================
  // LOGIN / REGISTER
  // ==============================

  const submitForm = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("❌ Please enter email and password.");
      return;
    }

    if (!isLogin && !name.trim()) {
      setMessage("❌ Please enter your name.");
      return;
    }

    setMessage(isLogin ? "Signing in..." : "Creating account...");

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isLogin) {
        // Common Supabase database authentication.
        // Passwords in the shared users table are bcrypt hashes.
        const { data: existingUser, error } = await supabase
          .from("users")
          .select("user_id, name, email, password, created_at")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (error) {
          console.error("Login error:", error);
          setMessage("❌ " + error.message);
          return;
        }

        if (!existingUser) {
          setMessage("❌ Account not found in the common database. Please create an account first.");
          return;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          existingUser.password || ""
        );

        if (!passwordMatches) {
          setMessage("❌ Invalid email or password.");
          return;
        }

        const sessionToken = `supabase-user-${existingUser.user_id}-${Date.now()}`;

        localStorage.setItem("token", sessionToken);
        localStorage.setItem(
          "user",
          JSON.stringify({
            user_id: existingUser.user_id,
            name: existingUser.name,
            email: existingUser.email,
            created_at: existingUser.created_at,
          })
        );

        setLoggedIn(true);
        setMessage("");
        setEmail("");
        setPassword("");
        return;
      }

      // Registration in the shared Supabase users table.
      const { data: existingUser, error: existingUserError } = await supabase
        .from("users")
        .select("user_id, email")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingUserError) {
        console.error("User lookup error:", existingUserError);
        setMessage("❌ " + existingUserError.message);
        return;
      }

      if (existingUser) {
        setMessage("❌ An account with this email already exists.");
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const { data: newUser, error: registerError } = await supabase
        .from("users")
        .insert([
          {
            name: name.trim(),
            email: cleanEmail,
            password: passwordHash,
          },
        ])
        .select("user_id, name, email, created_at")
        .single();

      if (registerError) {
        console.error("Registration error:", registerError);
        setMessage("❌ " + registerError.message);
        return;
      }

      const sessionToken = `supabase-user-${newUser.user_id}-${Date.now()}`;

      localStorage.setItem("token", sessionToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      setLoggedIn(true);
      setMessage("");
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage("❌ Authentication failed. Please try again.");
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
            username:
              user?.name ||
              user?.email ||
              "Meghana",
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

    if (
      status === "scheduled" &&
      isRecurring &&
      (recurrenceCount < 2 || recurrenceCount > 30)
    ) {
      setMessage(
        "❌ Recurring posts must have 2 to 30 occurrences."
      );
      return;
    }

    setMessage("Saving...");

    const firstDate =
      status === "scheduled"
        ? new Date(scheduleDate)
        : null;

    const totalOccurrences =
      status === "scheduled" && isRecurring
        ? Number(recurrenceCount)
        : 1;

    const postData = [];

    for (let i = 0; i < totalOccurrences; i++) {
      let scheduledAt = null;

      if (firstDate) {
        const nextDate = new Date(firstDate);

        if (isRecurring) {
          if (recurrenceFrequency === "daily") {
            nextDate.setDate(
              nextDate.getDate() + i
            );
          } else if (
            recurrenceFrequency === "weekly"
          ) {
            nextDate.setDate(
              nextDate.getDate() + i * 7
            );
          } else if (
            recurrenceFrequency === "monthly"
          ) {
            nextDate.setMonth(
              nextDate.getMonth() + i
            );
          }
        }

        scheduledAt = nextDate.toISOString();
      }

      postData.push({
        content: content.trim(),
        post_type: platform,
        status,
        scheduled_at: scheduledAt,
      });
    }

    const { data, error } = await supabase
      .from("posts")
      .insert(postData)
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
    setIsRecurring(false);
    setRecurrenceFrequency("daily");
    setRecurrenceCount(3);

    if (status === "draft") {
      setMessage(
        "✅ Draft saved successfully!"
      );
    } else if (totalOccurrences > 1) {
      setMessage(
        `✅ ${totalOccurrences} recurring posts scheduled successfully!`
      );
    } else {
      setMessage(
        "✅ Post scheduled successfully!"
      );
    }

    if (status === "scheduled") {
      setActivePage("scheduled");
    }
  };

  // ==============================
  // DRAFT MANAGEMENT
  // ==============================

  const startEditDraft = (draft) => {
    setEditingDraftId(draft.id);
    setDraftEditContent(draft.content || "");
    setDraftEditPlatform(draft.post_type || "Instagram");
    setMessage("");
  };

  const cancelEditDraft = () => {
    setEditingDraftId(null);
    setDraftEditContent("");
    setDraftEditPlatform("Instagram");
  };

  const updateDraft = async () => {
    if (!draftEditContent.trim()) {
      setMessage("❌ Please enter draft content.");
      return;
    }

    setMessage("Saving draft...");

    const { data, error } = await supabase
      .from("posts")
      .update({
        content: draftEditContent.trim(),
        post_type: draftEditPlatform,
      })
      .eq("id", editingDraftId)
      .eq("status", "draft")
      .select()
      .single();

    if (error) {
      setMessage("❌ " + error.message);
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === editingDraftId ? data : post
      )
    );

    cancelEditDraft();
    setMessage("✅ Draft updated successfully!");
  };

  const deleteDraft = async (draftId) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this draft?"
    );

    if (!shouldDelete) return;

    setMessage("Deleting draft...");

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", draftId)
      .eq("status", "draft");

    if (error) {
      setMessage("❌ " + error.message);
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== draftId)
    );

    if (editingDraftId === draftId) {
      cancelEditDraft();
    }

    setMessage("✅ Draft deleted successfully!");
  };

  // ==============================
  // MILESTONE 2 - PUBLISHING WORKFLOW
  // ==============================

  // Prototype publishing processor: posts whose scheduled time has arrived
  // are marked as published in Supabase. Real social-media API publishing
  // will be connected later when OAuth/API credentials are configured.
  const processPublishingQueue = async () => {
    if (publishingNow) return;

    setPublishingNow(true);
    setMessage("Checking publishing queue...");

    try {
      const now = new Date();
      const duePosts = posts.filter((post) => {
        const status = String(post.status || "").toLowerCase();
        return (
          status === "scheduled" &&
          post.scheduled_at &&
          new Date(post.scheduled_at) <= now
        );
      });

      if (duePosts.length === 0) {
        setLastPublishCheck(new Date());
        setMessage("ℹ️ No posts are due for publishing right now.");
        return;
      }

      const publishedIds = [];
      const publishedAt = new Date().toISOString();

      for (const post of duePosts) {
        const { error } = await supabase
          .from("posts")
          .update({
            status: "published",
            published_at: publishedAt,
          })
          .eq("id", post.id)
          .eq("status", "scheduled");

        if (!error) {
          publishedIds.push(post.id);
        } else {
          console.error("Publishing error:", error);
        }
      }

      if (publishedIds.length > 0) {
        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            publishedIds.includes(post.id)
              ? {
                  ...post,
                  status: "published",
                  published_at: publishedAt,
                }
              : post
          )
        );

        setMessage(
          `✅ ${publishedIds.length} due post${
            publishedIds.length > 1 ? "s" : ""
          } processed successfully.`
        );
      } else {
        setMessage("⚠️ No posts could be processed.");
      }

      setLastPublishCheck(new Date());
    } catch (error) {
      console.error("Publishing workflow error:", error);
      setMessage("❌ Publishing workflow failed. Please try again.");
    } finally {
      setPublishingNow(false);
    }
  };

  // Background-style polling for the prototype. It checks every 30 seconds
  // while the user is logged in.
  useEffect(() => {
    if (!loggedIn) return;

    const timer = setInterval(() => {
      processPublishingQueue();
    }, 30000);

    return () => clearInterval(timer);
  }, [loggedIn, posts, publishingNow]);

  // ==============================
  // MILESTONE 3 - CAMPAIGN MANAGEMENT
  // ==============================

  const resetCampaignForm = () => {
    setCampaignName("");
    setCampaignDescription("");
    setCampaignStartDate("");
    setCampaignEndDate("");
    setCampaignStatus("active");
  };

  const createCampaign = async () => {
    if (!campaignName.trim()) {
      setMessage("❌ Please enter a campaign name.");
      return;
    }

    if (!campaignStartDate || !campaignEndDate) {
      setMessage("❌ Please select campaign start and end dates.");
      return;
    }

    if (new Date(campaignEndDate) < new Date(campaignStartDate)) {
      setMessage("❌ End date cannot be before start date.");
      return;
    }

    setMessage("Creating campaign...");

    const { data, error } = await supabase
      .from("campaigns")
      .insert([
        {
          campaign_name: campaignName.trim(),
          description: campaignDescription.trim(),
          start_date: campaignStartDate,
          end_date: campaignEndDate,
          status: campaignStatus,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Create campaign error:", error);
      setMessage("❌ " + error.message);
      return;
    }

    setCampaigns((currentCampaigns) => [data, ...currentCampaigns]);
    resetCampaignForm();
    setMessage("✅ Campaign created successfully!");
  };

  const deleteCampaign = async (campaignId) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this campaign?"
    );

    if (!shouldDelete) return;

    setMessage("Deleting campaign...");

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (error) {
      console.error("Delete campaign error:", error);
      setMessage("❌ " + error.message);
      return;
    }

    setCampaigns((currentCampaigns) =>
      currentCampaigns.filter((campaign) => campaign.id !== campaignId)
    );

    setMessage("✅ Campaign deleted successfully!");
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
            icon="📄"
            text="Drafts"
            active={
              activePage === "drafts"
            }
            onClick={() => {
              setActivePage("drafts");
              loadPosts();
            }}
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

          <NavButton
            icon="📋"
            text="Publishing Queue"
            active={
              activePage === "queue"
            }
            onClick={() => {
              setActivePage("queue");
              loadPosts();
            }}
          />

          <NavButton
            icon="📊"
            text="Publishing Logs"
            active={
              activePage === "logs"
            }
            onClick={() => {
              setActivePage("logs");
              loadPosts();
            }}
          />

          <NavButton
            icon="🎯"
            text="Campaigns"
            active={activePage === "campaigns"}
            onClick={() => {
              setActivePage("campaigns");
              loadCampaigns();
            }}
          />

          <NavButton
            icon="🗓️"
            text="Publishing Calendar"
            active={
              activePage === "calendar"
            }
            onClick={() => {
              setActivePage("calendar");
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

                  {/* ==============================
                      MILESTONE 2 - RECURRING POSTS
                  ============================== */}
                  <div
                    style={{
                      marginTop: "18px",
                      padding: "18px",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(event) =>
                          setIsRecurring(
                            event.target.checked
                          )
                        }
                      />
                      🔁 Make this a recurring post
                    </label>

                    {isRecurring && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr",
                          gap: "14px",
                          marginTop: "16px",
                        }}
                      >
                        <div className="form-group">
                          <label>
                            Repeat
                          </label>

                          <select
                            value={
                              recurrenceFrequency
                            }
                            onChange={(event) =>
                              setRecurrenceFrequency(
                                event.target.value
                              )
                            }
                          >
                            <option value="daily">
                              Daily
                            </option>
                            <option value="weekly">
                              Weekly
                            </option>
                            <option value="monthly">
                              Monthly
                            </option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>
                            Occurrences
                          </label>

                          <input
                            type="number"
                            min="2"
                            max="30"
                            value={recurrenceCount}
                            onChange={(event) =>
                              setRecurrenceCount(
                                Number(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    )}
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
                      className="secondary-button"
                      onClick={() => setShowPreview(true)}
                    >
                      👀 Preview
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

          {/* CAMPAIGNS */}

          {activePage === "campaigns" && (
            <>
              <section className="page-header">
                <span className="page-label">CAMPAIGN MANAGEMENT</span>
                <h2>Campaign Management</h2>
                <p>Create, organize and manage your social media campaigns.</p>
              </section>

              {message && (
                <div
                  className={
                    message.startsWith("❌")
                      ? "error-message"
                      : "success-message"
                  }
                >
                  {message}
                </div>
              )}

              <div className="create-layout">
                <div className="dashboard-card">
                  <div className="section-heading">
                    <div>
                      <h3 style={{ margin: 0 }}>🎯 Create New Campaign</h3>
                      <p style={{ margin: "6px 0 0" }}>
                        Set up a campaign with a clear schedule and status.
                      </p>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Campaign Name</label>
                    <input
                      value={campaignName}
                      onChange={(event) => setCampaignName(event.target.value)}
                      placeholder="e.g. Summer Product Launch"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={campaignDescription}
                      onChange={(event) =>
                        setCampaignDescription(event.target.value)
                      }
                      placeholder="Describe the goal of this campaign..."
                      rows="5"
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px",
                    }}
                  >
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={campaignStartDate}
                        onChange={(event) =>
                          setCampaignStartDate(event.target.value)
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={campaignEndDate}
                        onChange={(event) =>
                          setCampaignEndDate(event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={campaignStatus}
                      onChange={(event) => setCampaignStatus(event.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetCampaignForm}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={createCampaign}
                    >
                      🎯 Create Campaign
                    </button>
                  </div>
                </div>

                <div className="preview-card">
                  <div className="preview-header">
                    <span>CAMPAIGN PREVIEW</span>
                  </div>
                  <div className="preview-content">
                    <div className="preview-user">
                      <div className="preview-avatar">🎯</div>
                      <div>
                        <strong>SocialPilot Campaign</strong>
                        <small>{campaignStatus}</small>
                      </div>
                    </div>
                    <h3 style={{ marginBottom: "8px" }}>
                      {campaignName || "Your campaign name"}
                    </h3>
                    <p>
                      {campaignDescription ||
                        "Your campaign description will appear here."}
                    </p>
                    <div className="scheduled-time">
                      📅 {campaignStartDate || "Start date"} → {campaignEndDate || "End date"}
                    </div>
                  </div>
                </div>
              </div>

              <section className="dashboard-card" style={{ marginTop: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>📋 Campaigns</h3>
                    <p style={{ margin: "6px 0 0" }}>
                      Your saved campaigns and their current status.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={loadCampaigns}
                  >
                    🔄 Refresh
                  </button>
                </div>

                {loadingCampaigns ? (
                  <div className="empty-card">
                    <div className="loading">Loading campaigns...</div>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="empty-card">
                    <div className="empty-icon">🎯</div>
                    <h3>No campaigns yet</h3>
                    <p>Create your first campaign above.</p>
                  </div>
                ) : (
                  <div className="posts-list">
                    {campaigns.map((campaign) => (
                      <div className="post-card" key={campaign.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "16px",
                          }}
                        >
                          <div>
                            <div className="post-platform">
                              <span className="post-icon">🎯</span>
                              <div>
                                <strong>{campaign.campaign_name}</strong>
                                <small>
                                  Created {
                                    campaign.created_at
                                      ? new Date(campaign.created_at).toLocaleString()
                                      : "-"
                                  }
                                </small>
                              </div>
                            </div>
                          </div>

                          <span className={`post-status ${campaign.status || "active"}`}>
                            {campaign.status || "active"}
                          </span>
                        </div>

                        <p className="post-content">
                          {campaign.description || "No campaign description."}
                        </p>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "14px",
                            marginTop: "12px",
                          }}
                        >
                          <div className="scheduled-time">
                            📅 Start: {campaign.start_date || "-"}
                          </div>
                          <div className="scheduled-time">
                            🏁 End: {campaign.end_date || "-"}
                          </div>
                        </div>

                        <div className="form-actions">
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => deleteCampaign(campaign.id)}
                          >
                            🗑️ Delete Campaign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* PUBLISHING CALENDAR */}

          {activePage === "calendar" && (
            <>
              <section className="page-header">
                <span className="page-label">
                  PUBLISHING
                </span>

                <h2>
                  Publishing Calendar
                </h2>

                <p>
                  View your scheduled content by date
                  and manage your publishing plan.
                </p>
              </section>

              <div
                className="dashboard-card"
                style={{
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(280px, 360px) 1fr",
                    gap: "32px",
                    alignItems: "start",
                  }}
                >
                  <div>
                    <Calendar
                      onChange={setCalendarDate}
                      value={calendarDate}
                      tileContent={({ date, view }) => {
                        if (view !== "month") {
                          return null;
                        }

                        const dayPosts = posts.filter(
                          (post) =>
                            post.scheduled_at &&
                            new Date(
                              post.scheduled_at
                            ).toDateString() ===
                              date.toDateString()
                        );

                        return dayPosts.length > 0 ? (
                          <div
                            style={{
                              fontSize: "10px",
                              marginTop: "3px",
                              fontWeight: 700,
                            }}
                          >
                            {dayPosts.length} post
                            {dayPosts.length > 1
                              ? "s"
                              : ""}
                          </div>
                        ) : null;
                      }}
                    />

                    <div
                      style={{
                        marginTop: "18px",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <strong>
                        Selected Date
                      </strong>

                      <div
                        style={{
                          marginTop: "5px",
                          color: "#64748b",
                        }}
                      >
                        {calendarDate.toLocaleDateString(
                          undefined,
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: "8px",
                      }}
                    >
                      📋 Scheduled Content
                    </h3>

                    <p
                      style={{
                        marginTop: 0,
                        color: "#64748b",
                      }}
                    >
                      Posts scheduled for the selected
                      date.
                    </p>

                    {(() => {
                      const selectedPosts =
                        posts.filter(
                          (post) =>
                            post.scheduled_at &&
                            new Date(
                              post.scheduled_at
                            ).toDateString() ===
                              calendarDate.toDateString()
                        );

                      if (selectedPosts.length === 0) {
                        return (
                          <div className="empty-card">
                            <div className="empty-icon">
                              📭
                            </div>

                            <h3>
                              No scheduled posts
                            </h3>

                            <p>
                              There are no posts scheduled
                              for this date.
                            </p>

                            <button
                              className="primary-button"
                              onClick={() =>
                                setActivePage("create")
                              }
                            >
                              Create Post
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="posts-list">
                          {selectedPosts.map((post) => (
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
                                    {new Date(
                                      post.scheduled_at
                                    ).toLocaleTimeString(
                                      undefined,
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
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

                              <div className="scheduled-time">
                                📅{" "}
                                {new Date(
                                  post.scheduled_at
                                ).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DRAFT MANAGEMENT */}

          {activePage === "drafts" && (
            <>
              <section className="page-header">
                <span className="page-label">CONTENT</span>
                <h2>Draft Management</h2>
                <p>Edit, update or delete your saved drafts.</p>
              </section>

              {message && (
                <div
                  className={
                    message.startsWith("❌")
                      ? "error-message"
                      : "success-message"
                  }
                >
                  {message}
                </div>
              )}

              {loadingPosts ? (
                <div className="empty-card">
                  <div className="loading">Loading drafts...</div>
                </div>
              ) : posts.filter((post) => post.status === "draft").length === 0 ? (
                <div className="empty-card">
                  <div className="empty-icon">📄</div>
                  <h3>No drafts yet</h3>
                  <p>Save a post as a draft to manage it here.</p>
                  <button
                    className="primary-button"
                    onClick={() => setActivePage("create")}
                  >
                    Create Draft
                  </button>
                </div>
              ) : (
                <div className="posts-list">
                  {posts
                    .filter((post) => post.status === "draft")
                    .map((draft) => (
                      <div className="post-card" key={draft.id}>
                        {editingDraftId === draft.id ? (
                          <>
                            <div className="form-group">
                              <label>Platform</label>
                              <select
                                value={draftEditPlatform}
                                onChange={(event) =>
                                  setDraftEditPlatform(event.target.value)
                                }
                              >
                                {platforms.map((item) => (
                                  <option key={item.name} value={item.name}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Draft Content</label>
                              <textarea
                                value={draftEditContent}
                                onChange={(event) =>
                                  setDraftEditContent(event.target.value)
                                }
                                rows="7"
                              />
                              <div className="character-count">
                                {draftEditContent.length} characters
                              </div>
                            </div>

                            <div className="form-actions">
                              <button
                                className="secondary-button"
                                onClick={cancelEditDraft}
                              >
                                Cancel
                              </button>
                              <button
                                className="primary-button"
                                onClick={updateDraft}
                              >
                                💾 Save Changes
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="post-platform">
                              <span className="post-icon">
                                {platforms.find(
                                  (item) => item.name === draft.post_type
                                )?.icon || "📱"}
                              </span>
                              <div>
                                <strong>{draft.post_type}</strong>
                                <small>
                                  {draft.created_at
                                    ? new Date(draft.created_at).toLocaleString()
                                    : ""}
                                </small>
                              </div>
                            </div>

                            <span className="post-status draft">draft</span>
                            <p className="post-content">{draft.content}</p>

                            <div className="form-actions">
                              <button
                                className="secondary-button"
                                onClick={() => startEditDraft(draft)}
                              >
                                ✏️ Edit Draft
                              </button>
                              <button
                                className="danger-button"
                                onClick={() => deleteDraft(draft.id)}
                              >
                                🗑️ Delete Draft
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* PUBLISHING QUEUE */}

          {activePage === "queue" && (
            <>

              <section className="page-header">
                <span className="page-label">PUBLISHING</span>
                <h2>Publishing Queue</h2>
                <p>View and manage posts waiting to be published.</p>
              </section>

              {loadingPosts ? (
                <div className="empty-card">
                  <div className="loading">Loading queue...</div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <div className="stat-card">
                      <div className="stat-icon">📋</div>
                      <div>
                        <div className="stat-label">Queue</div>
                        <div className="stat-value">
                          {posts.filter((post) =>
                            ["scheduled", "pending"].includes(
                              String(post.status || "").toLowerCase()
                            )
                          ).length}
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">⏳</div>
                      <div>
                        <div className="stat-label">Next Post</div>
                        <div className="stat-value" style={{ fontSize: "18px" }}>
                          {(() => {
                            const next = posts
                              .filter(
                                (post) =>
                                  ["scheduled", "pending"].includes(
                                    String(post.status || "").toLowerCase()
                                  ) && post.scheduled_at
                              )
                              .sort(
                                (a, b) =>
                                  new Date(a.scheduled_at) -
                                  new Date(b.scheduled_at)
                              )[0];

                            return next
                              ? new Date(next.scheduled_at).toLocaleString()
                              : "No upcoming post";
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">⚠️</div>
                      <div>
                        <div className="stat-label">Failed</div>
                        <div className="stat-value">
                          {posts.filter(
                            (post) =>
                              String(post.status || "").toLowerCase() ===
                              "failed"
                          ).length}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="section-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "18px",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0 }}>Upcoming Publishing Queue</h3>
                        <p style={{ margin: "6px 0 0" }}>
                          Posts are ordered by their scheduled publishing time.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={loadPosts}
                      >
                        🔄 Refresh Queue
                      </button>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={processPublishingQueue}
                        disabled={publishingNow}
                      >
                        {publishingNow ? "⏳ Processing..." : "🚀 Process Due Posts"}
                      </button>
                    </div>

                    {(() => {
                      const queuePosts = posts
                        .filter((post) =>
                          ["scheduled", "pending"].includes(
                            String(post.status || "").toLowerCase()
                          )
                        )
                        .sort((a, b) => {
                          if (!a.scheduled_at) return 1;
                          if (!b.scheduled_at) return -1;
                          return (
                            new Date(a.scheduled_at) -
                            new Date(b.scheduled_at)
                          );
                        });

                      if (queuePosts.length === 0) {
                        return (
                          <div className="empty-card">
                            <div className="empty-icon">📋</div>
                            <h3>Publishing queue is empty</h3>
                            <p>Schedule a post and it will appear here.</p>
                            <button
                              className="primary-button"
                              onClick={() => setActivePage("create")}
                            >
                              Create Post
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="posts-list">
                          {queuePosts.map((post, index) => (
                            <div className="post-card" key={post.id}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: "16px",
                                }}
                              >
                                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                                  <div
                                    style={{
                                      minWidth: "38px",
                                      height: "38px",
                                      borderRadius: "12px",
                                      display: "grid",
                                      placeItems: "center",
                                      fontWeight: 700,
                                    }}
                                  >
                                    #{index + 1}
                                  </div>

                                  <div className="post-platform">
                                    <span className="post-icon">
                                      {platforms.find(
                                        (item) => item.name === post.post_type
                                      )?.icon || "📱"}
                                    </span>
                                    <div>
                                      <strong>{post.post_type || "Unknown Platform"}</strong>
                                      <small>
                                        Added {
                                          post.created_at
                                            ? new Date(post.created_at).toLocaleString()
                                            : "-"
                                        }
                                      </small>
                                    </div>
                                  </div>
                                </div>

                                <span className={`post-status ${post.status}`}>
                                  {post.status}
                                </span>
                              </div>

                              <p className="post-content">{post.content}</p>

                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "14px",
                                  marginTop: "12px",
                                }}
                              >
                                <div className="scheduled-time">
                                  📅 {
                                    post.scheduled_at
                                      ? new Date(post.scheduled_at).toLocaleString()
                                      : "No schedule time"
                                  }
                                </div>
                                <div className="scheduled-time">
                                  📌 Queue position: {index + 1}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

            </>
          )}

          {/* PUBLISHING LOGS */}

          {activePage === "logs" && (
            <>
              <section className="page-header">
                <span className="page-label">PUBLISHING</span>
                <h2>Publishing Logs &amp; Status</h2>
                <p>Track the status and history of your scheduled content.</p>
              </section>

              {loadingPosts ? (
                <div className="empty-card">
                  <div className="loading">Loading publishing logs...</div>
                </div>
              ) : posts.length === 0 ? (
                <div className="empty-card">
                  <div className="empty-icon">📊</div>
                  <h3>No publishing logs yet</h3>
                  <p>Create or schedule a post to see its publishing status here.</p>
                  <button
                    className="primary-button"
                    onClick={() => setActivePage("create")}
                  >
                    + Create Post
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <LogSummaryCard
                      icon="📊"
                      title="Total"
                      value={posts.length}
                    />
                    <LogSummaryCard
                      icon="📅"
                      title="Scheduled"
                      value={posts.filter((p) => p.status === "scheduled").length}
                    />
                    <LogSummaryCard
                      icon="🚀"
                      title="Published"
                      value={posts.filter((p) => p.status === "published").length}
                    />
                    <LogSummaryCard
                      icon="⚠️"
                      title="Failed"
                      value={posts.filter((p) => p.status === "failed").length}
                    />
                  </div>

                  <div className="card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "18px",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0 }}>Publishing Activity</h3>
                        <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                          Latest post status and scheduling information
                        </p>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={loadPosts}
                      >
                        🔄 Refresh Logs
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: "12px" }}>
                      {[...posts]
                        .sort((a, b) => {
                          const aTime = new Date(a.scheduled_at || a.created_at || 0).getTime();
                          const bTime = new Date(b.scheduled_at || b.created_at || 0).getTime();
                          return bTime - aTime;
                        })
                        .map((post) => {
                          const platformInfo =
                            platforms.find((item) => item.name === post.post_type) ||
                            platforms[0];

                          const status = String(post.status || "unknown").toLowerCase();
                          const statusIcon =
                            status === "published" ? "✅" :
                            status === "failed" ? "❌" :
                            status === "cancelled" ? "🚫" :
                            status === "draft" ? "📝" :
                            "⏳";

                          return (
                            <div
                              key={post.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: "16px",
                                alignItems: "center",
                                padding: "16px",
                                border: "1px solid rgba(0,0,0,0.08)",
                                borderRadius: "14px",
                                background: "rgba(255,255,255,0.65)",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                                  <span style={{ fontSize: "20px" }}>{platformInfo.icon}</span>
                                  <strong>{platformInfo.name}</strong>
                                  <span
                                    style={{
                                      marginLeft: "4px",
                                      padding: "4px 9px",
                                      borderRadius: "999px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      textTransform: "capitalize",
                                      background: "rgba(59,130,246,0.10)",
                                    }}
                                  >
                                    {statusIcon} {status}
                                  </span>
                                </div>
                                <div style={{ fontWeight: 600, marginBottom: "6px", wordBreak: "break-word" }}>
                                  {post.content || "No content"}
                                </div>
                                <div style={{ fontSize: "13px", opacity: 0.7, display: "flex", gap: "14px", flexWrap: "wrap" }}>
                                  <span>🕐 Created: {post.created_at ? new Date(post.created_at).toLocaleString() : "—"}</span>
                                  {post.scheduled_at && (
                                    <span>📅 Scheduled: {new Date(post.scheduled_at).toLocaleString()}</span>
                                  )}
                                  {post.published_at && (
                                    <span>🚀 Published: {new Date(post.published_at).toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", minWidth: "90px" }}>
                                <div style={{ fontSize: "12px", opacity: 0.6 }}>Post ID</div>
                                <strong>#{post.id}</strong>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
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

                      {post.published_at && (
                        <div className="scheduled-time">
                          🚀 Published: {new Date(post.published_at).toLocaleString()}
                        </div>
                      )}

                    </div>
                  ))}

                </div>
              )}

            </>
          )}

        </main>

        {showPreview && (
          <div
            className="preview-modal-overlay"
            onClick={() => setShowPreview(false)}
          >
            <div
              className="preview-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="preview-modal-header">
                <div>
                  <span className="page-label">POST PREVIEW</span>
                  <h2>Content Preview</h2>
                </div>

                <button
                  type="button"
                  className="preview-close-button"
                  onClick={() => setShowPreview(false)}
                >
                  ✕
                </button>
              </div>

              <div className="social-preview-card">
                <div className="social-preview-top">
                  <div className="preview-avatar">
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>{user?.name || "Your Account"}</strong>
                    <small>{platform}</small>
                  </div>
                </div>

                <div className="social-preview-content">
                  {content.trim() ? (
                    content
                  ) : (
                    <span className="preview-placeholder">
                      Your post content will appear here...
                    </span>
                  )}
                </div>

                <div className="social-preview-footer">
                  <span>📱 {platform}</span>
                  <span>
                    📅{" "}
                    {scheduleDate
                      ? new Date(scheduleDate).toLocaleString()
                      : "No schedule selected"}
                  </span>
                </div>
              </div>

              {isRecurring && (
                <div className="preview-recurring-info">
                  🔁 Recurring: {recurrenceFrequency} × {recurrenceCount}
                </div>
              )}

              <button
                type="button"
                className="primary-button preview-done-button"
                onClick={() => setShowPreview(false)}
              >
                Looks Good ✓
              </button>
            </div>
          </div>
        )}

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

function LogSummaryCard({ icon, title, value }) {
  return (
    <div
      className="card"
      style={{
        padding: "18px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "26px" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "13px", opacity: 0.65 }}>{title}</div>
        <div style={{ fontSize: "24px", fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}

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