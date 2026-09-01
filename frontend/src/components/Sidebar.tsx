import React from "react";
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
  Zap,
} from "lucide-react";

interface SidebarProps {
  onOpenCreatePost?: () => void;
}

export default function Sidebar({ onOpenCreatePost }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const role = user?.role || "content_creator";

  // Build dynamic menu based on RBAC role
  const getMenuItems = () => {
    switch (role) {
      case "administrator":
        return [
          { name: "Admin Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
          { name: "User Management", path: "/admin/users", icon: <Users size={20} /> },
          { name: "Team Workspaces", path: "/team", icon: <Share2 size={20} /> },
          { name: "Roles & Permissions", path: "/admin/roles", icon: <ShieldCheck size={20} /> },
          { name: "System Audit Logs", path: "/admin/audit-logs", icon: <ClipboardList size={20} /> },
          { name: "Social Channels", path: "/accounts", icon: <Share2 size={20} /> },
          { name: "Analytics & System", path: "/analytics", icon: <BarChart3 size={20} /> },
        ];

      case "business_user":
        return [
          { name: "Brand Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
          { name: "Campaigns & ROI", path: "/campaigns", icon: <Megaphone size={20} /> },
          { name: "Social Channels", path: "/accounts", icon: <Share2 size={20} /> },
          { name: "Growth Analytics", path: "/analytics", icon: <BarChart3 size={20} /> },
          { name: "Executive Reports", path: "/reports", icon: <FileText size={20} /> },
          { name: "Team Members", path: "/team", icon: <Users size={20} /> },
        ];

      case "marketing_team":
        return [
          { name: "Marketing Hub", path: "/", icon: <LayoutDashboard size={20} /> },
          { name: "Posts & Content", path: "/posts", icon: <FileText size={20} /> },
          { name: "Content Calendar", path: "/calendar", icon: <CalendarDays size={20} /> },
          { name: "Publishing Queue", path: "/queue", icon: <ListOrdered size={20} /> },
          { name: "Campaigns", path: "/campaigns", icon: <Megaphone size={20} /> },
          { name: "Social Accounts", path: "/accounts", icon: <Share2 size={20} /> },
          { name: "Analytics", path: "/analytics", icon: <BarChart3 size={20} /> },
          { name: "Reports Export", path: "/reports", icon: <FileText size={20} /> },
        ];

      case "content_creator":
      default:
        return [
          { name: "Creator Studio", path: "/", icon: <LayoutDashboard size={20} /> },
          { name: "My Posts", path: "/posts", icon: <FileText size={20} /> },
          { name: "Drafts & Approvals", path: "/posts?status=pending_approval", icon: <FileText size={20} /> },
          { name: "Content Calendar", path: "/calendar", icon: <CalendarDays size={20} /> },
          { name: "Connected Channels", path: "/accounts", icon: <Share2 size={20} /> },
        ];
    }
  };

  const menu = getMenuItems();

  const getRoleBadge = () => {
    switch (role) {
      case "administrator":
        return { label: "Admin User", bg: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "business_user":
        return { label: "Business User", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "marketing_team":
        return { label: "Marketing Lead", bg: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      case "content_creator":
      default:
        return { label: "Content Creator", bg: "bg-pink-500/20 text-pink-300 border-pink-500/30" };
    }
  };

  const badge = getRoleBadge();

  return (
    <aside className="w-68 min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 border-r border-slate-800/80 shrink-0 select-none z-30 shadow-2xl">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 mb-4 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
          <Zap size={22} className="text-white fill-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight font-display text-white">
            Social<span className="text-blue-500">Pilot</span>
          </h1>
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Marketing OS
          </p>
        </div>
      </div>

      {/* Role Tag & Workspace */}
      <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs text-slate-300 font-medium truncate">
            {user?.company || "Acme Global"}
          </span>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      {/* Create Action Button */}
      <button
        onClick={() => {
          if (onOpenCreatePost) onOpenCreatePost();
          else navigate("/posts?action=create");
        }}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/30 transition-all duration-200 mb-4 group cursor-pointer text-sm"
      >
        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-200" />
        <span>Create Post</span>
      </button>

      {/* Menu Section */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
          Navigation
        </p>

        {menu.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path.split("?")[0]);

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left font-medium text-sm cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <span className={isActive ? "text-white" : "text-slate-400"}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </button>
          );
        })}

        <div className="pt-3 mt-3 border-t border-slate-800/80">
          <button
            onClick={() => navigate("/settings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left font-medium text-sm cursor-pointer ${
              location.pathname === "/settings"
                ? "bg-blue-600 text-white font-bold"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
            }`}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* User Profile / Logout Footer */}
      <div className="pt-3 mt-auto border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <UserAvatar name={user?.name || "Admin User"} email={user?.email} role={user?.role} size="sm" />
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {user?.name || "Jenee"}
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {user?.email || "admin@socialpilot.io"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}