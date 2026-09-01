import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  Eye,
  Heart,
  MousePointerClick,
  Download,
  Calendar,
} from "lucide-react";

const COLORS = ["#2563eb", "#7c3aed", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"];

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [platform, setPlatform] = useState("all");
  const [data, setData] = useState<any>(null);
  const [_loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.analytics.getOverview(range, platform);
      setData(res);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [range, platform]);

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Analytics & Audience Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track multi-platform engagement trends, impression trajectories, and audience demographics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Range Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            {[
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "1y", label: "Year" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  range === r.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Platform Selector */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-white border border-slate-200/80 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:border-blue-500 transition cursor-pointer shadow-xs font-semibold"
          >
            <option value="all">All Channels</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">X / Twitter</option>
            <option value="youtube">YouTube</option>
            <option value="pinterest">Pinterest</option>
          </select>

          <button
            onClick={() => (window.location.href = "/reports")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200/80 transition cursor-pointer shadow-xs"
          >
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Eye size={22} />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              +{data?.reach_growth_pct || 18.4}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              {data?.total_reach ? `${(data.total_reach / 1000).toFixed(1)}K` : "124.5K"}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Audience Reach</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Unique accounts reached</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Heart size={22} />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              +{data?.engagement_growth_pct || 14.2}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              {data?.total_engagement ? `${(data.total_engagement / 1000).toFixed(1)}K` : "18.4K"}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Interactions</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Likes, comments, and shares</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Users size={22} />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              +{data?.followers_growth_pct || 8.9}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              {data?.total_followers ? `${(data.total_followers / 1000).toFixed(1)}K` : "98.2K"}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Followers Base</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Across all connected channels</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
              <MousePointerClick size={22} />
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {data?.average_engagement_rate || 5.8}% Avg
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              {data?.total_clicks ? `${(data.total_clicks / 1000).toFixed(1)}K` : "4.2K"}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Clicks & Traffic</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Bio link clicks & outbound</p>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Audience Reach & Impressions Trajectory
            </h3>
            <p className="text-xs text-slate-500">Chronological impression volume comparison</p>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeline || []}>
                <defs>
                  <linearGradient id="areaReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "0.75rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} />
                <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "13px" }} />
                <Area type="monotone" name="Reach" dataKey="reach" stroke="#2563eb" strokeWidth={2.5} fill="url(#areaReach)" />
                <Area type="monotone" name="Impressions" dataKey="impressions" stroke="#7c3aed" strokeWidth={2.5} fill="url(#areaImp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Share Pie Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Channel Engagement Mix
            </h3>
            <p className="text-xs text-slate-500">Distribution of audience engagement</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.platforms || []}
                  dataKey="reach"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {(data?.platforms || []).map((_: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "0.5rem" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            {(data?.platforms || []).map((p: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-700 capitalize">{p.platform}: {p.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demographics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Age Groups */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Age Breakdown (%)</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.demographics_age || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "0.5rem" }} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Gender Audience Share</h3>
          <div className="space-y-3 pt-1">
            {(data?.demographics_gender || []).map((g: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{g.label}</span>
                  <span className="text-slate-900 font-bold">{g.value}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${g.value}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Top Locations */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Top Geographic Markets</h3>
          <div className="space-y-2.5">
            {(data?.demographics_location || []).map((loc: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs sm:text-sm p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold">
                <span className="text-slate-800">{loc.label}</span>
                <span className="text-blue-600 font-extrabold">{loc.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
