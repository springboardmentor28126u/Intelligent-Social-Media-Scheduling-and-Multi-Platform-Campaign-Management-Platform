import { useEffect, useState } from "react";
import api from "../services/api";
import "./CalendarPage.css";

export default function CalendarPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    year,
    month,
    1
  ).getDay();

  useEffect(() => {
    const loadCalendar = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/posts/calendar"
        );

        setPosts(response.data.posts || []);
      } catch (error) {
        console.error("Calendar error:", error);

        const detail = error.response?.data?.detail;

        if (Array.isArray(detail)) {
          setError(
            detail
              .map((item) => item.msg)
              .join(", ")
          );
        } else {
          setError(
            detail ||
              "Failed to load calendar."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, []);

  const monthName = new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  ).format(today);

  const getPostsForDay = (day) => {
    return posts.filter((post) => {
      if (!post.scheduled_at) {
        return false;
      }

      const postDate = new Date(
        post.scheduled_at
      );

      return (
        postDate.getFullYear() === year &&
        postDate.getMonth() === month &&
        postDate.getDate() === day
      );
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) {
      return "";
    }

    return new Date(
      dateString
    ).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusClass = (status) => {
    const normalizedStatus =
      status?.toUpperCase();

    switch (normalizedStatus) {
      case "SCHEDULED":
        return "status-scheduled";

      case "PUBLISHED":
        return "status-published";

      case "FAILED":
        return "status-failed";

      case "DRAFT":
        return "status-draft";

      case "PUBLISHING":
        return "status-publishing";

      default:
        return "status-default";
    }
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const calendarDays = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="calendar-page">
      <div className="calendar-container">

        <div className="calendar-header">
          <div>
            <h1>Publishing Calendar</h1>
            <p>
              View your scheduled and published posts
            </p>
          </div>

          <div className="calendar-month">
            {monthName}
          </div>
        </div>

        {loading && (
          <div className="calendar-message">
            Loading calendar...
          </div>
        )}

        {error && (
          <div className="calendar-error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="calendar-legend">
              <div>
                <span className="legend-dot scheduled-dot"></span>
                Scheduled
              </div>

              <div>
                <span className="legend-dot published-dot"></span>
                Published
              </div>

              <div>
                <span className="legend-dot failed-dot"></span>
                Failed
              </div>

              <div>
                <span className="legend-dot draft-dot"></span>
                Draft
              </div>
            </div>

            <div className="calendar-weekdays">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="calendar-grid">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="calendar-day empty-day"
                    />
                  );
                }

                const dayPosts =
                  getPostsForDay(day);

                return (
                  <div
                    key={day}
                    className={`calendar-day ${
                      isToday(day)
                        ? "today"
                        : ""
                    }`}
                  >
                    <div className="calendar-day-header">
                      <span className="day-number">
                        {day}
                      </span>

                      {isToday(day) && (
                        <span className="today-label">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="day-posts">
                      {dayPosts.length === 0 && (
                        <span className="no-posts">
                          No posts
                        </span>
                      )}

                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          className={`calendar-post ${getStatusClass(
                            post.status
                          )}`}
                        >
                          <div className="post-time">
                            {formatTime(
                              post.scheduled_at
                            )}
                          </div>

                          <div className="post-content">
                            {post.content ||
                              "No content"}
                          </div>

                          <div className="post-status">
                            {post.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}