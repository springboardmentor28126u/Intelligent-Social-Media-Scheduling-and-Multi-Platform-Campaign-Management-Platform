"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  PenSquare,
  Sparkles,
  Layers,
  BarChart3,
  Share2,
  Users,
  FileText,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { clearAuthSession } from "@/lib/auth";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Calendar", href: "/dashboard/calendar", icon: Calendar, badge: "Live" },
    { label: "Create Post", href: "/dashboard/create-post", icon: PenSquare, highlight: true },
    { label: "Campaigns", href: "/dashboard/campaigns", icon: TrendingUp },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Social Accounts", href: "/dashboard/social-accounts", icon: Share2 },
    { label: "Team", href: "/dashboard/team", icon: Users },
    { label: "Reports", href: "/dashboard/reports", icon: FileText },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between min-h-screen">
      
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#7C3AED] text-white shadow-md shadow-[#635BFF]/25">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1">
                SocialPilot
                <span className="rounded bg-[#635BFF]/10 px-1 py-0.2 text-[9px] font-bold text-[#635BFF]">
                  AI
                </span>
              </span>
              <span className="text-[9px] font-medium text-slate-400 -mt-0.5">
                Plan. Post. Perform.
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#635BFF] text-white shadow-sm shadow-[#635BFF]/30 font-semibold"
                    : item.highlight
                    ? "bg-[#635BFF]/5 text-[#635BFF] hover:bg-[#635BFF]/10 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : item.highlight ? "text-[#635BFF]" : "text-slate-400 group-hover:text-slate-700"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* AI Co-Pilot Widget in Sidebar */}
        <div className="mx-3 mt-2 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-cyan-50 p-3.5 border border-indigo-100/60">
          <div className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="h-4 w-4 text-[#635BFF]" />
            <span className="text-xs font-bold">AI Co-Pilot Active</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-tight">
            Adapts content instantly for 6 social platforms.
          </p>
          <Link
            href="/dashboard/create-post"
            className="mt-2.5 block text-center rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#635BFF] shadow-xs border border-indigo-100 hover:bg-indigo-50/50 transition-colors"
          >
            Create with AI →
          </Link>
        </div>
      </div>

      {/* Footer / Account Settings */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors ${
            pathname === "/dashboard/settings" ? "bg-slate-100 text-[#635BFF] font-semibold" : ""
          }`}
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Settings</span>
        </Link>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-rose-500" />
          <span>Log out</span>
        </button>
      </div>

    </aside>
  );
}
