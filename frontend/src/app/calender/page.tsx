"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Post {
  id: number;
  content: string;
  platforms: string[];
  content_type?: string;
  status: string;
  scheduled_at?: string | null;
  created_at?: string | null;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export default function CalendarPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedPost, setSelectedPost] =
    useState<Post | null>(null);

  // =========================================================
  // LOAD POSTS
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      try {
        const token =
          localStorage.getItem("access_token");

        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(
          `${API_URL}/posts`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to load posts"
          );
        }

        if (!cancelled) {
          setPosts(data);
        }
      } catch (error) {
        console.error(
          "Calendar loading error:",
          error
        );

        if (
          error instanceof Error &&
          error.message
            .toLowerCase()
            .includes("invalid or expired")
        ) {
          localStorage.removeItem(
            "access_token"
          );

          router.push("/login");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();

  const monthName =
    currentDate.toLocaleString(
      "default",
      {
        month: "long",
      }
    );

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const calendarDays = useMemo(() => {
    const days: (
      | number
      | null
    )[] = [];

    for (
      let i = 0;
      i < firstDay;
      i++
    ) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      days.push(day);
    }

    return days;
  }, [
    firstDay,
    daysInMonth,
  ]);

  // =========================================================
  // MONTH NAVIGATION
  // =========================================================

  function previousMonth() {
    setCurrentDate(
      new Date(
        year,
        month - 1,
        1
      )
    );
  }

  function nextMonth() {
    setCurrentDate(
      new Date(
        year,
        month + 1,
        1
      )
    );
  }

  function goToToday() {
    setCurrentDate(
      new Date()
    );
  }

  // =========================================================
  // POSTS FOR A PARTICULAR DAY
  // =========================================================

  function getPostsForDay(
    day: number
  ) {
    return posts.filter(
      (post) => {
        if (!post.scheduled_at) {
          return false;
        }

        const date =
          new Date(
            post.scheduled_at
          );

        return (
          date.getFullYear() ===
            year &&
          date.getMonth() ===
            month &&
          date.getDate() === day
        );
      }
    );
  }

  // =========================================================
  // STATUS COLOR
  // =========================================================

  function getStatusClasses(
    status: string
  ) {
    switch (
      status.toLowerCase()
    ) {
      case "scheduled":
        return "bg-sky-50 text-sky-600 border-sky-200";

      case "published":
        return "bg-green-50 text-green-600 border-green-200";

      case "failed":
        return "bg-red-50 text-red-600 border-red-200";

      case "cancelled":
        return "bg-slate-100 text-slate-500 border-slate-200";

      case "draft":
        return "bg-amber-50 text-amber-600 border-amber-200";

      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  }

  // =========================================================
  // PLATFORM DISPLAY
  // =========================================================

  function getPlatformLabel(
    platforms: string[]
  ) {
    if (!platforms?.length) {
      return "No platform";
    }

    if (platforms.length === 1) {
      return platforms[0];
    }

    return `${platforms[0]} +${
      platforms.length - 1
    }`;
  }

  // =========================================================
  // FORMAT TIME
  // =========================================================

  function formatTime(
    dateString?: string | null
  ) {
    if (!dateString) {
      return "";
    }

    const date =
      new Date(dateString);

    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  // =========================================================
  // TODAY CHECK
  // =========================================================

  function isToday(
    day: number
  ) {
    const today =
      new Date();

    return (
      today.getFullYear() ===
        year &&
      today.getMonth() ===
        month &&
      today.getDate() === day
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8fcff] flex items-center justify-center">

        <div className="text-center">

          <div className="w-11 h-11 border-4 border-sky-100 border-t-sky-400 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-base font-medium text-slate-500">
            Loading publishing calendar...
          </p>

        </div>

      </main>
    );
  }

  // =========================================================
  // CALENDAR UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f8fcff] text-slate-700">

      {/* =================================================== */}
      {/* HEADER */}
      {/* =================================================== */}

      <header className="bg-white border-b border-sky-100 px-8 py-6">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

          <div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="text-sm font-semibold text-sky-500 hover:text-sky-600 mb-2"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold text-slate-800">
              Publishing Calendar
            </h1>

            <p className="text-base text-slate-500 mt-1">
              Plan, schedule and
              track your social
              media content.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/create-post"
              )
            }
            className="px-6 py-3 rounded-xl bg-sky-400 text-white text-sm font-bold hover:bg-sky-500 shadow-sm transition"
          >
            + Create Post
          </button>

        </div>

      </header>

      {/* =================================================== */}
      {/* MAIN */}
      {/* =================================================== */}

      <div className="p-8">

        {/* ================================================= */}
        {/* CALENDAR TOOLBAR */}
        {/* ================================================= */}

        <div className="bg-white border border-sky-100 rounded-2xl shadow-sm p-5 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            {/* MONTH */}

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={
                  previousMonth
                }
                aria-label="Previous month"
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-sky-100 bg-white text-slate-600 text-2xl font-bold hover:bg-sky-50 hover:border-sky-200 hover:text-sky-500 transition"
              >
                ‹
              </button>

              <h2 className="min-w-[220px] text-center text-2xl font-bold text-slate-800">
                {monthName}{" "}
                {year}
              </h2>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                aria-label="Next month"
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-sky-100 bg-white text-slate-600 text-2xl font-bold hover:bg-sky-50 hover:border-sky-200 hover:text-sky-500 transition"
              >
                ›
              </button>

            </div>

            {/* TODAY */}

            <button
              type="button"
              onClick={
                goToToday
              }
              className="px-5 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-600 text-sm font-bold hover:bg-sky-100 transition"
            >
              Today
            </button>

          </div>

        </div>

        {/* ================================================= */}
        {/* LEGEND */}
        {/* ================================================= */}

        <div className="bg-white border border-sky-100 rounded-2xl shadow-sm px-6 py-4 mb-6">

          <div className="flex flex-wrap items-center gap-5">

            <span className="text-sm font-bold text-slate-600">
              Status:
            </span>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400" />
              <span className="text-sm text-slate-500">
                Scheduled
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-sm text-slate-500">
                Published
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-sm text-slate-500">
                Failed
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-sm text-slate-500">
                Cancelled
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-sm text-slate-500">
                Draft
              </span>
            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* CALENDAR */}
        {/* ================================================= */}

        <div className="bg-white border border-sky-100 rounded-2xl shadow-sm overflow-hidden">

          {/* WEEKDAYS */}

          <div className="grid grid-cols-7 border-b border-sky-100 bg-sky-50">

            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map(
              (day) => (
                <div
                  key={day}
                  className="px-3 py-4 text-center text-sm font-bold text-slate-500 border-r border-sky-100 last:border-r-0"
                >
                  {day}
                </div>
              )
            )}

          </div>

          {/* DAYS */}

          <div className="grid grid-cols-7">

            {calendarDays.map(
              (
                day,
                index
              ) => {

                if (
                  day === null
                ) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[145px] bg-slate-50/50 border-r border-b border-sky-50"
                    />
                  );
                }

                const dayPosts =
                  getPostsForDay(
                    day
                  );

                return (
                  <div
                    key={day}
                    className={`min-h-[145px] p-3 border-r border-b border-sky-50 last:border-r-0 hover:bg-sky-50/40 transition ${
                      isToday(day)
                        ? "bg-sky-50/70"
                        : "bg-white"
                    }`}
                  >

                    {/* DAY NUMBER */}

                    <div className="flex items-center justify-between mb-3">

                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          isToday(day)
                            ? "bg-sky-400 text-white"
                            : "text-slate-600"
                        }`}
                      >
                        {day}
                      </span>

                      {dayPosts.length >
                        0 && (
                        <span className="text-xs font-semibold text-slate-400">
                          {
                            dayPosts.length
                          }{" "}
                          post
                          {dayPosts.length >
                          1
                            ? "s"
                            : ""}
                        </span>
                      )}

                    </div>

                    {/* POSTS */}

                    <div className="space-y-2">

                      {dayPosts.map(
                        (post) => (

                          <button
                            key={
                              post.id
                            }
                            type="button"
                            onClick={() =>
                              setSelectedPost(
                                post
                              )
                            }
                            className="w-full text-left"
                          >

                            <div
                              className={`rounded-lg border px-3 py-2 hover:shadow-sm transition ${getStatusClasses(
                                post.status
                              )}`}
                            >

                              <div className="flex items-center justify-between gap-2">

                                <span className="text-xs font-bold truncate">
                                  {getPlatformLabel(
                                    post.platforms
                                  )}
                                </span>

                                <span className="text-[11px] font-medium">
                                  {formatTime(
                                    post.scheduled_at
                                  )}
                                </span>

                              </div>

                              <p className="text-xs mt-1 line-clamp-2 leading-4">
                                {
                                  post.content
                                }
                              </p>

                            </div>

                          </button>

                        )
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* ================================================= */}
        {/* EMPTY STATE */}
        {/* ================================================= */}

        {posts.length ===
          0 && (
          <div className="mt-6 bg-white border border-sky-100 rounded-2xl shadow-sm p-10 text-center">

            <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-400 flex items-center justify-center text-2xl mx-auto mb-4">
              ▣
            </div>

            <h3 className="text-lg font-bold text-slate-700">
              No posts yet
            </h3>

            <p className="text-sm text-slate-400 mt-1 mb-5">
              Create your first
              post and schedule
              it on the calendar.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/create-post"
                )
              }
              className="px-5 py-2.5 rounded-xl bg-sky-400 text-white text-sm font-bold hover:bg-sky-500 transition"
            >
              Create Your First Post
            </button>

          </div>
        )}

      </div>

      {/* =================================================== */}
      {/* POST DETAILS MODAL */}
      {/* =================================================== */}

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-5"
          onClick={() =>
            setSelectedPost(null)
          }
        >

          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-sky-100 p-6"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-sky-500">
                  Post Details
                </p>

                <h2 className="text-xl font-bold text-slate-800 mt-1">
                  Social Media Post
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPost(null)
                }
                className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 hover:bg-sky-50 hover:text-sky-500 text-lg"
              >
                ×
              </button>

            </div>

            {/* STATUS */}

            <div className="mt-5">

              <span
                className={`inline-flex px-3 py-1.5 rounded-full border text-xs font-bold ${getStatusClasses(
                  selectedPost.status
                )}`}
              >
                {selectedPost.status}
              </span>

            </div>

            {/* CONTENT */}

            <div className="mt-5">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                Content
              </p>

              <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">

                <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                  {
                    selectedPost.content
                  }
                </p>

              </div>

            </div>

            {/* DETAILS */}

            <div className="grid grid-cols-2 gap-4 mt-5">

              <div className="rounded-xl border border-sky-100 p-4">

                <p className="text-xs text-slate-400">
                  Platforms
                </p>

                <p className="text-sm font-bold text-slate-700 mt-1">
                  {getPlatformLabel(
                    selectedPost.platforms
                  )}
                </p>

              </div>

              <div className="rounded-xl border border-sky-100 p-4">

                <p className="text-xs text-slate-400">
                  Scheduled Time
                </p>

                <p className="text-sm font-bold text-slate-700 mt-1">
                  {formatTime(
                    selectedPost.scheduled_at
                  ) ||
                    "Not scheduled"}
                </p>

              </div>

            </div>

            {/* CLOSE */}

            <button
              type="button"
              onClick={() =>
                setSelectedPost(null)
              }
              className="w-full mt-6 rounded-xl bg-sky-400 text-white py-3 text-sm font-bold hover:bg-sky-500 transition"
            >
              Close
            </button>

          </div>

        </div>
      )}

    </main>
  );
}