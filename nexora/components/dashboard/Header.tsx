"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, Plus, Sparkles, Check, ArrowRight } from "lucide-react";
import { getStoredUser, AuthUser } from "@/lib/auth";

export default function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const notifications = [
    { id: 1, title: "Post Published", desc: "Instagram carousel reached 18.4K users", time: "10m ago", read: false },
    { id: 2, title: "Campaign Milestone", desc: "Product Launch 2.0 at 78% target", time: "1h ago", read: false },
    { id: 3, title: "Post Scheduled", desc: "Queued for tomorrow at peak time", time: "3h ago", read: true },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md">
      
      {/* Search Input */}
      <div className="relative w-72 md:w-96">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search posts, campaigns, analytics..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#635BFF] focus:bg-white focus:outline-none transition-all"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 md:gap-4">
        
        {/* Create Post Button */}
        <Link
          href="/dashboard/create-post"
          className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-3.5 py-2 text-xs md:text-sm font-semibold text-white shadow-sm shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Post</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#635BFF] ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-semibold text-sm text-slate-900">Notifications</span>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-[#635BFF] hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl p-2.5 transition-colors ${
                      n.read ? "bg-slate-50/50" : "bg-indigo-50/40 border border-indigo-100/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 rounded-xl p-1 hover:bg-slate-50 transition-colors"
        >
          <img
            src={user?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={user?.name || "User Avatar"}
            className="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-xs"
          />
        </Link>

      </div>
    </header>
  );
}
