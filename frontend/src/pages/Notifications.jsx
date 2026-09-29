import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, PageHeader } from "../components/UI";
import "./Notifications.css";

const API_URL = "http://127.0.0.1:8000";

function readNotificationIds(storageKey) {
  try {
    const values = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set(Array.isArray(values) ? values : []);
  } catch {
    return new Set();
  }
}

function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    Promise.all([
      fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/dashboard/recent-posts`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([userResponse, postsResponse]) => {
        if (userResponse.status === 401 || postsResponse.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/login", { replace: true });
          return null;
        }
        if (!userResponse.ok || !postsResponse.ok) throw new Error("Unable to load notifications.");
        return Promise.all([userResponse.json(), postsResponse.json()]);
      })
      .then((result) => {
        if (!result) return;
        const [user, posts] = result;
        const storageKey = `socialpilot:notification-read:${user.user_id}`;
        const readIds = readNotificationIds(storageKey);
        setItems(posts.filter((post) => ["scheduled", "published", "failed"].includes(post.status?.toLowerCase())).map((post) => {
          const status = post.status.toLowerCase();
          const category = status === "failed" ? "Publishing failure" : status === "scheduled" ? "Post notification" : "Publishing update";
          return {
            id: String(post.id),
            category,
            title: status === "failed" ? "A post needs attention" : status === "scheduled" ? "A post is scheduled" : "A post was published",
            description: [post.content, post.platform, post.campaign_name].filter(Boolean).join(" · "),
            date: post.published_at || post.scheduled_at || post.created_at,
            read: readIds.has(String(post.id)),
          };
        }));
      })
      .catch((requestError) => setError(requestError.message || "Unable to load notifications."))
      .finally(() => setLoading(false));
  }, [navigate]);

  function saveReadState(nextItems) {
    setItems(nextItems);
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((user) => {
        if (user) {
          localStorage.setItem(`socialpilot:notification-read:${user.user_id}`, JSON.stringify(nextItems.filter((item) => item.read).map((item) => item.id)));
        }
      })
      .catch(() => {});
  }

  const unreadCount = items.filter((item) => !item.read).length;

  return <div className="workspace-page notifications-page">
    <PageHeader eyebrow="ACTIVITY CENTER" title="Notifications" description="Recent publishing and scheduling updates." className="notifications-heading" actions={<button className="notifications-mark-all" disabled={!unreadCount} onClick={() => saveReadState(items.map((item) => ({ ...item, read: true })))}>Mark all as read</button>} />
    {error && <p className="notification-error" role="alert">{error}</p>}
    {loading && <p className="notification-empty">Loading notifications...</p>}
    {!loading && !error && !items.length && <section className="notifications-empty"><EmptyState title="You are all caught up" description="Publishing updates will appear here when posts are scheduled or published." /></section>}
    {!loading && !error && items.length > 0 && <section className="notifications-list" aria-label="Recent notifications">
      {items.map((item) => <article key={item.id} className={`notification-item${item.read ? " is-read" : " is-unread"}`}>
        <span className={`notification-indicator${item.category === "Publishing failure" ? " is-error" : ""}`} aria-hidden="true">{item.category === "Publishing failure" ? "!" : item.category === "Post notification" ? "◷" : "✓"}</span>
        <div className="notification-copy"><div><span className="notification-category">{item.category}</span><time>{item.date ? new Date(item.date).toLocaleString() : "Recently"}</time></div><strong>{item.title}</strong><p>{item.description || "Post activity updated."}</p></div>
        {!item.read && <button className="notification-read-button" onClick={() => saveReadState(items.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))}>Mark read</button>}
      </article>)}
    </section>}
    {!loading && !error && items.length > 0 && <p className="notification-count">{unreadCount ? `${unreadCount} unread` : "All notifications read"}</p>}
  </div>;
}

export default Notifications;