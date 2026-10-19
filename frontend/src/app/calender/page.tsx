"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { getPosts } from "@/lib/api";

interface Post {
  id: number;
  content: string;
  platforms: string[];
  content_type?: string;
  status: "scheduled" | "published" | "failed" | "cancelled" | "draft" | "pending_approval";
  scheduled_at?: string | null;
  created_at?: string | null;
  campaign?: string;
}

function getSampleCalendarPosts(baseDate: Date): Post[] {
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, "0");
  return [
    {
      id: 101,
      content: "🚀 Scaling SaaS operations with multi-platform campaign automation. What works best for your team?",
      platforms: ["LinkedIn", "Twitter"],
      content_type: "carousel",
      status: "published",
      scheduled_at: `${y}-${m}-04T10:00:00`,
      campaign: "Q4 Omni-Channel Boost",
    },
    {
      id: 102,
      content: "Behind the scenes: How we craft interactive product walkthroughs and Reels for developers.",
      platforms: ["Instagram", "YouTube"],
      content_type: "reels",
      status: "published",
      scheduled_at: `${y}-${m}-07T14:30:00`,
      campaign: "Employer Branding",
    },
    {
      id: 103,
      content: "5 metrics every social marketer should track: CTR, engagement depth, and conversion ROI.",
      platforms: ["LinkedIn"],
      content_type: "carousel",
      status: "scheduled",
      scheduled_at: `${y}-${m}-12T09:15:00`,
      campaign: "Q4 Omni-Channel Boost",
    },
    {
      id: 104,
      content: "Weekly Product Roundup: New analytics dashboards and scheduling calendar upgrades now live!",
      platforms: ["LinkedIn", "Twitter", "Facebook"],
      content_type: "image",
      status: "scheduled",
      scheduled_at: `${y}-${m}-18T16:00:00`,
      campaign: "Product Release V2",
    },
    {
      id: 105,
      content: "Live AMA on Twitter Space: Trends in Social Media Campaign Management & AI Automation for 2026.",
      platforms: ["Twitter"],
      content_type: "text",
      status: "scheduled",
      scheduled_at: `${y}-${m}-22T11:00:00`,
      campaign: "Community Growth",
    },
    {
      id: 106,
      content: "Infographic: Complete dimension cheat sheet for Instagram, LinkedIn, and Pinterest pins.",
      platforms: ["Pinterest", "Instagram"],
      content_type: "image",
      status: "pending_approval",
      scheduled_at: `${y}-${m}-26T15:00:00`,
      campaign: "Creative Lab",
    },
  ];
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  /* Auth Guard & Load Posts */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const livePosts = await getPosts();
        if (Array.isArray(livePosts) && livePosts.length > 0) {
          const mapped: Post[] = livePosts.map((p, idx) => ({
            id: p.id || idx + 1,
            content: p.content || "Scheduled update",
            platforms: Array.isArray(p.platforms) ? p.platforms : [p.platform || "LinkedIn"],
            content_type: p.content_type || "text",
            status: p.status || "scheduled",
            scheduled_at: p.scheduled_at,
            campaign: "Campaign",
          }));
          setPosts(mapped.length > 0 ? mapped : getSampleCalendarPosts(currentDate));
        } else {
          setPosts(getSampleCalendarPosts(currentDate));
        }
      } catch {
        setPosts(getSampleCalendarPosts(currentDate));
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [currentDate, router]);

  /* Calendar Calculations */
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  }, [firstDay, daysInMonth]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getPostsForDay = (day: number) => {
    return posts.filter((p) => {
      if (!p.scheduled_at) return false;
      const d = new Date(p.scheduled_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* HEADER BAR */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Publishing Engine</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Omni-Channel Content Calendar
            </h1>
          </div>

          {/* MONTH NAVIGATION CONTROLS */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 shadow-sm">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm transition"
              >
                ‹
              </button>
              <span className="px-3 text-xs font-bold text-white min-w-[120px] text-center">
                {monthName} {year}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm transition"
              >
                ›
              </button>
            </div>

            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => router.push("/create-post")}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <span>＋</span>
              <span>Schedule Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR BODY */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col">
          {/* DAY NAMES HEADER */}
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/70 text-center text-xs font-bold text-slate-400 py-3 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* CALENDAR GRID */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-800/80 min-h-[600px]">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="bg-slate-950/30 p-2 min-h-[100px]" />;
              }

              const dayPosts = getPostsForDay(day);
              const isTodayCell = isToday(day);
              const isSelected = selectedDay === day;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`p-2 min-h-[105px] transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-950/40 ring-2 ring-indigo-500/50"
                      : "hover:bg-slate-850/60 bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isTodayCell
                          ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                          : "text-slate-300"
                      }`}
                    >
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayPosts.length} {dayPosts.length === 1 ? "post" : "posts"}
                      </span>
                    )}
                  </div>

                  {/* POST PILLS */}
                  <div className="space-y-1 overflow-hidden">
                    {dayPosts.slice(0, 2).map((p) => {
                      const statusColor =
                        p.status === "published"
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/70"
                          : p.status === "pending_approval"
                          ? "bg-amber-950/80 text-amber-300 border-amber-800/70"
                          : "bg-indigo-950/80 text-indigo-300 border-indigo-800/70";

                      return (
                        <div
                          key={p.id}
                          className={`text-[10px] p-1 rounded-md border font-medium truncate flex items-center gap-1 ${statusColor}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                          <span className="truncate">{p.content}</span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <span className="text-[9px] font-bold text-indigo-400 block pl-1">
                        +{dayPosts.length - 2} more
                      </span>
                    )}
                  </div>

                  <div className="pt-1 text-[9px] text-slate-500 text-right opacity-0 hover:opacity-100 transition">
                    + add
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SELECTED DAY INSPECTOR DRAWER */}
        {selectedDay && (
          <div className="mt-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">
                Scheduled Content for {monthName} {selectedDay}, {year}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/create-post")}
                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
                >
                  + Add Post for this Day
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {selectedDayPosts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No posts scheduled for this day yet. Click "+ Add Post" to schedule one!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {post.content_type || "text"}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-400">
                          {post.campaign || "General"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                        <span>Platforms: {post.platforms.join(", ")}</span>
                        <span>•</span>
                        <span>Status: {post.status}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push("/create-post")}
                      className="text-xs text-indigo-400 font-bold hover:text-indigo-300 shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}