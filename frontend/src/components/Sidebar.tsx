import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  BarChart3,
  Share2,
  Users,
  CalendarDays,
  ListOrdered,
  ShieldCheck,
  ClipboardList,
  Settings,
  Plus,
  LogOut,
  Sparkles,
  Crown,
  HelpCircle,
  Inbox,
  ChevronDown,
  ChevronRight,
  Hash,
  Link as LinkIcon,
  Palette,
  Send,
} from "lucide-react";

interface SidebarProps {
  onOpenCreatePost?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ onOpenCreatePost, isMobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [toolsOpen, setToolsOpen] = useState(true);

  const role = user?.role || "content_creator";

  // Build dynamic menu based on RBAC role
  const getMenuItems = () => {
    switch (role) {
      case "administrator":
        return [
          { name: "Admin Dashboard", path: "/", icon: <LayoutDashboard size={19} /> },
          { name: "User Management", path: "/admin/users", icon: <Users size={19} /> },
          { name: "Team Workspaces", path: "/team", icon: <Share2 size={19} /> },
          { name: "Roles & Permissions", path: "/admin/roles", icon: <ShieldCheck size={19} /> },
          { name: "System Audit Logs", path: "/admin/audit-logs", icon: <ClipboardList size={19} /> },
          { name: "Social Channels", path: "/accounts", icon: <Share2 size={19} /> },
          { name: "Analytics & System", path: "/analytics", icon: <BarChart3 size={19} /> },
        ];

      case "business_user":
        return [
          { name: "Brand Dashboard", path: "/", icon: <LayoutDashboard size={19} /> },
          { name: "Campaigns & ROI", path: "/campaigns", icon: <Megaphone size={19} /> },
          { name: "Social Channels", path: "/accounts", icon: <Share2 size={19} /> },
          { name: "Growth Analytics", path: "/analytics", icon: <BarChart3 size={19} /> },
          { name: "Executive Reports", path: "/reports", icon: <FileText size={19} /> },
          { name: "Team Members", path: "/team", icon: <Users size={19} /> },
        ];

      case "marketing_team":
        return [
          { name: "Dashboard", path: "/", icon: <LayoutDashboard size={19} /> },
          { name: "Campaigns", path: "/campaigns", icon: <Megaphone size={19} /> },
          { name: "Create Campaign", path: "/campaigns?action=create", icon: <Plus size={19} /> },
          { name: "Content Calendar", path: "/calendar", icon: <CalendarDays size={19} /> },
          { name: "Posts", path: "/posts", icon: <FileText size={19} /> },
          { name: "Analytics", path: "/analytics", icon: <BarChart3 size={19} /> },
          { name: "Audience / Engagement", path: "/team", icon: <Users size={19} /> },
          { name: "Connected Channels", path: "/accounts", icon: <Share2 size={19} /> },
          { name: "Reports", path: "/reports", icon: <FileText size={19} /> },
          { name: "Settings", path: "/settings", icon: <Settings size={19} /> },
        ];

      case "content_creator":
      default:
        return [
          { name: "Creator Panel", path: "/", icon: <LayoutDashboard size={19} /> },
          { name: "Create Post", action: "create", icon: <Plus size={19} /> },
          { name: "Campaigns", path: "/campaigns", icon: <Megaphone size={19} /> },
          { name: "Content Calendar", path: "/calendar", icon: <CalendarDays size={19} /> },
          { name: "Analytics", path: "/analytics", icon: <BarChart3 size={19} /> },
          { name: "Audience", path: "/team", icon: <Users size={19} /> },
          { name: "Social Accounts", path: "/accounts", icon: <Share2 size={19} /> },
          { name: "Inbox", path: "/posts", badge: "3", icon: <Inbox size={19} /> },
        ];
    }
  };

  const menu = getMenuItems();

  const toolsItems = [
    { name: "AI Assistant", icon: <Sparkles size={16} />, path: "/posts?action=create" },
    { name: "Hashtags", icon: <Hash size={16} />, path: "/posts" },
    { name: "Link Shortener", icon: <LinkIcon size={16} />, path: "/settings" },
    { name: "Branding", icon: <Palette size={16} />, path: "/settings" },
  ];

  const handleNavClick = (item: any) => {
    if (item.action === "create") {
      if (onOpenCreatePost) onOpenCreatePost();
      else navigate("/posts?action=create");
    } else if (item.path) {
      navigate(item.path);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0B132B] text-slate-200 flex flex-col p-4 border-r border-slate-800/70 shrink-0 select-none shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div
          className="flex items-center gap-3 px-2 py-3 mb-3 cursor-pointer group"
          onClick={() => {
            navigate("/");
            if (onCloseMobile) onCloseMobile();
          }}
        >
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0 group-hover:scale-105 transition-transform duration-200">
            <Send size={18} className="text-white fill-white -translate-x-0.5 translate-y-0.5 -rotate-45" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight font-display text-white">
              Social<span className="text-blue-500">Pilot</span>
            </h1>
          </div>
        </div>

        {/* Menu Section */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-sidebar-scroll">
          {menu.map((item: any) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : item.path && item.path !== "/"
                ? location.pathname.startsWith(item.path.split("?")[0])
                : false;

            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left text-[13.5px] font-medium cursor-pointer ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/30 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={isActive ? "text-white" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white min-w-4 text-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Tools Collapsible for Creator role */}
          {role === "content_creator" && (
            <div className="pt-2">
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={18} className="text-slate-400" />
                  <span>Tools</span>
                </div>
                {toolsOpen ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
              </button>

              {toolsOpen && (
                <div className="pl-6 pr-1 py-1 space-y-0.5">
                  {toolsItems.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => {
                        navigate(tool.path);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition cursor-pointer"
                    >
                      <span>{tool.icon}</span>
                      <span>{tool.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings & Support */}
          <div className="pt-2 mt-2 border-t border-slate-800/60 space-y-1">
            {role !== "marketing_team" && (
              <button
                onClick={() => {
                  navigate("/settings");
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left text-[13.5px] font-medium cursor-pointer ${
                  location.pathname === "/settings"
                    ? "bg-[#2563EB] text-white font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Settings size={19} className={location.pathname === "/settings" ? "text-white" : "text-slate-400"} />
                <span>Settings</span>
              </button>
            )}

            <button
              onClick={() => {
                navigate("/settings");
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer"
            >
              <HelpCircle size={19} className="text-slate-400" />
              <span>Help & Support</span>
            </button>
          </div>
        </div>

        {/* Upgrade to Pro Card Banner */}
        <div className="my-3 p-4 rounded-2xl bg-gradient-to-b from-[#1C2541] to-[#141B32] border border-blue-500/20 shadow-lg relative overflow-hidden shrink-0">
          <div className="absolute top-2 right-2 opacity-10">
            <Crown size={56} className="text-blue-400" />
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <Crown size={16} className="text-amber-400" />
            <h4 className="text-xs font-bold text-white tracking-tight">Upgrade to Pro</h4>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
            Get more features, higher limits, and take your social media to the next level.
          </p>
          <button
            onClick={() => {
              navigate("/settings");
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#0B132B] text-xs font-bold transition shadow-xs cursor-pointer text-center"
          >
            View Plans
          </button>
        </div>

        {/* User Profile / Logout Footer */}
        <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <UserAvatar name={user?.name || "Jenelia S"} email={user?.email} role={user?.role} size="xs" />
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {user?.name || "Jenelia S"}
              </p>
              <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                {user?.email || "jenelia@socialpilot.io"}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}