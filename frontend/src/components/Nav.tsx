"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { INITIAL_NOTIFICATIONS } from "@/lib/mockData";
import { NotificationItem } from "@/lib/types";

type NavProps = {
  rightSlot?: React.ReactNode;
};

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: "⌂" },
  { name: "Create", href: "/create-post", icon: "✦" },
  { name: "Calendar", href: "/calendar", icon: "▣" },
  { name: "Content", href: "/content", icon: "📑" },
  { name: "Publishing", href: "/publishing", icon: "⚡" },
  { name: "Campaigns", href: "/campaigns", icon: "◈" },
  { name: "Analytics", href: "/analytics", icon: "◔" },
  { name: "Accounts", href: "/social-accounts", icon: "◎" },
  { name: "Reports", href: "/reports", icon: "📊" },
  { name: "Settings", href: "/settings", icon: "⚙" },
];

export default function Nav({ rightSlot }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [userName, setUserName] = useState("Marketing Director");
  const [userRole, setUserRole] = useState("Administrator");

  /* Notifications state */
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  /* Profile Dropdown state */
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  /* Mobile menu state */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    const storedRole = localStorage.getItem("user_role");
    if (storedName) setUserName(storedName);
    if (storedRole) setUserRole(storedRole);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#070b14]/95 backdrop-blur-md border-b border-slate-800/80 shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* BRAND LOGO */}
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Toggle Navigation Menu"
              >
                <span className="text-lg">☰</span>
              </button>

              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-[#fbbf24] text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4 fill-slate-950" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-extrabold text-white tracking-tight block">
                    SocialPilot
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 block -mt-0.5">
                    Command Center
                  </span>
                </div>
              </Link>
            </div>

            {/* DESKTOP NAVIGATION LINKS */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? "bg-indigo-600/25 text-indigo-300 ring-1 ring-indigo-500/50 shadow-xs font-bold"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-850"
                    }`}
                  >
                    <span className="text-xs opacity-80">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* RIGHT ACTION CONTROLS */}
            <div className="flex items-center gap-2.5 shrink-0">
              {rightSlot}

              {!rightSlot && (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/create-post")}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
                  >
                    <span>＋</span>
                    <span>Create</span>
                  </button>

                  {/* NOTIFICATIONS TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition relative"
                    title="Notification Center"
                  >
                    <span className="text-xs">🔔</span>
                    {unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center absolute -top-1 -right-1">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* USER AVATAR & DROPDOWN */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-2 pl-2 border-l border-slate-800 text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden xl:block text-[11px] leading-tight max-w-[100px]">
                        <p className="font-bold text-slate-200 truncate">{userName}</p>
                        <span className="text-[9px] font-semibold text-indigo-400 block truncate">{userRole}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">⌄</span>
                    </button>

                    {/* DROPDOWN MENU */}
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1 z-50 text-xs">
                        <div className="p-2 border-b border-slate-800 mb-1">
                          <p className="font-bold text-white truncate">{userName}</p>
                          <span className="text-[10px] text-indigo-400 font-semibold">{userRole}</span>
                        </div>
                        <Link
                          href="/account"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <span>👤</span>
                          <span>My Profile</span>
                        </Link>
                        <Link
                          href="/preferences"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <span>⚙</span>
                          <span>Preferences</span>
                        </Link>
                        <div className="pt-1 border-t border-slate-800 mt-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/60 font-semibold"
                          >
                            <span>🚪</span>
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE SLIDE-DOWN SUB-NAV */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                    active
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* NOTIFICATIONS SLIDE-OVER DRAWER */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔔</span>
                  <h3 className="font-bold text-white text-sm">Notification Center</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] text-slate-400 font-semibold">Latest Alerts</span>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                >
                  Mark all as read
                </button>
              </div>

              <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border transition ${
                      n.read
                        ? "bg-slate-950/60 border-slate-800 text-slate-300"
                        : "bg-slate-850 border-indigo-500/50 ring-1 ring-indigo-500/20 text-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold">{n.title}</h4>
                      <span className="text-[9px] text-slate-500 whitespace-nowrap">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}