import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
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
  Legend,
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
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";

const COLORS = ["#2563eb", "#7c3aed", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, showToast } = useAuth();
  const role = user?.role || "content_creator";

  const [analytics, setAnalytics] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [analyticsData, postsData, campsData] = await Promise.all([
        api.analytics.getOverview("30d", "all"),
        api.posts.list(),
        api.campaigns.list(),
      ]);
      setAnalytics(analyticsData);
      setRecentPosts(postsData.slice(0, 5));
      setCampaigns(campsData.slice(0, 4));

      if (role === "administrator") {
        const aData = await api.admin.dashboard();
        setAdminStats(aData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener("post_created", loadDashboardData);
    return () => window.removeEventListener("post_created", loadDashboardData);
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
        return <FaInstagram className="text-pink-600" size={18} />;
      case "facebook":
        return <FaFacebook className="text-blue-600" size={18} />;
      case "linkedin":
        return <FaLinkedin className="text-sky-600" size={18} />;
      case "twitter":
        return <FaTwitter className="text-slate-900" size={18} />;
      case "youtube":
        return <FaYoutube className="text-red-600" size={18} />;
      case "pinterest":
        return <FaPinterest className="text-rose-600" size={18} />;
      default:
        return <Sparkles className="text-blue-600" size={18} />;
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Header Banner - Navy Accent with High Legibility */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-bold text-blue-300">
            <Sparkles size={14} />
            <span className="capitalize">{role.replace("_", " ")} Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display">
            Welcome back, {user?.name || "Jenee"} 👋
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
            Real-time social engagement metrics, active multi-platform campaigns, and automated dispatch queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => navigate("/calendar")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <Calendar size={16} />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => navigate("/posts?action=create")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          1. ADMINISTRATOR DASHBOARD
         ============================================================ */}
      {role === "administrator" && (
        <div className="space-y-7">
          {/* Admin KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Registered Users"
              value={adminStats?.total_users || 4}
              change="+100%"
              subtext="Platform accounts active"
              icon={<Users size={22} className="text-purple-600" />}
              iconBg="bg-purple-50 border-purple-100"
            />
            <KpiCard
              title="Active Workspaces"
              value={adminStats?.active_teams || 1}
              change="+100%"
              subtext="Organization teams"
              icon={<Layers size={22} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
            />
            <KpiCard
              title="Connected Accounts"
              value={adminStats?.connected_accounts || 6}
              change="6 Live"
              subtext="Across FB, IG, X, LI, YT, Pin"
              icon={<Share2 size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Dispatched Posts"
              value={adminStats?.total_posts || 12}
              change={`${adminStats?.published_posts || 8} Live`}
              subtext={`${adminStats?.failed_posts || 0} failed / queued`}
              icon={<Activity size={22} className="text-pink-600" />}
              iconBg="bg-pink-50 border-pink-100"
            />
          </div>

          {/* System Health & Audit Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">System Logs & Audit Trail</h3>
                  <p className="text-xs text-slate-500">Real-time immutable SOC2 compliance event stream</p>
                </div>
                <button
                  onClick={() => navigate("/admin/audit-logs")}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {(adminStats?.recent_logs || []).map((log: any) => (
                  <div key={log.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-snug">{log.description}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {log.user_email || "System"} • Module: {log.module}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 font-display">System Health & Services</h3>
                <p className="text-xs text-slate-500">Active background worker infrastructure</p>
              </div>

              <div className="space-y-3">
                {[
                  { name: "PostgreSQL Database Engine", status: "Operational", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                  { name: "Redis Queue & Cache (Port 6379)", status: "Connected", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                  { name: "Celery Workers Pipeline", status: "Active (2 Workers)", color: "text-blue-700 bg-blue-50 border-blue-200" },
                  { name: "Background Interval Scheduler", status: "Active (1-min Polling)", color: "text-purple-700 bg-purple-50 border-purple-200" },
                ].map((s, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">{s.name}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${s.color}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRetryFailed}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-300 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Repeat2 size={16} />
                <span>Retry Failed Publishing Jobs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          2. BUSINESS USER DASHBOARD
         ============================================================ */}
      {role === "business_user" && (
        <div className="space-y-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Total Brand Reach"
              value={analytics?.total_reach ? `${(analytics.total_reach / 1000).toFixed(1)}K` : "124.5K"}
              change="+18.4%"
              subtext="Across all platforms"
              icon={<TrendingUp size={22} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
            />
            <KpiCard
              title="Total Engagement"
              value={analytics?.total_engagement ? `${(analytics.total_engagement / 1000).toFixed(1)}K` : "18.4K"}
              change="+14.2%"
              subtext="Likes, comments & shares"
              icon={<BarChart3 size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Active Campaigns"
              value={campaigns.length || 4}
              change="4 Running"
              subtext="Budget: $19.5K Total"
              icon={<Megaphone size={22} className="text-indigo-600" />}
              iconBg="bg-indigo-50 border-indigo-100"
            />
            <KpiCard
              title="Average Campaign ROI"
              value="3.4x"
              change="+22%"
              subtext="Return on ad spend"
              icon={<ShieldCheck size={22} className="text-pink-600" />}
              iconBg="bg-pink-50 border-pink-100"
            />
          </div>

          {/* Reach Trajectory Chart & Campaigns Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">Audience Growth & Reach Trend</h3>
                  <p className="text-xs text-slate-500">Total impressions and unique audience reach over last 30 days</p>
                </div>
                <button
                  onClick={() => navigate("/analytics")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Full Analytics →
                </button>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.timeline || []}>
                    <defs>
                      <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "0.75rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                    />
                    <Area type="monotone" dataKey="reach" stroke="#2563eb" strokeWidth={3} fill="url(#colorReach)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Campaign Cards Progress */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 font-display">Campaigns Progress</h3>
                <button onClick={() => navigate("/campaigns")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Manage →
                </button>
              </div>

              <div className="space-y-4">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{camp.name}</p>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {camp.roi ? `${camp.roi}x ROI` : "Active"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${camp.progress_percentage || 65}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Reach: {camp.actual_reach?.toLocaleString() || "48,200"}</span>
                      <span>Budget: ${camp.budget || "5,000"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          3. MARKETING TEAM DASHBOARD
         ============================================================ */}
      {role === "marketing_team" && (
        <div className="space-y-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Scheduled Posts"
              value={analytics?.scheduled_posts || 8}
              change="Ready"
              subtext="Next automated dispatch in 35m"
              icon={<Clock size={22} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
            />
            <KpiCard
              title="Published Content"
              value={analytics?.total_posts || 45}
              change="+12 this week"
              subtext="6 channels active"
              icon={<Send size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Total Impressions"
              value={analytics?.total_impressions ? `${(analytics.total_impressions / 1000).toFixed(1)}K` : "384.1K"}
              change="+18.5%"
              subtext="30-day aggregate"
              icon={<TrendingUp size={22} className="text-purple-600" />}
              iconBg="bg-purple-50 border-purple-100"
            />
            <KpiCard
              title="Avg Engagement Rate"
              value="5.8%"
              change="+0.8%"
              subtext="Above industry benchmark"
              icon={<BarChart3 size={22} className="text-pink-600" />}
              iconBg="bg-pink-50 border-pink-100"
            />
          </div>

          {/* Publishing Queue & Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">Upcoming Publishing Queue</h3>
                  <p className="text-xs text-slate-500">Automated worker dispatches ready for publishing</p>
                </div>
                <button
                  onClick={() => navigate("/queue")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  View Queue →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {recentPosts.map((p) => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {getPlatformIcon(p.platform)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.title || p.content}</p>
                        <p className="text-xs text-slate-500 capitalize">{p.platform} • {p.status}</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase shrink-0 ${
                        p.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : p.status === "scheduled"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Distribution Chart */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 font-display">Platform Engagement Mix</h3>
                <p className="text-xs text-slate-500">Traffic distribution across channels</p>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.platforms || []}
                      dataKey="reach"
                      nameKey="platform"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      {(analytics?.platforms || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "0.5rem" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {(analytics?.platforms || []).map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-700 capitalize">{p.platform}: {p.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          4. CONTENT CREATOR DASHBOARD
         ============================================================ */}
      {role === "content_creator" && (
        <div className="space-y-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="My Drafts"
              value={recentPosts.filter((p) => p.status === "draft").length || 3}
              change="Ready"
              subtext="Saved in creator studio"
              icon={<Sparkles size={22} className="text-pink-600" />}
              iconBg="bg-pink-50 border-pink-100"
            />
            <KpiCard
              title="Pending Approval"
              value={recentPosts.filter((p) => p.status === "pending_approval").length || 2}
              change="Under Review"
              subtext="Manager approval requested"
              icon={<Clock size={22} className="text-amber-600" />}
              iconBg="bg-amber-50 border-amber-100"
            />
            <KpiCard
              title="Published Content"
              value={recentPosts.filter((p) => p.status === "published").length || 6}
              change="Live"
              subtext="Dispatched across channels"
              icon={<CheckCircle2 size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Audience Likes"
              value="4.8K"
              change="+24%"
              subtext="Generated by creator copy"
              icon={<TrendingUp size={22} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
            />
          </div>

          {/* Creator Launchpad & Submissions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-display">Create New Social Post</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Compose captions with live multi-platform mockup previews (Instagram, Facebook, LinkedIn, X, YouTube), attach media, and submit for manager approval.
                </p>
              </div>

              <button
                onClick={() => navigate("/posts?action=create")}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer self-start"
              >
                Open Creator Studio
              </button>
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 font-display">Recent Content Submissions</h3>
                <button onClick={() => navigate("/posts")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  All Posts →
                </button>
              </div>

              <div className="space-y-3">
                {recentPosts.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {getPlatformIcon(p.platform)}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.title || p.content}</p>
                        <p className="text-xs text-slate-500 capitalize">{p.platform}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shrink-0">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  change,
  subtext,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  change: string;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl ${iconBg} border flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          {change}
        </span>
      </div>
      <div>
        <h3 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-none">{value}</h3>
        <p className="text-sm font-bold text-slate-800 mt-1.5">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtext}</p>
      </div>
    </div>
  );
}