"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getSocialAccounts } from "@/lib/api";

type UserProfile = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

type SocialAccount = {
  id: number;
  platform: string;
  account_name: string;
};

const PLATFORM_DATA: Record<
  string,
  {
    label: string;
    icon: string;
    description: string;
  }
> = {
  linkedin: {
    label: "LinkedIn",
    icon: "in",
    description: "Professional network",
  },
  instagram: {
    label: "Instagram",
    icon: "◎",
    description: "Visual community",
  },
  facebook: {
    label: "Facebook",
    icon: "f",
    description: "Social community",
  },
  twitter: {
    label: "X",
    icon: "𝕏",
    description: "Real-time conversation",
  },
  youtube: {
    label: "YouTube",
    icon: "▶",
    description: "Video audience",
  },
  pinterest: {
    label: "Pinterest",
    icon: "P",
    description: "Visual discovery",
  },
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

      const [profileData, accountsData] = await Promise.all([
        getMe(),
        getSocialAccounts(),
      ]);

      setProfile(profileData);
      setAccounts(accountsData);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load insights";

      setError(message);

      if (
        err instanceof Error &&
        message.toLowerCase().includes("invalid or expired")
      ) {
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
      <main
        className="flex min-h-screen items-center justify-center"
        style={{
          background: "#07080C",
          color: "#E8E9F5",
        }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "#00E5FF",
              borderRightColor: "#9B5CFF",
            }}
          />

          <p
            className="text-sm"
            style={{ color: "#777A8D" }}
          >
            Reading your social signals...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: "#07080C",
        color: "#E8E9F5",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >
      <div className="flex min-h-screen">

        {/* ================================================= */}
        {/* SIDEBAR */}
        {/* ================================================= */}

        <aside
          className="hidden w-64 shrink-0 border-r p-5 md:flex md:flex-col"
          style={{
            borderColor:
              "rgba(255,255,255,0.07)",
            background:
              "rgba(10,11,17,0.9)",
          }}
        >
          {/* BRAND */}

          <div className="mb-10 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                color: "#05060A",
              }}
            >
              S
            </div>

            <div>
              <div
                className="font-semibold"
                style={{
                  fontFamily:
                    "var(--font-fraunces), serif",
                }}
              >
                SocialPilot
              </div>

              <div
                className="text-[9px] uppercase tracking-[0.2em]"
                style={{
                  color: "#55596B",
                }}
              >
                Command Center
              </div>
            </div>
          </div>

          {/* NAVIGATION */}

          <p
            className="mb-3 px-2 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: "#505365" }}
          >
            Workspace
          </p>

          <div className="space-y-1">

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#85889A" }}
            >
              <span>◉</span>
              Command Center
            </button>

            <button
              onClick={() =>
                router.push("/create-post")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#85889A" }}
            >
              <span>✦</span>
              Create
            </button>

            <button
              onClick={() =>
                router.push("/content-lab")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#85889A" }}
            >
              <span>◇</span>
              Content Lab
            </button>

            {/* ACTIVE */}

            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm"
              style={{
                background:
                  "rgba(0,229,255,0.09)",
                color: "#00E5FF",
              }}
            >
              <span>◌</span>
              Insights
            </button>

            <button
              onClick={() =>
                router.push("/audience")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#85889A" }}
            >
              <span>◎</span>
              Audience
            </button>
          </div>

          {/* CONNECTED PLATFORMS */}

          <p
            className="mb-3 mt-10 px-2 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: "#505365" }}
          >
            Connected
          </p>

          <div className="space-y-2">
            {accounts.length === 0 ? (
              <p
                className="px-2 text-xs"
                style={{ color: "#55596B" }}
              >
                No platforms connected
              </p>
            ) : (
              accounts.slice(0, 5).map((account) => {
                const info =
                  PLATFORM_DATA[
                    account.platform
                  ];

                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 px-2 py-2"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                      style={{
                        background:
                          "rgba(255,255,255,0.06)",
                        color: "#A7A9B7",
                      }}
                    >
                      {info?.icon || "●"}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-xs">
                        {account.account_name}
                      </p>

                      <p
                        className="text-[10px]"
                        style={{
                          color: "#55596B",
                        }}
                      >
                        {info?.label ||
                          account.platform}
                      </p>
                    </div>

                    <span
                      className="ml-auto h-1.5 w-1.5 rounded-full"
                      style={{
                        background: "#35E6A1",
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* BOTTOM */}

          <div className="mt-auto space-y-1">
            <button
              onClick={() =>
                router.push("/settings")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              ⚙ Preferences
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* ================================================= */}
        {/* MAIN CONTENT */}
        {/* ================================================= */}

        <section className="flex-1">

          {/* TOP BAR */}

          <header
            className="flex items-center justify-between border-b px-6 py-5 md:px-10"
            style={{
              borderColor:
                "rgba(255,255,255,0.07)",
            }}
          >
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{
                  color: "#00E5FF",
                }}
              >
                Intelligence Layer
              </p>

              <p
                className="mt-1 text-xs"
                style={{
                  color: "#55596B",
                }}
              >
                Understand what your content is doing
              </p>
            </div>

            <div className="flex items-center gap-3">

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-xl px-4 py-2.5 text-xs transition-colors hover:bg-white/10 disabled:opacity-50"
                style={{
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                  color: "#9A9DAD",
                }}
              >
                {refreshing
                  ? "Refreshing..."
                  : "↻ Refresh"}
              </button>

              <button
                onClick={() =>
                  router.push("/create-post")
                }
                className="rounded-xl px-4 py-2.5 text-xs font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                  color: "#05060A",
                }}
              >
                + Create
              </button>

            </div>
          </header>

          {/* PAGE */}

          <div className="mx-auto max-w-7xl p-6 md:p-10">

            {/* HEADER */}

            <div className="mb-10">

              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

                <div>

                  <p
                    className="mb-2 text-[10px] uppercase tracking-[0.25em]"
                    style={{
                      color: "#55596B",
                    }}
                  >
                    Social intelligence
                  </p>

                  <h1
                    className="text-4xl md:text-5xl"
                    style={{
                      fontFamily:
                        "var(--font-fraunces), serif",
                      fontWeight: 600,
                    }}
                  >
                    See the signal.
                  </h1>

                  <p
                    className="mt-3 max-w-2xl text-sm leading-6"
                    style={{
                      color: "#686B7D",
                    }}
                  >
                    Insights turns your connected
                    social presence into signals,
                    patterns and decisions.
                  </p>

                </div>

                <div
                  className="rounded-2xl px-5 py-4"
                  style={{
                    background:
                      "rgba(255,255,255,0.025)",
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                  }}
                >

                  <p
                    className="text-[9px] uppercase tracking-widest"
                    style={{
                      color: "#55596B",
                    }}
                  >
                    Connected sources
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {accounts.length}
                  </p>

                  <p
                    className="mt-1 text-[10px]"
                    style={{
                      color: "#35E6A1",
                    }}
                  >
                    active account
                    {accounts.length === 1
                      ? ""
                      : "s"}
                  </p>

                </div>

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div
                className="mb-6 rounded-xl p-4 text-sm"
                style={{
                  background:
                    "rgba(255,61,110,0.08)",
                  border:
                    "1px solid rgba(255,61,110,0.2)",
                  color: "#FF6B8B",
                }}
              >
                {error}
              </div>
            )}

            {/* ================================================= */}
            {/* ANALYTICS STATUS */}
            {/* ================================================= */}

            <div
              className="relative overflow-hidden rounded-3xl p-6 md:p-8"
              style={{
                background:
                  "linear-gradient(135deg,rgba(0,229,255,0.06),rgba(155,92,255,0.08))",
                border:
                  "1px solid rgba(155,92,255,0.16)",
              }}
            >

              <div
                className="absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl"
                style={{
                  background:
                    "rgba(0,229,255,0.08)",
                }}
              />

              <div className="relative">

                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                  <div>

                    <div className="flex items-center gap-3">

                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                          background:
                            "rgba(0,229,255,0.1)",
                          color: "#00E5FF",
                        }}
                      >
                        ✦
                      </span>

                      <div>

                        <p
                          className="text-[10px] uppercase tracking-widest"
                          style={{
                            color: "#777A8D",
                          }}
                        >
                          Analytics engine
                        </p>

                        <h2
                          className="mt-1 text-xl"
                          style={{
                            fontFamily:
                              "var(--font-fraunces), serif",
                          }}
                        >
                          Waiting for live signals
                        </h2>

                      </div>

                    </div>

                    <p
                      className="mt-5 max-w-xl text-sm leading-6"
                      style={{
                        color: "#85889A",
                      }}
                    >
                      Your accounts are connected,
                      but platform-level analytics are
                      not available yet. Once the
                      respective social APIs are
                      connected, SocialPilot can replace
                      these states with live performance
                      data.
                    </p>

                  </div>

                  <div
                    className="rounded-2xl p-5 md:min-w-[220px]"
                    style={{
                      background:
                        "rgba(0,0,0,0.16)",
                      border:
                        "1px solid rgba(255,255,255,0.05)",
                    }}
                  >

                    <p
                      className="text-[9px] uppercase tracking-widest"
                      style={{
                        color: "#55596B",
                      }}
                    >
                      Data status
                    </p>

                    <div className="mt-4 flex items-center gap-3">

                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            accounts.length > 0
                              ? "#F5B942"
                              : "#777A8D",
                        }}
                      />

                      <span className="text-sm">
                        {accounts.length > 0
                          ? "Awaiting API data"
                          : "No data sources"}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* ================================================= */}
            {/* SIGNAL CARDS */}
            {/* ================================================= */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {[
                {
                  label: "Reach",
                  value: "—",
                  description:
                    "Live platform data required",
                  icon: "↗",
                },
                {
                  label: "Engagement",
                  value: "—",
                  description:
                    "Waiting for interactions",
                  icon: "◎",
                },
                {
                  label: "Impressions",
                  value: "—",
                  description:
                    "Platform analytics required",
                  icon: "◌",
                },
                {
                  label: "Growth",
                  value: "—",
                  description:
                    "Historical data required",
                  icon: "⌁",
                },
              ].map((item) => (

                <div
                  key={item.label}
                  className="rounded-2xl p-5"
                  style={{
                    background:
                      "rgba(255,255,255,0.025)",
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                  }}
                >

                  <div className="flex items-center justify-between">

                    <span
                      className="text-xs"
                      style={{
                        color: "#646879",
                      }}
                    >
                      {item.label}
                    </span>

                    <span
                      style={{
                        color: "#55596B",
                      }}
                    >
                      {item.icon}
                    </span>

                  </div>

                  <p
                    className="mt-5 text-3xl font-semibold"
                    style={{
                      color: "#737686",
                    }}
                  >
                    {item.value}
                  </p>

                  <p
                    className="mt-2 text-[10px] leading-4"
                    style={{
                      color: "#55596B",
                    }}
                  >
                    {item.description}
                  </p>

                </div>

              ))}

            </div>

            {/* ================================================= */}
            {/* SIGNAL MAP + AI */}
            {/* ================================================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">

              {/* SIGNAL MAP */}

              <div
                className="rounded-2xl p-6 lg:col-span-2"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                <div className="flex items-start justify-between">

                  <div>

                    <p
                      className="text-[10px] uppercase tracking-widest"
                      style={{
                        color: "#55596B",
                      }}
                    >
                      Signal map
                    </p>

                    <h2
                      className="mt-2 text-xl"
                      style={{
                        fontFamily:
                          "var(--font-fraunces), serif",
                      }}
                    >
                      Your social ecosystem
                    </h2>

                  </div>

                  <span
                    className="rounded-full px-3 py-1 text-[9px]"
                    style={{
                      background:
                        "rgba(255,255,255,0.04)",
                      color: "#686B7D",
                    }}
                  >
                    {accounts.length} source
                    {accounts.length === 1
                      ? ""
                      : "s"}
                  </span>

                </div>

                {accounts.length === 0 ? (

                  <div
                    className="mt-8 rounded-2xl p-8 text-center"
                    style={{
                      background:
                        "rgba(255,255,255,0.02)",
                      border:
                        "1px dashed rgba(255,255,255,0.08)",
                    }}
                  >

                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        background:
                          "rgba(0,229,255,0.07)",
                        color: "#00E5FF",
                      }}
                    >
                      ◈
                    </div>

                    <p className="mt-4 text-sm">
                      No signal sources yet
                    </p>

                    <p
                      className="mx-auto mt-2 max-w-sm text-xs leading-5"
                      style={{
                        color: "#55596B",
                      }}
                    >
                      Connect a social account from
                      your Command Center to start
                      building your intelligence map.
                    </p>

                    <button
                      onClick={() =>
                        router.push("/dashboard")
                      }
                      className="mt-5 rounded-xl px-4 py-2.5 text-xs"
                      style={{
                        background:
                          "rgba(0,229,255,0.08)",
                        color: "#00E5FF",
                        border:
                          "1px solid rgba(0,229,255,0.12)",
                      }}
                    >
                      Connect account →
                    </button>

                  </div>

                ) : (

                  <div className="mt-8 space-y-3">

                    {accounts.map((account, index) => {

                      const info =
                        PLATFORM_DATA[
                          account.platform
                        ];

                      return (
                        <div
                          key={account.id}
                          className="group rounded-2xl p-4 transition-colors hover:bg-white/[0.025]"
                          style={{
                            border:
                              "1px solid rgba(255,255,255,0.05)",
                          }}
                        >

                          <div className="flex items-center gap-4">

                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                              style={{
                                background:
                                  index % 2 === 0
                                    ? "rgba(0,229,255,0.08)"
                                    : "rgba(155,92,255,0.08)",
                                color:
                                  index % 2 === 0
                                    ? "#00E5FF"
                                    : "#B58CFF",
                              }}
                            >
                              {info?.icon || "●"}
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex items-center justify-between">

                                <div>

                                  <p className="text-sm font-medium">
                                    {account.account_name}
                                  </p>

                                  <p
                                    className="mt-1 text-[10px]"
                                    style={{
                                      color: "#55596B",
                                    }}
                                  >
                                    {info?.label ||
                                      account.platform}
                                    {" · "}
                                    {info?.description ||
                                      "Connected source"}
                                  </p>

                                </div>

                                <span
                                  className="rounded-full px-3 py-1 text-[9px]"
                                  style={{
                                    background:
                                      "rgba(245,185,66,0.08)",
                                    color: "#C99A38",
                                  }}
                                >
                                  API pending
                                </span>

                              </div>

                              <div
                                className="mt-4 h-1 overflow-hidden rounded-full"
                                style={{
                                  background:
                                    "rgba(255,255,255,0.04)",
                                }}
                              >
                                <div
                                  className="h-full w-1/3 rounded-full"
                                  style={{
                                    background:
                                      "linear-gradient(90deg,#00E5FF,#9B5CFF)",
                                    opacity: 0.35,
                                  }}
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
                style={{
                  background:
                    "linear-gradient(145deg,rgba(155,92,255,0.08),rgba(0,229,255,0.04))",
                  border:
                    "1px solid rgba(155,92,255,0.15)",
                }}
              >

                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "rgba(155,92,255,0.12)",
                    color: "#B58CFF",
                  }}
                >
                  ✦
                </div>

                <p
                  className="mt-6 text-[10px] uppercase tracking-widest"
                  style={{
                    color: "#777A8D",
                  }}
                >
                  AI interpretation
                </p>

                <h2
                  className="mt-2 text-xl"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Intelligence comes next.
                </h2>

                <p
                  className="mt-4 text-sm leading-6"
                  style={{
                    color: "#85889A",
                  }}
                >
                  Once SocialPilot receives live
                  performance data, the AI layer can
                  identify unusual changes, winning
                  content patterns and opportunities.
                </p>

                <div className="mt-6 space-y-3">

                  {[
                    [
                      "01",
                      "Detect",
                      "Find unusual performance changes.",
                    ],
                    [
                      "02",
                      "Explain",
                      "Understand why a signal changed.",
                    ],
                    [
                      "03",
                      "Recommend",
                      "Turn patterns into your next move.",
                    ],
                  ].map(
                    ([number, title, text]) => (

                      <div
                        key={number}
                        className="rounded-xl p-4"
                        style={{
                          background:
                            "rgba(0,0,0,0.15)",
                        }}
                      >

                        <div className="flex gap-3">

                          <span
                            className="text-[9px]"
                            style={{
                              color: "#9B5CFF",
                            }}
                          >
                            {number}
                          </span>

                          <div>

                            <p className="text-xs font-medium">
                              {title}
                            </p>

                            <p
                              className="mt-1 text-[10px] leading-4"
                              style={{
                                color: "#686B7D",
                              }}
                            >
                              {text}
                            </p>

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            </div>

            {/* ================================================= */}
            {/* BOTTOM INSIGHT AREAS */}
            {/* ================================================= */}

            <div className="mt-6 grid gap-6 md:grid-cols-3">

              {/* CONTENT SIGNAL */}

              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                <span
                  className="text-lg"
                  style={{
                    color: "#00E5FF",
                  }}
                >
                  ◇
                </span>

                <h3
                  className="mt-5 text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Content signal
                </h3>

                <p
                  className="mt-3 text-xs leading-5"
                  style={{
                    color: "#686B7D",
                  }}
                >
                  Discover which themes, formats
                  and messages create the strongest
                  response.
                </p>

                <div
                  className="mt-5 rounded-xl px-4 py-3 text-[10px]"
                  style={{
                    background:
                      "rgba(255,255,255,0.025)",
                    color: "#55596B",
                  }}
                >
                  Waiting for content analytics
                </div>

              </div>

              {/* AUDIENCE SIGNAL */}

              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                <span
                  className="text-lg"
                  style={{
                    color: "#B58CFF",
                  }}
                >
                  ◎
                </span>

                <h3
                  className="mt-5 text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Audience signal
                </h3>

                <p
                  className="mt-3 text-xs leading-5"
                  style={{
                    color: "#686B7D",
                  }}
                >
                  Understand audience behaviour,
                  response patterns and emerging
                  interests.
                </p>

                <div
                  className="mt-5 rounded-xl px-4 py-3 text-[10px]"
                  style={{
                    background:
                      "rgba(255,255,255,0.025)",
                    color: "#55596B",
                  }}
                >
                  Audience data not connected
                </div>

              </div>

              {/* OPPORTUNITY */}

              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                <span
                  className="text-lg"
                  style={{
                    color: "#35E6A1",
                  }}
                >
                  ↗
                </span>

                <h3
                  className="mt-5 text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Opportunity
                </h3>

                <p
                  className="mt-3 text-xs leading-5"
                  style={{
                    color: "#686B7D",
                  }}
                >
                  Surface opportunities where your
                  social presence can improve or grow.
                </p>

                <div
                  className="mt-5 rounded-xl px-4 py-3 text-[10px]"
                  style={{
                    background:
                      "rgba(255,255,255,0.025)",
                    color: "#55596B",
                  }}
                >
                  AI recommendations will appear here
                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div
              className="mt-10 border-t pt-6"
              style={{
                borderColor:
                  "rgba(255,255,255,0.06)",
              }}
            >

              <div className="flex flex-col justify-between gap-3 text-[10px] sm:flex-row">

                <p
                  style={{
                    color: "#454858",
                  }}
                >
                  SocialPilot Intelligence Layer
                </p>

                <p
                  style={{
                    color: "#454858",
                  }}
                >
                  {profile?.name
                    ? `Workspace · ${profile.name}`
                    : "Workspace"}
                </p>

              </div>

            </div>

          </div>
        </section>
      </div>
    </main>
  );
}