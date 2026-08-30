// src/app/dashboard/page.tsx
//
// The account management dashboard — visually upgraded version.
// Logic is unchanged from before (route guard + GET /auth/me fetch);
// this pass focuses on layout/styling:
//   - A gradient top bar with an avatar (user's initials) and role badge
//   - A stat-card row (placeholder numbers, since scheduling/analytics
//     don't exist yet — clearly labeled "Coming soon")
//   - A nicer "connected accounts" empty state with an icon
//   - A dedicated account-info card with icons per field

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Mail,
  UserRound,
  ShieldCheck,
  LogOut,
  Link2,
  CalendarClock,
  Megaphone,
  BarChart3,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

interface MeResponse {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

// Turns "content_creator" into "Content Creator" for display.
function formatRole(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Turns "Jane Doe" into "JD" for the avatar circle.
function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

// Small color variation per role, just for visual distinction on the badge.
const roleColors: Record<string, string> = {
  content_creator: "bg-pink-100 text-pink-700",
  marketing_team: "bg-purple-100 text-purple-700",
  business_user: "bg-blue-100 text-blue-700",
  administrator: "bg-amber-100 text-amber-700",
};

export default function DashboardPage() {
  const { token, logout } = useAuth();
  const router = useRouter();

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

        if (!response.ok) {
          throw new Error("Could not load your account info.");
        }

        const data: MeResponse = await response.json();
        setMe(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
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
    <div className="min-h-screen bg-gray-50">
      {/* ---------- Top gradient bar ---------- */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar circle with initials */}
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-semibold text-lg border border-white/30">
                {me ? getInitials(me.full_name) : "?"}
              </div>
              <div>
                <p className="text-white/70 text-sm">Welcome back,</p>
                <h1 className="text-white text-xl font-bold leading-tight">
                  {me?.full_name ?? "..."}
                </h1>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-white/90 bg-white/10 hover:bg-white/20
                         border border-white/20 rounded-lg px-3 py-2 transition"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6 pb-10">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 shadow">
            {error}
          </div>
        )}

        {/* ---------- Stat cards (placeholders for future milestones) ---------- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={<CalendarClock size={18} />}
            label="Scheduled posts"
            value="—"
            note="Coming in Milestone 2"
          />
          <StatCard
            icon={<Megaphone size={18} />}
            label="Active campaigns"
            value="—"
            note="Coming in Milestone 3"
          />
          <StatCard
            icon={<BarChart3 size={18} />}
            label="Total engagement"
            value="—"
            note="Coming in Milestone 3"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ---------- Account info card ---------- */}
          {me && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                Your account
              </h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <UserRound size={16} className="text-gray-400 shrink-0" />
                  <span className="text-gray-900">{me.full_name}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400 shrink-0" />
                  <span className="text-gray-900">{me.email}</span>
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck size={16} className="text-gray-400 shrink-0" />
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                      roleColors[me.role] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {formatRole(me.role)}
                  </span>
                </li>
              </ul>
            </div>
          )}

          {/* ---------- Connected accounts card ---------- */}
          <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Connected social accounts
            </h2>
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                <Link2 size={20} className="text-indigo-500" />
              </div>
              <p className="text-sm text-gray-500 max-w-[220px]">
                No accounts connected yet. You&apos;ll be able to connect
                platforms like X (Twitter) soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small reusable stat-card component, kept in this same file since it's
// only used here and it's small.
function StatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{note}</p>
    </div>
  );
}