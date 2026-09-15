import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Drafts.css";

function Drafts() {
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");


  // =====================================================
  // FETCH DRAFTS
  // =====================================================

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:8000/posts/drafts",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Token expired
      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail || "Failed to load drafts."
        );
        return;
      }

      setDrafts(data);

    } catch (err) {
      console.error(err);

      setError(
        "Cannot connect to backend. Please make sure FastAPI is running."
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // LOAD DRAFTS
  // =====================================================

  useEffect(() => {

    if (!token) {
      navigate("/login");
      return;
    }

    fetchDrafts();

  }, [navigate, token]);


  // =====================================================
  // DELETE DRAFT
  // =====================================================

  const deleteDraft = async (postId) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this draft?"
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

        alert(
          data.detail || "Failed to delete draft."
        );

        return;
      }


      // Remove deleted draft from screen

      setDrafts((currentDrafts) =>
        currentDrafts.filter(
          (draft) => draft.id !== postId
        )
      );


      alert("Draft deleted successfully.");

    } catch (err) {

      console.error(err);

      alert(
        "Cannot connect to backend."
      );

    }

  };


  // =====================================================
  // EDIT DRAFT
  // =====================================================

  const editDraft = (draft) => {

    navigate("/create-post", {
      state: {
        editMode: true,
        post: draft,
      },
    });

  };


  // =====================================================
  // SCHEDULE DRAFT
  // =====================================================

  const scheduleDraft = (draft) => {

    navigate("/create-post", {
      state: {
        editMode: true,
        scheduleMode: true,
        post: draft,
      },
    });

  };


  // =====================================================
  // PLATFORM ICON
  // =====================================================

  const getPlatformIcon = (platform) => {

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


    if (
      value.includes("twitter") ||
      value === "x"
    ) {
      return "🐦";
    }


    if (value.includes("linkedin")) {
      return "💼";
    }


    if (value.includes("youtube")) {
      return "▶️";
    }


    return "🌐";
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="drafts-loading">

        <div className="drafts-loading-icon">
          📝
        </div>

        <h2>
          Loading Drafts...
        </h2>

        <p>
          Please wait while we load your saved drafts.
        </p>

      </div>

    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {

    return (

      <div className="drafts-error-page">

        <div className="drafts-error-card">

          <div className="drafts-error-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Drafts
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={fetchDrafts}
          >
            Try Again
          </button>

        </div>

      </div>

    );

  }


  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (

    <div className="drafts-page">

      <div className="drafts-container">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="drafts-header">

          <div>

            <h1>
              📝 Draft Posts
            </h1>

            <p>
              Manage your saved social media drafts.
            </p>

          </div>


          <button
            className="drafts-dashboard-button"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="drafts-summary">

          <div className="drafts-summary-icon">
            📝
          </div>

          <div>

            <strong>
              {drafts.length}
            </strong>

            <span>
              {drafts.length === 1
                ? " Draft"
                : " Drafts"}
            </span>

          </div>

        </div>


        {/* =================================================
            NO DRAFTS
        ================================================= */}

        {drafts.length === 0 && (

          <div className="drafts-empty">

            <div className="drafts-empty-icon">
              📝
            </div>

            <h2>
              No Drafts Yet
            </h2>

            <p>
              Your saved drafts will appear here.
            </p>

            <button
              onClick={() => navigate("/create-post")}
            >
              + Create New Post
            </button>

          </div>

        )}


        {/* =================================================
            DRAFT LIST
        ================================================= */}

        {drafts.length > 0 && (

          <div className="drafts-list">

            {drafts.map((draft) => (

              <div
                className="draft-card"
                key={draft.id}
              >


                {/* DRAFT HEADER */}

                <div className="draft-card-header">

                  <div className="draft-number">

                    <span>
                      Draft
                    </span>

                    <strong>
                      #{draft.id}
                    </strong>

                  </div>


                  <span className="draft-status">
                    DRAFT
                  </span>

                </div>


                {/* CONTENT */}

                <div className="draft-content">

                  <p>
                    {draft.content}
                  </p>

                </div>


                {/* ACCOUNT INFORMATION */}

                <div className="draft-details">

                  <div className="draft-detail-item">

                    <span>
                      Platform
                    </span>

                    <strong>

                      {getPlatformIcon(
                        draft.platform
                      )}

                      {" "}

                      {draft.platform ||
                        "Not selected"}

                    </strong>

                  </div>


                  <div className="draft-detail-item">

                    <span>
                      Account
                    </span>

                    <strong>
                      👤{" "}
                      {draft.username ||
                        "Not selected"}
                    </strong>

                  </div>

                </div>


                {/* ACTION BUTTONS */}

                <div className="draft-actions">


                  {/* EDIT */}

                  <button
                    className="edit-draft-button"
                    onClick={() =>
                      editDraft(draft)
                    }
                  >
                    ✏️ Edit
                  </button>


                  {/* SCHEDULE */}

                  <button
                    className="schedule-draft-button"
                    onClick={() =>
                      scheduleDraft(draft)
                    }
                  >
                    📅 Schedule
                  </button>


                  {/* DELETE */}

                  <button
                    className="delete-draft-button"
                    onClick={() =>
                      deleteDraft(draft.id)
                    }
                  >
                    🗑️ Delete
                  </button>


                </div>

              </div>

            ))}

          </div>

        )}


      </div>

    </div>

  );
}

export default Drafts;