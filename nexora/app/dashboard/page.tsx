"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  PenSquare,
  Sparkles,
  TrendingUp,
  BarChart3,
  Share2,
  Users,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight,
  Plus,
  Zap,
  MoreHorizontal
} from "lucide-react";
import { getStoredUser, AuthUser } from "@/lib/auth";
import { formatNumber, getPlatformBadgeColor, getStatusBadgeColor } from "@/lib/utils";

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [timeOfDay, setTimeOfDay] = useState("Good morning");

  useEffect(() => {
    setUser(getStoredUser());
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setTimeOfDay("Good afternoon");
    else if (hour >= 17) setTimeOfDay("Good evening");
  }, []);

  const stats = [
    { label: "Posts Scheduled", value: "24", change: "+6 this week", icon: Calendar, color: "text-[#635BFF]", bg: "bg-indigo-50" },
    { label: "Published", value: "12", change: "100% on time", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Campaigns", value: "8", change: "78% avg progress", icon: TrendingUp, color: "text-[#06B6D4]", bg: "bg-cyan-50" },
    { label: "Audience Growth", value: "+18.4%", change: "47,170 total fans", icon: ArrowUpRight, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const platforms = [
    { name: "Facebook", handle: "@IntelliPostHQ", followers: "12,540", growth: "+12%", color: "border-blue-200 bg-blue-50/40", icon: "f", textColor: "text-blue-600" },
    { name: "Instagram", handle: "@intellipost_app", followers: "8,320", growth: "+15%", color: "border-pink-200 bg-pink-50/40", icon: "📸", textColor: "text-pink-600" },
    { name: "LinkedIn", handle: "intellipost-inc", followers: "4,210", growth: "+6%", color: "border-sky-200 bg-sky-50/40", icon: "in", textColor: "text-sky-700" },
    { name: "X (Twitter)", handle: "@IntelliPost", followers: "6,780", growth: "+10%", color: "border-slate-300 bg-slate-100/50", icon: "𝕏", textColor: "text-slate-900" },
    { name: "YouTube", handle: "@IntelliPostStudio", followers: "15,320", growth: "+14%", color: "border-red-200 bg-red-50/40", icon: "▶", textColor: "text-red-600" },
    { name: "Pinterest", handle: "@IntelliPostPins", followers: "3,450", growth: "+8%", color: "border-rose-200 bg-rose-50/40", icon: "P", textColor: "text-rose-600" },
  ];

  const upcomingPosts = [
    {
      id: 1,
      content: "Behind the scenes: How our marketing team plans 30 days of social content in 2 hours.",
      platforms: ["instagram", "facebook", "linkedin", "twitter"],
      time: "Today at 2:30 PM",
      type: "AI Adapted",
      mediaUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: 2,
      content: "Why data-backed scheduling outperforms manual posting every single time.",
      platforms: ["linkedin", "twitter"],
      time: "Tomorrow at 9:00 AM",
      type: "B2B Insights",
      mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: 3,
      content: "Weekly Creator Spotlight: Learn how top digital agencies scale without burnout.",
      platforms: ["youtube", "pinterest", "instagram"],
      time: "Thursday at 5:15 PM",
      type: "Video & Pins",
      mediaUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80"
    }
  ];

  const recentPublished = [
    {
      id: 101,
      content: "Excited to announce IntelliPost 2.0! Schedule across 6 platforms simultaneously with AI...",
      platforms: ["instagram", "facebook", "linkedin", "twitter"],
      publishedAt: "Yesterday at 10:30 AM",
      reach: 18400,
      engagement: 244,
      rate: "4.9%",
    },
    {
      id: 102,
      content: "5 Proven Tactics to Boost Your Engagement Rate in 2026. Bookmark this carousel!",
      platforms: ["instagram", "linkedin"],
      publishedAt: "3 days ago",
      reach: 34500,
      engagement: 466,
      rate: "5.4%",
    }
  ];

  // 7-day visual trend bars
  const trendData = [
    { day: "Mon", reach: 12000, height: "45%" },
    { day: "Tue", reach: 14500, height: "55%" },
    { day: "Wed", reach: 13800, height: "50%" },
    { day: "Thu", reach: 18900, height: "72%" },
    { day: "Fri", reach: 22400, height: "85%" },
    { day: "Sat", reach: 26100, height: "92%" },
    { day: "Sun", reach: 29800, height: "100%" },
  ];

  return (
    <div className="space-y-8">
      
      {/* 1. Header Greeting & Quick CTA Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            {timeOfDay}, {user?.name || "Chandu"} 👋
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Here's what's happening with your social media today. All 6 channels are synchronized.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/create-post"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#7C3AED] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:from-[#5046E5] hover:to-[#6D28D9] transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create Post with AI</span>
          </Link>
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Calendar className="h-4 w-4 text-slate-500" />
            <span>View Calendar</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs card-hover-effect flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-500">{stat.label}</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{stat.value}</p>
                <p className="text-[11px] font-medium text-emerald-600 mt-0.5">{stat.change}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Platform Overview Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform Performance Overview</h2>
            <p className="text-xs text-slate-500">Live audience metrics across connected networks</p>
          </div>
          <Link href="/dashboard/social-accounts" className="text-xs font-bold text-[#635BFF] hover:underline flex items-center gap-1">
            Manage Accounts <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {platforms.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-4 transition-all hover:shadow-sm ${p.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{p.icon}</span>
                <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {p.growth}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-3">{p.name}</p>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">{p.followers}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.handle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Center Section: Engagement Trend + Upcoming Posts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left 2 Cols: Engagement Trends Visual Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">7-Day Reach & Engagement Trajectory</h3>
              <p className="text-xs text-slate-500">Total organic impressions spiked +24.1% over last week</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#635BFF]" /> Reach
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 ml-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#06B6D4]" /> Engagement
              </span>
            </div>
          </div>

          {/* Chart Visual Bars */}
          <div className="my-8 flex h-48 items-end justify-between gap-3 sm:gap-6 px-2">
            {trendData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="relative w-full flex items-end justify-center h-full">
                  <div
                    style={{ height: d.height }}
                    className="w-full max-w-[38px] rounded-t-xl bg-gradient-to-t from-[#635BFF] to-[#7C3AED] transition-all group-hover:from-[#5046E5] group-hover:to-[#6D28D9] group-hover:scale-105 shadow-xs relative"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {formatNumber(d.reach)}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span>Peak engagement window: <strong className="text-slate-800">Tuesday & Thursday (10:30 AM)</strong></span>
            <Link href="/dashboard/analytics" className="font-bold text-[#635BFF] hover:underline">
              Detailed Analytics →
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Posts Queue */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upcoming Queue</h3>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-[#635BFF]">
                3 Scheduled
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {upcomingPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-indigo-700">
                      <Clock className="h-3 w-3 text-[#635BFF]" /> {post.time}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{post.type}</span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-800 font-medium line-clamp-2">
                    {post.content}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/50">
                    <div className="flex items-center gap-1">
                      {post.platforms.map((p) => {
                        const style = getPlatformBadgeColor(p);
                        return (
                          <span
                            key={p}
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase border ${style.bg} ${style.text} ${style.border}`}
                          >
                            {p.slice(0, 2)}
                          </span>
                        );
                      })}
                    </div>

                    <Link
                      href="/dashboard/calendar"
                      className="text-[11px] font-bold text-[#635BFF] hover:underline"
                    >
                      Inspect →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/dashboard/create-post"
            className="mt-4 block w-full rounded-xl border border-dashed border-[#635BFF]/40 bg-[#635BFF]/5 py-2.5 text-center text-xs font-bold text-[#635BFF] hover:bg-[#635BFF]/10 transition-colors"
          >
            + Schedule Another Post
          </Link>
        </div>

      </div>

      {/* 5. Bottom Section: Top Performing Content & Recent Published */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Live Posts</h3>
            <p className="text-xs text-slate-500">Performance stats updated automatically from social APIs</p>
          </div>
          <Link href="/dashboard/analytics" className="text-xs font-bold text-[#635BFF] hover:underline">
            View All Content
          </Link>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {recentPublished.map((p) => (
            <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">{p.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Published: {p.publishedAt}</span>
                    <span>•</span>
                    <span className="capitalize">{p.platforms.join(", ")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs shrink-0 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-slate-400 text-[10px]">Reach</span>
                  <p className="font-bold text-slate-900">{formatNumber(p.reach)}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px]">Engagement</span>
                  <p className="font-bold text-slate-900">{p.engagement}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px]">Rate</span>
                  <p className="font-bold text-emerald-600">{p.rate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
