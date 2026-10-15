
"use client";

import { useCallback, useEffect, useState } from "react";

type Notification = {
  id: number;
  user_id: number;
  post_id: number | null;
  title: string;
  message: string;
  notification_type: string;
  platform: string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationResponse = {
  total: number;
  all_count?: number;
  unread_count: number;
  notifications: Notification[];
};

type FilterType = "all" | "unread";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

function getToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function getNotificationCategory(type: string) {
  const value = type.toLowerCase();

  if (value.includes("fail") || value.includes("error")) {
    return {
      label: "Publishing failed",
      icon: "!",
      style: "bg-rose-50 text-rose-700 ring-rose-200",
      dot: "bg-rose-500",
    };
  }

  if (value.includes("publish") || value.includes("success")) {
    return {
      label: "Publishing update",
      icon: "✓",
      style: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dot: "bg-emerald-500",
    };
  }

  if (value.includes("schedule") || value.includes("reminder")) {
    return {
      label: "Scheduled post",
      icon: "◷",
      style: "bg-sky-50 text-sky-700 ring-sky-200",
      dot: "bg-sky-500",
    };
  }

  if (value.includes("campaign")) {
    return {
      label: "Campaign update",
      icon: "◎",
      style: "bg-indigo-50 text-indigo-700 ring-indigo-200",
      dot: "bg-indigo-500",
    };
  }

  return {
    label: "Activity update",
    icon: "•",
    style: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
  };
}

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [allCount, setAllCount] = useState(0);

  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = getToken();

      if (!token) {
        throw new Error("Login session not found. Please log in again.");
      }

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...options.headers,
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Your session may have expired. Please log in again."
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.detail || `Request failed (${response.status}).`
        );
      }

      if (response.status === 204) return null;

      return response.json();
    },
    []
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query =
        filter === "unread" ? "?unread_only=true" : "";

      const data = (await request(
        `/api/notifications/${query}`
      )) as NotificationResponse;

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
      setTotal(data.total ?? 0);

      if (typeof data.all_count === "number") {
        setAllCount(data.all_count);
      } else if (filter === "all") {
        setAllCount(data.total ?? 0);
      }
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load notifications.")
      );
    } finally {
      setLoading(false);
    }
  }, [filter, request]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function markAsRead(id: number) {
    setActionId(id);
    setError("");

    try {
      await request(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });

      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to mark as read."));
    } finally {
      setActionId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");

    try {
      await request("/api/notifications/read-all", {
        method: "PATCH",
      });

      await loadNotifications();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to mark notifications as read.")
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function deleteNotification(id: number) {
    setActionId(id);
    setError("");

    try {
      await request(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete notification."));
    } finally {
      setActionId(null);
    }
  }

  const readCount = Math.max(allCount - unreadCount, 0);

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              SocialPilot / Activity
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Notifications
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor publishing results, scheduled posts, and campaign
              updates from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">✓</span>
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </header>

        {/* Summary */}
        <section
          aria-label="Notification summary"
          className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                All notifications
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <span aria-hidden="true">▤</span>
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums text-slate-900">
              {allCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total activity updates
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Unread
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <span aria-hidden="true">●</span>
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums text-slate-900">
              {unreadCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Updates awaiting review
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Read
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <span aria-hidden="true">✓</span>
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums text-slate-900">
              {readCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Updates already reviewed
            </p>
          </div>
        </section>

        {/* Activity panel */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent activity
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Updates from your connected publishing workflows
              </p>
            </div>

            <div
              className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1"
              role="group"
              aria-label="Filter notifications"
            >
              <button
                type="button"
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === "all"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setFilter("unread")}
                aria-pressed={filter === "unread"}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === "unread"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs tabular-nums text-slate-700">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:mx-6"
            >
              <p className="font-semibold">Unable to complete the request</p>
              <p className="mt-1 break-words">{error}</p>
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="mt-3 font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-5 p-6" aria-label="Loading notifications">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex animate-pulse gap-4">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 w-1/3 rounded bg-slate-200" />
                    <div className="h-3 w-4/5 rounded bg-slate-100" />
                    <div className="h-3 w-1/4 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl text-slate-500">
                ♧
              </div>

              <h3 className="mt-5 text-base font-semibold text-slate-900">
                {filter === "unread"
                  ? "You're all caught up"
                  : "No notifications yet"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {filter === "unread"
                  ? "There are no unread updates. New publishing results and reminders will appear here when generated by the backend."
                  : "Publishing results, scheduled-post reminders, and campaign alerts will appear here when generated by the backend."}
              </p>

              {filter === "unread" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="mt-5 text-sm font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-900"
                >
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const category = getNotificationCategory(
                  notification.notification_type
                );

                return (
                  <article
                    key={notification.id}
                    className={`flex gap-3 px-5 py-5 transition-colors sm:gap-4 sm:px-6 ${
                      !notification.is_read
                        ? "bg-slate-50/80"
                        : "bg-white hover:bg-slate-50/70"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold ring-1 ring-inset ${category.style}`}
                      aria-label={category.label}
                      title={category.label}
                    >
                      {category.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-semibold text-slate-900">
                          {notification.title}
                        </h3>

                        {!notification.is_read && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            <span className={`h-1.5 w-1.5 rounded-full ${category.dot}`} />
                            New
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {notification.message}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
                        <span>{formatDate(notification.created_at)}</span>

                        <span aria-hidden="true">·</span>
                        <span>{category.label}</span>

                        {notification.platform && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">
                              {notification.platform}
                            </span>
                          </>
                        )}

                        {notification.post_id !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Post #{notification.post_id}</span>
                          </>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        {!notification.is_read && (
                          <button
                            type="button"
                            disabled={actionId === notification.id}
                            onClick={() => void markAsRead(notification.id)}
                            className="text-xs font-semibold text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline disabled:opacity-50"
                          >
                            Mark as read
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={actionId === notification.id}
                          onClick={() =>
                            void deleteNotification(notification.id)
                          }
                          className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-rose-700 hover:underline disabled:opacity-50"
                        >
                          {actionId === notification.id
                            ? "Processing..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && notifications.length > 0 && (
            <footer className="border-t border-slate-200 bg-slate-50/70 px-5 py-3.5 sm:px-6">
              <p className="text-xs text-slate-500">
                Showing {notifications.length} notification
                {notifications.length !== 1 ? "s" : ""}
                {filter === "unread" ? " in the unread view" : ""}.
              </p>
            </footer>
          )}
        </section>

        <footer className="py-6 text-center">
          <p className="text-xs text-slate-400">
            SocialPilot · Publishing activity and updates
          </p>
        </footer>
      </div>
    </main>
  );
}

