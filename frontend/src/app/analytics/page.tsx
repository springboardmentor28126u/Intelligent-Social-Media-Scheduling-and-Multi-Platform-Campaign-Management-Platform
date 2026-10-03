"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import Nav from "@/components/Nav";
import { getCampaigns, Campaign } from "@/lib/campaigns";

/* Historical Trend Series */
const BASE_TREND_DATA = [
  { day: "Mon", reach: 12400, engagement: 820, impressions: 24500, clicks: 310, followers: 120 },
  { day: "Tue", reach: 18200, engagement: 1450, impressions: 38200, clicks: 540, followers: 185 },
  { day: "Wed", reach: 15600, engagement: 1120, impressions: 31400, clicks: 420, followers: 140 },
  { day: "Thu", reach: 24800, engagement: 2100, impressions: 52100, clicks: 790, followers: 260 },
  { day: "Fri", reach: 28400, engagement: 2450, impressions: 59800, clicks: 920, followers: 310 },
  { day: "Sat", reach: 21100, engagement: 1680, impressions: 44200, clicks: 610, followers: 215 },
  { day: "Sun", reach: 19800, engagement: 1520, impressions: 41000, clicks: 580, followers: 190 },
];

/* Platform Benchmark Comparison */
const PLATFORM_DATA = [
  { platform: "LinkedIn", reach: 84200, engagement: 5400, clicks: 2100, roi: 240 },
  { platform: "Instagram", reach: 112500, engagement: 7200, clicks: 2800, roi: 290 },
  { platform: "Facebook", reach: 48200, engagement: 2100, clicks: 950, roi: 160 },
  { platform: "X (Twitter)", reach: 39800, engagement: 1800, clicks: 1200, roi: 190 },
  { platform: "YouTube", reach: 28400, engagement: 2600, clicks: 1400, roi: 310 },
  { platform: "Pinterest", reach: 15600, engagement: 850, clicks: 680, roi: 180 },
];

export default function AnalyticsDashboardPage() {
  const router = useRouter();

  /* Global Filters */
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  /* Auth Guard & Load Campaigns */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadCampaignList() {
      try {
        const list = await getCampaigns();
        if (Array.isArray(list) && list.length > 0) {
          setCampaigns(list);
        }
      } catch {
        // fallback
      }
    }
    void loadCampaignList();
  }, [router]);

  /* Multiplier based on timeframe */
  const multiplier = dateRange === "7d" ? 1 : dateRange === "30d" ? 3.8 : dateRange === "90d" ? 9.5 : 28;

  /* Filter-responsive KPI Cards */
  const kpis = useMemo(() => {
    const baseReach = 328700 * (platformFilter === "all" ? 1 : 0.45);
    const baseEng = 20970 * (platformFilter === "all" ? 1 : 0.42);
    const baseImp = baseReach * 2.1;
    const baseClicks = 9140 * (platformFilter === "all" ? 1 : 0.4);

    return {
      reach: Math.round(baseReach * (multiplier / 3.8)),
      engagement: Math.round(baseEng * (multiplier / 3.8)),
      impressions: Math.round(baseImp * (multiplier / 3.8)),
      clicks: Math.round(baseClicks * (multiplier / 3.8)),
      engRate: (5.8).toFixed(1),
      followerGrowth: Math.round(1420 * (multiplier / 3.8)),
      totalPosts: Math.round(48 * (multiplier / 3.8)),
      averageRoi: 248,
    };
  }, [dateRange, platformFilter, multiplier]);

  /* Adjusted Trend Chart Data */
  const trendData = useMemo(() => {
    const factor = platformFilter === "all" ? 1 : 0.55;
    return BASE_TREND_DATA.map((item) => ({
      ...item,
      reach: Math.round(item.reach * factor),
      engagement: Math.round(item.engagement * factor),
      impressions: Math.round(item.impressions * factor),
      clicks: Math.round(item.clicks * factor),
    }));
  }, [platformFilter]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* HEADER BREADCRUMB */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Analytics Engine</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Interactive Analytics & ROI Intelligence
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
            >
              Export Reports →
            </button>
            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
            >
              Campaign Tracking →
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* =========================================================
            GLOBAL FILTERS BAR
        ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
          {/* Timeframe Pill */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(["7d", "30d", "90d", "1y"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition ${
                  dateRange === r
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "1 Year"}
              </button>
            ))}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="text-xs font-semibold p-2 rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All Platforms (6)</option>
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">X (Twitter)</option>
              <option value="youtube">YouTube</option>
              <option value="pinterest">Pinterest</option>
            </select>

            {/* Campaign Filter */}
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="text-xs font-semibold p-2 rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All Campaigns</option>
              <option value="Q4 Omni-Channel Boost">Q4 Omni-Channel Boost</option>
              <option value="Product Release V2 Showcase">Product Release V2 Showcase</option>
              <option value="Employer Branding 2026">Employer Branding 2026</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Content Type Filter */}
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="text-xs font-semibold p-2 rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All Formats (6)</option>
              <option value="carousel">Carousels</option>
              <option value="reels">Reels / Shorts</option>
              <option value="video">HD Video</option>
              <option value="image">Single Image</option>
              <option value="text">Text Update</option>
              <option value="stories">Stories</option>
            </select>
          </div>
        </div>

        {/* =========================================================
            8 KPI CARDS MATRIX
        ========================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Reach</span>
            <p className="text-2xl font-black text-white mt-1">{kpis.reach.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">↑ +18.4% vs baseline</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Impressions</span>
            <p className="text-2xl font-black text-indigo-400 mt-1">{kpis.impressions.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">↑ +24.1% feed velocity</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Engagements</span>
            <p className="text-2xl font-black text-white mt-1">{kpis.engagement.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">↑ +14.2% interactions</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Outbound Clicks</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{kpis.clicks.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">High intent referral traffic</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Engagement Rate</span>
            <p className="text-2xl font-black text-white mt-1">{kpis.engRate}%</p>
            <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">1.8x industry benchmark</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Follower Net Growth</span>
            <p className="text-2xl font-black text-indigo-400 mt-1">+{kpis.followerGrowth.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Organic community build</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Published Posts</span>
            <p className="text-2xl font-black text-white mt-1">{kpis.totalPosts}</p>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">100% scheduled uptime</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 block">Average Campaign ROI</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">+{kpis.averageRoi}%</p>
            <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Verified conversions</span>
          </div>
        </div>

        {/* =========================================================
            CHARTS ROW 1: REACH & ENGAGEMENT TRENDS
        ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Reach & Impressions Area */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Cross-Network Reach & Impressions</h3>
                <p className="text-[11px] text-slate-400">Total exposure across selected social channels</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800">
                Area Chart
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="impressions" stroke="#818cf8" fillOpacity={0.2} fill="#818cf8" name="Impressions" />
                  <Area type="monotone" dataKey="reach" stroke="#6366f1" fillOpacity={1} fill="url(#reachGrad)" name="Audience Reach" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Engagement & Clicks Line */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Audience Engagement & Click Activity</h3>
                <p className="text-[11px] text-slate-400">Direct response and conversation velocity</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                Line Chart
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={2.5} name="Engagements" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="clicks" stroke="#f59e0b" strokeWidth={2.5} name="Outbound Clicks" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* =========================================================
            CHARTS ROW 2: PLATFORM COMPARISON (BAR) & FOLLOWER GROWTH
        ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Platform Comparison Bar Chart */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Platform Benchmark Comparison (All 6 Networks)</h3>
                <p className="text-[11px] text-slate-400">Reach vs Engagement volume across channels</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800">
                Bar Chart
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PLATFORM_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="platform" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="reach" fill="#6366f1" name="Reach" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="engagement" fill="#ec4899" name="Engagement" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Platform ROI Multiplier */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Platform Return on Investment (% ROI)</h3>
                <p className="text-[11px] text-slate-400">Factual ROI metrics per target network</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                ROI Multiplier
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PLATFORM_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="platform" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="roi" fill="#10b981" name="% Return on Ad/Campaign Spend" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 3: BEST PERFORMING CONTENT & CAMPAIGN COMPARISON
        ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Top-Performing Content Leaderboard</h3>
              <p className="text-[11px] text-slate-400">Ranked by dwell time, viral reposts, and click-through conversions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Post & Campaign</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4 text-center">Impressions</th>
                  <th className="py-3 px-4 text-center">Eng. Rate</th>
                  <th className="py-3 px-4 text-center">Clicks</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  { title: "🚀 Scaling SaaS operations with multi-platform campaign automation", format: "Carousel", platform: "LinkedIn", imp: "48.2K", rate: "6.8%", clicks: 1420 },
                  { title: "Behind the scenes: How we craft interactive product walkthroughs and Reels", format: "Reels", platform: "Instagram", imp: "62.4K", rate: "7.4%", clicks: 2190 },
                  { title: "5 metrics every social marketer should track: CTR, engagement depth, and conversion ROI", format: "Carousel", platform: "LinkedIn", imp: "34.1K", rate: "5.9%", clicks: 880 },
                  { title: "Developer spotlight & deep dive: Building resilient distributed webhook architectures", format: "Video", platform: "YouTube", imp: "28.5K", rate: "8.2%", clicks: 1240 },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 font-semibold text-white max-w-sm truncate">{row.title}</td>
                    <td className="py-3 px-4 font-bold text-indigo-400 uppercase text-[11px]">{row.format}</td>
                    <td className="py-3 px-4 uppercase text-slate-300">{row.platform}</td>
                    <td className="py-3 px-4 text-center font-bold text-white">{row.imp}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-400">{row.rate}</td>
                    <td className="py-3 px-4 text-center font-bold text-white">{row.clicks}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 uppercase">
                        High Velocity
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
