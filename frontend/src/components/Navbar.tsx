import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import UserAvatar from "./UserAvatar";
import {
  Search,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  ChevronDown,
  LogOut,
  Shield,
  Briefcase,
  Megaphone,
  PenTool,
} from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, showToast } = useAuth();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data);
      const countRes = await api.notifications.getUnreadCount();
      setUnreadCount(countRes.unread_count || 0);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markRead({ mark_all: true });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast("All read", "Notifications marked as read", "info");
    } catch {
      // Ignore
    }
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "administrator":
        return {
          label: "Administrator",
          icon: <Shield size={14} className="text-purple-600" />,
          style: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "business_user":
        return {
          label: "Business User",
          icon: <Briefcase size={14} className="text-emerald-600" />,
          style: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "marketing_team":
        return {
          label: "Marketing Lead",
          icon: <Megaphone size={14} className="text-blue-600" />,
          style: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "content_creator":
      default:
        return {
          label: "Content Creator",
          icon: <PenTool size={14} className="text-pink-600" />,
          style: "bg-pink-50 text-pink-700 border-pink-200",
        };
    }
  };

  const badge = getRoleBadge(user?.role || "content_creator");

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-6 lg:px-8 z-20 shrink-0 select-none shadow-xs">
      {/* Search Input */}
      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition px-3.5 py-2 rounded-xl w-72 lg:w-96 shadow-xs">
        <Search size={17} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search posts, campaigns, channels..."
          className="bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none w-full"
        />
        <span className="text-[10px] uppercase font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-xs shrink-0">
          ⌘K
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3.5">
        {/* Authenticated Role Indicator Badge */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border ${badge.style}`}>
          {badge.icon}
          <span className="text-xs font-bold">{badge.label}</span>
        </div>

        {/* Notifications Bell & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer shadow-xs"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No notifications yet. You're all caught up!
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={async () => {
                        try {
                          if (!notif.is_read) {
                            await api.notifications.markRead({ notification_ids: [notif.id] });
                            setNotifications((prev) =>
                              prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
                            );
                            setUnreadCount((prev) => Math.max(0, prev - 1));
                          }
                        } catch (e) {
                          console.error(e);
                        }
                        if (notif.link) navigate(notif.link);
                        setShowNotifications(false);
                      }}
                      className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 items-start ${
                        !notif.is_read ? "bg-amber-50/50 border-l-3 border-amber-500" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === "publish_success" && <CheckCircle2 size={16} className="text-emerald-600" />}
                        {notif.type === "publish_failed" && <AlertCircle size={16} className="text-rose-600" />}
                        {notif.type === "reminder" && <Clock size={16} className="text-amber-600" />}
                        {notif.type === "campaign_alert" && <Clock size={16} className="text-amber-600" />}
                        {notif.type === "team_invite" && <Users size={16} className="text-indigo-600" />}
                        {notif.type === "system_alert" && <Shield size={16} className="text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {notif.message}
                        </p>
                        {notif.metadata_json?.platform && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
                              {notif.metadata_json.platform}
                            </span>
                            {notif.metadata_json.creator_name && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                by {notif.metadata_json.creator_name}
                              </span>
                            )}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                          {new Date(notif.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shadow-xs"
          >
            <UserAvatar name={user?.name || "User"} email={user?.email} role={user?.role} size="xs" />
            <span className="text-xs sm:text-sm font-semibold text-slate-800 hidden md:inline">
              {user?.name || "User"}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "User"}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate("/settings");
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Profile & Settings
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center justify-between"
              >
                <span>Sign out</span>
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}