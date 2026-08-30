"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getSocialAccounts, connectSocialAccount } from "@/lib/api";
import Nav from "@/components/Nav";

type UserProfile = { user_id: number; name: string; email: string; role: string };
type SocialAccount = { id: number; platform: string; account_name: string };

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "📘", instagram: "📷", linkedin: "💼", twitter: "🐦", youtube: "▶️", pinterest: "📌",
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [accountName, setAccountName] = useState("");
  const [connecting, setConnecting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profileData, accountsData] = await Promise.all([getMe(), getSocialAccounts()]);
      setProfile(profileData);
      setAccounts(accountsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      if (err instanceof Error && err.message.includes("Invalid or expired")) {
        localStorage.removeItem("access_token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

   useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on mount
    loadData();
  }, [router, loadData]);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        const token = localStorage.getItem("access_token");
        if (!token) {
          router.push("/");
        }
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName.trim()) return;
    setConnecting(true);
    setError("");
    try {
      await connectSocialAccount(platform, accountName);
      setAccountName("");
      const accountsData = await getSocialAccounts();
      setAccounts(accountsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect account");
    } finally {
      setConnecting(false);
    }
  }

    function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    router.push("/");
  }

    if (loading) {
    return (
      <main style={{ background: "#08090D", minHeight: "100vh" }} className="flex items-center justify-center">
        <p style={{ color: "#8A8B9A", fontFamily: "var(--font-plex-mono), monospace" }}>Loading dashboard...</p>
      </main>
    );
  }

    return (
    <main
      style={{ background: "#08090D", color: "#E8E9F0", fontFamily: "var(--font-plex-mono), monospace" }}
      className="min-h-screen p-8"
    >
      <div className="mx-auto max-w-4xl">
              <Nav
          rightSlot={
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/account")}
                className="glass-panel rounded-lg px-4 py-2 text-sm font-medium"
                style={{ color: "#8A8CA8" }}
              >
                Account
              </button>
              <button
                onClick={handleLogout}
                className="glass-panel rounded-lg px-4 py-2 text-sm font-medium"
                style={{ color: "#8A8CA8" }}
              >
                Log out
              </button>
            </div>
          }
        /> 

        <div className="mb-8">
          <p className="mb-1 text-xs tracking-[0.25em] uppercase" style={{ color: "#00F0FF" }}>Dashboard</p>
          <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600 }} className="text-3xl">
            Welcome{profile ? `, ${profile.name}` : ""}
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-xl p-4 text-sm" style={{ background: "rgba(255,61,110,0.1)", color: "#FF3D6E", border: "1px solid rgba(255,61,110,0.3)" }}>
            {error}
          </div>
        )}

        {profile && (
          <div className="glass-panel mb-8 rounded-2xl p-6">
            <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="mb-4 text-lg">Your Profile</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <span style={{ color: "#8A8CA8" }}>Email</span>
                <span>{profile.email}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span style={{ color: "#8A8CA8" }}>Role</span>
                <span className="rounded-full px-3 py-0.5 text-xs font-medium" style={{ background: "rgba(0,240,255,0.15)", color: "#00F0FF" }}>
                  {profile.role.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel mb-8 rounded-2xl p-6">
          <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="mb-4 text-lg">Connect a Social Account</h2>
          <form onSubmit={handleConnect} className="flex flex-wrap gap-3">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg border p-3 text-sm"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "#0B0C14", color: "#E8E9F5" }}
            >
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">X (Twitter)</option>
              <option value="youtube">YouTube</option>
              <option value="pinterest">Pinterest</option>
            </select>
            <input
              type="text"
              placeholder="Account name / handle"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="flex-1 rounded-lg border p-3 text-sm"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "#0B0C14", color: "#E8E9F5", minWidth: "180px" }}
            />
            <button
              type="submit"
              disabled={connecting}
              className="rounded-lg px-5 py-3 text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #00F0FF, #B026FF)", color: "#05060A" }}
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="mb-4 text-lg">Connected Accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-sm" style={{ color: "#8A8CA8" }}>No accounts connected yet — add one above.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-2xl">{PLATFORM_ICONS[account.platform] || "🔗"}</span>
                  <div>
                    <p className="text-sm font-medium">{account.account_name}</p>
                    <p className="text-xs capitalize" style={{ color: "#8A8CA8" }}>{account.platform}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}