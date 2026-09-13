import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, getMediaUrl } from "../services/api";
import {
  Megaphone,
  Calendar,
  Send,
  Target,
  TrendingUp,
  Plus,
  CalendarDays,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  MousePointerClick,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  DollarSign,
  ChevronDown,
  ChevronRight,
  FileText,
  Activity,
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import MetricCard from "./MetricCard";
import CreatePostModal from "./CreatePostModal";

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "Just now";
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

function formatScheduleDateTime(dateString?: string | null): string {
  if (!dateString) return "Scheduled";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const { user, showToast } = useAuth();

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Modal states
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Campaign form state
  const [campName, setCampName] = useState("");
  const [campDesc, setCampDesc] = useState("");
  const [campPlatforms, setCampPlatforms] = useState<string[]>(["Instagram", "Facebook"]);
  const [campBudget, setCampBudget] = useState("5000");
  const [campTargetReach, setCampTargetReach] = useState("50000");
  const [campTargetEng, setCampTargetEng] = useState("5.0");
  const [campObjective, setCampObjective] = useState("Brand Awareness & Lead Generation");
  const [campStartDate, setCampStartDate] = useState("");
  const [campEndDate, setCampEndDate] = useState("");
  const [campStatus, setCampStatus] = useState("active");

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        campaignsRes,
        upcomingRes,
        recentRes,
        activityRes,
        analyticsRes,
      ] = await Promise.allSettled([
        api.dashboard.getStats(),
        api.campaigns.list(),
        api.dashboard.getUpcomingPosts(8),
        api.dashboard.getRecentPosts(8),
        api.dashboard.getActivity(10),
        api.analytics.getOverview(timeRange, "all"),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (campaignsRes.status === "fulfilled") setCampaigns(campaignsRes.value || []);
      if (upcomingRes.status === "fulfilled") setUpcomingPosts(upcomingRes.value || []);
      if (recentRes.status === "fulfilled") setRecentPosts(recentRes.value || []);
      if (activityRes.status === "fulfilled") setActivities(activityRes.value || []);
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value);
    } catch (err) {
      console.error("Marketing dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  useEffect(() => {
    const handleUpdate = () => loadAllData();
    window.addEventListener("campaign_created", handleUpdate);
    window.addEventListener("post_created", handleUpdate);
    window.addEventListener("post_published", handleUpdate);
    window.addEventListener("post_updated", handleUpdate);
    window.addEventListener("post_deleted", handleUpdate);

    return () => {
      window.removeEventListener("campaign_created", handleUpdate);
      window.removeEventListener("post_created", handleUpdate);
      window.removeEventListener("post_published", handleUpdate);
      window.removeEventListener("post_updated", handleUpdate);
      window.removeEventListener("post_deleted", handleUpdate);
    };
  }, []);

  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName.trim()) {
      showToast("Validation Error", "Campaign name is required", "warning");
      return;
    }

    setCreatingCampaign(true);
    try {
      await api.campaigns.create({
        name: campName.trim(),
        description: campDesc.trim(),
        platform: campPlatforms.join(" + ") || "All Channels",
        budget: parseFloat(campBudget) || 0,
        target_reach: parseInt(campTargetReach) || 50000,
        target_engagement: parseFloat(campTargetEng) || 5.0,
        objectives: campObjective,
        start_date: campStartDate ? new Date(campStartDate).toISOString() : undefined,
        end_date: campEndDate ? new Date(campEndDate).toISOString() : undefined,
        status: campStatus,
      });

      showToast("Campaign Created 🎯", `"${campName}" is now active.`, "success");
      window.dispatchEvent(new Event("campaign_created"));
      setIsCreateCampaignOpen(false);

      // Reset form
      setCampName("");
      setCampDesc("");
      setCampBudget("5000");
      setCampTargetReach("50000");
      setCampTargetEng("5.0");
      setCampStartDate("");
      setCampEndDate("");
      loadAllData();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to create campaign", "error");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const togglePlatform = (p: string) => {
    if (campPlatforms.includes(p)) {
      if (campPlatforms.length > 1) {
        setCampPlatforms(campPlatforms.filter((item) => item !== p));
      }
    } else {
      setCampPlatforms([...campPlatforms, p]);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getPlatformIcon = (plat?: string) => {
    switch (plat?.toLowerCase()) {
      case "instagram":
        return <FaInstagram className="text-pink-600" size={15} />;
      case "facebook":
        return <FaFacebook className="text-blue-600" size={15} />;
      case "linkedin":
        return <FaLinkedin className="text-sky-600" size={15} />;
      case "twitter":
      case "x":
        return <FaTwitter className="text-slate-900" size={15} />;
      case "youtube":
        return <FaYoutube className="text-red-600" size={15} />;
      case "pinterest":
        return <FaPinterest className="text-rose-600" size={15} />;
      default:
        return <Sparkles className="text-blue-600" size={15} />;
    }
  };

  // Top summary calculations based on real DB records
  const activeCampaignsCount = campaigns.filter((c) => c.status === "active").length;
  const totalCampaignsCount = campaigns.length;
  const scheduledPostsCount = stats?.scheduled_posts ?? 0;
  const publishedPostsCount = stats?.published_posts ?? 0;

  // Top performing posts (ranked by engagement / likes + comments + shares + reach)
  const topPerformingPosts = [...recentPosts]
    .sort((a, b) => {
      const scoreA =
        (a.likes_count || a.likes || 0) * 2 +
        (a.comments_count || a.comments || 0) * 3 +
        (a.shares_count || a.shares || 0) * 4 +
        (a.reach_count || a.reach || 0) * 0.1;
      const scoreB =
        (b.likes_count || b.likes || 0) * 2 +
        (b.comments_count || b.comments || 0) * 3 +
        (b.shares_count || b.shares || 0) * 4 +
        (b.reach_count || b.reach || 0) * 0.1;
      return scoreB - scoreA;
    })
    .slice(0, 4);

  // Platform distribution from analytics
  const platformStats = analytics?.platforms || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & GREETING WITH MARKETING ROLE PILL & QUICK ACTIONS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2">
              <span>🎯</span>
              <span>
                {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Marketing Lead"}!
              </span>
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1.5">
              <Megaphone size={12} />
              Marketing Team Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Campaign planning, content scheduling, performance monitoring, and marketing analytics.
          </p>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsCreateCampaignOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Campaign</span>
          </button>

          <button
            onClick={() => setIsCreatePostOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Send size={14} />
            <span>Schedule Post</span>
          </button>

          <button
            onClick={() => navigate("/calendar")}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition cursor-pointer"
          >
            <CalendarDays size={15} className="text-slate-500" />
            <span>View Calendar</span>
          </button>

          <button
            onClick={loadAllData}
            title="Refresh Metrics"
            className="p-2.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-slate-800 shadow-xs transition cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP SUMMARY CARDS (Active Campaigns, Scheduled, Published, Total)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Campaigns */}
        <MetricCard
          title="Active Campaigns"
          value={activeCampaignsCount}
          subtext={`${totalCampaignsCount} total initiatives created`}
          icon={<Megaphone size={19} className="text-blue-600" />}
          iconBg="bg-blue-50/80 border-blue-100"
          badge="Live Now"
          badgeColor="blue"
          trend={{
            value: activeCampaignsCount > 0 ? "Running" : "Idle",
            label: "campaign status",
            positive: activeCampaignsCount > 0,
          }}
          onClick={() => navigate("/campaigns")}
        />

        {/* Scheduled Posts */}
        <MetricCard
          title="Scheduled Posts"
          value={scheduledPostsCount}
          subtext="Queued in content calendar"
          icon={<Calendar size={19} className="text-purple-600" />}
          iconBg="bg-purple-50/80 border-purple-100"
          badge="In Queue"
          badgeColor="purple"
          trend={{
            value: scheduledPostsCount,
            label: "ready to dispatch",
            positive: scheduledPostsCount > 0,
          }}
          onClick={() => navigate("/calendar")}
        />

        {/* Published Posts */}
        <MetricCard
          title="Published Posts"
          value={publishedPostsCount}
          subtext="Dispatched across channels"
          icon={<Send size={19} className="text-emerald-600" />}
          iconBg="bg-emerald-50/80 border-emerald-100"
          badge="Delivered"
          badgeColor="emerald"
          trend={{
            value: stats?.total_reach ? `${Math.round(stats.total_reach / 1000)}k` : "Live",
            label: "total reach achieved",
            positive: true,
          }}
          onClick={() => navigate("/posts")}
        />

        {/* Total Campaigns */}
        <MetricCard
          title="Total Campaigns"
          value={totalCampaignsCount}
          subtext="Strategic marketing plans"
          icon={<Target size={19} className="text-amber-600" />}
          iconBg="bg-amber-50/80 border-amber-100"
          badge="Portfolio"
          badgeColor="amber"
          trend={{
            value: totalCampaignsCount > 0 ? "Tracked" : "0",
            label: "strategic initiatives",
            positive: totalCampaignsCount > 0,
          }}
          onClick={() => navigate("/campaigns")}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN ANALYTICS ROW: Campaign Performance & Engagement Overview
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Campaign Performance Matrix */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                Campaign Performance & Progress
              </h3>
            </div>
            <button
              onClick={() => navigate("/campaigns")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage All</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {campaigns.length > 0 ? (
            <div className="space-y-3.5">
              {campaigns.slice(0, 4).map((camp) => {
                const reachPct =
                  camp.target_reach > 0
                    ? Math.min(100, Math.round(((camp.actual_reach || 0) / camp.target_reach) * 100))
                    : 0;

                const budgetSpentPct =
                  camp.budget > 0
                    ? Math.min(100, Math.round(((camp.spent || 0) / camp.budget) * 100))
                    : 0;

                return (
                  <div
                    key={camp.id}
                    onClick={() => navigate("/campaigns")}
                    className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/30 transition-all duration-150 cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {camp.name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              camp.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : camp.status === "completed"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {camp.status ? camp.status.toUpperCase() : "ACTIVE"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {camp.description || camp.platform || "Multi-channel campaign initiative"}
                        </p>
                      </div>

                      {camp.roi && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                            {camp.roi}x ROI
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress Metrics Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 font-medium">Reach Progress</span>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mt-0.5">
                          <span>{(camp.actual_reach || 0).toLocaleString()}</span>
                          <span className="text-[11px] text-blue-600">{reachPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${reachPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 font-medium">Budget Spent</span>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mt-0.5">
                          <span>${(camp.spent || 0).toLocaleString()}</span>
                          <span className="text-[11px] text-slate-500">${(camp.budget || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${budgetSpentPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-slate-500 font-medium">Engagement</span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                          {camp.actual_engagement || camp.target_engagement || "4.5"}%
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Target: {camp.target_engagement || 5}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Megaphone size={22} />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm font-bold text-slate-800">No Campaigns Planned Yet</h4>
                <p className="text-xs text-slate-500">
                  Group your posts under strategic marketing campaigns to allocate budgets and measure performance ROI.
                </p>
              </div>
              <button
                onClick={() => setIsCreateCampaignOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Create First Campaign
              </button>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Engagement & Reach Overview Chart */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                Engagement & Reach
              </h3>
            </div>

            {/* Time range switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  timeRange === "7d" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                7D
              </button>
              <button
                onClick={() => setTimeRange("30d")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  timeRange === "30d" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                30D
              </button>
              <button
                onClick={() => setTimeRange("90d")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  timeRange === "90d" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                90D
              </button>
            </div>
          </div>

          {/* Metric Summary Strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Reach</span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {analytics?.total_reach ? (analytics.total_reach >= 1000 ? `${(analytics.total_reach / 1000).toFixed(1)}k` : analytics.total_reach) : "0"}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-center">
              <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Engagement</span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {analytics?.total_engagement ? (analytics.total_engagement >= 1000 ? `${(analytics.total_engagement / 1000).toFixed(1)}k` : analytics.total_engagement) : "0"}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Eng Rate</span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {analytics?.average_engagement_rate ? `${analytics.average_engagement_rate}%` : "0%"}
              </p>
            </div>
          </div>

          {/* Area Chart */}
          <div className="h-56 w-full pt-2">
            {analytics?.timeline && analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mktReachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="mktEngGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reach"
                    name="Reach"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#mktReachGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement"
                    stroke="#9333ea"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#mktEngGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                <span>No time-series analytics recorded for selected window.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. PLATFORM PERFORMANCE & TOP PERFORMING CONTENT ROW
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: Platform Performance Breakdown */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                Platform Performance
              </h3>
            </div>
            <button
              onClick={() => navigate("/analytics")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Analytics</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {platformStats.length > 0 ? (
            <div className="space-y-3">
              {platformStats.map((plat: any) => {
                return (
                  <div
                    key={plat.platform}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                          {getPlatformIcon(plat.platform)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {plat.platform}
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            {plat.count} {plat.count === 1 ? "post" : "posts"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">
                          {plat.reach ? (plat.reach >= 1000 ? `${(plat.reach / 1000).toFixed(1)}k` : plat.reach) : 0} Reach
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {plat.engagement ? (plat.engagement >= 1000 ? `${(plat.engagement / 1000).toFixed(1)}k` : plat.engagement) : 0} Eng
                        </p>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.min(100, plat.percentage || 15)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 rounded-xl bg-slate-50 border border-slate-100">
              <Share2 size={20} className="mx-auto mb-2 text-slate-300" />
              <p>No platform distribution data yet. Publish posts to see channel metrics.</p>
            </div>
          )}
        </div>

        {/* Right 6 Cols: Top Performing Content */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                Top Performing Content
              </h3>
            </div>
            <button
              onClick={() => navigate("/posts")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Posts</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {topPerformingPosts.length > 0 ? (
            <div className="space-y-3">
              {topPerformingPosts.map((post) => {
                const likes = post.likes_count ?? post.likes ?? 0;
                const comments = post.comments_count ?? post.comments ?? 0;
                const shares = post.shares_count ?? post.shares ?? 0;
                const reach = post.reach_count ?? post.reach ?? 0;
                const mediaUrl = post.media_url || (post.media_urls && post.media_urls[0]);

                return (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/posts?post_id=${post.id}`)}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/20 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {mediaUrl ? (
                        <img
                          src={getMediaUrl(mediaUrl)}
                          alt="Post preview"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          {getPlatformIcon(post.platform)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {getPlatformIcon(post.platform)}
                          <span className="text-[11px] font-bold text-slate-600 capitalize">
                            {post.platform || "Social"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {post.title || post.content || "Untitled post"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatRelativeTime(post.published_at || post.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1" title="Likes">
                        <Heart size={13} className="text-rose-500 fill-rose-500" />
                        <span>{likes}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Comments">
                        <MessageCircle size={13} className="text-blue-500" />
                        <span>{comments}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Shares">
                        <Share2 size={13} className="text-emerald-500" />
                        <span>{shares}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 rounded-xl bg-slate-50 border border-slate-100">
              <FileText size={20} className="mx-auto mb-2 text-slate-300" />
              <p>No published content analytics available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CONTENT PLANNING & UPCOMING CAMPAIGNS & RECENT ACTIVITY
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Content Calendar / Upcoming Scheduled Content */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                Content Calendar / Upcoming Scheduled Posts
              </h3>
            </div>
            <button
              onClick={() => navigate("/calendar")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Calendar</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {upcomingPosts.length > 0 ? (
            <div className="space-y-3">
              {upcomingPosts.slice(0, 5).map((post) => {
                const mediaUrl = post.media_url || (post.media_urls && post.media_urls[0]);

                return (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/posts?post_id=${post.id}`)}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/20 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {mediaUrl ? (
                        <img
                          src={getMediaUrl(mediaUrl)}
                          alt="Scheduled thumbnail"
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                          {getPlatformIcon(post.platform)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            {post.platform ? post.platform.toUpperCase() : "POST"}
                          </span>
                          {post.campaign_name && (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                              {post.campaign_name}
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          {post.title || post.content || "Upcoming post content"}
                        </h5>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                        <Clock size={12} className="text-slate-400" />
                        <span>{formatScheduleDateTime(post.scheduled_at)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
              <Calendar size={28} className="mx-auto text-slate-300" />
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm font-bold text-slate-800">No Upcoming Posts Scheduled</h4>
                <p className="text-xs text-slate-500">
                  Plan your weekly content drops, draft multi-channel posts and queue them for automated distribution.
                </p>
              </div>
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Schedule New Post
              </button>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Recent Campaign Activity & Status Updates */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-500 fill-amber-500" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                Recent Campaign Activity
              </h3>
            </div>
          </div>

          {activities.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {activities.slice(0, 6).map((act, index) => {
                return (
                  <div key={act.id || index} className="py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      {act.type === "publishing" ? (
                        <Send size={14} />
                      ) : act.module === "campaigns" ? (
                        <Megaphone size={14} />
                      ) : (
                        <Activity size={14} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {act.message || act.event_name || "Campaign event recorded"}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-0.5 inline-block">
                        {formatRelativeTime(act.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 rounded-xl bg-slate-50 border border-slate-100">
              <Activity size={20} className="mx-auto mb-2 text-slate-300" />
              <p>No recent activity events.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. CREATE CAMPAIGN MODAL (Marketing Team Direct Action)
         ───────────────────────────────────────────────────────────── */}
      {isCreateCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-90 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Megaphone size={20} />
                <div>
                  <h3 className="text-base font-bold">Create Marketing Campaign</h3>
                  <p className="text-xs text-blue-100">
                    Define targets, budgets, platforms, and timeline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateCampaignOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCampaignSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="e.g. Q4 Brand Awareness & Product Launch"
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Strategy
                </label>
                <textarea
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  rows={2}
                  placeholder="Briefly describe the marketing goals, core messaging, and creative strategy..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>

              {/* Target Platforms selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Channels
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube", "Pinterest"].map((p) => {
                    const isSelected = campPlatforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {getPlatformIcon(p)}
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget & Target Reach */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Allocated Budget ($ USD)
                  </label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="number"
                      value={campBudget}
                      onChange={(e) => setCampBudget(e.target.value)}
                      placeholder="5000"
                      className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Reach
                  </label>
                  <input
                    type="number"
                    value={campTargetReach}
                    onChange={(e) => setCampTargetReach(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              {/* Target Engagement & Objective */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Engagement Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={campTargetEng}
                    onChange={(e) => setCampTargetEng(e.target.value)}
                    placeholder="5.0"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={campStatus}
                    onChange={(e) => setCampStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={campStartDate}
                    onChange={(e) => setCampStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={campEndDate}
                    onChange={(e) => setCampEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateCampaignOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCampaign}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  {creatingCampaign ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Launch Campaign</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. CREATE / SCHEDULE POST MODAL
         ───────────────────────────────────────────────────────────── */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => {
          setIsCreatePostOpen(false);
          loadAllData();
        }}
      />
    </div>
  );
}
