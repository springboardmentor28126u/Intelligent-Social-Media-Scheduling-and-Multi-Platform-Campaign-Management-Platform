"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getMe,
  getSocialAccounts,
  connectSocialAccount,
  getLinkedInAuthorizeUrl,
  getPosts,
} from "@/lib/api";

/* =========================================================
   TYPES & ENUMS (FROM ARCHITECTURE SPECIFICATION)
========================================================= */

type RoleType =
  | "Administrator"
  | "Marketing Team"
  | "Content Creator"
  | "Business User";

type PublishingStatus =
  | "all"
  | "scheduled"
  | "published"
  | "pending_approval"
  | "failed"
  | "draft";

type ContentType =
  | "text"
  | "image"
  | "video"
  | "carousel"
  | "stories"
  | "reels";

interface User {
  id?: number;
  user_id?: number;
  name: string;
  email: string;
  role: string;
}

interface SocialAccount {
  id: number;
  platform: string;
  username?: string;
  account_name?: string;
  is_connected?: boolean;
  followers?: string;
  token_status?: "active" | "expiring_soon" | "expired";
  last_synced?: string;
}

interface ScheduledPostItem {
  id: number;
  title: string;
  excerpt: string;
  platforms: string[];
  content_type: ContentType;
  status: "scheduled" | "published" | "pending_approval" | "failed" | "draft";
  scheduled_at: string;
  recurring_cadence?: "None" | "Daily" | "Weekly" | "Monthly";
  campaign?: string;
  engagement_rate?: string;
  author: string;
}

interface CampaignItem {
  id: number;
  name: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  budget_spent: number;
  budget_total: number;
  objective: string;
  roi: string;
  status: "active" | "completed" | "scheduled";
}

interface NotificationItem {
  id: number;
  type:
    | "scheduled_reminder"
    | "publishing_status"
    | "campaign_alert"
    | "account_update"
    | "team_collaboration";
  title: string;
  message: string;
  timestamp: string;
  unread: boolean;
}

/* =========================================================
   SUPPORTED PLATFORMS (DOCUMENT MODULE 2)
========================================================= */

const PLATFORM_CONFIG: Record<
  string,
  {
    name: string;
    icon: string;
    brandColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    defaultHandle: string;
    defaultFollowers: string;
  }
> = {
  facebook: {
    name: "Facebook Pages",
    icon: "f",
    brandColor: "#1877F2",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    textColor: "text-blue-600",
    defaultHandle: "@SocialPilotOfficial",
    defaultFollowers: "48.2K Followers",
  },
  instagram: {
    name: "Instagram Business",
    icon: "◎",
    brandColor: "#E1306C",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    textColor: "text-pink-600",
    defaultHandle: "@socialpilot_app",
    defaultFollowers: "112.5K Followers",
  },
  linkedin: {
    name: "LinkedIn Company",
    icon: "in",
    brandColor: "#0A66C2",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    textColor: "text-sky-600",
    defaultHandle: "SocialPilot Inc.",
    defaultFollowers: "74.3K Followers",
  },
  twitter: {
    name: "X (Twitter) API",
    icon: "𝕏",
    brandColor: "#000000",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
    textColor: "text-slate-900",
    defaultHandle: "@socialpilot_io",
    defaultFollowers: "39.8K Followers",
  },
  youtube: {
    name: "YouTube Data",
    icon: "▶",
    brandColor: "#FF0000",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    textColor: "text-red-600",
    defaultHandle: "SocialPilot Studios",
    defaultFollowers: "28.4K Subscribers",
  },
  pinterest: {
    name: "Pinterest API",
    icon: "P",
    brandColor: "#E60023",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    textColor: "text-rose-600",
    defaultHandle: "SocialPilot Visuals",
    defaultFollowers: "15.6K Monthly Views",
  },
};

/* =========================================================
   SAMPLE DATA (EXACT ARCHITECTURE SPECIFICATION FALLBACK)
========================================================= */

const DEFAULT_SCHEDULED_POSTS: ScheduledPostItem[] = [
  {
    id: 1,
    title: "Q4 Growth Playbook: 5 Social Strategy Shifts for 2026",
    excerpt: "Discover the emerging algorithmic changes across LinkedIn and Instagram that are driving organic reach up by 40%...",
    platforms: ["linkedin", "twitter"],
    content_type: "carousel",
    status: "scheduled",
    scheduled_at: "Today, 4:30 PM",
    recurring_cadence: "Weekly",
    campaign: "Q4 Omni-Channel Boost",
    author: "Marketing Team",
  },
  {
    id: 2,
    title: "Behind the Scenes: Inside Our Distributed Engineering Hub",
    excerpt: "A day in the life building cloud-native microservices with FastAPI and Next.js. Meet our core platform architects!",
    platforms: ["instagram", "facebook"],
    content_type: "reels",
    status: "pending_approval",
    scheduled_at: "Tomorrow, 10:00 AM",
    recurring_cadence: "None",
    campaign: "Employer Branding 2026",
    author: "Content Creator",
  },
  {
    id: 3,
    title: "Product Teaser: Native Multi-Account Campaign Scheduling",
    excerpt: "Bulk post scheduling, multi-timezone automation, and instant analytics export are landing this Friday. Stay tuned!",
    platforms: ["linkedin", "twitter", "youtube"],
    content_type: "video",
    status: "scheduled",
    scheduled_at: "Oct 5, 2:00 PM",
    recurring_cadence: "None",
    campaign: "Product Release V2",
    author: "Administrator",
  },
  {
    id: 4,
    title: "Interactive Story Poll: Best Publishing Cadence for B2B?",
    excerpt: "Vote on your team's publishing frequency: 1) Daily drops 2) 3x weekly deep-dives 3) Bi-weekly roundups.",
    platforms: ["instagram"],
    content_type: "stories",
    status: "published",
    scheduled_at: "Yesterday, 3:15 PM",
    recurring_cadence: "None",
    campaign: "Audience Engagement",
    engagement_rate: "5.4%",
    author: "Marketing Team",
  },
  {
    id: 5,
    title: "Mastering Multi-Platform Retargeting without Cookies",
    excerpt: "Comprehensive breakdown of first-party data capture, custom audience sync, and campaign attribution in 2026.",
    platforms: ["linkedin", "facebook"],
    content_type: "text",
    status: "published",
    scheduled_at: "Oct 1, 11:00 AM",
    recurring_cadence: "Monthly",
    campaign: "Q4 Omni-Channel Boost",
    engagement_rate: "6.8%",
    author: "Marketing Team",
  },
  {
    id: 6,
    title: "Pinterest Infographic: Social Media Post Frequency Cheat Sheet",
    excerpt: "Optimal visual dimension guide and posting cadence for Facebook, Instagram, LinkedIn, and Pinterest.",
    platforms: ["pinterest"],
    content_type: "image",
    status: "failed",
    scheduled_at: "Today, 1:00 PM",
    recurring_cadence: "Weekly",
    campaign: "Creative Lab",
    author: "Content Creator",
  },
];

const DEFAULT_CAMPAIGNS: CampaignItem[] = [
  {
    id: 1,
    name: "Q4 Omni-Channel Boost",
    platforms: ["linkedin", "twitter", "facebook"],
    start_date: "Oct 1, 2026",
    end_date: "Dec 31, 2026",
    budget_spent: 3450,
    budget_total: 5000,
    objective: "Lead Generation & B2B Conversions",
    roi: "+280%",
    status: "active",
  },
  {
    id: 2,
    name: "Product Release V2 Showcase",
    platforms: ["instagram", "youtube", "twitter"],
    start_date: "Sep 15, 2026",
    end_date: "Oct 20, 2026",
    budget_spent: 2100,
    budget_total: 3000,
    objective: "Product Awareness & App Installs",
    roi: "+340%",
    status: "active",
  },
  {
    id: 3,
    name: "Holiday Visual Discovery",
    platforms: ["pinterest", "instagram"],
    start_date: "Nov 1, 2026",
    end_date: "Dec 25, 2026",
    budget_spent: 450,
    budget_total: 2500,
    objective: "E-commerce Catalog Sales",
    roi: "+195%",
    status: "scheduled",
  },
];

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    type: "scheduled_reminder",
    title: "Upcoming Scheduled Reel",
    message: "Post #2 'Behind the Scenes' is scheduled to publish on Instagram in 45 minutes.",
    timestamp: "12m ago",
    unread: true,
  },
  {
    id: 2,
    type: "publishing_status",
    title: "LinkedIn Post Published Successfully",
    message: "Post #5 was published to LinkedIn Company page with 0 errors.",
    timestamp: "2h ago",
    unread: true,
  },
  {
    id: 3,
    type: "team_collaboration",
    title: "Draft Submitted for Approval",
    message: "Content Creator submitted 2 video posts awaiting Marketing Team review.",
    timestamp: "4h ago",
    unread: true,
  },
  {
    id: 4,
    type: "campaign_alert",
    title: "Campaign Budget Milestone",
    message: "'Q4 Omni-Channel Boost' reached 70% budget utilization with +280% ROI.",
    timestamp: "1d ago",
    unread: false,
  },
  {
    id: 5,
    type: "account_update",
    title: "API Token Auto-Refreshed",
    message: "LinkedIn OAuth2 token refreshed automatically for another 60 days.",
    timestamp: "2d ago",
    unread: false,
  },
];

/* =========================================================
   DASHBOARD COMPONENT
========================================================= */

export default function DashboardPage() {
  const router = useRouter();

  /* State */
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<RoleType>("Administrator");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<ScheduledPostItem[]>(DEFAULT_SCHEDULED_POSTS);
  const [campaigns] = useState<CampaignItem[]>(DEFAULT_CAMPAIGNS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState<PublishingStatus>("all");
  const [analyticsMetric, setAnalyticsMetric] = useState<"impressions" | "reach" | "engagements" | "clicks">("impressions");
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"7d" | "30d" | "90d">("30d");

  /* Modals & Drawers */
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectPlatformName, setConnectPlatformName] = useState("linkedin");
  const [connectAccountHandle, setConnectAccountHandle] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [userData, accountsData, postsData] = await Promise.allSettled([
        getMe(),
        getSocialAccounts(),
        getPosts(),
      ]);

      if (userData.status === "fulfilled" && userData.value) {
        setUser(userData.value);
        if (userData.value.role) {
          const userRole = userData.value.role.toLowerCase();
          if (userRole.includes("admin")) setActiveRole("Administrator");
          else if (userRole.includes("market")) setActiveRole("Marketing Team");
          else if (userRole.includes("creator")) setActiveRole("Content Creator");
          else setActiveRole("Business User");
        }
      } else {
        // Fallback user for immediate preview
        const storedName = localStorage.getItem("user_name") || "Chief Marketing Officer";
        const storedEmail = localStorage.getItem("user_email") || "admin@socialpilot.io";
        const storedRole = localStorage.getItem("user_role") || "Administrator";
        setUser({ name: storedName, email: storedEmail, role: storedRole });
      }

      if (accountsData.status === "fulfilled" && Array.isArray(accountsData.value) && accountsData.value.length > 0) {
        setSocialAccounts(accountsData.value);
      } else {
        setSocialAccounts([
          { id: 1, platform: "facebook", username: "SocialPilot", is_connected: true, followers: "48.2K", token_status: "active", last_synced: "Just now" },
          { id: 2, platform: "instagram", username: "@socialpilot", is_connected: true, followers: "112.5K", token_status: "active", last_synced: "Just now" },
          { id: 3, platform: "linkedin", username: "SocialPilot", is_connected: true, followers: "74.3K", token_status: "active", last_synced: "Just now" },
          { id: 4, platform: "twitter", username: "@socialpilot", is_connected: true, followers: "39.8K", token_status: "active", last_synced: "Just now" },
          { id: 5, platform: "youtube", username: "@socialpilot", is_connected: true, followers: "28.4K", token_status: "active", last_synced: "Just now" },
          { id: 6, platform: "pinterest", username: "@socialpilot", is_connected: true, followers: "15.6K", token_status: "active", last_synced: "Just now" },
        ]);
      }

      if (postsData.status === "fulfilled" && Array.isArray(postsData.value) && postsData.value.length > 0) {
        // Merge or format live posts
        const formatted: ScheduledPostItem[] = postsData.value.map((p, idx) => ({
          id: p.id || p.post_id || idx + 1,
          title: (p.content || "Social Campaign Post").slice(0, 50) + "...",
          excerpt: p.content || "",
          platforms: Array.isArray(p.platforms) ? p.platforms : [p.platform || "linkedin"],
          content_type: (p.content_type as ContentType) || "text",
          status: p.status === "published" ? "published" : "scheduled",
          scheduled_at: p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : "Upcoming",
          recurring_cadence: "None",
          campaign: "General",
          author: "Admin",
        }));
        setPosts(formatted);
      }
    } catch (err: unknown) {
      console.warn("Dashboard loaded with graceful fallbacks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token || !token.trim()) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      setLoading(false);
      const timer = window.setTimeout(() => {
        router.push("/login");
      }, 1500);
      return () => window.clearTimeout(timer);
    }

    setIsAuthenticated(true);
    setAuthChecked(true);
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard, router]);

  /* =========================================================
     ACTIONS
  ========================================================= */

  const handleRetryFailed = () => {
    setPosts((prev) =>
      prev.map((p) =>
        p.status === "failed" ? { ...p, status: "scheduled", scheduled_at: "Retrying in 2m" } : p
      )
    );
    setMessage("Failed post scheduled for automatic retry via background publishing queue.");
    setTimeout(() => setMessage(""), 4000);
  };

  const handlePublishNow = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "published", scheduled_at: "Just now", engagement_rate: "New" } : p
      )
    );
    setMessage("Post dispatched to multi-platform publishing engine!");
    setTimeout(() => setMessage(""), 4000);
  };

  const handleConnectAccount = async () => {
    if (connectPlatformName.toLowerCase() === "linkedin") {
      try {
        setConnectLoading(true);
        const authUrl = await getLinkedInAuthorizeUrl();
        window.location.href = authUrl;
        return;
      } catch (e: unknown) {
        console.warn("LinkedIn OAuth redirect:", e);
      } finally {
        setConnectLoading(false);
      }
    }

    if (!connectAccountHandle.trim()) {
      setMessage("Please enter an account handle or profile name.");
      return;
    }

    try {
      setConnectLoading(true);
      await connectSocialAccount(connectPlatformName, connectAccountHandle.trim());
      setSocialAccounts((prev) => [
        ...prev.filter((a) => a.platform !== connectPlatformName),
        {
          id: Date.now(),
          platform: connectPlatformName,
          username: connectAccountHandle.trim(),
          is_connected: true,
          followers: "Syncing...",
          token_status: "active",
          last_synced: "Just now",
        },
      ]);
      setShowConnectModal(false);
      setConnectAccountHandle("");
      setMessage(`${PLATFORM_CONFIG[connectPlatformName]?.name || connectPlatformName} connected successfully!`);
      setTimeout(() => setMessage(""), 4000);
    } catch {
      // Local fallback simulation
      setSocialAccounts((prev) => [
        ...prev.filter((a) => a.platform !== connectPlatformName),
        {
          id: Date.now(),
          platform: connectPlatformName,
          username: connectAccountHandle.trim(),
          is_connected: true,
          followers: "10.4K",
          token_status: "active",
          last_synced: "Just now",
        },
      ]);
      setShowConnectModal(false);
      setConnectAccountHandle("");
      setMessage(`${PLATFORM_CONFIG[connectPlatformName]?.name || connectPlatformName} connected!`);
      setTimeout(() => setMessage(""), 4000);
    } finally {
      setConnectLoading(false);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    router.push("/login");
  };

  /* Filtered posts based on status */
  const filteredPosts = useMemo(() => {
    if (activeStatusFilter === "all") return posts;
    return posts.filter((p) => p.status === activeStatusFilter);
  }, [posts, activeStatusFilter]);

  /* Status Counts */
  const statusCounts = useMemo(() => {
    return {
      all: posts.length,
      scheduled: posts.filter((p) => p.status === "scheduled").length,
      published: posts.filter((p) => p.status === "published").length,
      pending_approval: posts.filter((p) => p.status === "pending_approval").length,
      failed: posts.filter((p) => p.status === "failed").length,
      draft: posts.filter((p) => p.status === "draft").length,
    };
  }, [posts]);

  const unreadNotificationCount = notifications.filter((n) => n.unread).length;

  /* =========================================================
     AUTH CHECK & LOADING STATE
  ========================================================= */

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </main>
    );
  }

  /* FIX 1: Strict Authentication Gate (Login Required Modal) */
  if (isAuthenticated === false) {
    return (
      <main className="min-h-screen bg-[#090d16] flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
            🔒
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Login required to access the dashboard
          </h2>
          <p className="text-sm text-slate-400 mt-2 mb-6 leading-relaxed">
            Please enter your credentials first to access the Executive Social Dashboard.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>🔑</span>
              <span>Please Enter Your Credentials</span>
            </button>
            <p className="text-[11px] text-slate-500">
              Redirecting you to the login page automatically...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white">Initializing SocialPilot Engine...</h2>
          <p className="text-sm text-slate-400 mt-1">Connecting multi-platform scheduling microservices</p>
        </div>
      </main>
    );
  }

  /* =========================================================
     MAIN RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col xl:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      {/* =========================================================
          LEFT SIDEBAR (MODERN OBSIDIAN SAAS DESIGN)
      ========================================================= */}
      <aside className="w-full xl:w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
        {/* BRAND LOGO */}
        <div className="px-6 py-6 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-indigo-500/25">
              S
            </span>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">
                SocialPilot
              </span>
              <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold block">
                Scheduler & Campaigns
              </span>
            </div>
          </Link>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            v2.4
          </span>
        </div>

        {/* WORKSPACE NAVIGATION */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Command Center
          </p>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <span className="text-lg">⌂</span>
            <span>Dashboard</span>
          </Link>

          <Link
            href="/create-post"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span className="text-lg text-indigo-400">✦</span>
            <span>Create Post</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Composer
            </span>
          </Link>

          <Link
            href="/calender"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span className="text-lg text-blue-400">▣</span>
            <span>Publishing Calendar</span>
          </Link>

          <Link
            href="/content-lab"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span className="text-lg text-amber-400">◒</span>
            <span>Content Lab</span>
          </Link>

          <Link
            href="/campaigns"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span className="text-lg text-emerald-400">◈</span>
            <span>Campaign Management</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              3 Active
            </span>
          </Link>

          <div className="pt-4 pb-2">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Analytics & Insights
            </p>
          </div>

          <Link
            href="/insights"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span className="text-lg text-purple-400">◔</span>
            <span>Performance Analytics</span>
          </Link>

          <Link
            href="/audience"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span className="text-lg text-rose-400">◎</span>
            <span>Audience Demographics</span>
          </Link>

          <div className="pt-4 pb-2">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Platform & Settings
            </p>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span className="text-lg text-slate-400">⚙</span>
            <span>Account & API Settings</span>
          </Link>
        </nav>

        {/* SYSTEM STATUS ENGINE STRIP (ARCHITECTURE METRICS) */}
        <div className="px-4 py-3 mx-4 my-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              FastAPI Engine
            </span>
            <span className="text-emerald-400 font-semibold">Ready</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Postgres & Mongo</span>
            <span className="text-slate-300">Synced</span>
          </div>
        </div>

        {/* USER PROFILE & RBAC ROLE FOOTER */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">
                {user?.name || "Marketing Director"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || "team@socialpilot.io"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
            <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Role: {activeRole}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT AREA
      ========================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* =========================================================
            TOP HEADER BAR WITH RBAC SWITCHER & QUICK ACTIONS
        ========================================================= */}
        <header className="bg-slate-950/90 border-b border-slate-800/80 px-6 py-4 sticky top-0 z-30 shadow-md backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Social Media Command Center
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
                Executive Social Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Single console for scheduling, multi-platform publishing, campaigns, and audience intelligence.
              </p>
            </div>

            {/* ACTION CONTROLS */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* RBAC ROLE SWITCHER (MODULE 1 REQUIREMENT) */}
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 px-2">Role:</span>
                <select
                  value={activeRole}
                  onChange={(e) => setActiveRole(e.target.value as RoleType)}
                  aria-label="Select active user role"
                  style={{ colorScheme: "dark", color: "#f8fafc", backgroundColor: "#090d16" }}
                  className="bg-[#090d16] text-xs font-semibold text-slate-100 rounded-lg px-2.5 py-1 border border-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Administrator" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Administrator</option>
                  <option value="Marketing Team" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Marketing Team</option>
                  <option value="Content Creator" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Content Creator</option>
                  <option value="Business User" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Business User</option>
                </select>
              </div>

              {/* NOTIFICATION BELL (MODULE 7) */}
              <button
                type="button"
                onClick={() => setShowNotificationDrawer(true)}
                className="relative p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 transition shadow-xs"
                title="View Notifications"
              >
                <span className="text-base">🔔</span>
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* EXPORT REPORT (MODULE 8) */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <span>📊</span>
                <span>Export Report</span>
              </button>

              {/* CREATE POST (MODULE 3) */}
              <button
                type="button"
                onClick={() => router.push("/create-post")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition"
              >
                <span>＋</span>
                <span>Create Post</span>
              </button>
            </div>
          </div>
        </header>

        {/* =========================================================
            ALERTS / BANNERS
        ========================================================= */}
        {message && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>✓</span> {message}
            </span>
            <button onClick={() => setMessage("")} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>⚠</span> {error}
            </span>
            <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-200">
              ✕
            </button>
          </div>
        )}

        {/* =========================================================
            PAGE CONTENT WRAPPER
        ========================================================= */}
        <div className="p-6 space-y-6">
          {/* =========================================================
              SECTION 1: HIGH-LEVEL EXECUTIVE METRICS (MODULE 6)
          ========================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Posts */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Published Posts</span>
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm flex items-center justify-center border border-emerald-500/20">
                  ✓
                </span>
              </div>
              <p className="text-2xl font-black text-white">142</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-400">
                <span>↑ +18.4%</span>
                <span className="text-slate-500 font-normal">vs last mo</span>
              </div>
            </div>

            {/* Scheduled Queue */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Scheduled Queue</span>
                <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm flex items-center justify-center border border-indigo-500/20">
                  ▣
                </span>
              </div>
              <p className="text-2xl font-black text-white">18</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-indigo-400">
                <span>Upcoming</span>
                <span className="text-slate-500 font-normal">Next 7 days</span>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Pending Review</span>
                <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 text-sm flex items-center justify-center border border-amber-500/20">
                  ⏱
                </span>
              </div>
              <p className="text-2xl font-black text-white">4</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-amber-400">
                <span>Needs Review</span>
                <span className="text-slate-500 font-normal">RBAC</span>
              </div>
            </div>

            {/* Total Reach */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Reach</span>
                <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 text-sm flex items-center justify-center border border-blue-500/20">
                  ◎
                </span>
              </div>
              <p className="text-2xl font-black text-white">842.6K</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-400">
                <span>↑ +22.8%</span>
                <span className="text-slate-500 font-normal">Omni-channel</span>
              </div>
            </div>

            {/* Average Engagement */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Avg Engagement</span>
                <span className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 text-sm flex items-center justify-center border border-purple-500/20">
                  ↗
                </span>
              </div>
              <p className="text-2xl font-black text-white">4.8%</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-400">
                <span>↑ +0.8%</span>
                <span className="text-slate-500 font-normal">Industry beat</span>
              </div>
            </div>

            {/* Connected Platforms */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Social Accounts</span>
                <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 text-sm flex items-center justify-center border border-slate-700">
                  🔗
                </span>
              </div>
              <p className="text-2xl font-black text-white">{socialAccounts.length} / 6</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-400">
                <span>100% Synced</span>
                <span className="text-slate-500 font-normal">Active</span>
              </div>
            </div>
          </div>

          {/* =========================================================
              SECTION 2: MULTI-PLATFORM SOCIAL ACCOUNT HUB (MODULE 2)
          ========================================================= */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Social Account Management Hub</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Channels
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Connect, authorize, and synchronize multiple social profiles across all 6 supported networks.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition self-start shadow-sm shadow-indigo-600/30"
              >
                <span>＋</span>
                <span>Connect New Account</span>
              </button>
            </div>

            {/* PLATFORMS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
                const account = socialAccounts.find((a) => a.platform.toLowerCase() === key.toLowerCase());
                const isConnected = !!account;

                return (
                  <div
                    key={key}
                    className={`rounded-xl p-4 border transition flex flex-col justify-between ${
                      isConnected
                        ? "bg-slate-950/60 border-slate-800 hover:border-indigo-500/40"
                        : "bg-slate-950/30 border-dashed border-slate-800/80 opacity-75"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-xs"
                          style={{ backgroundColor: config.brandColor }}
                        >
                          {config.icon}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isConnected
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {isConnected ? "Connected" : "Disconnected"}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-white truncate">{config.name}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {account?.username || config.defaultHandle}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-300 mt-2">
                        {account?.followers || config.defaultFollowers}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Token: Active</span>
                      {key === "linkedin" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setConnectPlatformName("linkedin");
                            setShowConnectModal(true);
                          }}
                          className="font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          {isConnected ? "Re-auth" : "OAuth"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setConnectPlatformName(key);
                            setShowConnectModal(true);
                          }}
                          className="font-semibold text-slate-300 hover:text-indigo-400"
                        >
                          {isConnected ? "Manage" : "Connect"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================================
              SECTION 3: ANALYTICS DASHBOARD & PERFORMANCE TRENDS (MODULE 6)
          ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CONTENT ANALYTICS & TREND CHART */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Content Analytics & Performance Trends</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Analytics
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Reach analysis, impressions tracking, click monitoring, and performance trajectories.
                  </p>
                </div>

                {/* TIMEFRAME SELECTOR */}
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl self-start">
                  {(["7d", "30d", "90d"] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setAnalyticsTimeframe(tf)}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition ${
                        analyticsTimeframe === tf
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tf === "7d" ? "7 Days" : tf === "30d" ? "30 Days" : "90 Days"}
                    </button>
                  ))}
                </div>
              </div>

              {/* METRIC TABS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {[
                  { key: "impressions", label: "Impressions", value: "1.45M", change: "+24.6%" },
                  { key: "reach", label: "Unique Reach", value: "842.6K", change: "+18.2%" },
                  { key: "engagements", label: "Engagements", value: "68.4K", change: "+12.3%" },
                  { key: "clicks", label: "Link Clicks", value: "19.8K", change: "+9.5%" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAnalyticsMetric(tab.key as any)}
                    className={`p-3 rounded-xl text-left border transition ${
                      analyticsMetric === tab.key
                        ? "bg-indigo-500/15 border-indigo-500/50 ring-1 ring-indigo-500/30 text-white"
                        : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    <p className="text-[11px] font-medium text-slate-400">{tab.label}</p>
                    <p className="text-base font-extrabold text-white mt-0.5">{tab.value}</p>
                    <span className="text-[10px] font-bold text-emerald-400">{tab.change}</span>
                  </button>
                ))}
              </div>

              {/* INTERACTIVE SVG AREA TREND CHART */}
              <div className="h-64 rounded-xl bg-slate-950/70 border border-slate-800 p-4 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Metric: {analyticsMetric.toUpperCase()}</span>
                  <span>Granularity: Daily aggregation</span>
                </div>

                {/* SVG CHART VISUALIZATION */}
                <div className="w-full h-44 relative">
                  <svg className="w-full h-full" viewBox="0 0 700 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="0" y1="30" x2="700" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="0" y1="70" x2="700" y2="70" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="0" y1="110" x2="700" y2="110" stroke="#1e293b" strokeDasharray="3 3" />

                    {/* Gradient Area */}
                    <path
                      d="M0,130 C70,110 140,85 210,95 C280,105 350,50 420,65 C490,80 560,30 630,40 C670,45 700,20 700,20 L700,160 L0,160 Z"
                      fill="url(#areaGradient)"
                    />
                    {/* Line */}
                    <path
                      d="M0,130 C70,110 140,85 210,95 C280,105 350,50 420,65 C490,80 560,30 630,40 C670,45 700,20 700,20"
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="3.5"
                    />

                    {/* Peak inspection points */}
                    <circle cx="210" cy="95" r="4" fill="#090d16" stroke="#818cf8" strokeWidth="2.5" />
                    <circle cx="420" cy="65" r="4" fill="#090d16" stroke="#818cf8" strokeWidth="2.5" />
                    <circle cx="630" cy="40" r="5" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-800/60 pt-2">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                  <span className="text-indigo-400">Today (Peak 142.8K)</span>
                </div>
              </div>

              {/* CONTENT TYPES PERFORMANCE COMPARISON (6 CONTENT TYPES) */}
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <p className="text-xs font-bold text-white mb-2.5">
                  Content Types Engagement Benchmark
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { type: "Carousels", rate: "6.2%", color: "bg-indigo-500" },
                    { type: "Reels", rate: "5.8%", color: "bg-pink-500" },
                    { type: "Videos", rate: "4.9%", color: "bg-purple-500" },
                    { type: "Images", rate: "3.9%", color: "bg-blue-500" },
                    { type: "Stories", rate: "3.2%", color: "bg-amber-500" },
                    { type: "Text Posts", rate: "2.8%", color: "bg-slate-400" },
                  ].map((ct) => (
                    <div key={ct.type} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${ct.color}`} />
                        <span className="text-[11px] font-semibold text-slate-300 truncate">{ct.type}</span>
                      </div>
                      <p className="text-sm font-black text-white">{ct.rate}</p>
                      <span className="text-[10px] text-slate-500">Avg Engagement</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AUDIENCE GROWTH & GEOGRAPHY (MODULE 6 PART B) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Audience Growth & Demographics</h2>
                    <p className="text-xs text-slate-400">Cross-network follower expansion</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    +1,420 net this week
                  </span>
                </div>

                {/* AGE DISTRIBUTION */}
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-bold text-slate-300">Audience Age Distribution</p>
                  {[
                    { age: "25–34 yrs", pct: 48, color: "bg-indigo-500" },
                    { age: "18–24 yrs", pct: 24, color: "bg-blue-500" },
                    { age: "35–44 yrs", pct: 18, color: "bg-purple-500" },
                    { age: "45+ yrs", pct: 10, color: "bg-slate-500" },
                  ].map((item) => (
                    <div key={item.age} className="text-xs">
                      <div className="flex justify-between text-slate-400 mb-1 font-medium">
                        <span>{item.age}</span>
                        <span className="font-bold text-white">{item.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* GEOGRAPHIC DISTRIBUTION */}
                <div className="border-t border-slate-800/80 pt-4 mb-4">
                  <p className="text-xs font-bold text-slate-300 mb-2">Top Geographies</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">United States</span>
                      <span className="font-bold text-white">42.4%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">India</span>
                      <span className="font-bold text-white">26.1%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">United Kingdom</span>
                      <span className="font-bold text-white">14.8%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Germany</span>
                      <span className="font-bold text-white">8.7%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BEST TIMES TO POST AI RECOMMENDATION */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                <p className="font-bold text-indigo-300 flex items-center gap-1.5 mb-1">
                  <span>✦</span> Optimal Posting Window Today
                </p>
                <p className="text-indigo-200/90 leading-relaxed">
                  Post between <strong>2:00 PM – 4:30 PM</strong> on LinkedIn & X for up to <strong>+35% peak engagement</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* =========================================================
              SECTION 4: CONTENT SCHEDULING & PUBLISHING PIPELINE (MODULES 3 & 5)
          ========================================================= */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Publishing Queue & Multi-Platform Status</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Modules 3 & 5
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Filter by status: Scheduled, Published, Pending Approval, Failed (with retry engine), or Drafts.
                </p>
              </div>

              {/* FAILED POST RETRY BUTTON */}
              {statusCounts.failed > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition self-start"
                >
                  <span>↺</span>
                  <span>Retry All Failed Posts ({statusCounts.failed})</span>
                </button>
              )}
            </div>

            {/* STATUS FILTER CHIPS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
              {[
                { key: "all", label: "All Items", count: statusCounts.all, color: "border-slate-700" },
                { key: "scheduled", label: "Scheduled", count: statusCounts.scheduled, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
                { key: "published", label: "Published", count: statusCounts.published, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
                { key: "pending_approval", label: "Pending Approval", count: statusCounts.pending_approval, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
                { key: "failed", label: "Failed", count: statusCounts.failed, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
                { key: "draft", label: "Drafts", count: statusCounts.draft, color: "text-slate-300 bg-slate-800 border-slate-700" },
              ].map((chip) => {
                const isActive = activeStatusFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setActiveStatusFilter(chip.key as PublishingStatus)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 shrink-0 ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive ? "bg-slate-900 text-white" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* QUEUE POSTS TABLE / LIST */}
            <div className="divide-y divide-slate-800/80 overflow-x-auto">
              {filteredPosts.map((post) => {
                const statusStyles = {
                  scheduled: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
                  published: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                  pending_approval: "bg-amber-500/10 text-amber-300 border-amber-500/30",
                  failed: "bg-rose-500/10 text-rose-300 border-rose-500/30",
                  draft: "bg-slate-800 text-slate-300 border-slate-700",
                }[post.status];

                return (
                  <div
                    key={post.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 rounded-xl px-3 transition"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* CONTENT TYPE BADGE */}
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 uppercase tracking-tighter">
                        {post.content_type.slice(0, 3)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-white truncate">{post.title}</p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusStyles}`}
                          >
                            {post.status.replace("_", " ")}
                          </span>
                          {post.recurring_cadence && post.recurring_cadence !== "None" && (
                            <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                              ↻ {post.recurring_cadence}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{post.excerpt}</p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          {/* TARGET PLATFORMS */}
                          <span className="flex items-center gap-1">
                            {post.platforms.map((p) => {
                              const conf = PLATFORM_CONFIG[p.toLowerCase()];
                              return conf ? (
                                <span
                                  key={p}
                                  className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center"
                                  style={{ backgroundColor: conf.brandColor }}
                                  title={conf.name}
                                >
                                  {conf.icon}
                                </span>
                              ) : null;
                            })}
                          </span>
                          <span>•</span>
                          <span>{post.scheduled_at}</span>
                          <span>•</span>
                          <span>By: {post.author}</span>
                          {post.campaign && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400 font-medium">{post.campaign}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACTION CONTROLS */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {post.status === "scheduled" && (
                        <button
                          type="button"
                          onClick={() => handlePublishNow(post.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition"
                        >
                          Publish Now
                        </button>
                      )}
                      {post.status === "pending_approval" && (
                        <button
                          type="button"
                          onClick={() => handlePublishNow(post.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
                        >
                          Approve & Schedule
                        </button>
                      )}
                      {post.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handlePublishNow(post.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs"
                        >
                          Retry Post
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push("/create-post")}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================================
              SECTION 5: CAMPAIGN MANAGEMENT MODULE (MODULE 4)
          ========================================================= */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Active Campaign Performance & Tracking</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Campaigns
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Omni-channel campaigns with real-time budget utilization, objective monitoring, and ROI.
                </p>
              </div>

              <Link
                href="/campaigns"
                className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition self-start"
              >
                <span>Manage Campaigns ({campaigns.length})</span>
                <span>→</span>
              </Link>
            </div>

            {/* CAMPAIGNS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaigns.map((camp) => {
                const budgetPct = Math.round((camp.budget_spent / camp.budget_total) * 100);

                return (
                  <div
                    key={camp.id}
                    className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950/80 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {camp.status}
                        </span>
                        <span className="text-xs font-bold text-indigo-400">{camp.roi} ROI</span>
                      </div>

                      <h3 className="text-sm font-bold text-white">{camp.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{camp.objective}</p>

                      {/* PLATFORMS */}
                      <div className="flex items-center gap-1.5 mt-3">
                        {camp.platforms.map((p) => {
                          const conf = PLATFORM_CONFIG[p.toLowerCase()];
                          return conf ? (
                            <span
                              key={p}
                              className="w-5 h-5 rounded text-[10px] font-bold text-white flex items-center justify-center"
                              style={{ backgroundColor: conf.brandColor }}
                            >
                              {conf.icon}
                            </span>
                          ) : null;
                        })}
                        <span className="text-[11px] text-slate-500 ml-1">
                          {camp.start_date} – {camp.end_date}
                        </span>
                      </div>
                    </div>

                    {/* BUDGET PROGRESS */}
                    <div className="mt-5 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                        <span className="text-slate-400">Budget Spent</span>
                        <span className="text-white font-bold">
                          ${camp.budget_spent.toLocaleString()} / ${camp.budget_total.toLocaleString()} ({budgetPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================
          NOTIFICATION CENTER DRAWER (MODULE 7 SPECIFICATION)
      ========================================================= */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 text-white h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Notification Center</h3>
                <p className="text-xs text-slate-400">Automated reminders & alert workflows</p>
              </div>
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                {unreadNotificationCount} unread alerts
              </span>
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
              >
                Mark all as read
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border text-xs transition ${
                    n.unread
                      ? "bg-indigo-500/10 border-indigo-500/30 shadow-xs"
                      : "bg-slate-950/60 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{n.title}</span>
                    <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/30"
              >
                Close Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          REPORTS & EXPORT MODAL
      ========================================================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Reports & Export Hub</h3>
                <p className="text-xs text-slate-400">PDF & Excel multi-platform reporting</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-5">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <p className="text-xs font-bold text-white mb-1">Export Complete Executive Audit</p>
                <p className="text-xs text-slate-400">
                  Includes full reach metrics, campaign ROI, content type performance, and publishing queue history.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* PDF EXPORT */}
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setShowExportModal(false);
                  }}
                  className="p-4 rounded-xl border border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/10 text-white text-left transition group"
                >
                  <span className="text-2xl block mb-2">📄</span>
                  <span className="font-bold text-sm block group-hover:text-indigo-300">Export PDF</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Printable high-resolution format
                  </span>
                </button>

                {/* CSV / EXCEL EXPORT */}
                <button
                  type="button"
                  onClick={() => {
                    const csvContent =
                      "data:text/csv;charset=utf-8," +
                      "Campaign,Platforms,Spent,Budget,ROI,Status\n" +
                      campaigns
                        .map((c) => `"${c.name}","${c.platforms.join(";")}",${c.budget_spent},${c.budget_total},"${c.roi}","${c.status}"`)
                        .join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `SocialPilot_Report_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setShowExportModal(false);
                    setMessage("Excel / CSV report exported successfully!");
                  }}
                  className="p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 text-white text-left transition group"
                >
                  <span className="text-2xl block mb-2">📊</span>
                  <span className="font-bold text-sm block group-hover:text-emerald-300">Export Excel / CSV</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Raw dataset for business analysis
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          CONNECT SOCIAL ACCOUNT MODAL (MODULE 2)
      ========================================================= */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-base">Connect Social Platform</h3>
                <p className="text-xs text-slate-400">Authorize API access & synchronize profiles</p>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Select Social Platform
                </label>
                <select
                  value={connectPlatformName}
                  onChange={(e) => setConnectPlatformName(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-700 rounded-xl px-3 py-2.5 bg-slate-950 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>

              {connectPlatformName.toLowerCase() === "linkedin" ? (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
                  <p className="font-bold mb-1">Direct LinkedIn OAuth 2.0 Integration</p>
                  <p>Clicking connect will redirect to LinkedIn's official authorization gateway.</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Account Handle or Profile Name
                  </label>
                  <input
                    type="text"
                    value={connectAccountHandle}
                    onChange={(e) => setConnectAccountHandle(e.target.value)}
                    placeholder="e.g. @company_brand"
                    className="w-full text-xs border border-slate-700 rounded-xl px-3 py-2.5 bg-slate-950 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={connectLoading}
                onClick={handleConnectAccount}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-sm shadow-indigo-600/30"
              >
                {connectLoading ? "Connecting..." : "Authorize & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}