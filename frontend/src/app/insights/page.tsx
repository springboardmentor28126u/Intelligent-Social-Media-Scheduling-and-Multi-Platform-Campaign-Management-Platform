"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getSocialAccounts } from "@/lib/api";

type UserProfile = { user_id: number; name: string; email: string; role: string };
type SocialAccount = { id: number; platform: string; account_name: string };

const PLATFORM_DATA: Record<string, { label: string; icon: string; description: string }> = {
  linkedin: { label: "LinkedIn", icon: "in", description: "Professional network" },
  instagram: { label: "Instagram", icon: "◎", description: "Visual community" },
  facebook: { label: "Facebook", icon: "f", description: "Social community" },
  twitter: { label: "X", icon: "𝕏", description: "Real-time conversation" },
  youtube: { label: "YouTube", icon: "▶", description: "Video audience" },
  pinterest: { label: "Pinterest", icon: "P", description: "Visual discovery" },
};

export default function InsightsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [profileData, accountsData] = await Promise.all([getMe(), getSocialAccounts()]);
      setProfile(profileData);
      setAccounts(accountsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to load insights";
      setError(message);

      if (err instanceof Error && message.toLowerCase().includes("invalid or expired")) {
        localStorage.removeItem("access_token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router, loadData]);

  function handleRefresh() {
    setRefreshing(true);
    loadData();
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
      <main className="flex min-h-screen items-center justify-center" style={{ background: "var(--sp-bg)", color: "var(--sp-text)" }}>
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--sp-cyan)", borderRightColor: "var(--sp-purple)" }}
          />
          <p className="text-sm" style={{ color: "var(--sp-text-secondary)" }}>
            Reading your social signals...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--sp-bg)", color: "var(--sp-text)", fontFamily: "var(--font-plex-mono), monospace" }}
    >
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside
          className="hidden w-64 shrink-0 border-r p-5 md:flex md:flex-col"
          style={{ borderColor: "var(--sp-border)", background: "var(--sp-surface)" }}
        >
          <div className="mb-10 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
              style={{ background: "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))", color: "#05060A" }}
            >
              S
            </div>
            <div>
              <div className="font-semibold" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                SocialPilot
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--sp-subtle)" }}>
                Command Center
              </div>
            </div>
          </div>

          <p className="mb-3 px-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--sp-subtle)" }}>
            Workspace
          </p>

          <div className="space-y-1">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>◉</span>
              Command Center
            </button>

            <button
              onClick={() => router.push("/create-post")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>✦</span>
              Create
            </button>

            <button
              onClick={() => router.push("/content-lab")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>◇</span>
              Content Lab
            </button>

            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm"
              style={{ background: "rgba(0,229,255,0.09)", color: "var(--sp-cyan)" }}
            >
              <span>◌</span>
              Insights
            </button>

            <button
              onClick={() => router.push("/audience")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>◎</span>
              Audience
            </button>
          </div>

          <p className="mb-3 mt-10 px-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--sp-subtle)" }}>
            Connected
          </p>

          <div className="space-y-2">
            {accounts.length === 0 ? (
              <p className="px-2 text-xs" style={{ color: "var(--sp-subtle)" }}>
                No platforms connected
              </p>
            ) : (
              accounts.slice(0, 5).map((account) => {
                const info = PLATFORM_DATA[account.platform];

                return (
                  <div key={account.id} className="flex items-center gap-3 px-2 py-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ background: "var(--sp-hover)", color: "var(--sp-text-secondary)" }}
                    >
                      {info?.icon || "●"}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-xs">{account.account_name}</p>
                      <p className="text-[10px]" style={{ color: "var(--sp-subtle)" }}>
                        {info?.label || account.platform}
                      </p>
                    </div>

                    <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "var(--sp-green)" }} />
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-auto space-y-1">
            <button
              onClick={() => router.push("/settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              ⚙ Preferences
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="flex-1">
          <header
            className="flex items-center justify-between border-b px-6 py-5 md:px-10"
            style={{ borderColor: "var(--sp-border)" }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--sp-cyan)" }}>
                Intelligence Layer
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--sp-subtle)" }}>
                Understand what your content is doing
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-xl px-4 py-2.5 text-xs transition-colors hover:bg-white/10 disabled:opacity-50"
                style={{ border: "1px solid var(--sp-border-strong)", color: "var(--sp-text-secondary)" }}
              >
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </button>

              <button
                onClick={() => router.push("/create-post")}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold"
                style={{ background: "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))", color: "#05060A" }}
              >
                + Create
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl p-6 md:p-10">
            <div className="mb-10">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--sp-subtle)" }}>
                    Social intelligence
                  </p>

                  <h1 className="text-4xl md:text-5xl" style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600 }}>
                    See the signal.
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--sp-muted)" }}>
                    Insights turns your connected social presence into signals, patterns and decisions.
                  </p>
                </div>

                <div className="rounded-2xl px-5 py-4" style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--sp-subtle)" }}>
                    Connected sources
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{accounts.length}</p>
                  <p className="mt-1 text-[10px]" style={{ color: "var(--sp-green)" }}>
                    active account{accounts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div
                className="mb-6 rounded-xl p-4 text-sm"
                style={{ background: "rgba(255,61,110,0.08)", border: "1px solid rgba(255,61,110,0.2)", color: "var(--sp-danger)" }}
              >
                {error}
              </div>
            )}

            {/* ANALYTICS STATUS */}
            <div
              className="relative overflow-hidden rounded-3xl p-6 md:p-8"
              style={{ background: "linear-gradient(135deg,rgba(0,229,255,0.06),rgba(155,92,255,0.08))", border: "1px solid rgba(155,92,255,0.16)" }}
            >
              <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl" style={{ background: "rgba(0,229,255,0.08)" }} />

              <div className="relative">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: "rgba(0,229,255,0.1)", color: "var(--sp-cyan)" }}
                      >
                        ✦
                      </span>

                      <div>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-text-secondary)" }}>
                          Analytics engine
                        </p>
                        <h2 className="mt-1 text-xl" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                          Waiting for live signals
                        </h2>
                      </div>
                    </div>

                    <p className="mt-5 max-w-xl text-sm leading-6" style={{ color: "var(--sp-text-secondary)" }}>
                      Your accounts are connected, but platform-level analytics are not available yet. Once the respective social
                      APIs are connected, SocialPilot can replace these states with live performance data.
                    </p>
                  </div>

                  <div className="rounded-2xl p-5 md:min-w-[220px]" style={{ background: "rgba(0,0,0,0.16)", border: "1px solid var(--sp-border)" }}>
                    <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--sp-subtle)" }}>
                      Data status
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: accounts.length > 0 ? "#F5B942" : "var(--sp-text-secondary)" }} />
                      <span className="text-sm">{accounts.length > 0 ? "Awaiting API data" : "No data sources"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SIGNAL CARDS */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Reach", value: "—", description: "Live platform data required", icon: "↗" },
                { label: "Engagement", value: "—", description: "Waiting for interactions", icon: "◎" },
                { label: "Impressions", value: "—", description: "Platform analytics required", icon: "◌" },
                { label: "Growth", value: "—", description: "Historical data required", icon: "⌁" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl p-5" style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--sp-muted)" }}>
                      {item.label}
                    </span>
                    <span style={{ color: "var(--sp-subtle)" }}>{item.icon}</span>
                  </div>

                  <p className="mt-5 text-3xl font-semibold" style={{ color: "var(--sp-text-secondary)" }}>
                    {item.value}
                  </p>

                  <p className="mt-2 text-[10px] leading-4" style={{ color: "var(--sp-subtle)" }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            {/* SIGNAL MAP + AI */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl p-6 lg:col-span-2" style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-subtle)" }}>
                      Signal map
                    </p>
                    <h2 className="mt-2 text-xl" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                      Your social ecosystem
                    </h2>
                  </div>

                  <span className="rounded-full px-3 py-1 text-[9px]" style={{ background: "var(--sp-card)", color: "var(--sp-muted)" }}>
                    {accounts.length} source{accounts.length === 1 ? "" : "s"}
                  </span>
                </div>

                {accounts.length === 0 ? (
                  <div className="mt-8 rounded-2xl p-8 text-center" style={{ background: "var(--sp-card)", border: "1px dashed var(--sp-border-strong)" }}>
                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: "rgba(0,229,255,0.07)", color: "var(--sp-cyan)" }}
                    >
                      ◈
                    </div>

                    <p className="mt-4 text-sm">No signal sources yet</p>

                    <p className="mx-auto mt-2 max-w-sm text-xs leading-5" style={{ color: "var(--sp-subtle)" }}>
                      Connect a social account from your Command Center to start building your intelligence map.
                    </p>

                    <button
                      onClick={() => router.push("/dashboard")}
                      className="mt-5 rounded-xl px-4 py-2.5 text-xs"
                      style={{ background: "rgba(0,229,255,0.08)", color: "var(--sp-cyan)", border: "1px solid rgba(0,229,255,0.12)" }}
                    >
                      Connect account →
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 space-y-3">
                    {accounts.map((account, index) => {
                      const info = PLATFORM_DATA[account.platform];

                      return (
                        <div
                          key={account.id}
                          className="group rounded-2xl p-4 transition-colors hover:bg-white/[0.025]"
                          style={{ border: "1px solid var(--sp-border)" }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                              style={{
                                background: index % 2 === 0 ? "rgba(0,229,255,0.08)" : "rgba(155,92,255,0.08)",
                                color: index % 2 === 0 ? "var(--sp-cyan)" : "var(--sp-purple)",
                              }}
                            >
                              {info?.icon || "●"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">{account.account_name}</p>
                                  <p className="mt-1 text-[10px]" style={{ color: "var(--sp-subtle)" }}>
                                    {info?.label || account.platform} · {info?.description || "Connected source"}
                                  </p>
                                </div>

                                <span className="rounded-full px-3 py-1 text-[9px]" style={{ background: "rgba(245,185,66,0.08)", color: "#C99A38" }}>
                                  API pending
                                </span>
                              </div>

                              <div className="mt-4 h-1 overflow-hidden rounded-full" style={{ background: "var(--sp-card)" }}>
                                <div
                                  className="h-full w-1/3 rounded-full"
                                  style={{ background: "linear-gradient(90deg,var(--sp-cyan),var(--sp-purple))", opacity: 0.35 }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI INTERPRETATION */}
              <div
                className="rounded-2xl p-6"
                style={{ background: "linear-gradient(145deg,rgba(155,92,255,0.08),rgba(0,229,255,0.04))", border: "1px solid rgba(155,92,255,0.15)" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(155,92,255,0.12)", color: "var(--sp-purple)" }}>
                  ✦
                </div>

                <p className="mt-6 text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-text-secondary)" }}>
                  AI interpretation
                </p>

                <h2 className="mt-2 text-xl" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  Intelligence comes next.
                </h2>

                <p className="mt-4 text-sm leading-6" style={{ color: "var(--sp-muted)" }}>
                  Once SocialPilot receives live performance data, the AI layer can identify unusual changes, winning content
                  patterns and opportunities.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    ["01", "Detect", "Find unusual performance changes."],
                    ["02", "Explain", "Understand why a signal changed."],
                    ["03", "Recommend", "Turn patterns into your next move."],
                  ].map(([number, title, text]) => (
                    <div key={number} className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.15)" }}>
                      <div className="flex gap-3">
                        <span className="text-[9px]" style={{ color: "var(--sp-purple)" }}>
                          {number}
                        </span>

                        <div>
                          <p className="text-xs font-medium">{title}</p>
                          <p className="mt-1 text-[10px] leading-4" style={{ color: "var(--sp-subtle)" }}>
                            {text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BOTTOM INSIGHT AREAS */}
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl p-6" style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}>
                <span className="text-lg" style={{ color: "var(--sp-cyan)" }}>
                  ◇
                </span>
                <h3 className="mt-5 text-lg" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  Content signal
                </h3>
                <p className="mt-3 text-xs leading-5" style={{ color: "var(--sp-muted)" }}>
                  Discover which themes, formats and messages create the strongest response.
                </p>
                <div className="mt-5 rounded-xl px-4 py-3 text-[10px]" style={{ background: "var(--sp-card)", color: "var(--sp-subtle)" }}>
                  Waiting for content analytics
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}>
                <span className="text-lg" style={{ color: "var(--sp-purple)" }}>
                  ◎
                </span>
                <h3 className="mt-5 text-lg" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  Audience signal
                </h3>
                <p className="mt-3 text-xs leading-5" style={{ color: "var(--sp-muted)" }}>
                  Understand audience behaviour, response patterns and emerging interests.
                </p>
                <div className="mt-5 rounded-xl px-4 py-3 text-[10px]" style={{ background: "var(--sp-card)", color: "var(--sp-subtle)" }}>
                  Audience data not connected
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}>
                <span className="text-lg" style={{ color: "var(--sp-green)" }}>
                  ↗
                </span>
                <h3 className="mt-5 text-lg" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  Opportunity
                </h3>
                <p className="mt-3 text-xs leading-5" style={{ color: "var(--sp-muted)" }}>
                  Surface opportunities where your social presence can improve or grow.
                </p>
                <div className="mt-5 rounded-xl px-4 py-3 text-[10px]" style={{ background: "var(--sp-card)", color: "var(--sp-subtle)" }}>
                  AI recommendations will appear here
                </div>
              </div>
            </div>

            <div className="mt-10 border-t pt-6" style={{ borderColor: "var(--sp-border)" }}>
              <div className="flex flex-col justify-between gap-3 text-[10px] sm:flex-row">
                <p style={{ color: "var(--sp-subtle)" }}>SocialPilot Intelligence Layer</p>
                <p style={{ color: "var(--sp-subtle)" }}>{profile?.name ? `Workspace · ${profile.name}` : "Workspace"}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}