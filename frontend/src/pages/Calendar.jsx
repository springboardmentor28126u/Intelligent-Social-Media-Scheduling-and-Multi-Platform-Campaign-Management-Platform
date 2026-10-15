import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Calendar.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
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
const STATUS_OPTIONS = ["scheduled", "published", "failed", "draft"];

function parseLocalDate(value) {
  if (!value) return null;
  const match = String(value)
    .replace("T", " ")
    .replace("Z", "")
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  );
}

function getPostDate(post) {
  const status = String(post.status || "").toLowerCase();
  if (status === "published") {
    return parseLocalDate(post.published_at || post.scheduled_at || post.created_at);
  }
  return parseLocalDate(post.scheduled_at || post.created_at || post.published_at);
}

function toDateTimeLocal(value) {
  const date = parseLocalDate(value);
  if (!date) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date, options = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) {
  return date.toLocaleDateString("en-IN", options);
}

function formatTime(date) {
  if (!date) return "Time not set";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeStatus(status) {
  const value = String(status || "draft").toLowerCase();
  if (value === "scheduled" || value === "published" || value === "failed" || value === "draft") {
    return value;
  }
  if (value === "publishing") return "scheduled";
  return null;
}

function platformIcon(platform) {
  const value = String(platform || "").toLowerCase();
  if (value.includes("instagram")) return "◎";
  if (value.includes("facebook")) return "f";
  if (value.includes("linkedin")) return "in";
  if (value.includes("youtube")) return "▶";
  if (value.includes("twitter") || value === "x") return "𝕏";
  return "•";
}

function Calendar() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState("month");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  const loadCalendar = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [postsResponse, campaignsResponse] = await Promise.all([
        fetch(`${API_URL}/posts/`, { headers }),
        fetch(`${API_URL}/campaigns`, { headers }),
      ]);

      if (postsResponse.status === 401 || campaignsResponse.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        navigate("/login");
        return;
      }

      const [postsData, campaignsData] = await Promise.all([
        postsResponse.json(),
        campaignsResponse.json(),
      ]);
      if (!postsResponse.ok) {
        throw new Error(postsData.detail || "Failed to load posts for the calendar.");
      }
      if (!campaignsResponse.ok) {
        throw new Error(campaignsData.detail || "Failed to load campaigns for the calendar.");
      }

      setPosts(Array.isArray(postsData) ? postsData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the content calendar."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadCalendar();
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadCalendar]);

  const campaignNames = useMemo(
    () => new Map(campaigns.map((campaign) => [String(campaign.id), campaign.name])),
    [campaigns]
  );
  const platforms = useMemo(
    () => [...new Set(posts.map((post) => post.platform).filter(Boolean))].sort(),
    [posts]
  );

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const status = normalizeStatus(post.status);
        return (
          status !== null &&
          (platformFilter === "all" || post.platform === platformFilter) &&
          (statusFilter === "all" || status === statusFilter) &&
          (campaignFilter === "all" || String(post.campaign_id || "") === campaignFilter)
        );
      }),
    [posts, platformFilter, statusFilter, campaignFilter]
  );

  const startDate = useMemo(() => {
    if (view === "week") {
      const sunday = new Date(currentDate);
      sunday.setDate(currentDate.getDate() - currentDate.getDay());
      sunday.setHours(0, 0, 0, 0);
      return sunday;
    }
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate, view]);

  const calendarDates = useMemo(() => {
    if (view === "week") {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        return date;
      });
    }

    const first = new Date(startDate);
    const firstWeekday = first.getDay();
    first.setDate(1 - firstWeekday);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const totalCells = Math.ceil((firstWeekday + lastDay.getDate()) / 7) * 7;
    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      return date;
    });
  }, [currentDate, startDate, view]);

  const postsByDate = useMemo(() => {
    const grouped = new Map();
    filteredPosts.forEach((post) => {
      const date = getPostDate(post);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ ...post, calendarDate: date });
    });
    grouped.forEach((dayPosts) => {
      dayPosts.sort((first, second) => first.calendarDate - second.calendarDate);
    });
    return grouped;
  }, [filteredPosts]);

  const getDayPosts = (date) =>
    postsByDate.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) || [];

  const movePeriod = (amount) => {
    const nextDate = new Date(currentDate);
    if (view === "week") nextDate.setDate(nextDate.getDate() + amount * 7);
    else nextDate.setMonth(nextDate.getMonth() + amount, 1);
    setCurrentDate(nextDate);
  };

  const rangeTitle = () => {
    if (view === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${MONTHS[startDate.getMonth()]} ${startDate.getDate()}–${endDate.getDate()}, ${endDate.getFullYear()}`;
    }
    return `${MONTHS[startDate.getMonth()]} ${startDate.getDate()} – ${MONTHS[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  };

  const openPost = (post) => {
    setSelectedPost(post);
    setRescheduleValue(toDateTimeLocal(post.scheduled_at || post.created_at));
    setActionError("");
  };

  const handleDelete = async () => {
    if (!selectedPost || !window.confirm("Delete this post? This cannot be undone.")) return;
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`${API_URL}/posts/${selectedPost.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = response.status === 204 ? {} : await response.json();
      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        navigate("/login");
        return;
      }
      if (!response.ok) throw new Error(result.detail || "Failed to delete post.");
      setPosts((current) => current.filter((post) => post.id !== selectedPost.id));
      setSelectedPost(null);
    } catch (actionFailure) {
      setActionError(actionFailure instanceof Error ? actionFailure.message : "Failed to delete post.");
    }
  };

  const handleReschedule = async (event) => {
    event.preventDefault();
    if (!selectedPost || !rescheduleValue) return;
    if (new Date(rescheduleValue) <= new Date()) {
      setActionError("Choose a future date and time.");
      return;
    }

    const token = localStorage.getItem("access_token");
    setSavingReschedule(true);
    setActionError("");
    try {
      const query = new URLSearchParams({ scheduled_at: rescheduleValue });
      const response = await fetch(
        `${API_URL}/posts/${selectedPost.id}?${query.toString()}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await response.json();
      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        navigate("/login");
        return;
      }
      if (!response.ok) throw new Error(result.detail || "Failed to reschedule post.");
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id
            ? { ...post, scheduled_at: result.scheduled_at, status: result.status }
            : post
        )
      );
      setSelectedPost((current) =>
        current ? { ...current, scheduled_at: result.scheduled_at, status: result.status } : null
      );
      setRescheduleValue(toDateTimeLocal(result.scheduled_at));
    } catch (actionFailure) {
      setActionError(actionFailure instanceof Error ? actionFailure.message : "Failed to reschedule post.");
    } finally {
      setSavingReschedule(false);
    }
  };

  const editPost = () => {
    navigate("/create-post", { state: { editMode: true, post: selectedPost } });
  };

  const duplicatePost = () => {
    navigate("/create-post", {
      state: {
        post: {
          ...selectedPost,
          status: "draft",
          scheduled_at: null,
          published_at: null,
          is_recurring: false,
        },
      },
    });
  };

  const retryLoadCalendar = () => {
    setError("");
    setLoading(true);
    loadCalendar();
  };

  const activePostCount = filteredPosts.length;

  if (loading) {
    return (
      <main className="calendar-page">
        <div className="calendar-state-card" role="status">Loading your content calendar…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="calendar-page">
        <div className="calendar-state-card calendar-load-error">
          <h1>Content Calendar</h1>
          <p>{error}</p>
          <button type="button" onClick={retryLoadCalendar}>Try again</button>
        </div>
      </main>
    );
  }

  return (
    <main className="calendar-page">
      <div className="calendar-container">
        <header className="calendar-header">
          <div className="calendar-title">
            <span className="calendar-eyebrow">PUBLISHING WORKSPACE</span>
            <h1>Content Calendar</h1>
            <p>Plan and manage scheduled posts, drafts, and publishing activity.</p>
          </div>
          <button
            className="calendar-create-button"
            type="button"
            onClick={() => navigate("/create-post")}
          >
            + Create Post
          </button>
        </header>

        <section className="calendar-controls" aria-label="Calendar controls">
          <div className="calendar-period-controls">
            <button type="button" className="calendar-nav-button" onClick={() => movePeriod(-1)} aria-label={`Previous ${view}`}>
              ‹
            </button>
            <h2>{rangeTitle()}</h2>
            <button type="button" className="calendar-nav-button" onClick={() => movePeriod(1)} aria-label={`Next ${view}`}>
              ›
            </button>
            <button type="button" className="calendar-today-button" onClick={() => setCurrentDate(new Date())}>
              Today
            </button>
          </div>
          <div className="calendar-view-toggle" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={view === "month" ? "is-active" : ""}
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={view === "week" ? "is-active" : ""}
              aria-pressed={view === "week"}
              onClick={() => setView("week")}
            >
              Week
            </button>
          </div>
        </section>

        <section className="calendar-filters" aria-label="Filter calendar posts">
          <label>
            <span>Platform</span>
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
              <option value="all">All platforms</option>
              {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Campaign</span>
            <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
              <option value="all">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={String(campaign.id)}>{campaign.name}</option>
              ))}
            </select>
          </label>
          <span className="calendar-result-count">{activePostCount} {activePostCount === 1 ? "post" : "posts"}</span>
        </section>

        <section className="calendar-grid-wrap" aria-label={`${view} content calendar`}>
          <div className="calendar-weekday-row">
            {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className={`calendar-grid ${view === "week" ? "is-week-view" : ""}`}>
            {calendarDates.map((date) => {
              const dayPosts = getDayPosts(date);
              const inCurrentMonth = date.getMonth() === currentDate.getMonth();
              const today = new Date();
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div
                  className={`calendar-day${inCurrentMonth || view === "week" ? "" : " is-outside-month"}${isToday ? " is-today" : ""}`}
                  key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                >
                  <div className="calendar-day-heading">
                    <span>{date.getDate()}</span>
                    {isToday && <small>Today</small>}
                  </div>
                  <div className="calendar-day-posts">
                    {dayPosts.map((post) => {
                      const status = normalizeStatus(post.status);
                      return (
                        <button
                          className={`calendar-post-card status-${status}`}
                          type="button"
                          key={post.id}
                          onClick={() => openPost(post)}
                          title={`Open ${post.platform || "social"} post details`}
                        >
                          <span className="calendar-post-card-top">
                            <span className="calendar-post-platform">
                              <b aria-hidden="true">{platformIcon(post.platform)}</b>
                              {post.platform || "Social"}
                            </span>
                            <span className={`calendar-status status-${status}`}>{status}</span>
                          </span>
                          <span className="calendar-post-time">{formatTime(post.calendarDate)}</span>
                          <span className="calendar-post-preview">{post.content || "No content"}</span>
                          {post.campaign_id && (
                            <span className="calendar-post-campaign">
                              {campaignNames.get(String(post.campaign_id)) || "Campaign"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="calendar-legend">
          <span>{activePostCount} posts in this filter</span>
          <div aria-label="Post status legend">
            {STATUS_OPTIONS.map((status) => (
              <span className={`calendar-legend-item status-${status}`} key={status}>
                <i aria-hidden="true" />
                {status[0].toUpperCase() + status.slice(1)}
              </span>
            ))}
          </div>
        </footer>
      </div>

      {selectedPost && (
        <div className="calendar-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedPost(null);
        }}>
          <section
            className="calendar-post-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-post-modal-title"
          >
            <div className="calendar-modal-header">
              <div>
                <span className={`calendar-status status-${normalizeStatus(selectedPost.status)}`}>
                  {normalizeStatus(selectedPost.status)}
                </span>
                <h2 id="calendar-post-modal-title">Post details</h2>
              </div>
              <button type="button" className="calendar-modal-close" onClick={() => setSelectedPost(null)} aria-label="Close post details">
                ×
              </button>
            </div>
            <dl className="calendar-post-details">
              <div><dt>Date</dt><dd>{getPostDate(selectedPost) ? formatDate(getPostDate(selectedPost)) : "Not set"}</dd></div>
              <div><dt>Time</dt><dd>{formatTime(getPostDate(selectedPost))}</dd></div>
              <div><dt>Platform</dt><dd>{selectedPost.platform || "Social"}</dd></div>
              <div><dt>Campaign</dt><dd>{selectedPost.campaign_id ? campaignNames.get(String(selectedPost.campaign_id)) || "Campaign" : "None"}</dd></div>
              <div className="calendar-detail-content"><dt>Caption / content</dt><dd>{selectedPost.content || "No content"}</dd></div>
            </dl>
            {actionError && <p className="calendar-action-error" role="alert">{actionError}</p>}
            {normalizeStatus(selectedPost.status) !== "published" && (
              <form className="calendar-reschedule-form" onSubmit={handleReschedule}>
                <label htmlFor="calendar-reschedule">Reschedule</label>
                <div>
                  <input
                    id="calendar-reschedule"
                    type="datetime-local"
                    value={rescheduleValue}
                    onChange={(event) => setRescheduleValue(event.target.value)}
                    required
                  />
                  <button type="submit" disabled={savingReschedule}>
                    {savingReschedule ? "Saving…" : "Save time"}
                  </button>
                </div>
              </form>
            )}
            <div className="calendar-modal-actions">
              <button type="button" onClick={editPost}>Edit</button>
              <button type="button" onClick={duplicatePost}>Duplicate</button>
              <button type="button" className="calendar-delete-button" onClick={handleDelete}>Delete</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Calendar;
