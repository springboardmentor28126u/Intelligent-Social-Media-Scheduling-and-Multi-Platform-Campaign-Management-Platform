"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

const PLATFORM_INSIGHTS = [
  { platform: "LinkedIn", handle: "SocialPilot Inc.", followers: "74.3K", reach: "384.2K", engagement: "5.8%", color: "#0A66C2", icon: "in", growth: "+14.2%" },
  { platform: "Instagram", handle: "@socialpilot_app", followers: "112.5K", reach: "512.8K", engagement: "6.2%", color: "#E1306C", icon: "◎", growth: "+19.8%" },
  { platform: "X (Twitter)", handle: "@socialpilot_io", followers: "39.8K", reach: "248.6K", engagement: "3.4%", color: "#1DA1F2", icon: "𝕏", growth: "+8.4%" },
  { platform: "Facebook", handle: "@SocialPilotOfficial", followers: "48.2K", reach: "192.4K", engagement: "3.9%", color: "#1877F2", icon: "f", growth: "+6.1%" },
  { platform: "YouTube", handle: "SocialPilot Studios", followers: "28.4K", reach: "94.2K", engagement: "7.1%", color: "#FF0000", icon: "▶", growth: "+24.5%" },
  { platform: "Pinterest", handle: "SocialPilot Visuals", followers: "15.6K", reach: "48.5K", engagement: "4.2%", color: "#E60023", icon: "P", growth: "+11.3%" },
];

export default function InsightsPage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");

  /* Auth Guard */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* HEADER BREADCRUMB */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Analytics Engine</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Performance Insights & Content Analytics
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(["7d", "30d", "90d"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition ${
                    timeframe === tf
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf === "7d" ? "7 Days" : tf === "30d" ? "30 Days" : "90 Days"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
            >
              Campaigns →
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* KPI OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Cross-Network Reach", value: "842.6K", change: "+18.2%", icon: "◎" },
            { label: "Video & Feed Impressions", value: "1.45M", change: "+24.6%", icon: "👁️" },
            { label: "Omni-Channel Engagements", value: "68.4K", change: "+12.3%", icon: "↗" },
            { label: "Total Link Outbound Clicks", value: "19.8K", change: "+9.5%", icon: "🔗" },
          ].map((kpi, idx) => (
            <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
                <span>{kpi.label}</span>
                <span className="text-base">{kpi.icon}</span>
              </div>
              <p className="text-2xl font-black text-white">{kpi.value}</p>
              <span className="text-xs font-bold text-emerald-400 mt-1 block">
                {kpi.change} vs prior period
              </span>
            </div>
          ))}
        </div>

        {/* PERFORMANCE BREAKDOWN BY PLATFORM */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Network-by-Network Performance</h2>
              <p className="text-xs text-slate-400 mt-0.5">Reach, engagement rate, and audience growth breakdown</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              6 Active Networks
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_INSIGHTS.map((net) => (
              <div
                key={net.platform}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-950 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: net.color }}
                    >
                      {net.icon}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-white">{net.platform}</h3>
                      <p className="text-[10px] text-slate-400">{net.handle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                    {net.growth}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Followers</span>
                    <strong className="text-slate-200">{net.followers}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Reach</span>
                    <strong className="text-slate-200">{net.reach}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Eng. Rate</span>
                    <strong className="text-indigo-400">{net.engagement}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BEST POSTING TIMES & ENGAGEMENT HEATMAP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Peak Audience Activity Times</h2>
            <p className="text-xs text-slate-400 mb-4">When your community is most receptive to scheduled drops</p>

            <div className="space-y-3">
              {[
                { network: "LinkedIn", window: "Tuesday & Thursday (10:00 AM – 1:00 PM)", score: "98% peak" },
                { network: "Instagram", window: "Wednesday & Friday (2:00 PM – 5:30 PM)", score: "94% peak" },
                { network: "X (Twitter)", window: "Monday through Thursday (12:00 PM – 3:00 PM)", score: "91% peak" },
                { network: "YouTube", window: "Friday & Saturday (4:00 PM – 7:00 PM)", score: "89% peak" },
              ].map((slot) => (
                <div key={slot.network} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{slot.network}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{slot.window}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-800/60">
                    {slot.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white mb-1">Content Type Engagement Hierarchy</h2>
              <p className="text-xs text-slate-400 mb-4">Average conversion & engagement multiplier by post format</p>

              <div className="space-y-2.5 text-xs">
                {[
                  { format: "Multi-slide Carousels", rate: "6.2%", mult: "1.4x benchmark", color: "bg-indigo-500" },
                  { format: "Short-form Vertical Reels", rate: "5.8%", mult: "1.3x benchmark", color: "bg-pink-500" },
                  { format: "HD Video Clips", rate: "4.9%", mult: "1.1x benchmark", color: "bg-purple-500" },
                  { format: "Static Infographics & Images", rate: "3.9%", mult: "Baseline", color: "bg-blue-500" },
                  { format: "Text-only Updates & Polls", rate: "2.8%", mult: "Conversational", color: "bg-slate-500" },
                ].map((f) => (
                  <div key={f.format} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${f.color}`} />
                      <span className="font-bold text-slate-200">{f.format}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-extrabold">{f.rate}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({f.mult})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/create-post")}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                Create High-Performing Post →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}