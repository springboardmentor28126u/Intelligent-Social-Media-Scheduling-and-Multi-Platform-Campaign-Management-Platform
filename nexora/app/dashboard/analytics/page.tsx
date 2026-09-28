"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  Download,
  Calendar,
  Users,
  Eye,
  MousePointer,
  Heart,
  Share2,
  Filter
} from "lucide-react";
import { formatNumber, getPlatformBadgeColor } from "@/lib/utils";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d");

  const overviewMetrics = [
    { label: "Total Reach", value: "148,500", growth: "+18.4%", icon: Eye, color: "text-[#635BFF]", bg: "bg-indigo-50" },
    { label: "Total Engagement", value: "38,420", growth: "+24.1%", icon: Heart, color: "text-rose-500", bg: "bg-rose-50" },
    { label: "Impressions", value: "237,600", growth: "+15.8%", icon: BarChart3, color: "text-[#06B6D4]", bg: "bg-cyan-50" },
    { label: "Link Clicks", value: "12,940", growth: "+31.2%", icon: MousePointer, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Total Followers", value: "47,170", growth: "+12.6%", icon: Users, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Avg Engagement Rate", value: "4.85%", growth: "+0.8%", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  const platformStats = [
    { platform: "Instagram", followers: "8,320", growth: "+15.2%", reach: 42100, reachPercent: "100%", engagement: 14200, color: "bg-pink-500" },
    { platform: "Facebook", followers: "12,540", growth: "+12.0%", reach: 38900, reachPercent: "92%", engagement: 9400, color: "bg-blue-600" },
    { platform: "YouTube", followers: "15,320", growth: "+14.5%", reach: 34800, reachPercent: "82%", engagement: 6800, color: "bg-red-600" },
    { platform: "X (Twitter)", followers: "6,780", growth: "+10.3%", reach: 21400, reachPercent: "51%", engagement: 5300, color: "bg-slate-900" },
    { platform: "LinkedIn", followers: "4,210", growth: "+6.8%", reach: 11300, reachPercent: "27%", engagement: 2720, color: "bg-sky-600" },
  ];

  const topPosts = [
    {
      id: 1,
      content: "5 Proven Tactics to Boost Your Engagement Rate in 2026. Save this carousel for your next strategy session!",
      platforms: ["instagram", "linkedin"],
      publishedAt: "Aug 28, 2026",
      reach: 34500,
      engagement: 466,
      rate: "5.4%",
      mediaUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&auto=format&fit=crop&q=80"
    },
    {
      id: 2,
      content: "Excited to announce IntelliPost 2.0! Schedule across 6 platforms simultaneously with AI captions & analytics.",
      platforms: ["instagram", "facebook", "linkedin", "twitter"],
      publishedAt: "Aug 30, 2026",
      reach: 18400,
      engagement: 244,
      rate: "4.9%",
      mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=80"
    },
    {
      id: 3,
      content: "Behind the scenes: How our marketing team plans 30 days of high-converting social media content in 2 hours.",
      platforms: ["youtube", "instagram"],
      publishedAt: "Aug 24, 2026",
      reach: 15200,
      engagement: 188,
      rate: "4.6%",
      mediaUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80"
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-[#635BFF]" />
            Analytics & Performance
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Real-time cross-channel metrics, audience growth velocity, and top-performing content.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-[#635BFF] focus:outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date (2026)</option>
          </select>

          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#635BFF] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
          >
            <Download className="h-4 w-4" /> Export Report
          </Link>
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {overviewMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs card-hover-effect flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500">{m.label}</span>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${m.bg} ${m.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <p className="text-xl font-extrabold text-slate-900">{m.value}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{m.growth} vs prior</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform Comparison Bars & Engagement Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left: Platform Reach Comparison (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Platform Reach Comparison</h3>
              <p className="text-xs text-slate-500">Distribution of 148.5K organic impressions across networks</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {platformStats.map((p) => (
              <div key={p.platform} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.color}`} />
                    {p.platform}
                  </span>
                  <span className="text-slate-900">{formatNumber(p.reach)} Reach ({formatNumber(p.engagement)} Eng.)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: p.reachPercent }}
                    className={`h-full rounded-full ${p.color} transition-all`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Audience Growth & Follower Trajectory (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Audience Growth Share</h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                +4,280 New Fans
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {platformStats.map((p) => (
                <div key={p.platform} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{p.platform}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{p.followers}</span>
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      {p.growth}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">Data automatically refreshed every 60 minutes.</span>
          </div>
        </div>

      </div>

      {/* Top Performing Content Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Top Performing Posts</h3>
            <p className="text-xs text-slate-500">Highest engaging content published across channels</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3">Post Details</th>
                <th className="pb-3">Networks</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Reach</th>
                <th className="pb-3 text-right">Engagement</th>
                <th className="pb-3 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topPosts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pr-4 max-w-sm">
                    <div className="flex items-center gap-3">
                      {post.mediaUrl && (
                        <img src={post.mediaUrl} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                      )}
                      <span className="font-medium text-slate-800 line-clamp-2">{post.content}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-1">
                      {post.platforms.map((p) => {
                        const style = getPlatformBadgeColor(p);
                        return (
                          <span key={p} className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold border capitalize ${style.bg} ${style.text} ${style.border}`}>
                            {p.slice(0, 2)}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-500 whitespace-nowrap">{post.publishedAt}</td>
                  <td className="py-3.5 text-right font-bold text-slate-900">{formatNumber(post.reach)}</td>
                  <td className="py-3.5 text-right font-bold text-slate-900">{post.engagement}</td>
                  <td className="py-3.5 text-right font-bold text-emerald-600">{post.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
