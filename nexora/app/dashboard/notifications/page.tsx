"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  CheckCheck,
  ArrowRight,
  Sparkles,
  Share2
} from "lucide-react";

interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  category: "Publishing" | "Campaigns" | "Approvals" | "Alerts" | "System";
  type: "success" | "warning" | "info";
  time: string;
  read: boolean;
  actionUrl?: string;
}

export default function NotificationsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      title: "Instagram Post Published Successfully 🎉",
      desc: "Your carousel 'Excited to announce IntelliPost 2.0' was published and has reached 18.4K users.",
      category: "Publishing",
      type: "success",
      time: "10 minutes ago",
      read: false,
      actionUrl: "/dashboard/analytics",
    },
    {
      id: 2,
      title: "Campaign Milestone Reached 🚀",
      desc: "Campaign 'Product Launch 2.0' reached 78% of its reach target (125,000 / 150,000).",
      category: "Campaigns",
      type: "info",
      time: "1 hour ago",
      read: false,
      actionUrl: "/dashboard/campaigns",
    },
    {
      id: 3,
      title: "Scheduled Post Queued ⏰",
      desc: "Post 'Behind the scenes...' has been queued for publishing today at 2:30 PM.",
      category: "Publishing",
      type: "info",
      time: "3 hours ago",
      read: true,
      actionUrl: "/dashboard/calendar",
    },
    {
      id: 4,
      title: "Team Member Invitation Accepted 👋",
      desc: "Aarav Sharma has joined the workspace with role: Content Creator.",
      category: "System",
      type: "info",
      time: "Yesterday",
      read: true,
      actionUrl: "/dashboard/team",
    },
    {
      id: 5,
      title: "Weekly Analytics Summary Ready 📊",
      desc: "Your weekly audience growth report is compiled and ready for review or export.",
      category: "Alerts",
      type: "success",
      time: "2 days ago",
      read: true,
      actionUrl: "/dashboard/reports",
    }
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filtered = notifications.filter((n) => {
    if (activeCategory !== "all" && n.category.toLowerCase() !== activeCategory.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-[#635BFF]" />
            Notifications Center
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Real-time updates on scheduled posts, campaign achievements, and system alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <CheckCheck className="h-4 w-4 text-emerald-600" />
            <span>Mark All as Read</span>
          </button>
          
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", "Publishing", "Campaigns", "Approvals", "Alerts", "System"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-colors ${
              activeCategory === cat.toLowerCase() || (cat === "all" && activeCategory === "all")
                ? "bg-[#635BFF] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Bell className="mx-auto h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-semibold">No notifications in this category.</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => toggleRead(n.id)}
              className={`py-4 flex items-start justify-between gap-4 transition-colors cursor-pointer rounded-2xl p-3 -mx-3 ${
                !n.read ? "bg-indigo-50/30" : "hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 ${
                    n.type === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : n.type === "warning"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-indigo-50 text-[#635BFF]"
                  }`}
                >
                  {n.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : n.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Info className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xs sm:text-sm font-bold ${!n.read ? "text-slate-900" : "text-slate-700"}`}>
                      {n.title}
                    </h3>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-[#635BFF]" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.desc}</p>
                  
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                    <span>{n.time}</span>
                    <span>•</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.2 font-bold text-slate-600 uppercase">
                      {n.category}
                    </span>
                  </div>
                </div>
              </div>

              {n.actionUrl && (
                <Link
                  href={n.actionUrl}
                  className="shrink-0 text-xs font-bold text-[#635BFF] hover:underline flex items-center gap-1 self-center"
                >
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
