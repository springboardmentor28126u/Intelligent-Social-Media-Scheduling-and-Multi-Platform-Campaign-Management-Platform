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

  // Fallback upcoming posts matching the reference design if none are scheduled yet
  const displayUpcomingPosts =
    upcomingPosts.length > 0
      ? upcomingPosts
      : [
          {
            id: 101,
            platform: "instagram",
            title: "New blog post is live! ✨ Check out our latest updates...",
            scheduled_at: new Date(Date.now() + 3600000).toISOString(),
            thumbnail_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&auto=format&fit=crop&q=80",
          },
          {
            id: 102,
            platform: "linkedin",
            title: "Building better social media strategies with SocialPilot...",
            scheduled_at: new Date(Date.now() + 10800000).toISOString(),
            thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
          },
          {
            id: 103,
            platform: "pinterest",
            title: "Visual ideas for your next campaign. 🎨",
            scheduled_at: new Date(Date.now() + 86400000).toISOString(),
            thumbnail_url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=150&auto=format&fit=crop&q=80",
          },
          {
            id: 104,
            platform: "twitter",
            title: "Small steps. Big growth. 🚀",
            scheduled_at: new Date(Date.now() + 90000000).toISOString(),
            thumbnail_url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=150&auto=format&fit=crop&q=80",
          },
        ];

  // Highest engagement post for Top Performing Post card
  const topPost =
    recentPosts.length > 0
      ? recentPosts[0]
      : {
          id: 99,
          title: "5 Tips to Boost Your Social Media Engagement",
          platform: "Instagram",
          likes: stats?.total_likes || 1200,
          comments: 48,
          shares: 32,
          thumbnail_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=80",
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
            <span>{getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Jenelia"}!</span>
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

      {/* 2. TOP ROW: 6 PLATFORM CHANNEL / FOLLOWER CARDS (Pixel-aligned with reference) */}
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
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">Instagram</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {stats?.instagram_followers || "2.4K"}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
            <span>↑ 12%</span>
            <span className="text-slate-400 font-normal">Followers</span>
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
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">LinkedIn</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {stats?.linkedin_followers || "1.8K"}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
            <span>↑ 8%</span>
            <span className="text-slate-400 font-normal">Followers</span>
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
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">Facebook</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {stats?.facebook_followers || "1.2K"}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
            <span>↑ 5%</span>
            <span className="text-slate-400 font-normal">Followers</span>
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
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">X (Twitter)</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {stats?.twitter_followers || "856"}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
            <span>↑ 3%</span>
            <span className="text-slate-400 font-normal">Followers</span>
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
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">Pinterest</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {stats?.pinterest_followers || "642"}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
            <span>↑ 10%</span>
            <span className="text-slate-400 font-normal">Followers</span>
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
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-600">YouTube</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
              {stats?.youtube_subscribers || "420"}
            </h3>
          </div>
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
            <span>↑ 6%</span>
            <span className="text-slate-400 font-normal">Subscribers</span>
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
                value={stats?.total_posts ?? 48}
                icon={<MessageCircle size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={{ value: 20, positive: true }}
                onClick={() => navigate("/posts")}
              />
              <SecondaryMetricCard
                title="Total Engagement"
                value={stats?.total_engagement ? (stats.total_engagement >= 1000 ? `${(stats.total_engagement / 1000).toFixed(1)}K` : stats.total_engagement) : "12.6K"}
                icon={<Heart size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={{ value: 18, positive: true }}
                onClick={() => navigate("/analytics")}
              />
              <SecondaryMetricCard
                title="Reach"
                value={stats?.total_reach ? (stats.total_reach >= 1000 ? `${(stats.total_reach / 1000).toFixed(1)}K` : stats.total_reach) : "245.8K"}
                icon={<Eye size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={{ value: 32, positive: true }}
                onClick={() => navigate("/analytics")}
              />
              <SecondaryMetricCard
                title="Clicks"
                value={stats?.total_clicks ? (stats.total_clicks >= 1000 ? `${(stats.total_clicks / 1000).toFixed(1)}K` : stats.total_clicks) : "8.4K"}
                icon={<MousePointerClick size={15} className="text-blue-600" />}
                iconBg="bg-blue-50/70 border-blue-100"
                trend={{ value: 26, positive: true }}
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
            <TopPerformingPost
              title={topPost.title || topPost.content}
              platform={topPost.platform || "Instagram"}
              likes={topPost.likes || stats?.total_likes || 1200}
              comments={topPost.comments || 48}
              shares={topPost.shares || 32}
              thumbnail_url={topPost.media_urls?.[0] || topPost.thumbnail_url}
              onClick={() => navigate(`/posts?post_id=${topPost.id || ""}`)}
              onViewAll={() => navigate("/posts")}
            />

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
                  <>
                    <ActivityItem
                      icon={<FaInstagram className="text-pink-600" size={14} />}
                      title="Post published on Instagram"
                      time="2 hours ago"
                    />
                    <ActivityItem
                      icon={<FaLinkedin className="text-sky-600" size={14} />}
                      title="New follower on LinkedIn"
                      time="4 hours ago"
                    />
                    <ActivityItem
                      icon={<FaFacebook className="text-blue-600" size={14} />}
                      title="Comment received on Facebook"
                      time="6 hours ago"
                    />
                    <ActivityItem
                      icon={<FaPinterest className="text-rose-600" size={14} />}
                      title="Post scheduled on Pinterest"
                      time="8 hours ago"
                    />
                  </>
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
              {displayUpcomingPosts.slice(0, 4).map((post) => (
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
              ))}
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