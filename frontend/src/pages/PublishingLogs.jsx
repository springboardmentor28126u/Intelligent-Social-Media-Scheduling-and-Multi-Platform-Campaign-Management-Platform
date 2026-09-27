import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PublishingLogs.css";

const API_URL = "http://127.0.0.1:8000";

function PublishingLogs() {

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");


  // =====================================================
  // FETCH PUBLISHING LOGS
  // =====================================================

  const fetchLogs = async () => {

    try {

      setLoading(true);
      setError("");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch(
        `${API_URL}/posts/publishing-logs`,
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

        const detail = Array.isArray(data?.detail)
          ? data.detail.map((issue) => issue?.msg || "Validation error").join("; ")
          : data?.detail || "Failed to load publishing logs";

        setError(detail);

        return;
      }


      setLogs(data);

    } catch (err) {

      console.error("Publishing logs error:", err);

      setError(
        "Cannot connect to the backend. Please make sure FastAPI is running."
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // LOAD LOGS
  // =====================================================

  useEffect(() => {

    fetchLogs();

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
  // STATUS
  // =====================================================

  const getStatusClass = (status) => {

    if (!status) {
      return "unknown";
    }

    return status.toLowerCase();

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
       * 2026-09-07T22:10:00
       *
       * We intentionally DO NOT use:
       * new Date(value + "Z")
       *
       * because we are using Indian time only.
       */

      const parts = value.split("T");

      if (parts.length !== 2) {
        return value;
      }

      const datePart = parts[0];
      const timePart = parts[1];

      const dateValues = datePart
        .split("-")
        .map(Number);

      const timeValues = timePart
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

    } catch (error) {

      return value;

    }

  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="publishing-logs-page">

        <div className="publishing-logs-loading">

          <div className="logs-spinner"></div>

          <h2>
            Loading Publishing Logs...
          </h2>

          <p>
            Please wait while we load your publishing history.
          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="publishing-logs-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="publishing-logs-header">

        <div>

          <h1>
            Publishing Logs
          </h1>

          <p>
            View your social media publishing history
          </p>

        </div>


        <button
          className="logs-refresh-button"
          onClick={fetchLogs}
        >

          🔄 Refresh

        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="publishing-logs-error">

          {error}

        </div>

      )}


      {/* =================================================
          NO LOGS
      ================================================= */}

      {!error && logs.length === 0 && (

        <div className="publishing-logs-empty">

          <div className="empty-icon">
            📋
          </div>

          <h2>
            No Publishing Logs
          </h2>

          <p>
            Publishing history will appear here after scheduled posts are processed.
          </p>

        </div>

      )}


      {/* =================================================
          LOG TABLE
      ================================================= */}

      {logs.length > 0 && (

        <div className="publishing-logs-card">

          <div className="publishing-logs-table-wrapper">

            <table className="publishing-logs-table">

              <thead>

                <tr>

                  <th>
                    Post
                  </th>

                  <th>
                    Platform
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Message
                  </th>

                  <th>
                    Published Time
                  </th>

                </tr>

              </thead>


              <tbody>

                {logs.map((log) => (

                  <tr key={log.id}>

                    {/* POST */}

                    <td>

                      <span className="post-id">
                        #{log.post_id}
                      </span>

                    </td>


                    {/* PLATFORM */}

                    <td>

                      <div className="platform-cell">

                        <span className="platform-icon">
                          {getPlatformIcon(log.platform)}
                        </span>

                        <span className="platform-name">
                          {getPlatformName(log.platform)}
                        </span>

                      </div>

                    </td>


                    {/* STATUS */}

                    <td>

                      <span
                        className={`publishing-status ${getStatusClass(
                          log.status
                        )}`}
                      >

                        {log.status}

                      </span>

                    </td>


                    {/* MESSAGE */}

                    <td>

                      <span className="publishing-message">
                        {log.message || "-"}
                      </span>

                    </td>


                    {/* TIME */}

                    <td>

                      <span className="publishing-time">
                        {formatIndianDateTime(
                          log.published_at
                        )}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}


    </div>

  );

}

export default PublishingLogs;