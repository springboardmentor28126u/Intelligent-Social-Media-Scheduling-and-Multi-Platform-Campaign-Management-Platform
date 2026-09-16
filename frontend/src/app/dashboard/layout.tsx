// src/app/dashboard/layout.tsx
//
// Shared shell for every /dashboard/* page: sidebar nav, top bar,
// and the ONE auth check + GET /auth/me fetch (previously duplicated
// per-page — now done once here and shared via DashboardUserContext).

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  BarChart3,
  Megaphone,
  Link2,
  LogOut,
  UserRound,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

interface MeResponse {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

// ---------- Shared context so every dashboard page can read the
// ---------- logged-in user without re-fetching /auth/me itself.
const DashboardUserContext = createContext<MeResponse | null>(null);
export function useDashboardUser() {
  return useContext(DashboardUserContext);
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

const roleColors: Record<string, string> = {
  content_creator: "bg-pink-100 text-pink-700",
  marketing_team: "bg-purple-100 text-purple-700",
  business_user: "bg-blue-100 text-blue-700",
  administrator: "bg-amber-100 text-amber-700",
};

// Sidebar nav items — icons are generic (not brand logos), safe across
// lucide-react versions.
const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/posts", label: "Posts", icon: FileText },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/social-accounts", label: "Social Accounts", icon: Link2 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchMe = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Could not load your account info.");
        const data: MeResponse = await response.json();
        setMe(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, [token, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!token || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <DashboardUserContext.Provider value={me}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* ---------- Sidebar ---------- */}
        <aside className="w-60 shrink-0 bg-gradient-to-b from-indigo-700 to-purple-700 text-white flex flex-col">
          <div className="px-5 py-6">
            <p className="font-bold text-lg tracking-tight">SocialPilot</p>
            <p className="text-white/60 text-xs mt-0.5">Manage every platform</p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition
                    ${isActive
                      ? "bg-white/15 text-white font-medium"
                      : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {me && (
            <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold shrink-0">
                {getInitials(me.full_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{me.full_name}</p>
                <p className="text-[11px] text-white/60 truncate">{formatRole(me.role)}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="mx-3 mb-4 flex items-center gap-2 text-sm text-white/80 hover:text-white
                       hover:bg-white/10 rounded-lg px-3 py-2 transition"
          >
            <LogOut size={15} />
            Log out
          </button>
        </aside>

        {/* ---------- Main content area ---------- */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
  <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    {error && (
      <div className="mb-6 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 shadow">
        {error}
      </div>
    )}

    {children}
  </div>
</main>
      </div>
    </DashboardUserContext.Provider>
  );
}