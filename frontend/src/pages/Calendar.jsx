import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Calendar.css";

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// INDIAN DATE/TIME PARSER
// ============================================================

// Database value example:
//
// 2026-09-07 21:48:00
//
// Treat this directly as Indian local time.
//
// No UTC conversion.
// No toISOString().
// No timezone shifting.

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

  const hours = Number(
    match[4] || 0
  );

  const minutes = Number(
    match[5] || 0
  );

  const seconds = Number(
    match[6] || 0
  );

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
// CALENDAR COMPONENT
// ============================================================

function Calendar() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const token =
    localStorage.getItem("access_token");


  // ============================================================
  // FETCH SCHEDULED POSTS
  // ============================================================

  const fetchScheduledPosts = async () => {
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
        `${API_URL}/posts/scheduled`,
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
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem("role");

        navigate("/login");

        return;
      }


      const data =
        await response.json();


      console.log(
        "Scheduled posts:",
        data
      );


      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      if (!response.ok) {
        setError(
          data.detail ||
            "Failed to load scheduled posts."
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
        "Calendar fetch error:",
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
  // LOAD SCHEDULED POSTS
  // ============================================================

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchScheduledPosts();

  }, [navigate]);


  // ============================================================
  // CURRENT MONTH / YEAR
  // ============================================================

  const month =
    currentDate.getMonth();

  const year =
    currentDate.getFullYear();


  // ============================================================
  // MONTH NAMES
  // ============================================================

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];


  // ============================================================
  // DAY NAMES
  // ============================================================

  const dayNames = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];


  // ============================================================
  // NUMBER OF DAYS IN CURRENT MONTH
  // ============================================================

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  // ============================================================
  // FIRST DAY OF CURRENT MONTH
  // ============================================================

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();


  // ============================================================
  // PREVIOUS MONTH
  // ============================================================

  const previousMonth = () => {
    setCurrentDate(
      new Date(
        year,
        month - 1,
        1
      )
    );
  };


  // ============================================================
  // NEXT MONTH
  // ============================================================

  const nextMonth = () => {
    setCurrentDate(
      new Date(
        year,
        month + 1,
        1
      )
    );
  };


  // ============================================================
  // GO TO TODAY
  // ============================================================

  const goToToday = () => {
    setCurrentDate(
      new Date()
    );
  };


  // ============================================================
  // CHECK TODAY
  // ============================================================

  const isToday = (day) => {
    const today =
      new Date();

    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };


  // ============================================================
  // GET POSTS FOR PARTICULAR DATE
  // ============================================================

  const getPostsForDate = (day) => {
    return posts.filter(
      (post) => {

        if (!post.scheduled_at) {
          return false;
        }

        const postDate =
          parseIndianDateTime(
            post.scheduled_at
          );

        if (!postDate) {
          return false;
        }

        return (
          postDate.getDate() === day &&
          postDate.getMonth() === month &&
          postDate.getFullYear() === year
        );
      }
    );
  };


  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (dateString) => {
    if (!dateString) {
      return "";
    }

    const date =
      parseIndianDateTime(
        dateString
      );

    if (!date) {
      return "";
    }

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  };


  // ============================================================
  // FORMAT FULL DATE
  // ============================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return "";
    }

    const date =
      parseIndianDateTime(
        dateString
      );

    if (!date) {
      return "";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };


  // ============================================================
  // PLATFORM ICON
  // ============================================================

  const getPlatformIcon = (
    platform
  ) => {

    if (!platform) {
      return "🌐";
    }

    const value =
      platform.toLowerCase();


    if (
      value.includes("instagram")
    ) {
      return "📸";
    }


    if (
      value.includes("facebook")
    ) {
      return "📘";
    }


    if (
      value.includes("twitter") ||
      value === "x"
    ) {
      return "🐦";
    }


    if (
      value.includes("linkedin")
    ) {
      return "💼";
    }


    if (
      value.includes("youtube")
    ) {
      return "▶️";
    }


    return "🌐";
  };


  // ============================================================
  // RECURRING LABEL
  // ============================================================

  const getRecurrenceLabel = (
    post
  ) => {

    if (!post.is_recurring) {
      return null;
    }

    if (!post.recurrence_type) {
      return "Recurring";
    }

    const type =
      post.recurrence_type.toLowerCase();


    if (type === "daily") {
      return "Daily";
    }


    if (type === "weekly") {
      return "Weekly";
    }


    if (type === "monthly") {
      return "Monthly";
    }


    return "Recurring";
  };


  // ============================================================
  // CREATE CALENDAR CELLS
  // ============================================================

  const calendarCells = [];


  // ============================================================
  // EMPTY CELLS BEFORE FIRST DAY
  // ============================================================

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    calendarCells.push(

      <div
        className="calendar-day empty-day"
        key={`empty-${i}`}
      >
      </div>

    );
  }


  // ============================================================
  // ACTUAL DAYS
  // ============================================================

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {

    const dayPosts =
      getPostsForDate(day);


    calendarCells.push(

      <div
        className={`calendar-day ${
          isToday(day)
            ? "today"
            : ""
        }`}
        key={day}
      >

        {/* ===================================================
            DATE NUMBER
        =================================================== */}

        <div className="date-number">

          <span>
            {day}
          </span>

          {isToday(day) && (

            <small>
              Today
            </small>

          )}

        </div>


        {/* ===================================================
            POSTS
        =================================================== */}

        <div className="day-posts">

          {dayPosts.length === 0 ? (

            <div className="calendar-empty-day">
            </div>

          ) : (

            dayPosts.map(
              (post) => (

                <div
                  className="calendar-post"
                  key={post.id}
                  title={post.content}
                >

                  {/* =========================================
                      TIME
                  ========================================= */}

                  <div className="calendar-post-time">

                    {formatTime(
                      post.scheduled_at
                    )}

                  </div>


                  {/* =========================================
                      PLATFORM
                  ========================================= */}

                  <div className="calendar-post-platform">

                    <span>
                      {getPlatformIcon(
                        post.platform
                      )}
                    </span>

                    <span>
                      {post.platform ||
                        "Social Media"}
                    </span>

                  </div>


                  {/* =========================================
                      CONTENT
                  ========================================= */}

                  <div className="calendar-post-content">

                    {post.content}

                  </div>


                  {/* =========================================
                      RECURRING
                  ========================================= */}

                  {post.is_recurring && (

                    <div className="calendar-post-recurring">

                      🔄{" "}
                      {getRecurrenceLabel(
                        post
                      )}

                    </div>

                  )}

                </div>

              )
            )

          )}

        </div>

      </div>

    );
  }


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (

      <div className="calendar-loading">

        <div className="calendar-loading-icon">
          📅
        </div>

        <h2>
          Loading Calendar...
        </h2>

        <p>
          Loading your scheduled posts.
        </p>

      </div>

    );
  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {

    return (

      <div className="calendar-error-page">

        <div className="calendar-error-card">

          <div className="calendar-error-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Calendar
          </h2>

          <p>
            {error}
          </p>


          <div className="calendar-error-buttons">

            <button
              onClick={
                fetchScheduledPosts
              }
            >
              Try Again
            </button>


            <button
              onClick={() =>
                navigate("/dashboard")
              }
            >
              ← Dashboard
            </button>

          </div>

        </div>

      </div>

    );
  }


  // ============================================================
  // MAIN CALENDAR
  // ============================================================

  return (

    <div className="calendar-page">

      <div className="calendar-container">


        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="calendar-header">

          <div className="calendar-title">

            <h1>
              📅 Publishing Calendar
            </h1>

            <p>
              View all your scheduled social media posts.
            </p>

          </div>


          <div className="calendar-header-actions">

            <button
              className="calendar-dashboard-button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              ← Dashboard
            </button>


            <button
              className="calendar-create-button"
              onClick={() =>
                navigate("/create-post")
              }
            >
              + Create Post
            </button>

          </div>

        </div>


        {/* ===================================================
            TOOLBAR
        =================================================== */}

        <div className="calendar-toolbar">


          {/* PREVIOUS */}

          <button
            className="calendar-navigation-button"
            onClick={
              previousMonth
            }
          >
            ←
          </button>


          {/* MONTH */}

          <h2>
            {monthNames[month]}{" "}
            {year}
          </h2>


          {/* NEXT */}

          <button
            className="calendar-navigation-button"
            onClick={
              nextMonth
            }
          >
            →
          </button>


          {/* TODAY */}

          <button
            className="today-button"
            onClick={
              goToToday
            }
          >
            Today
          </button>

        </div>


        {/* ===================================================
            CALENDAR
        =================================================== */}

        <div className="calendar-wrapper">


          {/* DAY HEADERS */}

          <div className="calendar-weekdays">

            {dayNames.map(
              (day) => (

                <div
                  className="calendar-weekday"
                  key={day}
                >
                  {day}
                </div>

              )
            )}

          </div>


          {/* CALENDAR GRID */}

          <div className="calendar-grid">

            {calendarCells}

          </div>

        </div>


        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="calendar-footer">


          <div className="calendar-info">

            <span className="info-dot">
            </span>

            <span>
              Scheduled Posts:{" "}
              <strong>
                {posts.length}
              </strong>
            </span>

          </div>


          <button
            className="create-calendar-post"
            onClick={() =>
              navigate("/create-post")
            }
          >
            + Schedule New Post
          </button>

        </div>


        {/* ===================================================
            INDIAN TIME INFORMATION
        =================================================== */}

        <div className="calendar-timezone-info">

          🇮🇳{" "}
          All scheduled times are shown in Indian Standard Time.

        </div>


      </div>

    </div>

  );
}

export default Calendar;