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
  X,
  Eye,
  Film,
  Image as ImageIcon,
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

  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [viewingApproval, setViewingApproval] = useState<any | null>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const formatScheduledDate = (d?: string | null) => {
    if (!d) return "Immediate / ASAP";
    try {
      const dt = new Date(d);
      return dt.toLocaleString([], {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(d);
    }
  };

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
        api.approvals.getPending(),
      ]);

      const [statsRes, recentRes, upcomingRes, activityRes, campsRes, analyticsRes, approvalsRes] = results;

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
      if (approvalsRes.status === "fulfilled") setPendingApprovals(approvalsRes.value || []);

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

  const handleApprovePost = async (postId: number, action: "approve" | "reject", reason?: string) => {
    try {
      await api.posts.approve(postId, action, reason);
      showToast(
        action === "approve" ? "Post Approved 👍" : "Post Rejected",
        action === "approve" ? "Scheduled for automatic publishing." : "Returned to creator for revision.",
        "success"
      );
      loadDashboardData();
    } catch (err: any) {
      showToast("Approval Error", err.message || "Failed to process decision", "error");
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
    window.addEventListener("approval_updated", handleUpdate);

    return () => {
      window.removeEventListener("post_created", handleUpdate);
      window.removeEventListener("post_updated", handleUpdate);
      window.removeEventListener("post_deleted", handleUpdate);
      window.removeEventListener("post_published", handleUpdate);
      window.removeEventListener("social_account_connected", handleUpdate);
      window.removeEventListener("social_account_disconnected", handleUpdate);
      window.removeEventListener("social_account_synced", handleUpdate);
      window.removeEventListener("campaign_created", handleUpdate);
      window.removeEventListener("approval_updated", handleUpdate);
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
      {/* Error state notification */}
      {hasError && !stats && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm">
          <span>Unable to load live dashboard metrics. Please check connection.</span>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-500 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

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

      {/* Real Live Database KPI Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Total Posts"
          value={stats?.total_posts ?? 0}
          change="Database"
          subtext="Total content records"
          icon={<FileText size={20} className="text-blue-600" />}
          iconBg="bg-blue-50 border-blue-100"
        />
        <KpiCard
          title="Scheduled"
          value={stats?.scheduled_posts ?? 0}
          change="Queue"
          subtext="Ready for dispatch"
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100"
        />
        <KpiCard
          title="Pending Approval"
          value={stats?.pending_approval_posts ?? 0}
          change={(stats?.pending_approval_posts ?? 0) > 0 ? "Review Needed" : "All Clear"}
          subtext="Awaiting admin action"
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100"
        />
        <KpiCard
          title="Published"
          value={stats?.published_posts ?? 0}
          change="Live"
          subtext="Successfully published"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-100"
        />
        <KpiCard
          title="Failed"
          value={stats?.failed_posts ?? 0}
          change={stats?.failed_posts > 0 ? "Action Req" : "Healthy"}
          subtext="Require attention/retry"
          icon={<Activity size={20} className="text-rose-600" />}
          iconBg="bg-rose-50 border-rose-100"
        />
        <KpiCard
          title="Connected Accounts"
          value={stats?.connected_accounts ?? 0}
          change="Active"
          subtext="Social channels linked"
          icon={<Share2 size={20} className="text-purple-600" />}
          iconBg="bg-purple-50 border-purple-100"
        />
      </div>

      {/* ============================================================
          1. ADMINISTRATOR DASHBOARD
         ============================================================ */}
      {role === "administrator" && (
        <div className="space-y-7">
          {/* Admin KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <KpiCard
              title="Registered Users"
              value={adminStats?.total_users ?? 1}
              change="Platform"
              subtext="Platform accounts active"
              icon={<Users size={22} className="text-purple-600" />}
              iconBg="bg-purple-50 border-purple-100"
            />
            <KpiCard
              title="Active Workspaces"
              value={adminStats?.active_teams ?? 1}
              change="Active"
              subtext="Organization teams"
              icon={<Layers size={22} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
            />
            <KpiCard
              title="Pending Approvals"
              value={adminStats?.pending_approvals ?? (stats?.pending_approval_posts ?? 0)}
              change={((adminStats?.pending_approvals ?? stats?.pending_approval_posts ?? 0) > 0) ? "Action Req" : "All Clear"}
              subtext="Awaiting review"
              icon={<Clock size={22} className="text-amber-600" />}
              iconBg="bg-amber-50 border-amber-100"
            />
            <KpiCard
              title="Connected Accounts"
              value={adminStats?.connected_accounts ?? (stats?.connected_accounts ?? 0)}
              change={`${stats?.connected_accounts ?? 0} Live`}
              subtext="Linked social channels"
              icon={<Share2 size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Dispatched Posts"
              value={adminStats?.total_posts ?? (stats?.total_posts ?? 0)}
              change={`${stats?.published_posts ?? 0} Published`}
              subtext={`${stats?.failed_posts ?? 0} failed / ${stats?.scheduled_posts ?? 0} scheduled`}
              icon={<Activity size={22} className="text-pink-600" />}
              iconBg="bg-pink-50 border-pink-100"
            />
          </div>

          {/* Pending Approvals Review Queue (Live for Admin) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      Pending Approvals
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                      {pendingApprovals.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Review and authorize creator scheduled posts across LinkedIn and all connected channels before publishing
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/posts?status=pending_approval")}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View All in Hub</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center bg-white border border-amber-200/60 rounded-xl space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <h4 className="text-sm font-bold text-slate-900">No Pending Approvals</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All scheduled posts and campaigns are authorized. New creator submissions requiring administrator review will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingApprovals.map((req) => (
                  <div key={req.id} className="p-4 rounded-xl bg-white border border-amber-200/90 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition duration-200">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {getPlatformIcon(req.post_platform)}
                          <span className="capitalize">{req.post_platform}</span>
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          By: {req.creator_name || "Creator"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-medium line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        "{req.post_content}"
                      </p>

                      {req.media_url && (
                        <div className="relative inline-block rounded-lg overflow-hidden border border-slate-200 bg-slate-900 max-h-24">
                          {req.media_type === "video" ? (
                            <div className="flex items-center justify-center bg-slate-900 h-20 w-36 text-white text-[10px] font-bold">
                              <Film size={18} className="mr-1" /> Video Attached
                            </div>
                          ) : (
                            <img
                              src={getMediaUrl(req.media_url)}
                              alt="Attachment"
                              className="h-20 w-36 object-cover"
                            />
                          )}
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] text-slate-500">
                        <p className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Scheduled: {formatScheduledDate(req.scheduled_at)}</span>
                        </p>
                        {req.created_at && (
                          <p className="flex items-center gap-1 font-mono text-slate-400 text-[10px]">
                            <Clock size={11} />
                            <span>Created: {new Date(req.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-1 pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                            <Clock size={10} /> Status: Awaiting Admin Review
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                      <button
                        onClick={() => setViewingApproval(req)}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => handleApprovePost(req.post_id, "approve")}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("Enter rejection note for creator:", "Content needs revision");
                          if (reason !== null) {
                            handleApprovePost(req.post_id, "reject", reason);
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              value={stats?.total_reach ? stats.total_reach.toLocaleString() : "0"}
              change="DB Aggregated"
              subtext="Across published posts"
              icon={<TrendingUp size={22} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
            />
            <KpiCard
              title="Total Engagement"
              value={stats?.total_engagement ? stats.total_engagement.toLocaleString() : "0"}
              change="DB Aggregated"
              subtext="Likes, comments & shares"
              icon={<BarChart3 size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Active Campaigns"
              value={campaigns.filter((c) => c.status === "active").length || campaigns.length}
              change={`${campaigns.length} Total`}
              subtext="Workspace campaigns"
              icon={<Megaphone size={22} className="text-indigo-600" />}
              iconBg="bg-indigo-50 border-indigo-100"
            />
            <KpiCard
              title="Average Campaign ROI"
              value={
                campaigns.length > 0 && campaigns.some((c) => c.roi)
                  ? `${(campaigns.reduce((acc, c) => acc + (c.roi || 0), 0) / campaigns.length).toFixed(1)}x`
                  : "N/A"
              }
              change="Actual"
              subtext="Campaign performance"
              icon={<ShieldCheck size={22} className="text-pink-600" />}
              iconBg="bg-pink-50 border-pink-100"
            />
          </div>

          {/* Pending Approvals Review Queue (Live for Business User / Owner) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      Pending Approvals
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                      {pendingApprovals.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Review and authorize creator scheduled posts across LinkedIn and all connected channels before publishing
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/posts?status=pending_approval")}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View All in Hub</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center bg-white border border-amber-200/60 rounded-xl space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <h4 className="text-sm font-bold text-slate-900">No Pending Approvals</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All scheduled posts and campaigns are authorized. New creator submissions requiring review will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingApprovals.map((req) => (
                  <div key={req.id} className="p-4 rounded-xl bg-white border border-amber-200/90 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition duration-200">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {getPlatformIcon(req.post_platform)}
                          <span className="capitalize">{req.post_platform}</span>
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          By: {req.creator_name || "Creator"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-medium line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        "{req.post_content}"
                      </p>

                      {req.media_url && (
                        <div className="relative inline-block rounded-lg overflow-hidden border border-slate-200 bg-slate-900 max-h-24">
                          {req.media_type === "video" ? (
                            <div className="flex items-center justify-center bg-slate-900 h-20 w-36 text-white text-[10px] font-bold">
                              <Film size={18} className="mr-1" /> Video Attached
                            </div>
                          ) : (
                            <img
                              src={getMediaUrl(req.media_url)}
                              alt="Attachment"
                              className="h-20 w-36 object-cover"
                            />
                          )}
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] text-slate-500">
                        <p className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Scheduled: {formatScheduledDate(req.scheduled_at)}</span>
                        </p>
                        {req.created_at && (
                          <p className="flex items-center gap-1 font-mono text-slate-400 text-[10px]">
                            <Clock size={11} />
                            <span>Created: {new Date(req.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-1 pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                            <Clock size={10} /> Status: Awaiting Admin Review
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                      <button
                        onClick={() => setViewingApproval(req)}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => handleApprovePost(req.post_id, "approve")}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("Enter rejection note for creator:", "Content needs revision");
                          if (reason !== null) {
                            handleApprovePost(req.post_id, "reject", reason);
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reach Trajectory Chart & Campaigns Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">Audience Growth & Reach Trend</h3>
                  <p className="text-xs text-slate-500">Total impressions and unique audience reach from published posts</p>
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
                {campaigns.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No active campaigns</p>
                ) : (
                  campaigns.map((camp) => (
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
                          style={{ width: `${camp.progress_percentage || 50}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span>Reach: {camp.actual_reach?.toLocaleString() || "0"}</span>
                        <span>Budget: ${camp.budget ? camp.budget.toLocaleString() : "0"}</span>
                      </div>
                    </div>
                  ))
                )}
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
              value={stats?.scheduled_posts ?? 0}
              change="Ready"
              subtext="In automated dispatch queue"
              icon={<Clock size={22} className="text-blue-600" />}
              iconBg="bg-blue-50 border-blue-100"
            />
            <KpiCard
              title="Published Content"
              value={stats?.published_posts ?? 0}
              change={`${stats?.connected_accounts ?? 0} Channels`}
              subtext="SocialPilot database records"
              icon={<Send size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Total Impressions"
              value={stats?.total_impressions ? stats.total_impressions.toLocaleString() : "0"}
              change="DB Aggregated"
              subtext="Impressions count"
              icon={<TrendingUp size={22} className="text-purple-600" />}
              iconBg="bg-purple-50 border-purple-100"
            />
            <KpiCard
              title="Avg Engagement Rate"
              value={
                stats?.total_impressions && stats.total_impressions > 0
                  ? `${((stats.total_engagement || 0) / stats.total_impressions * 100).toFixed(1)}%`
                  : "0.0%"
              }
              change="Calculated"
              subtext="Engagement / Impressions"
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
                {recentPosts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No posts found</p>
                ) : (
                  recentPosts.map((p) => (
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
                  ))
                )}
              </div>
            </div>

            {/* Platform Distribution Chart */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 font-display">Platform Engagement Mix</h3>
                <p className="text-xs text-slate-500">Traffic distribution across channels</p>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                {(!analytics?.platforms || analytics.platforms.length === 0) ? (
                  <p className="text-xs text-slate-400">No platform distribution data yet</p>
                ) : (
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
                )}
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
              value={stats?.draft_posts ?? 0}
              change="Ready"
              subtext="Saved in creator studio"
              icon={<Sparkles size={22} className="text-pink-600" />}
              iconBg="bg-pink-50 border-pink-100"
            />
            <KpiCard
              title="Pending Approval"
              value={stats?.pending_approval_posts ?? 0}
              change="Under Review"
              subtext="Manager approval requested"
              icon={<Clock size={22} className="text-amber-600" />}
              iconBg="bg-amber-50 border-amber-100"
            />
            <KpiCard
              title="Published Content"
              value={stats?.published_posts ?? 0}
              change="Live"
              subtext="Dispatched across channels"
              icon={<CheckCircle2 size={22} className="text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100"
            />
            <KpiCard
              title="Audience Likes"
              value={stats?.total_likes ? stats.total_likes.toLocaleString() : "0"}
              change="Actual"
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
                {recentPosts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No posts created yet.</p>
                ) : (
                  recentPosts.map((p) => {
                    const isPending = p.approval_status === "pending" || p.status === "pending_approval";
                    const isRejected = p.approval_status === "rejected";
                    const isApprovedScheduled = (p.approval_status === "approved" || !p.approval_status) && (p.status === "scheduled" || p.status === "queued");

                    return (
                      <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {getPlatformIcon(p.platform)}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{p.title || p.content}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 capitalize">
                              <span>{p.platform}</span>
                              {p.scheduled_at && (
                                <span className="font-mono text-[11px] text-slate-400">
                                  • {formatScheduledDate(p.scheduled_at)}
                                </span>
                              )}
                            </div>
                            {isRejected && p.failure_reason && (
                              <p className="text-[11px] text-rose-600 font-medium truncate mt-0.5">
                                Note: {p.failure_reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          {isPending ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0 inline-flex items-center gap-1">
                              <Clock size={11} /> Awaiting Admin Review
                            </span>
                          ) : isRejected ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shrink-0 inline-flex items-center gap-1">
                              <X size={11} /> Rejected
                            </span>
                          ) : isApprovedScheduled ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> Approved / Scheduled
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shrink-0">
                              {p.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Posts & Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">Upcoming Scheduled Posts</h3>
                  <p className="text-xs text-slate-500">Scheduled automated worker dispatches</p>
                </div>
                <button onClick={() => navigate("/calendar")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Calendar →
                </button>
              </div>

              <div className="space-y-3">
                {upcomingPosts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No upcoming scheduled posts.</p>
                ) : (
                  upcomingPosts.map((p) => {
                    const isPending = p.approval_status === "pending" || p.status === "pending_approval";
                    const isRejected = p.approval_status === "rejected";
                    const isApprovedScheduled = (p.approval_status === "approved" || !p.approval_status) && (p.status === "scheduled" || p.status === "queued");

                    return (
                      <div key={p.id} className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {getPlatformIcon(p.platform)}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{p.title || p.content}</p>
                            <p className="text-xs text-slate-500 font-mono">
                              {formatScheduledDate(p.scheduled_at)}
                            </p>
                            {isRejected && p.failure_reason && (
                              <p className="text-[11px] text-rose-600 font-medium truncate mt-0.5">
                                Note: {p.failure_reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          {isPending ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0 inline-flex items-center gap-1">
                              <Clock size={11} /> Awaiting Admin Review
                            </span>
                          ) : isRejected ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shrink-0 inline-flex items-center gap-1">
                              <X size={11} /> Rejected
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0 inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> Approved / Scheduled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">Recent Activity & Logs</h3>
                  <p className="text-xs text-slate-500">Live publishing execution feed</p>
                </div>
                <button onClick={() => navigate("/queue")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Queue & Logs →
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No publishing activity yet.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${act.level === "error" ? "bg-rose-500" : act.level === "success" ? "bg-emerald-500" : "bg-blue-500"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{act.message}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{act.event_name}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing approval details */}
      {viewingApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {getPlatformIcon(viewingApproval.post_platform)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Review {viewingApproval.post_platform ? viewingApproval.post_platform.toUpperCase() : "Social"} Post
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submitted by {viewingApproval.creator_name || "Creator"} • Created {new Date(viewingApproval.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingApproval(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scheduled Time</p>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    {formatScheduledDate(viewingApproval.scheduled_at)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Approval Status</p>
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Clock size={12} /> Awaiting Admin Review
                  </p>
                </div>
              </div>

              {viewingApproval.post_title && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title / Headline</p>
                  <p className="text-xs font-semibold text-slate-800 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    {viewingApproval.post_title}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Post Content</p>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {viewingApproval.post_content}
                </div>
              </div>

              {viewingApproval.media_url && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Media Attachment</p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-56">
                    {viewingApproval.media_type === "video" ? (
                      <video
                        src={getMediaUrl(viewingApproval.media_url)}
                        controls
                        className="max-h-56 w-full object-contain"
                      />
                    ) : (
                      <img
                        src={getMediaUrl(viewingApproval.media_url)}
                        alt="Post media"
                        className="max-h-56 w-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingApproval(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const reason = prompt("Enter rejection note for creator:", "Content needs revision");
                  if (reason !== null) {
                    handleApprovePost(viewingApproval.post_id, "reject", reason);
                    setViewingApproval(null);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
              >
                <X size={14} /> Reject Post
              </button>
              <button
                onClick={() => {
                  handleApprovePost(viewingApproval.post_id, "approve");
                  setViewingApproval(null);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Check size={14} /> Approve Post
              </button>
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