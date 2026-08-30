import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Posts.css";

function Posts() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");

  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  // =====================================================
  // GET POSTS
  // =====================================================

  const fetchPosts = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/posts/",
        {
          method: "GET",
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

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Failed to load posts");
        return;
      }

      setPosts(data);
    } catch (error) {
      console.error("Fetch posts error:", error);
      alert("Cannot connect to backend");
    }
  };

  // =====================================================
  // LOAD POSTS
  // =====================================================

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchPosts();
  }, []);

  // =====================================================
  // START EDIT
  // =====================================================

  const startEdit = (post) => {
    setEditingPost(post.id);
    setEditContent(post.content);

    if (post.scheduled_at) {
      const date = new Date(post.scheduled_at);

      const formatted =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0") +
        "T" +
        String(date.getHours()).padStart(2, "0") +
        ":" +
        String(date.getMinutes()).padStart(2, "0");

      setEditScheduledAt(formatted);
    } else {
      setEditScheduledAt("");
    }
  };

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  const cancelEdit = () => {
    setEditingPost(null);
    setEditContent("");
    setEditScheduledAt("");
  };

  // =====================================================
  // UPDATE POST
  // =====================================================

  const updatePost = async (postId) => {
    if (!editContent.trim()) {
      alert("Post content cannot be empty");
      return;
    }

    try {
      let url =
        `http://127.0.0.1:8000/posts/${postId}` +
        `?content=${encodeURIComponent(editContent)}`;

      if (editScheduledAt) {
        url +=
          `&scheduled_at=${encodeURIComponent(editScheduledAt)}`;
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Failed to update post");
        return;
      }

      alert(data.message || "Post updated successfully!");

      cancelEdit();
      fetchPosts();
    } catch (error) {
      console.error("Update post error:", error);
      alert("Cannot connect to backend");
    }
  };

  // =====================================================
  // PUBLISH POST
  // =====================================================

  const publishPost = async (postId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/posts/${postId}/publish`,
        {
          method: "PUT",
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

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Failed to publish post");
        return;
      }

      alert(
        data.message || "Post published successfully!"
      );

      fetchPosts();
    } catch (error) {
      console.error("Publish error:", error);
      alert("Cannot connect to backend");
    }
  };

  // =====================================================
  // DELETE POST
  // =====================================================

  const deletePost = async (postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/posts/${postId}`,
        {
          method: "DELETE",
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

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Failed to delete post");
        return;
      }

      alert(
        data.message || "Post deleted successfully!"
      );

      fetchPosts();
    } catch (error) {
      console.error("Delete post error:", error);
      alert("Cannot connect to backend");
    }
  };

  // =====================================================
  // FILTER POSTS
  // =====================================================

  const filteredPosts =
    filter === "all"
      ? posts
      : posts.filter(
          (post) => post.status === filter
        );

  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (status) => {
    switch (status) {
      case "published":
        return "status-published";

      case "scheduled":
        return "status-scheduled";

      case "draft":
        return "status-draft";

      case "failed":
        return "status-failed";

      default:
        return "status-default";
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="posts-page">

      <div className="posts-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="posts-header">

          <div>

            <div className="posts-logo">
              🚀 SocialPilot
            </div>

            <h1>My Posts</h1>

            <p>
              Create, manage and monitor your
              social media posts.
            </p>

          </div>

          <button
            className="dashboard-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            ← Dashboard
          </button>

        </div>


        {/* =================================================
            CREATE POST
        ================================================= */}

        <div className="posts-top-actions">

          <button
            className="create-post-button"
            onClick={() =>
              navigate("/create-post")
            }
          >
            + Create Post
          </button>

        </div>


        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="posts-filters">

          <button
            className={
              filter === "all"
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setFilter("all")}
          >
            All
            <span>{posts.length}</span>
          </button>


          <button
            className={
              filter === "draft"
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setFilter("draft")}
          >
            Draft
            <span>
              {
                posts.filter(
                  (p) => p.status === "draft"
                ).length
              }
            </span>
          </button>


          <button
            className={
              filter === "scheduled"
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setFilter("scheduled")}
          >
            Scheduled
            <span>
              {
                posts.filter(
                  (p) => p.status === "scheduled"
                ).length
              }
            </span>
          </button>


          <button
            className={
              filter === "published"
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setFilter("published")}
          >
            Published
            <span>
              {
                posts.filter(
                  (p) => p.status === "published"
                ).length
              }
            </span>
          </button>


          <button
            className={
              filter === "failed"
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setFilter("failed")}
          >
            Failed
            <span>
              {
                posts.filter(
                  (p) => p.status === "failed"
                ).length
              }
            </span>
          </button>

        </div>


        {/* =================================================
            POSTS LIST
        ================================================= */}

        <div className="posts-list">

          {filteredPosts.length === 0 ? (

            <div className="empty-posts">

              <div className="empty-icon">
                📝
              </div>

              <h2>
                No posts available
              </h2>

              <p>
                You don't have any posts in
                this category yet.
              </p>

              <button
                className="create-post-button"
                onClick={() =>
                  navigate("/create-post")
                }
              >
                + Create Your First Post
              </button>

            </div>

          ) : (

            filteredPosts.map(
              (post, index) => (

                <div
                  className="post-card"
                  key={post.id}
                >

                  {/* =================================================
                      EDIT MODE
                  ================================================= */}

                  {editingPost === post.id ? (

                    <div className="edit-post">

                      <div className="edit-header">

                        <h2>
                          Edit Post #{index + 1}
                        </h2>

                      </div>


                      {/* CONTENT */}

                      <div className="post-form-group">

                        <label>
                          Post Content
                        </label>

                        <textarea
                          value={editContent}
                          onChange={(e) =>
                            setEditContent(
                              e.target.value
                            )
                          }
                          rows="6"
                        />

                        <div className="character-count">
                          {editContent.length} characters
                        </div>

                      </div>


                      {/* SCHEDULE */}

                      <div className="post-form-group">

                        <label>
                          Schedule Date & Time
                        </label>

                        <input
                          type="datetime-local"
                          value={editScheduledAt}
                          onChange={(e) =>
                            setEditScheduledAt(
                              e.target.value
                            )
                          }
                        />

                      </div>


                      {/* EDIT ACTIONS */}

                      <div className="edit-actions">

                        <button
                          className="save-button"
                          onClick={() =>
                            updatePost(post.id)
                          }
                        >
                          Save Changes
                        </button>

                        <button
                          className="cancel-button"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>

                      </div>

                    </div>

                  ) : (

                    /* =================================================
                       NORMAL POST
                    ================================================= */

                    <>

                      <div className="post-card-header">

                        <div>

                          {/* IMPORTANT:
                              Display user's post number,
                              NOT database ID
                          */}

                          <h2>
                            Post #{index + 1}
                          </h2>

                          <p className="post-account">

                            <strong>
                              Social Account:
                            </strong>{" "}

                            {post.platform &&
                            post.username
                              ? `${post.platform} - ${post.username}`
                              : post.social_account_id
                              ? `Account ID: ${post.social_account_id}`
                              : "Account disconnected"}

                          </p>

                        </div>


                        <span
                          className={
                            `post-status ` +
                            getStatusClass(
                              post.status
                            )
                          }
                        >
                          {post.status}
                        </span>

                      </div>


                      {/* =================================================
                          CONTENT
                      ================================================= */}

                      <div className="post-content">

                        <div className="content-label">
                          Content
                        </div>

                        <p>
                          {post.content}
                        </p>

                      </div>


                      {/* =================================================
                          SCHEDULED DATE
                      ================================================= */}

                      {post.scheduled_at && (

                        <div className="scheduled-info">

                          <span>
                            📅
                          </span>

                          <div>

                            <strong>
                              Scheduled At
                            </strong>

                            <p>
                              {new Date(
                                post.scheduled_at
                              ).toLocaleString()}
                            </p>

                          </div>

                        </div>

                      )}


                      {/* =================================================
                          ACTIONS
                      ================================================= */}

                      <div className="post-actions">

                        <button
                          className="edit-button"
                          onClick={() =>
                            startEdit(post)
                          }
                        >
                          ✏️ Edit
                        </button>


                        {post.status !==
                          "published" && (

                          <button
                            className="publish-button"
                            onClick={() =>
                              publishPost(
                                post.id
                              )
                            }
                          >
                            🚀 Publish
                          </button>

                        )}


                        <button
                          className="delete-button"
                          onClick={() =>
                            deletePost(
                              post.id
                            )
                          }
                        >
                          🗑 Delete
                        </button>

                      </div>

                    </>

                  )}

                </div>

              )
            )

          )}

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="posts-footer">

          <button
            onClick={() =>
              navigate("/dashboard")
            }
          >
            📊 Back to Dashboard
          </button>

        </div>

      </div>

    </div>
  );
}

export default Posts;