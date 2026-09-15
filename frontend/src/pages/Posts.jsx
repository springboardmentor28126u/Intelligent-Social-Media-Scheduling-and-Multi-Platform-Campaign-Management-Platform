import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Posts.css";

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// INDIAN LOCAL DATE/TIME HELPERS
// ============================================================

// Backend/database stores:
// 2026-09-07 21:48:00
//
// We intentionally treat this as Indian local time.
// Do NOT use:
// new Date(dateString)
// toISOString()
// Date.parse()
//
// because those can introduce timezone conversion.

function parseIndianDateTime(value) {
  if (!value) {
    return null;
  }

  const cleaned = String(value)
    .replace("T", " ")
    .replace("Z", "")
    .trim();

  const match = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4] || 0);
  const minutes = Number(match[5] || 0);
  const seconds = Number(match[6] || 0);

  const date = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
    0
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}


// ============================================================
// FORMAT INDIAN DATE/TIME
// ============================================================

function formatIndianDateTime(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date = parseIndianDateTime(value);

  if (!date) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}


// ============================================================
// FORMAT DATE ONLY
// ============================================================

function formatIndianDate(value) {
  if (!value) {
    return "";
  }

  const date = parseIndianDateTime(value);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


// ============================================================
// FORMAT TIME ONLY
// ============================================================

function formatIndianTime(value) {
  if (!value) {
    return "";
  }

  const date = parseIndianDateTime(value);

  if (!date) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}


// ============================================================
// GET PLATFORM ICON
// ============================================================

function getPlatformIcon(platform) {
  if (!platform) {
    return "🌐";
  }

  const value = platform.toLowerCase();

  if (value.includes("instagram")) {
    return "📸";
  }

  if (value.includes("facebook")) {
    return "📘";
  }

  if (value.includes("twitter") || value === "x") {
    return "🐦";
  }

  if (value.includes("linkedin")) {
    return "💼";
  }

  if (value.includes("youtube")) {
    return "▶️";
  }

  return "🌐";
}


// ============================================================
// STATUS LABEL
// ============================================================

function getStatusLabel(status) {
  if (!status) {
    return "Unknown";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1).toLowerCase()
  );
}


// ============================================================
// STATUS CLASS
// ============================================================

function getStatusClass(status) {
  if (!status) {
    return "unknown";
  }

  return status.toLowerCase();
}


// ============================================================
// POSTS COMPONENT
// ============================================================

function Posts() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");


  // ============================================================
  // FETCH POSTS
  // ============================================================

  const fetchPosts = async () => {
    const currentToken =
      localStorage.getItem("access_token");

    if (!currentToken) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/posts/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        }
      );


      // --------------------------------------------------------
      // UNAUTHORIZED
      // --------------------------------------------------------

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");

        navigate("/login");
        return;
      }


      const data = await response.json();

      console.log("Posts response:", data);


      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      if (!response.ok) {
        setError(
          data.detail ||
            "Failed to load posts."
        );

        return;
      }


      // --------------------------------------------------------
      // SAVE POSTS
      // --------------------------------------------------------

      if (Array.isArray(data)) {
        setPosts(data);
      } else {
        setPosts([]);
      }

    } catch (err) {
      console.error(
        "Fetch posts error:",
        err
      );

      setError(
        "Cannot connect to backend. Please make sure FastAPI is running."
      );

    } finally {
      setLoading(false);
    }
  };


  // ============================================================
  // LOAD POSTS
  // ============================================================

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchPosts();

  }, [navigate]);


  // ============================================================
  // FILTER POSTS
  // ============================================================

  const filteredPosts = posts.filter(
    (post) => {
      if (filter === "all") {
        return true;
      }

      return (
        String(post.status || "").toLowerCase() ===
        filter.toLowerCase()
      );
    }
  );


  // ============================================================
  // EDIT POST
  // ============================================================

  const editPost = (post) => {
    navigate("/create-post", {
      state: {
        editMode: true,
        post: post,
      },
    });
  };


  // ============================================================
  // SCHEDULE DRAFT
  // ============================================================

  const schedulePost = (post) => {
    navigate("/create-post", {
      state: {
        scheduleMode: true,
        post: post,
      },
    });
  };


  // ============================================================
  // DELETE POST
  // ============================================================

  const deletePost = async (postId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this post?"
    );

    if (!confirmed) {
      return;
    }

    const currentToken =
      localStorage.getItem("access_token");

    if (!currentToken) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );


      // --------------------------------------------------------
      // UNAUTHORIZED
      // --------------------------------------------------------

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");

        navigate("/login");
        return;
      }


      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }


      // --------------------------------------------------------
      // DELETE FAILED
      // --------------------------------------------------------

      if (!response.ok) {
        alert(
          data.detail ||
            "Failed to delete post."
        );

        return;
      }


      // --------------------------------------------------------
      // DELETE SUCCESS
      // --------------------------------------------------------

      alert("Post deleted successfully!");

      setPosts((previousPosts) =>
        previousPosts.filter(
          (post) =>
            post.id !== postId
        )
      );

    } catch (err) {
      console.error(
        "Delete post error:",
        err
      );

      alert(
        "Cannot connect to backend."
      );
    }
  };


  // ============================================================
  // PUBLISH POST
  // ============================================================

  const publishPost = async (postId) => {
    const confirmed = window.confirm(
      "Are you sure you want to publish this post now?"
    );

    if (!confirmed) {
      return;
    }

    const currentToken =
      localStorage.getItem("access_token");

    if (!currentToken) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/posts/${postId}/publish`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        }
      );


      // --------------------------------------------------------
      // UNAUTHORIZED
      // --------------------------------------------------------

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");

        navigate("/login");
        return;
      }


      const data = await response.json();

      console.log(
        "Publish response:",
        data
      );


      // --------------------------------------------------------
      // PUBLISH FAILED
      // --------------------------------------------------------

      if (!response.ok) {
        alert(
          data.detail ||
            "Failed to publish post."
        );

        return;
      }


      // --------------------------------------------------------
      // PUBLISH SUCCESS
      // --------------------------------------------------------

      alert(
        data.message ||
          "Post published successfully!"
      );

      await fetchPosts();

    } catch (err) {
      console.error(
        "Publish error:",
        err
      );

      alert(
        "Cannot connect to backend."
      );
    }
  };


  // ============================================================
  // COUNTS
  // ============================================================

  const allCount = posts.length;

  const draftCount = posts.filter(
    (post) =>
      String(post.status || "")
        .toLowerCase() === "draft"
  ).length;

  const scheduledCount = posts.filter(
    (post) =>
      String(post.status || "")
        .toLowerCase() === "scheduled"
  ).length;

  const publishedCount = posts.filter(
    (post) =>
      String(post.status || "")
        .toLowerCase() === "published"
  ).length;

  const failedCount = posts.filter(
    (post) =>
      String(post.status || "")
        .toLowerCase() === "failed"
  ).length;


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="posts-loading">
        <div className="posts-loading-icon">
          📝
        </div>

        <h2>
          Loading Posts...
        </h2>

        <p>
          Please wait while we load your posts.
        </p>
      </div>
    );
  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="posts-error-page">
        <div className="posts-error-card">

          <div className="posts-error-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Posts
          </h2>

          <p>
            {error}
          </p>

          <div className="posts-error-buttons">

            <button
              onClick={fetchPosts}
              className="posts-retry-button"
            >
              Try Again
            </button>

            <button
              onClick={() =>
                navigate("/dashboard")
              }
              className="posts-dashboard-button"
            >
              ← Dashboard
            </button>

          </div>

        </div>
      </div>
    );
  }


  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="posts-page">

      <div className="posts-container">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="posts-header">

          <div>

            <p className="posts-welcome">
              Content Management
            </p>

            <h1>
              My Posts
            </h1>

            <p className="posts-subtitle">
              Create, schedule and manage your social media posts.
            </p>

          </div>


          <div className="posts-header-actions">

            <button
              className="posts-calendar-button"
              onClick={() =>
                navigate("/calendar")
              }
            >
              📅 Calendar
            </button>

            <button
              className="posts-create-button"
              onClick={() =>
                navigate("/create-post")
              }
            >
              + Create Post
            </button>

          </div>

        </header>


        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <section className="posts-stats">

          <button
            className={`posts-stat-card ${
              filter === "all"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter("all")
            }
          >
            <span className="posts-stat-icon">
              📝
            </span>

            <span className="posts-stat-label">
              All Posts
            </span>

            <strong className="posts-stat-number">
              {allCount}
            </strong>
          </button>


          <button
            className={`posts-stat-card ${
              filter === "draft"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter("draft")
            }
          >
            <span className="posts-stat-icon">
              📄
            </span>

            <span className="posts-stat-label">
              Drafts
            </span>

            <strong className="posts-stat-number">
              {draftCount}
            </strong>
          </button>


          <button
            className={`posts-stat-card ${
              filter === "scheduled"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter("scheduled")
            }
          >
            <span className="posts-stat-icon">
              📅
            </span>

            <span className="posts-stat-label">
              Scheduled
            </span>

            <strong className="posts-stat-number">
              {scheduledCount}
            </strong>
          </button>


          <button
            className={`posts-stat-card ${
              filter === "published"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter("published")
            }
          >
            <span className="posts-stat-icon">
              ✅
            </span>

            <span className="posts-stat-label">
              Published
            </span>

            <strong className="posts-stat-number">
              {publishedCount}
            </strong>
          </button>


          <button
            className={`posts-stat-card ${
              filter === "failed"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter("failed")
            }
          >
            <span className="posts-stat-icon">
              ❌
            </span>

            <span className="posts-stat-label">
              Failed
            </span>

            <strong className="posts-stat-number">
              {failedCount}
            </strong>
          </button>

        </section>


        {/* =====================================================
            FILTER BAR
        ===================================================== */}

        <section className="posts-filter-section">

          <div className="posts-filter-title">
            <h2>
              {filter === "all"
                ? "All Posts"
                : `${getStatusLabel(filter)} Posts`}
            </h2>

            <span>
              {filteredPosts.length} post
              {filteredPosts.length !== 1
                ? "s"
                : ""}
            </span>
          </div>


          <div className="posts-filter-buttons">

            <button
              className={
                filter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All
            </button>

            <button
              className={
                filter === "draft"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("draft")
              }
            >
              Draft
            </button>

            <button
              className={
                filter === "scheduled"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("scheduled")
              }
            >
              Scheduled
            </button>

            <button
              className={
                filter === "published"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("published")
              }
            >
              Published
            </button>

            <button
              className={
                filter === "failed"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("failed")
              }
            >
              Failed
            </button>

          </div>

        </section>


        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {filteredPosts.length === 0 ? (

          <div className="posts-empty">

            <div className="posts-empty-icon">
              📝
            </div>

            <h2>
              No Posts Found
            </h2>

            <p>
              {filter === "all"
                ? "You have not created any posts yet."
                : `You do not have any ${filter} posts.`}
            </p>

            <button
              className="posts-empty-button"
              onClick={() =>
                navigate("/create-post")
              }
            >
              + Create Your First Post
            </button>

          </div>

        ) : (

          /* ===================================================
             POSTS LIST
          =================================================== */

          <section className="posts-list">

            {filteredPosts.map(
              (post) => {

                const status =
                  String(
                    post.status || ""
                  ).toLowerCase();

                return (

                  <article
                    className="post-card"
                    key={post.id}
                  >

                    {/* =========================================
                        CARD HEADER
                    ========================================= */}

                    <div className="post-card-header">

                      <div className="post-card-platform">

                        <span className="post-platform-icon">
                          {getPlatformIcon(
                            post.platform
                          )}
                        </span>

                        <div>

                          <strong>
                            {post.platform ||
                              post.social_account?.platform ||
                              "Social Media"}
                          </strong>

                          {post.username && (
                            <small>
                              @{post.username}
                            </small>
                          )}

                        </div>

                      </div>


                      <span
                        className={`post-status ${getStatusClass(
                          status
                        )}`}
                      >
                        {getStatusLabel(status)}
                      </span>

                    </div>


                    {/* =========================================
                        CONTENT
                    ========================================= */}

                    <div className="post-card-content">

                      <p>
                        {post.content}
                      </p>

                    </div>


                    {/* =========================================
                        POST INFORMATION
                    ========================================= */}

                    <div className="post-card-info">

                      <div className="post-info-item">

                        <span>
                          🆔
                        </span>

                        <div>
                          <small>
                            Post ID
                          </small>

                          <strong>
                            #{post.id}
                          </strong>
                        </div>

                      </div>


                      {post.scheduled_at && (

                        <div className="post-info-item">

                          <span>
                            📅
                          </span>

                          <div>
                            <small>
                              Scheduled Time
                            </small>

                            <strong>
                              {formatIndianDateTime(
                                post.scheduled_at
                              )}
                            </strong>
                          </div>

                        </div>

                      )}


                      {!post.scheduled_at &&
                        post.created_at && (

                          <div className="post-info-item">

                            <span>
                              🕒
                            </span>

                            <div>
                              <small>
                                Created
                              </small>

                              <strong>
                                {formatIndianDate(
                                  post.created_at
                                )}
                              </strong>
                            </div>

                          </div>

                        )}


                      {post.is_recurring && (

                        <div className="post-info-item">

                          <span>
                            🔄
                          </span>

                          <div>
                            <small>
                              Recurring
                            </small>

                            <strong>
                              {post.recurrence_type
                                ? getStatusLabel(
                                    post.recurrence_type
                                  )
                                : "Recurring"}
                            </strong>
                          </div>

                        </div>

                      )}

                    </div>


                    {/* =========================================
                        ACTIONS
                    ========================================= */}

                    <div className="post-card-actions">

                      {/* EDIT */}

                      {(status === "draft" ||
                        status === "scheduled") && (

                        <button
                          className="post-edit-button"
                          onClick={() =>
                            editPost(post)
                          }
                        >
                          ✏️ Edit
                        </button>

                      )}


                      {/* SCHEDULE DRAFT */}

                      {status === "draft" && (

                        <button
                          className="post-schedule-button"
                          onClick={() =>
                            schedulePost(post)
                          }
                        >
                          📅 Schedule
                        </button>

                      )}


                      {/* PUBLISH */}

                      {(status === "draft" ||
                        status === "scheduled") && (

                        <button
                          className="post-publish-button"
                          onClick={() =>
                            publishPost(post.id)
                          }
                        >
                          🚀 Publish
                        </button>

                      )}


                      {/* DELETE */}

                      <button
                        className="post-delete-button"
                        onClick={() =>
                          deletePost(post.id)
                        }
                      >
                        🗑️ Delete
                      </button>

                    </div>

                  </article>

                );
              }
            )}

          </section>

        )}


        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="posts-footer">

          <button
            onClick={() =>
              navigate("/dashboard")
            }
          >
            ← Back to Dashboard
          </button>

          <span>
            Showing {filteredPosts.length} of{" "}
            {posts.length} posts
          </span>

        </footer>

      </div>

    </div>
  );
}

export default Posts;