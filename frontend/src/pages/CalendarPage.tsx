import React, { useState, useEffect, useCallback } from "react";
import { api, getMediaUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  X,
  Calendar as CalendarIcon,
  Edit3,
  Repeat2,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";

// ── Types ──────────────────────────────────────────────────────────
interface CalendarPost {
  id: number;
  uuid: string;
  title?: string;
  content: string;
  platform: string;
  post_type: string;
  media_url?: string;
  media_type?: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  campaign_name?: string;
  account_name?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
}

// ── Helpers ────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-50 border-emerald-200 text-emerald-900",
  scheduled: "bg-blue-50 border-blue-200 text-blue-900",
  draft: "bg-slate-100 border-slate-200 text-slate-700",
  failed: "bg-rose-50 border-rose-200 text-rose-900",
  cancelled: "bg-slate-100 border-slate-300 text-slate-400 line-through",
  queued: "bg-purple-50 border-purple-200 text-purple-900",
  pending_approval: "bg-amber-50 border-amber-200 text-amber-900",
};

const STATUS_BADGE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  scheduled: "bg-blue-50 text-blue-700 border border-blue-200",
  draft: "bg-slate-100 text-slate-600 border border-slate-200",
  failed: "bg-rose-50 text-rose-700 border border-rose-200",
  cancelled: "bg-slate-100 text-slate-400 border border-slate-200",
  queued: "bg-purple-50 text-purple-700 border border-purple-200",
  pending_approval: "bg-amber-50 text-amber-700 border border-amber-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  published: <CheckCircle2 size={14} className="text-emerald-600" />,
  scheduled: <Clock size={14} className="text-blue-600" />,
  draft: <FileText size={14} className="text-slate-500" />,
  failed: <AlertTriangle size={14} className="text-rose-600" />,
  cancelled: <Ban size={14} className="text-slate-400" />,
  pending_approval: <Clock size={14} className="text-amber-600" />,
};

function getPlatformIcon(plat: string, size = 13) {
  switch (plat?.toLowerCase()) {
    case "instagram": return <FaInstagram size={size} className="text-pink-600" />;
    case "facebook": return <FaFacebook size={size} className="text-blue-600" />;
    case "linkedin": return <FaLinkedin size={size} className="text-sky-600" />;
    case "twitter": return <FaTwitter size={size} className="text-slate-900" />;
    case "youtube": return <FaYoutube size={size} className="text-red-600" />;
    case "pinterest": return <FaPinterest size={size} className="text-rose-600" />;
    default: return <Sparkles size={size} className="text-blue-600" />;
  }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ── Main Component ─────────────────────────────────────────────────
export default function CalendarPage() {
  const { showToast } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate date range for calendar API call
  const getDateRange = useCallback(() => {
    if (viewMode === "month") {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (viewMode === "week") {
      const day = currentDate.getDay();
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    } else {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }, [currentDate, viewMode, year, month]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params: any = { start, end };
      if (statusFilter !== "all") params.status = statusFilter;
      if (platformFilter !== "all") params.platform = platformFilter;
      const data = await api.posts.calendar(params);
      setPosts(data);
    } catch (err: any) {
      showToast("Error", err.message || "Failed to load calendar", "error");
    } finally {
      setLoading(false);
    }
  }, [getDateRange, statusFilter, platformFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // ── Navigation ────────────────────────────────────────────────
  const navigate = (direction: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + direction);
      d.setDate(1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + direction * 7);
    } else {
      d.setDate(d.getDate() + direction);
    }
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  // ── Actions ───────────────────────────────────────────────────
  const handleCancel = async (postId: number) => {
    if (!confirm("Cancel this scheduled post? This cannot be undone.")) return;
    try {
      await api.posts.cancel(postId);
      showToast("Post Cancelled", "The post has been cancelled.", "info");
      setSelectedPost(null);
      loadPosts();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const handleRetry = async (postId: number) => {
    try {
      await api.posts.retry(postId);
      showToast("Retry Triggered", "Publishing attempt re-queued.", "success");
      setSelectedPost(null);
      loadPosts();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const handlePublishNow = async (postId: number) => {
    try {
      await api.posts.publish(postId);
      showToast("Published!", "Post dispatched to social media.", "success");
      setSelectedPost(null);
      loadPosts();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const handleReschedule = async (postId: number) => {
    if (!rescheduleDate) {
      showToast("Required", "Please select a new date and time.", "error");
      return;
    }
    setIsRescheduling(true);
    try {
      await api.posts.reschedule(postId, {
        scheduled_at: new Date(rescheduleDate).toISOString(),
        reason: "Rescheduled from calendar",
      });
      showToast("Rescheduled!", "Post has been rescheduled.", "success");
      setSelectedPost(null);
      setRescheduleDate("");
      loadPosts();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    } finally {
      setIsRescheduling(false);
    }
  };

  // ── Calendar Helpers ──────────────────────────────────────────
  const getPostsForDay = (targetDate: Date) =>
    posts.filter((p) => {
      const dateStr = p.scheduled_at || p.published_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return (
        d.getFullYear() === targetDate.getFullYear() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getDate() === targetDate.getDate()
      );
    });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ── Week View ─────────────────────────────────────────────────
  const getWeekDays = () => {
    const day = currentDate.getDay();
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  // ── Header Label ──────────────────────────────────────────────
  const getHeaderLabel = () => {
    if (viewMode === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (viewMode === "week") {
      const days = getWeekDays();
      return `Week of ${days[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const isToday = (d: Date) => {
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Publishing Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual content roadmap — live data from your scheduled and published posts.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode */}
          <div className="flex items-center p-1 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            {(["month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold capitalize transition cursor-pointer ${
                  viewMode === mode
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => (window.location.href = "/posts?action=create")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <Plus size={18} />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Platform:</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter / X</option>
            <option value="youtube">YouTube</option>
            <option value="pinterest">Pinterest</option>
          </select>
        </div>
        {loading && (
          <span className="text-xs text-slate-400 animate-pulse ml-auto">Loading...</span>
        )}
      </div>

      {/* Month/Week/Day Navigator */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <CalendarIcon size={20} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 font-display">{getHeaderLabel()}</h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── MONTH VIEW ─────────────────────────────────────────── */}
      {viewMode === "month" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 text-center bg-slate-50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[120px] p-2 bg-slate-50/40" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayDate = new Date(year, month, dayNum);
              const dayPosts = getPostsForDay(dayDate);
              const today = isToday(dayDate);

              return (
                <div
                  key={`d-${dayNum}`}
                  className={`min-h-[120px] p-2.5 flex flex-col transition hover:bg-slate-50 ${
                    today ? "bg-blue-50/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        today ? "bg-blue-600 text-white shadow-xs" : "text-slate-700"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[11px] font-bold text-slate-400">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[85px]">
                    {dayPosts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedPost(p); setRescheduleDate(""); }}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg text-xs font-semibold truncate cursor-pointer transition border shadow-xs ${
                          STATUS_STYLES[p.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {getPlatformIcon(p.platform)}
                        <span className="truncate">{p.title || p.content}</span>
                        {p.is_recurring && <Repeat2 size={10} className="shrink-0 opacity-60" />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ──────────────────────────────────────────── */}
      {viewMode === "week" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {getWeekDays().map((d) => (
              <div key={d.toISOString()} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {d.toLocaleDateString("en", { weekday: "short" })}
                </p>
                <span
                  className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-sm font-bold mt-1 ${
                    isToday(d) ? "bg-blue-600 text-white" : "text-slate-800"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[300px]">
            {getWeekDays().map((d) => {
              const dayPosts = getPostsForDay(d);
              return (
                <div key={d.toISOString()} className={`p-2 space-y-1 ${isToday(d) ? "bg-blue-50/20" : ""}`}>
                  {dayPosts.length === 0 && (
                    <p className="text-[11px] text-slate-300 text-center pt-6">—</p>
                  )}
                  {dayPosts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPost(p); setRescheduleDate(""); }}
                      className={`flex flex-col gap-0.5 p-2 rounded-lg text-xs font-semibold cursor-pointer border shadow-xs ${
                        STATUS_STYLES[p.status] || STATUS_STYLES.draft
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {getPlatformIcon(p.platform)}
                        <span className="truncate">{p.title || p.content.substring(0, 20)}</span>
                      </div>
                      {p.scheduled_at && (
                        <span className="text-[10px] opacity-60">
                          {new Date(p.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DAY VIEW ───────────────────────────────────────────── */}
      {viewMode === "day" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {currentDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h3>
          {(() => {
            const dayPosts = getPostsForDay(currentDate);
            if (dayPosts.length === 0) {
              return (
                <div className="py-12 text-center">
                  <CalendarIcon className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-sm text-slate-400">No posts scheduled for this day.</p>
                  <button
                    onClick={() => (window.location.href = "/posts?action=create")}
                    className="mt-4 px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition cursor-pointer"
                  >
                    Schedule a Post
                  </button>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {dayPosts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedPost(p); setRescheduleDate(""); }}
                    className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition ${
                      STATUS_STYLES[p.status] || STATUS_STYLES.draft
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {getPlatformIcon(p.platform, 20)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-sm truncate">{p.title || p.content.substring(0, 50)}</p>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_BADGE[p.status]}`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs opacity-70 line-clamp-2">{p.content}</p>
                      {p.scheduled_at && (
                        <p className="text-[11px] mt-1 font-mono opacity-60">
                          {new Date(p.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── POST DETAIL MODAL ─────────────────────────────────── */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                {getPlatformIcon(selectedPost.platform, 16)}
                <span className="text-base font-bold text-slate-900 capitalize">
                  {selectedPost.platform} Post
                </span>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status + Title */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {STATUS_ICON[selectedPost.status]}
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${STATUS_BADGE[selectedPost.status] || ""}`}>
                  {selectedPost.status.replace("_", " ")}
                </span>
                {selectedPost.is_recurring && (
                  <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    <Repeat2 size={11} /> Recurring ({selectedPost.recurrence_rule})
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                {selectedPost.title || "Social Post"}
              </h3>

              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                {selectedPost.content}
              </p>

              {/* Media preview */}
              {selectedPost.media_url && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48">
                  {selectedPost.media_type === "video" ? (
                    <video src={getMediaUrl(selectedPost.media_url)} controls className="w-full max-h-48 object-cover" />
                  ) : (
                    <img src={getMediaUrl(selectedPost.media_url)} alt="Post media" className="w-full max-h-48 object-cover" />
                  )}
                </div>
              )}

              {/* Meta info */}
              <div className="space-y-1 text-xs text-slate-500">
                {selectedPost.scheduled_at && (
                  <p>
                    <span className="font-semibold text-slate-700">Scheduled: </span>
                    {new Date(selectedPost.scheduled_at).toLocaleString()}
                  </p>
                )}
                {selectedPost.published_at && (
                  <p>
                    <span className="font-semibold text-slate-700">Published: </span>
                    {new Date(selectedPost.published_at).toLocaleString()}
                  </p>
                )}
                {selectedPost.account_name && (
                  <p>
                    <span className="font-semibold text-slate-700">Account: </span>
                    {selectedPost.account_name}
                  </p>
                )}
                {selectedPost.campaign_name && (
                  <p>
                    <span className="font-semibold text-slate-700">Campaign: </span>
                    {selectedPost.campaign_name}
                  </p>
                )}
                {selectedPost.failure_reason && (
                  <p className="text-rose-600">
                    <span className="font-semibold">Error: </span>
                    {selectedPost.failure_reason}
                  </p>
                )}
                {selectedPost.retry_count > 0 && (
                  <p>
                    <span className="font-semibold text-slate-700">Retry attempts: </span>
                    {selectedPost.retry_count} / {selectedPost.max_retries}
                  </p>
                )}
              </div>

              {/* Reschedule section for scheduled/draft/failed */}
              {["scheduled", "draft", "failed"].includes(selectedPost.status) && (
                <div className="pt-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Reschedule to:
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              {/* Edit */}
              <button
                onClick={() => { window.location.href = `/posts?edit=${selectedPost.id}`; }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Edit3 size={14} /> Edit
              </button>

              {/* Reschedule */}
              {["scheduled", "draft", "failed"].includes(selectedPost.status) && (
                <button
                  onClick={() => handleReschedule(selectedPost.id)}
                  disabled={!rescheduleDate || isRescheduling}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Clock size={14} />
                  {isRescheduling ? "Saving..." : "Reschedule"}
                </button>
              )}

              {/* Retry */}
              {selectedPost.status === "failed" && (
                <button
                  onClick={() => handleRetry(selectedPost.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Repeat2 size={14} /> Retry
                </button>
              )}

              {/* Publish Now */}
              {["draft", "scheduled"].includes(selectedPost.status) && (
                <button
                  onClick={() => handlePublishNow(selectedPost.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Send size={14} /> Publish Now
                </button>
              )}

              {/* Cancel */}
              {["scheduled", "draft", "pending_approval"].includes(selectedPost.status) && (
                <button
                  onClick={() => handleCancel(selectedPost.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                >
                  <Ban size={14} /> Cancel
                </button>
              )}

              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
