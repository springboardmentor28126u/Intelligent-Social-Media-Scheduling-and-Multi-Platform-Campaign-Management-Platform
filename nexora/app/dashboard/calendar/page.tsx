"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Send,
  Sparkles,
  X
} from "lucide-react";
import { getPlatformBadgeColor, getStatusBadgeColor } from "@/lib/utils";

interface CalendarPost {
  id: number;
  day: number;
  time: string;
  content: string;
  platforms: string[];
  status: "Scheduled" | "Published" | "Draft" | "Failed";
  mediaUrl?: string;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState("September 2026");
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);

  const [posts, setPosts] = useState<CalendarPost[]>([
    {
      id: 1,
      day: 1,
      time: "10:30 AM",
      content: "🚀 Excited to announce IntelliPost 2.0! Schedule across 6 platforms simultaneously.",
      platforms: ["instagram", "facebook", "linkedin", "twitter"],
      status: "Published",
      mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: 2,
      day: 2,
      time: "2:30 PM",
      content: "Behind the scenes: How our marketing team plans 30 days of content in under 2 hours.",
      platforms: ["instagram", "facebook", "linkedin", "twitter"],
      status: "Scheduled",
      mediaUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: 3,
      day: 4,
      time: "9:00 AM",
      content: "Why data-backed scheduling outperforms manual posting every single time.",
      platforms: ["linkedin", "twitter"],
      status: "Scheduled",
      mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: 4,
      day: 8,
      time: "5:15 PM",
      content: "Weekly Creator Spotlight: Learn how top digital agencies scale client accounts.",
      platforms: ["youtube", "pinterest", "instagram"],
      status: "Scheduled",
      mediaUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: 5,
      day: 12,
      time: "11:00 AM",
      content: "5 Proven Tactics to Boost Your Engagement Rate in 2026. Save this carousel!",
      platforms: ["instagram", "linkedin"],
      status: "Scheduled",
      mediaUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80"
    },
    {
      id: 6,
      day: 15,
      time: "4:00 PM",
      content: "Product launch announcement teaser for upcoming AI feature release.",
      platforms: ["twitter", "linkedin"],
      status: "Draft",
    }
  ]);

  const daysInMonth = 30; // September has 30 days
  const startingDayOffset = 2; // Starts on Tuesday for Sep 2026

  const filteredPosts = posts.filter((p) => {
    if (selectedPlatform !== "all" && !p.platforms.includes(selectedPlatform)) return false;
    if (selectedStatus !== "all" && p.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    return true;
  });

  const handlePublishNow = (post: CalendarPost) => {
    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id ? { ...item, status: "Published" } : item
      )
    );
    setSelectedPost(null);
  };

  const handleDeletePost = (id: number) => {
    setPosts((prev) => prev.filter((item) => item.id !== id));
    setSelectedPost(null);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-[#635BFF]" />
            Content Calendar
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Organize, preview, and reschedule all scheduled social media posts across networks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month / Week / Day Switch */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                  viewMode === mode
                    ? "bg-white text-[#635BFF] shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* New Post Button */}
          <Link
            href="/dashboard/create-post"
            className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Post</span>
          </Link>
        </div>
      </div>

      {/* 2. Filters & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Month Picker */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {}}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-base font-extrabold text-slate-900 min-w-[140px] text-center">
            {currentMonth}
          </span>
          <button
            onClick={() => {}}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#635BFF] focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">X (Twitter)</option>
            <option value="youtube">YouTube</option>
            <option value="pinterest">Pinterest</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#635BFF] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="failed">Failed</option>
          </select>
        </div>

      </div>

      {/* 3. Calendar Month Grid */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold text-slate-600 py-3">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[600px]">
          
          {/* Empty offset days */}
          {Array.from({ length: startingDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/30 p-2 text-slate-300 text-xs min-h-[110px]" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = dayNum === 1; // Sep 1
            const dayPosts = filteredPosts.filter((p) => p.day === dayNum);

            return (
              <div
                key={dayNum}
                className={`p-2 min-h-[110px] flex flex-col justify-between transition-colors hover:bg-slate-50/60 group relative ${
                  isToday ? "bg-indigo-50/20" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday
                        ? "bg-[#635BFF] text-white shadow-xs"
                        : "text-slate-700 group-hover:text-slate-900"
                    }`}
                  >
                    {dayNum}
                  </span>

                  <Link
                    href={`/dashboard/create-post?day=${dayNum}`}
                    className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-[#635BFF] hover:text-white transition-all text-xs"
                    title="Schedule post on this day"
                  >
                    +
                  </Link>
                </div>

                {/* Day posts list */}
                <div className="mt-1.5 space-y-1.5 flex-1">
                  {dayPosts.map((p) => {
                    const statusBadge = getStatusBadgeColor(p.status);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPost(p)}
                        className={`cursor-pointer rounded-lg p-1.5 text-[10px] border shadow-2xs transition-all hover:scale-[1.02] ${
                          p.status === "Published"
                            ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                            : p.status === "Scheduled"
                            ? "bg-indigo-50/90 border-indigo-200 text-indigo-950"
                            : "bg-slate-100 border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 opacity-70" />
                            {p.time}
                          </span>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                        </div>
                        <p className="truncate font-medium mt-0.5">{p.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 4. Post Details & Inspection Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusBadgeColor(selectedPost.status).bg}`}>
                  {selectedPost.status}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  September {selectedPost.day}, 2026 at {selectedPost.time}
                </span>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Post Content */}
            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {selectedPost.content}
            </div>

            {/* Media thumbnail if exists */}
            {selectedPost.mediaUrl && (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200">
                <img src={selectedPost.mediaUrl} alt="Attached Media" className="h-full w-full object-cover" />
              </div>
            )}

            {/* Target Networks */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Target Networks</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedPost.platforms.map((p) => {
                  const style = getPlatformBadgeColor(p);
                  return (
                    <span
                      key={p}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold border capitalize ${style.bg} ${style.text} ${style.border}`}
                    >
                      {p}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleDeletePost(selectedPost.id)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Delete Post
              </button>

              <div className="flex items-center gap-2">
                {selectedPost.status !== "Published" && (
                  <button
                    onClick={() => handlePublishNow(selectedPost)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    <Send className="h-3.5 w-3.5" /> Publish Now
                  </button>
                )}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
