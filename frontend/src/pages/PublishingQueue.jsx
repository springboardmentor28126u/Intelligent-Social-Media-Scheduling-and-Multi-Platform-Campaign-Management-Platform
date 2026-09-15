import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PublishingQueue.css";

const API_URL = "http://127.0.0.1:8000";

function PublishingQueue() {

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");


  // =====================================================
  // FETCH PUBLISHING QUEUE
  // =====================================================

  const fetchQueue = async () => {

    try {

      setLoading(true);
      setError("");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch(
        `${API_URL}/posts/publishing-queue`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );


      // =================================================
      // UNAUTHORIZED
      // =================================================

      if (response.status === 401) {

        localStorage.removeItem("access_token");

        navigate("/login", {
          replace: true
        });

        return;
      }


      const data = await response.json();


      if (!response.ok) {

        setError(
          data.detail || "Failed to load publishing queue."
        );

        return;
      }


      setQueue(data);

    } catch (err) {

      console.error("Publishing queue error:", err);

      setError(
        "Cannot connect to the backend. Please make sure FastAPI is running."
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // LOAD QUEUE
  // =====================================================

  useEffect(() => {

    fetchQueue();

  }, []);


  // =====================================================
  // PLATFORM ICON
  // =====================================================

  const getPlatformIcon = (platform) => {

    const value = platform?.toLowerCase();

    if (value === "instagram") {
      return "📸";
    }

    if (value === "facebook") {
      return "📘";
    }

    if (value === "linkedin") {
      return "💼";
    }

    if (value === "twitter") {
      return "🐦";
    }

    return "🌐";

  };


  // =====================================================
  // PLATFORM NAME
  // =====================================================

  const getPlatformName = (platform) => {

    if (!platform) {
      return "Unknown";
    }

    if (platform.toLowerCase() === "twitter") {
      return "Twitter";
    }

    return (
      platform.charAt(0).toUpperCase() +
      platform.slice(1)
    );

  };


  // =====================================================
  // FORMAT INDIAN DATE & TIME
  // =====================================================

  const formatIndianDateTime = (value) => {

    if (!value) {
      return "-";
    }

    try {

      /*
       * Backend stores Indian local time.
       *
       * Example:
       * 2026-09-08T22:00:00
       *
       * No UTC conversion is performed.
       */

      const parts = value.split("T");

      if (parts.length !== 2) {
        return value;
      }

      const dateValues = parts[0]
        .split("-")
        .map(Number);

      const timeValues = parts[1]
        .split(":")
        .map(Number);

      const year = dateValues[0];
      const month = dateValues[1];
      const day = dateValues[2];

      const hour = timeValues[0];
      const minute = timeValues[1];

      const date = new Date(
        year,
        month - 1,
        day,
        hour,
        minute
      );

      return date.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      );

    } catch (err) {

      return value;

    }

  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="publishing-queue-page">

        <div className="queue-loading">

          <div className="queue-spinner"></div>

          <h2>
            Loading Publishing Queue...
          </h2>

          <p>
            Please wait while we load your scheduled posts.
          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="publishing-queue-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="publishing-queue-header">

        <div>

          <h1>
            Publishing Queue
          </h1>

          <p>
            Posts waiting to be published
          </p>

        </div>


        <button
          className="queue-refresh-button"
          onClick={fetchQueue}
        >
          🔄 Refresh
        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="queue-error">
          {error}
        </div>

      )}


      {/* =================================================
          QUEUE SUMMARY
      ================================================= */}

      {!error && (

        <div className="queue-summary">

          <div className="queue-summary-card">

            <span className="queue-summary-icon">
              📋
            </span>

            <div>

              <span className="queue-summary-label">
                Queued Posts
              </span>

              <strong>
                {queue.length}
              </strong>

            </div>

          </div>


          <div className="queue-summary-card">

            <span className="queue-summary-icon">
              ⏳
            </span>

            <div>

              <span className="queue-summary-label">
                Waiting
              </span>

              <strong>
                {queue.filter(
                  post => post.status === "scheduled"
                ).length}
              </strong>

            </div>

          </div>


          <div className="queue-summary-card">

            <span className="queue-summary-icon">
              🇮🇳
            </span>

            <div>

              <span className="queue-summary-label">
                Timezone
              </span>

              <strong>
                IST
              </strong>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          EMPTY QUEUE
      ================================================= */}

      {!error && queue.length === 0 && (

        <div className="queue-empty">

          <div className="queue-empty-icon">
            📋
          </div>

          <h2>
            Publishing Queue is Empty
          </h2>

          <p>
            There are no scheduled posts waiting to be published.
          </p>

          <button
            className="create-queue-post-button"
            onClick={() => navigate("/create-post")}
          >
            + Create Scheduled Post
          </button>

        </div>

      )}


      {/* =================================================
          QUEUE TABLE
      ================================================= */}

      {!error && queue.length > 0 && (

        <div className="publishing-queue-card">

          <div className="queue-table-wrapper">

            <table className="publishing-queue-table">

              <thead>

                <tr>

                  <th>
                    Position
                  </th>

                  <th>
                    Post
                  </th>

                  <th>
                    Platform
                  </th>

                  <th>
                    Content
                  </th>

                  <th>
                    Scheduled Time
                  </th>

                  <th>
                    Status
                  </th>

                </tr>

              </thead>


              <tbody>

                {queue.map((post) => (

                  <tr key={post.id}>


                    {/* POSITION */}

                    <td>

                      <div className="queue-position">

                        #{post.queue_position}

                      </div>

                    </td>


                    {/* POST */}

                    <td>

                      <span className="queue-post-id">
                        #{post.id}
                      </span>

                    </td>


                    {/* PLATFORM */}

                    <td>

                      <div className="queue-platform">

                        <span className="queue-platform-icon">
                          {getPlatformIcon(post.platform)}
                        </span>

                        <span>
                          {getPlatformName(post.platform)}
                        </span>

                      </div>

                    </td>


                    {/* CONTENT */}

                    <td>

                      <div className="queue-content">

                        {post.content}

                      </div>

                      {post.is_recurring && (

                        <div className="queue-recurring">
                          🔄 Recurring
                        </div>

                      )}

                    </td>


                    {/* TIME */}

                    <td>

                      <span className="queue-time">

                        {formatIndianDateTime(
                          post.scheduled_at
                        )}

                      </span>

                    </td>


                    {/* STATUS */}

                    <td>

                      <span
                        className={`queue-status ${
                          post.status?.toLowerCase()
                        }`}
                      >

                        {post.status}

                      </span>

                    </td>


                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}


      {/* =================================================
          BOTTOM ACTIONS
      ================================================= */}

      <div className="queue-bottom-actions">

        <button
          onClick={() => navigate("/posts")}
        >
          📋 My Posts
        </button>

        <button
          onClick={() => navigate("/calendar")}
        >
          📅 Calendar
        </button>

        <button
          onClick={() => navigate("/publishing-logs")}
        >
          📊 Publishing Logs
        </button>

        <button
          onClick={() => navigate("/dashboard")}
        >
          🏠 Dashboard
        </button>

      </div>


    </div>

  );

}

export default PublishingQueue;