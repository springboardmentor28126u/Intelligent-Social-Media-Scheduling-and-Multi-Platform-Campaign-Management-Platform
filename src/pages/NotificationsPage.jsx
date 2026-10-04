import { useEffect, useState } from "react";
import notificationService from "../services/notificationService";
import "./NotificationsPage.css";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const [notificationsResponse, countResponse] =
        await Promise.all([
          notificationService.getNotifications(),
          notificationService.getCount(),
        ]);

      setNotifications(
        Array.isArray(notificationsResponse.data)
          ? notificationsResponse.data
          : []
      );

      setUnreadCount(
        countResponse.data?.unread_count || 0
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const refreshCount = async () => {
    try {
      const response = await notificationService.getCount();

      setUnreadCount(
        response.data?.unread_count || 0
      );
    } catch {
      // Keep the existing count if refreshing fails.
    }
  };

  const handleMarkRead = async (notification) => {
    if (notification.is_read) return;

    try {
      setProcessingId(notification.id);
      setError("");

      await notificationService.markRead(
        notification.id
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to mark notification as read."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      setProcessingId("all");
      setError("");
      setSuccess("");

      await notificationService.markAllRead();

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setUnreadCount(0);
      setSuccess("All notifications marked as read.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      setProcessingId(notificationId);
      setError("");
      setSuccess("");

      await notificationService.delete(notificationId);

      setNotifications((previous) =>
        previous.filter(
          (notification) =>
            notification.id !== notificationId
        )
      );

      await refreshCount();

      setSuccess("Notification deleted.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete notification."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await handleMarkRead(notification);
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    const notificationDate = new Date(date);
    const now = new Date();

    const difference =
      now.getTime() - notificationDate.getTime();

    const minutes = Math.floor(
      difference / (1000 * 60)
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d ago`;
    }

    return notificationDate.toLocaleDateString();
  };

  const getNotificationIcon = (notification) => {
    const type =
      notification.notification_type?.toLowerCase() ||
      notification.type?.toLowerCase();

    if (type?.includes("team")) return "👥";
    if (type?.includes("post")) return "📝";
    if (type?.includes("campaign")) return "📢";
    if (type?.includes("message")) return "💬";
    if (type?.includes("success")) return "✓";
    if (type?.includes("warning")) return "⚠";

    return "🔔";
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">
          <div className="notification-spinner" />
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <header className="notifications-header">
          <div>
            <p className="notification-eyebrow">
              ACTIVITY
            </p>

            <div className="notifications-title-row">
              <h1>Notifications</h1>

              {unreadCount > 0 && (
                <span className="unread-badge">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <p>
              Stay up to date with activity in your
              SocialPilot workspace.
            </p>
          </div>

          <button
            className="mark-all-button"
            onClick={handleMarkAllRead}
            disabled={
              unreadCount === 0 ||
              processingId === "all"
            }
          >
            {processingId === "all"
              ? "Marking..."
              : "Mark all as read"}
          </button>
        </header>

        {error && (
          <div className="notification-message error">
            <span>⚠</span>
            {error}
          </div>
        )}

        {success && (
          <div className="notification-message success">
            <span>✓</span>
            {success}
          </div>
        )}

        <div className="notifications-card">
          {notifications.length === 0 ? (
            <div className="notifications-empty">
              <div className="empty-bell">🔔</div>
              <h2>You're all caught up</h2>
              <p>
                You don't have any notifications right now.
              </p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read ? "read" : "unread"
                  }`}
                >
                  <button
                    className="notification-main"
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                    disabled={
                      processingId === notification.id
                    }
                  >
                    <div
                      className={`notification-icon ${
                        notification.is_read
                          ? "read-icon"
                          : "unread-icon"
                      }`}
                    >
                      {getNotificationIcon(notification)}
                    </div>

                    <div className="notification-content">
                      <div className="notification-top-row">
                        <h3>{notification.title}</h3>

                        {!notification.is_read && (
                          <span className="unread-dot" />
                        )}
                      </div>

                      <p>{notification.message}</p>

                      <div className="notification-meta">
                        <span>
                          {formatDate(
                            notification.created_at
                          )}
                        </span>

                        {notification.notification_type && (
                          <>
                            <span className="meta-separator">
                              •
                            </span>

                            <span>
                              {notification.notification_type}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="notification-actions">
                    {!notification.is_read && (
                      <button
                        className="read-button"
                        onClick={() =>
                          handleMarkRead(notification)
                        }
                        disabled={
                          processingId === notification.id
                        }
                      >
                        {processingId === notification.id
                          ? "..."
                          : "Mark read"}
                      </button>
                    )}

                    <button
                      className="delete-notification-button"
                      onClick={() =>
                        handleDelete(notification.id)
                      }
                      disabled={
                        processingId === notification.id
                      }
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}