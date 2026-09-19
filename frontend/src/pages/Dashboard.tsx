import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, getMediaUrl } from "../services/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Megaphone,
  BarChart3,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Send,
  Plus,
  ArrowUpRight,
  Activity,
  Layers,
  Repeat2,
  Share2,
  FileText,
  MousePointerClick,
  Check,
  X,
  Eye,
  Bell,
  UserPlus,
  Link as LinkIcon,
  Unlink,
  PenTool,
  Heart,
  MessageCircle,
  TrendingDown,
  ChevronDown,
  LayoutGrid,
  Zap,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";

import MetricCard from "../components/MetricCard";
import QuickAction from "../components/QuickAction";
import UpcomingPost from "../components/UpcomingPost";
import ActivityItem from "../components/ActivityItem";
import TopPerformingPost from "../components/TopPerformingPost";
import EngagementOverview from "../components/EngagementOverview";
import SecondaryMetricCard from "../components/SecondaryMetricCard";
import MarketingDashboard from "../components/MarketingDashboard";

const COLORS = ["#2563eb", "#7c3aed", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"];

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, showToast } = useAuth();
  const role = user?.role || "content_creator";

  if (role === "marketing_team") {
    return <MarketingDashboard />;
  }

  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const results = await Promise.allSettled([
        api.dashboard.getStats(),
        api.dashboard.getRecentPosts(6),
        api.dashboard.getUpcomingPosts(6),
        api.dashboard.getActivity(8),
        api.campaigns.list(),
        api.analytics.getOverview("30d", "all"),
        api.notifications.list(50),
      ]);

      const [statsRes, recentRes, upcomingRes, activityRes, campsRes, analyticsRes, notifsRes] = results;

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      } else {
        console.error("Error loading stats:", statsRes.reason);
        setHasError(true);
      }

      if (recentRes.status === "fulfilled") setRecentPosts(recentRes.value || []);
      if (upcomingRes.status === "fulfilled") setUpcomingPosts(upcomingRes.value || []);
      if (activityRes.status === "fulfilled") setActivities(activityRes.value || []);
      if (campsRes.status === "fulfilled") setCampaigns((campsRes.value || []).slice(0, 4));
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value);
      if (notifsRes.status === "fulfilled") setAdminNotifications(notifsRes.value || []);

      if (role === "administrator") {
        try {
          const aData = await api.admin.dashboard();
          setAdminStats(aData);
        } catch (e) {
          console.error("Admin dashboard error:", e);
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.is_read) {
        await api.notifications.markOneRead(notif.id);
        setAdminNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      }
    } catch (e) {
      console.error(e);
    }

    if (notif.related_entity_type === "user" || notif.type === "NEW_USER") {
      navigate("/admin/users");
    } else if (
      notif.related_entity_type === "social_account" ||
      notif.type === "SOCIAL_ACCOUNT_CONNECTED" ||
      notif.type === "SOCIAL_ACCOUNT_DISCONNECTED"
    ) {
      navigate("/accounts");
    } else if (notif.related_entity_type === "post" || notif.metadata_json?.post_id) {
      const postId = notif.related_entity_id || notif.metadata_json?.post_id;
      navigate(postId ? `/posts?post_id=${postId}` : "/posts");
    } else if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.notifications.markAllRead();
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast("Notifications Read", "All notifications marked as read", "info");
    } catch (e: any) {
      showToast("Error", e.message || "Failed to mark notifications read", "error");
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData();

    window.addEventListener("post_created", handleUpdate);
    window.addEventListener("post_updated", handleUpdate);
    window.addEventListener("post_deleted", handleUpdate);
    window.addEventListener("post_published", handleUpdate);
    window.addEventListener("social_account_connected", handleUpdate);
    window.addEventListener("social_account_disconnected", handleUpdate);
    window.addEventListener("social_account_synced", handleUpdate);
    window.addEventListener("campaign_created", handleUpdate);
    window.addEventListener("notification_updated", handleUpdate);

    return () => {
      window.removeEventListener("post_created", handleUpdate);
      window.removeEventListener("post_updated", handleUpdate);
      window.removeEventListener("post_deleted", handleUpdate);
      window.removeEventListener("post_published", handleUpdate);
      window.removeEventListener("social_account_connected", handleUpdate);
      window.removeEventListener("social_account_disconnected", handleUpdate);
      window.removeEventListener("social_account_synced", handleUpdate);
      window.removeEventListener("campaign_created", handleUpdate);
      window.removeEventListener("notification_updated", handleUpdate);
    };
  }, [role]);

  const handleRetryFailed = async () => {
    try {
      const res = await api.admin.retryFailedJobs();
      showToast("Retry Triggered", res.message, "success");
      loadDashboardData();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const getPlatformIcon = (plat: string) => {
    switch (plat?.toLowerCase()) {
      case "instagram":
        return <FaInstagram className="text-pink-600" size={16} />;
      case "facebook":
        return <FaFacebook className="text-blue-600" size={16} />;
      case "linkedin":
        return <FaLinkedin className="text-sky-600" size={16} />;
      case "twitter":
      case "x":
        return <FaTwitter className="text-slate-900" size={16} />;
      case "youtube":
        return <FaYoutube className="text-red-600" size={16} />;
      case "pinterest":
        return <FaPinterest className="text-rose-600" size={16} />;
      default:
        return <Sparkles className="text-blue-600" size={16} />;
    }
  };

  // Get current greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatStatCount = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return "0";
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const isPlatformConnected = (plat: string) => {
    return Boolean((stats?.platforms?.[plat]?.account_count ?? 0) > 0);
  };

  const getPlatformAccountDisplay = (plat: string) => {
    const count = stats?.platforms?.[plat]?.account_count ?? 0;
    if (count === 0) return "Not Connected";
    if (count === 1) return "1 Account";
    return `${count} Accounts`;
  };

  const getPlatformAccountBadge = (plat: string) => {
    const count = stats?.platforms?.[plat]?.account_count ?? 0;
    if (count === 0) {
      return <span className="text-slate-400 font-normal">Click to connect</span>;
    }
    return (
      <span className="text-emerald-600">Active</span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Error state notification */}
      {hasError && !stats && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs sm:text-sm">
          <span>Unable to load live dashboard metrics. Please check connection.</span>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-500 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. HERO / GREETING SECTION (Pixel-aligned with reference) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2">
            <span>👋</span>
            <span>{getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Creator"}!</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Here's what's happening with your social media today.
          </p>
        </div>

        {/* Date Selector Pill Button */}
        <div className="relative self-start sm:self-auto">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition cursor-pointer"
          >
            <Calendar size={14} className="text-slate-400" />
            <span>
              {new Date().toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showDateDropdown && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-30 animate-in fade-in-95 zoom-in-95 text-xs">
              <button
                onClick={() => setShowDateDropdown(false)}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={() => setShowDateDropdown(false)}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setShowDateDropdown(false)}
                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                Last 30 Days
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. TOP ROW: 6 PLATFORM CHANNEL / ACCOUNT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Instagram */}
        <div
          onClick={() => navigate("/accounts")}
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <FaInstagram size={18} />
            </div>
            {isPlatformConnected("instagram") && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">Instagram</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {getPlatformAccountDisplay("instagram")}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
            {getPlatformAccountBadge("instagram")}
          </div>
        </div>

        {/* LinkedIn */}
        <div
          onClick={() => navigate("/accounts")}
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shadow-xs">
              <FaLinkedin size={18} />
            </div>
            {isPlatformConnected("linkedin") && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">LinkedIn</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {getPlatformAccountDisplay("linkedin")}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
            {getPlatformAccountBadge("linkedin")}
          </div>
        </div>

        {/* Facebook */}
        <div
          onClick={() => navigate("/accounts")}
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center text-white shadow-xs">
              <FaFacebook size={18} />
            </div>
            {isPlatformConnected("facebook") && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">Facebook</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {getPlatformAccountDisplay("facebook")}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
            {getPlatformAccountBadge("facebook")}
          </div>
        </div>

        {/* X (Twitter) */}
        <div
          onClick={() => navigate("/accounts")}
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#000000] flex items-center justify-center text-white shadow-xs">
              <FaTwitter size={18} />
            </div>
            {isPlatformConnected("twitter") && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">X (Twitter)</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {getPlatformAccountDisplay("twitter")}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
            {getPlatformAccountBadge("twitter")}
          </div>
        </div>

        {/* Pinterest */}
        <div
          onClick={() => navigate("/accounts")}
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#E60023] flex items-center justify-center text-white shadow-xs">
              <FaPinterest size={18} />
            </div>
            {isPlatformConnected("pinterest") && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">Pinterest</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {getPlatformAccountDisplay("pinterest")}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
            {getPlatformAccountBadge("pinterest")}
          </div>
        </div>

        {/* YouTube */}
        <div
          onClick={() => navigate("/accounts")}
          className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF0000] flex items-center justify-center text-white shadow-xs">
              <FaYoutube size={18} />
            </div>
            {isPlatformConnected("youtube") && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">YouTube</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {getPlatformAccountDisplay("youtube")}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
            {getPlatformAccountBadge("youtube")}
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD GRID: Left (2/3) + Right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================
            LEFT WORKSPACE COLUMN (8 COLS)
           ============================================================ */}
        <div className="lg:col-span-8 space-y-6">
          {/* OVERVIEW CARD */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
            {/* Overview Header with Range Switcher */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Overview
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
                  Last 7 days
                </span>
              </div>
            </div>

            {/* 4 Secondary Metric Cards inside Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <SecondaryMetricCard
                title="Total Posts"
                value={stats?.total_posts ?? 0}
                icon={<MessageCircle size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={
                  stats?.posts_trend?.is_available
                    ? { value: stats.posts_trend.value, positive: stats.posts_trend.positive, label: stats.posts_trend.label }
                    : undefined
                }
                onClick={() => navigate("/posts")}
              />
              <SecondaryMetricCard
                title="Total Engagement"
                value={formatStatCount(stats?.total_engagement ?? 0)}
                icon={<Heart size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={
                  stats?.engagement_trend?.is_available
                    ? { value: stats.engagement_trend.value, positive: stats.engagement_trend.positive, label: stats.engagement_trend.label }
                    : undefined
                }
                onClick={() => navigate("/analytics")}
              />
              <SecondaryMetricCard
                title="Reach"
                value={formatStatCount(stats?.total_reach ?? 0)}
                icon={<Eye size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={
                  stats?.reach_trend?.is_available
                    ? { value: stats.reach_trend.value, positive: stats.reach_trend.positive, label: stats.reach_trend.label }
                    : undefined
                }
                onClick={() => navigate("/analytics")}
              />
              <SecondaryMetricCard
                title="Clicks"
                value={formatStatCount(stats?.total_clicks ?? 0)}
                icon={<MousePointerClick size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={
                  stats?.clicks_trend?.is_available
                    ? { value: stats.clicks_trend.value, positive: stats.clicks_trend.positive, label: stats.clicks_trend.label }
                    : undefined
                }
                onClick={() => navigate("/analytics")}
              />
            </div>

            {/* Engagement Overview Multi-line Area Chart */}
            <div className="pt-2">
              <EngagementOverview analytics={analytics} initialRange="7d" />
            </div>
          </div>

          {/* BOTTOM SPLIT ROW: Top Performing Post (Left) + Recent Activity (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Performing Post Card */}
            {recentPosts.length > 0 ? (
              <TopPerformingPost
                title={recentPosts[0].title || recentPosts[0].content}
                platform={recentPosts[0].platform || "Instagram"}
                likes={recentPosts[0].likes_count ?? recentPosts[0].likes ?? 0}
                comments={recentPosts[0].comments_count ?? recentPosts[0].comments ?? 0}
                shares={recentPosts[0].shares_count ?? recentPosts[0].shares ?? 0}
                thumbnail_url={recentPosts[0].media_urls?.[0] || recentPosts[0].thumbnail_url}
                onClick={() => navigate(`/posts?post_id=${recentPosts[0].id || ""}`)}
                onViewAll={() => navigate("/posts")}
              />
            ) : (
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                    <span>Top Performing Post</span>
                  </h4>
                </div>
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <p>No published posts yet</p>
                  <button
                    onClick={() => navigate("/posts?action=create")}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    + Create and publish a post
                  </button>
                </div>
              </div>
            )}

            {/* Recent Activity Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                  <Zap size={16} className="text-amber-500 fill-amber-500" />
                  <span>Recent Activity</span>
                </h4>
              </div>

              <div className="divide-y divide-slate-100">
                {activities.length > 0 ? (
                  activities.slice(0, 4).map((act, index) => (
                    <ActivityItem
                      key={act.id || index}
                      icon={getPlatformIcon(act.platform || "instagram")}
                      title={act.message || act.event_name || "Post published"}
                      time={act.created_at ? formatRelativeTime(act.created_at) : "Just now"}
                    />
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No recent activity recorded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            RIGHT WIDGETS COLUMN (4 COLS)
           ============================================================ */}
        <div className="lg:col-span-4 space-y-6">
          {/* QUICK ACTIONS CARD */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-600" />
              <h4 className="text-sm font-bold text-slate-900 font-display">
                Quick Actions
              </h4>
            </div>

            <div className="space-y-2.5">
              <QuickAction
                title="Create New Post"
                subtitle="Design, write and schedule"
                icon={<PenTool size={18} className="text-blue-600" />}
                iconBg="bg-blue-50/80 border-blue-100"
                onClick={() => navigate("/posts?action=create")}
              />

              <QuickAction
                title="Schedule Post"
                subtitle="Plan your content"
                icon={<Calendar size={18} className="text-purple-600" />}
                iconBg="bg-purple-50/80 border-purple-100"
                onClick={() => navigate("/calendar")}
              />

              <QuickAction
                title="Connect Social Account"
                subtitle="Add more platforms"
                icon={<LinkIcon size={18} className="text-emerald-600" />}
                iconBg="bg-emerald-50/80 border-emerald-100"
                onClick={() => navigate("/accounts")}
              />

              <QuickAction
                title="Explore Templates"
                subtitle="Get inspired"
                icon={<LayoutGrid size={18} className="text-pink-600" />}
                iconBg="bg-pink-50/80 border-pink-100"
                onClick={() => navigate("/posts?action=create")}
              />
            </div>
          </div>

          {/* UPCOMING POSTS CARD */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-600" />
                <h4 className="text-sm font-bold text-slate-900 font-display">
                  Upcoming Posts
                </h4>
              </div>
              <button
                onClick={() => navigate("/calendar")}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingPosts.length > 0 ? (
                upcomingPosts.slice(0, 4).map((post) => (
                  <UpcomingPost
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    content={post.content}
                    platform={post.platform}
                    scheduled_at={post.scheduled_at}
                    media_urls={post.media_urls}
                    thumbnail_url={post.thumbnail_url}
                    onClick={() => navigate(`/posts?post_id=${post.id}`)}
                    onMenuClick={() => navigate(`/posts?post_id=${post.id}`)}
                  />
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-2">
                  <p className="text-xs text-slate-500 font-medium">No scheduled posts yet</p>
                  <button
                    onClick={() => navigate("/posts?action=create")}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    + Schedule your first post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SPECIALIZED ROLE PANELS (Administrator / Business / Marketing)
         ============================================================ */}
      {role === "administrator" && (
        <div className="pt-6 border-t border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-purple-600" />
              <h3 className="text-lg font-bold text-slate-900 font-display">Admin Controls & Audit Trail</h3>
            </div>
            <button
              onClick={() => navigate("/admin/audit-logs")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Full Audit Logs →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Registered Users"
              value={adminStats?.total_users ?? 1}
              icon={<Users size={18} className="text-purple-600" />}
              iconBg="bg-purple-50 border-purple-100"
              subtext="Platform accounts active"
            />
            <MetricCard
              title="Active Teams"
              value={adminStats?.active_teams ?? 1}
              icon={<Layers size={18} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
              subtext="Workspace organizations"
            />
            <MetricCard
              title="Dispatched Posts"
              value={stats?.total_posts ?? 48}
              icon={<Send size={18} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
              subtext={`${stats?.published_posts ?? 32} published`}
            />
            <MetricCard
              title="Failed Jobs"
              value={stats?.failed_posts ?? 0}
              icon={<Activity size={18} className="text-rose-600" />}
              iconBg="bg-rose-50 border-rose-100"
              subtext="Needs attention/retry"
            />
          </div>

          <button
            onClick={handleRetryFailed}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2"
          >
            <Repeat2 size={15} />
            <span>Retry Failed Publishing Tasks</span>
          </button>
        </div>
      )}
    </div>
  );
}