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
  Users,
  ChevronDown,
  LogOut,
  Shield,
  Briefcase,
  Megaphone,
  PenTool,
  UserPlus,
  Calendar,
  Send,
  Link,
  Unlink,
  Check,
  HelpCircle,
  Menu,
} from "lucide-react";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export default function Navbar({ onToggleMobileSidebar }: NavbarProps) {
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
      const data = await api.notifications.list(30);
      setNotifications(data || []);
      const countRes = await api.notifications.getUnreadCount();
      setUnreadCount(countRes?.unread_count || 0);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    const handleEventUpdate = () => fetchNotifications();
    window.addEventListener("post_created", handleEventUpdate);
    window.addEventListener("notification_updated", handleEventUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("post_created", handleEventUpdate);
      window.removeEventListener("notification_updated", handleEventUpdate);
    };
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
      await api.notifications.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast("All read", "All notifications marked as read", "info");
    } catch (err: any) {
      showToast("Error", err.message || "Failed to mark all as read", "error");
    }
  };

  const handleMarkSingleRead = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    try {
      await api.notifications.markOneRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.is_read) {
        await api.notifications.markOneRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    }

    setShowNotifications(false);

    // Deep navigation based on type / entity
    if (notif.related_entity_type === "user" || notif.type === "NEW_USER") {
      navigate("/admin/users");
    } else if (
      notif.related_entity_type === "social_account" ||
      notif.type === "SOCIAL_ACCOUNT_CONNECTED" ||
      notif.type === "SOCIAL_ACCOUNT_DISCONNECTED"
    ) {
      navigate("/accounts");
    } else if (notif.related_entity_type === "post" || notif.metadata_json?.post_id) {
      const postId = notif.related_entity_id || notif.metadata_json?.post_id;
      navigate(postId ? `/posts?post_id=${postId}` : "/posts");
    } else if (notif.link) {
      navigate(notif.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NEW_USER":
        return <UserPlus size={16} className="text-emerald-600" />;
      case "POST_CREATED":
        return <PenTool size={16} className="text-blue-600" />;
      case "POST_SCHEDULED":
        return <Calendar size={16} className="text-amber-600" />;
      case "POST_PUBLISHED":
      case "publish_success":
        return <Send size={16} className="text-indigo-600" />;
      case "POST_UPDATED":
        return <Clock size={16} className="text-purple-600" />;
      case "POST_DELETED":
      case "publish_failed":
        return <AlertCircle size={16} className="text-rose-600" />;
      case "SOCIAL_ACCOUNT_CONNECTED":
        return <Link size={16} className="text-teal-600" />;
      case "SOCIAL_ACCOUNT_DISCONNECTED":
        return <Unlink size={16} className="text-amber-600" />;
      default:
        return <CheckCircle2 size={16} className="text-blue-600" />;
    }
  };

  const getRoleDisplayName = (roleName?: string) => {
    switch (roleName) {
      case "administrator":
        return "Admin";
      case "business_user":
        return "Business";
      case "marketing_team":
        return "Marketing Lead";
      case "content_creator":
      default:
        return "Creator";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-20 shrink-0 select-none">
      {/* Left: Mobile hamburger + Search Input */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition px-3.5 py-2 rounded-xl w-60 sm:w-80 lg:w-96">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search campaigns, posts, or accounts..."
            className="bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none w-full"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Activity & Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Check size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Bell size={24} className="text-slate-300" />
                    <span>No notifications yet. You're all caught up!</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.is_read;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 transition cursor-pointer flex gap-3 items-start group ${
                          isUnread
                            ? "bg-blue-50/40 hover:bg-blue-50/70 border-l-4 border-blue-600"
                            : "bg-white hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs leading-tight truncate ${isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                              {notif.title}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatRelativeTime(notif.created_at)}
                              </span>
                              {isUnread && (
                                <button
                                  title="Mark as read"
                                  onClick={(e) => handleMarkSingleRead(e, notif.id)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 transition cursor-pointer"
                                >
                                  <Check size={13} />
                                </button>
                              )}
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Help Icon */}
        <button
          onClick={() => navigate("/settings")}
          title="Help & Documentation"
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          <HelpCircle size={19} />
        </button>

        {/* User Profile Pill */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {(user?.name || "Jenelia S")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "JS"}
            </div>
            <div className="hidden sm:flex flex-col text-left min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                {user?.name || "Jenelia S"}
              </span>
              <span className="text-[10px] text-slate-500 truncate leading-tight">
                {getRoleDisplayName(user?.role)}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Jenelia S"}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || "jenelia@socialpilot.io"}</p>
                <div className="mt-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>
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
                  navigate("/accounts");
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Connected Channels
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