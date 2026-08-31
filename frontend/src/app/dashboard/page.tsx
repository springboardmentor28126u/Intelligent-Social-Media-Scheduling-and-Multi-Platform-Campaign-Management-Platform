"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe,
  getSocialAccounts,
  connectSocialAccount,
} from "@/lib/api";

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
  { icon: string; label: string }
> = {
  facebook: {
    icon: "f",
    label: "Facebook",
  },
  instagram: {
    icon: "◎",
    label: "Instagram",
  },
  linkedin: {
    icon: "in",
    label: "LinkedIn",
  },
  twitter: {
    icon: "𝕏",
    label: "X",
  },
  youtube: {
    icon: "▶",
    label: "YouTube",
  },
  pinterest: {
    icon: "P",
    label: "Pinterest",
  },
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [accounts, setAccounts] =
    useState<SocialAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [platform, setPlatform] =
    useState("linkedin");

  const [accountName, setAccountName] =
    useState("");

  const [connecting, setConnecting] =
    useState(false);

  /* =====================================================
     LOAD DASHBOARD DATA
  ===================================================== */

  const loadData = useCallback(async () => {
    try {
      const [profileData, accountsData] =
        await Promise.all([
          getMe(),
          getSocialAccounts(),
        ]);

      setProfile(profileData);
      setAccounts(accountsData);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load SocialPilot"
      );

      if (
        err instanceof Error &&
        err.message.includes("Invalid or expired")
      ) {
        localStorage.removeItem("access_token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  /* =====================================================
     AUTH CHECK
  ===================================================== */

  useEffect(() => {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      router.push("/login");
      return;
    }

    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    return () =>
      window.clearTimeout(timer);
  }, [router, loadData]);

  /* =====================================================
     CONNECT SOCIAL ACCOUNT
  ===================================================== */

  async function handleConnect(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!accountName.trim()) return;

    setConnecting(true);
    setError("");

    try {
      await connectSocialAccount(
        platform,
        accountName.trim()
      );

      setAccountName("");

      const updated =
        await getSocialAccounts();

      setAccounts(updated);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect account"
      );
    } finally {
      setConnecting(false);
    }
  }

  /* =====================================================
     LOGOUT
  ===================================================== */

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");

    router.push("/");
  }

  /* =====================================================
     LOADING SCREEN
  ===================================================== */

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
            style={{
              color: "#777A8D",
            }}
          >
            Initializing command center...
          </p>

        </div>
      </main>
    );
  }

  /* =====================================================
     DASHBOARD
  ===================================================== */

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

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside
          className="hidden w-64 shrink-0 border-r p-5 md:flex md:flex-col"
          style={{
            borderColor:
              "rgba(255,255,255,0.07)",
            background:
              "rgba(10,11,17,0.85)",
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

          {/* WORKSPACE */}

          <p
            className="mb-3 px-2 text-[10px] uppercase tracking-[0.2em]"
            style={{
              color: "#505365",
            }}
          >
            Workspace
          </p>

          <div className="space-y-1">

            {/* COMMAND CENTER */}

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm"
              style={{
                background:
                  "rgba(0,229,255,0.09)",
                color: "#00E5FF",
              }}
            >
              <span>◉</span>
              Command Center
            </button>

            {/* CREATE */}

            <button
              onClick={() =>
                router.push("/create-post")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{
                color: "#85889A",
              }}
            >
              <span>✦</span>
              Create
            </button>

            {/* CONTENT LAB */}

            <button
              onClick={() =>
                router.push("/content-lab")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{
                color: "#85889A",
              }}
            >
              <span>◇</span>
              Content Lab
            </button>

            {/* INSIGHTS */}

            <button
              onClick={() =>
                router.push("/insights")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{
                color: "#85889A",
              }}
            >
              <span>◌</span>
              Insights
            </button>

            {/* AUDIENCE */}

            <button
              onClick={() =>
                router.push("/audience")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{
                color: "#85889A",
              }}
            >
              <span>◎</span>
              Audience
            </button>

          </div>

          {/* =================================================
              CONNECTED PLATFORMS
          ================================================= */}

          <p
            className="mb-3 mt-10 px-2 text-[10px] uppercase tracking-[0.2em]"
            style={{
              color: "#505365",
            }}
          >
            Connected
          </p>

          <div className="space-y-2">

            {accounts.length === 0 ? (

              <p
                className="px-2 text-xs"
                style={{
                  color: "#55596B",
                }}
              >
                No platforms connected
              </p>

            ) : (

              accounts
                .slice(0, 5)
                .map((account) => {

                  const platformInfo =
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
                        {platformInfo?.icon ||
                          "●"}
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
                          {platformInfo?.label ||
                            account.platform}
                        </p>

                      </div>

                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full"
                        style={{
                          background:
                            "#35E6A1",
                        }}
                      />

                    </div>
                  );
                })
            )}

          </div>

          {/* =================================================
              ACCOUNT / SETTINGS
          ================================================= */}

          <div
            className="mt-auto border-t pt-4"
            style={{
              borderColor:
                "rgba(255,255,255,0.07)",
            }}
          >

            <p
              className="mb-2 px-2 text-[10px] uppercase tracking-[0.2em]"
              style={{
                color: "#505365",
              }}
            >
              Account
            </p>

            {/* SETTINGS */}

            <button
              onClick={() =>
                router.push("/settings")
              }
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all duration-200 hover:bg-white/5"
              style={{
                color: "#777A8D",
              }}
            >

              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                style={{
                  background:
                    "rgba(255,255,255,0.035)",
                }}
              >
                ⚙
              </span>

              <span className="group-hover:text-[#E8E9F5]">
                Settings
              </span>

              <span
                className="ml-auto text-xs opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  color: "#00E5FF",
                }}
              >
                →
              </span>

            </button>

            {/* SIGN OUT */}

            <button
              onClick={handleLogout}
              className="group mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all duration-200 hover:bg-white/5"
              style={{
                color: "#777A8D",
              }}
            >

              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                style={{
                  background:
                    "rgba(255,255,255,0.035)",
                }}
              >
                ↪
              </span>

              <span className="group-hover:text-[#FF6B8B]">
                Sign out
              </span>

            </button>

          </div>

        </aside>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

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
                Command Center
              </p>

              <p
                className="mt-1 text-xs"
                style={{
                  color: "#55596B",
                }}
              >
                Your social system at a glance
              </p>

            </div>

            <div className="flex items-center gap-4">

              {/* CREATE */}

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

              {/* USER */}

              <div className="hidden text-right sm:block">

                <p className="text-xs">
                  {profile?.name || "User"}
                </p>

                <p
                  className="text-[10px]"
                  style={{
                    color: "#55596B",
                  }}
                >
                  {profile?.role ||
                    "Creator"}
                </p>

              </div>

              {/* AVATAR */}

              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background:
                    "rgba(155,92,255,0.15)",
                  color: "#B58CFF",
                  border:
                    "1px solid rgba(155,92,255,0.25)",
                }}
              >
                {profile?.name
                  ?.charAt(0)
                  .toUpperCase() || "U"}
              </div>

            </div>

          </header>

          {/* PAGE CONTENT */}

          <div className="mx-auto max-w-7xl p-6 md:p-10">

            {/* GREETING */}

            <div className="mb-10">

              <h1
                className="text-3xl md:text-4xl"
                style={{
                  fontFamily:
                    "var(--font-fraunces), serif",
                  fontWeight: 600,
                }}
              >
                Good to see you
                {profile?.name
                  ? `, ${
                      profile.name.split(
                        " "
                      )[0]
                    }`
                  : ""}
                .
              </h1>

              <p
                className="mt-2 max-w-xl text-sm"
                style={{
                  color: "#686B7D",
                }}
              >
                Everything happening across
                your social presence, distilled
                into one intelligent workspace.
              </p>

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

            {/* =================================================
                METRICS
            ================================================= */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {[
                {
                  label: "Total Reach",
                  value: "24.8K",
                  change: "+18.4%",
                  icon: "↗",
                },
                {
                  label: "Engagement",
                  value: "8.4%",
                  change: "+2.1%",
                  icon: "◎",
                },
                {
                  label: "Published",
                  value: "18",
                  change: "+6 this week",
                  icon: "✦",
                },
                {
                  label: "Platforms",
                  value: String(
                    accounts.length
                  ),
                  change: "connected",
                  icon: "◈",
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

                  <div className="flex justify-between">

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
                        color: "#00E5FF",
                      }}
                    >
                      {item.icon}
                    </span>

                  </div>

                  <div className="mt-5 text-2xl font-semibold">
                    {item.value}
                  </div>

                  <p
                    className="mt-1 text-[10px]"
                    style={{
                      color: "#35E6A1",
                    }}
                  >
                    {item.change}
                  </p>

                </div>

              ))}

            </div>

            {/* =================================================
                PERFORMANCE + AI
            ================================================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">

              {/* PERFORMANCE */}

              <div
                className="rounded-2xl p-6 lg:col-span-2"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                <div className="flex items-center justify-between">

                  <div>

                    <p
                      className="text-xs uppercase tracking-widest"
                      style={{
                        color: "#55596B",
                      }}
                    >
                      Social pulse
                    </p>

                    <h2
                      className="mt-2 text-xl"
                      style={{
                        fontFamily:
                          "var(--font-fraunces), serif",
                      }}
                    >
                      Performance momentum
                    </h2>

                  </div>

                  <span
                    className="rounded-full px-3 py-1 text-[10px]"
                    style={{
                      background:
                        "rgba(53,230,161,0.08)",
                      color: "#35E6A1",
                    }}
                  >
                    Growing
                  </span>

                </div>

                <div className="mt-8 flex h-48 items-end gap-3">

                  {[
                    38,
                    52,
                    45,
                    68,
                    58,
                    76,
                    82,
                    70,
                    91,
                    84,
                    96,
                    100,
                  ].map(
                    (height, index) => (

                      <div
                        key={index}
                        className="group relative flex-1"
                      >

                        <div
                          className="absolute bottom-0 w-full rounded-t-lg transition-all group-hover:opacity-70"
                          style={{
                            height:
                              `${height}%`,
                            background:
                              "linear-gradient(to top,rgba(0,229,255,0.12),rgba(155,92,255,0.65))",
                          }}
                        />

                      </div>

                    )
                  )}

                </div>

                <div
                  className="mt-4 flex justify-between text-[9px]"
                  style={{
                    color: "#4F5262",
                  }}
                >
                  <span>
                    12 weeks ago
                  </span>

                  <span>
                    Today
                  </span>
                </div>

              </div>

              {/* AI INSIGHT */}

              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    "linear-gradient(145deg,rgba(0,229,255,0.07),rgba(155,92,255,0.08))",
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
                  AI Pilot
                </p>

                <h2
                  className="mt-2 text-xl"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  A signal worth noticing.
                </h2>

                <p
                  className="mt-4 text-sm leading-6"
                  style={{
                    color: "#85889A",
                  }}
                >
                  Your audience is responding
                  strongly to educational and
                  technology-focused content.
                </p>

                <div
                  className="mt-6 rounded-xl p-4"
                  style={{
                    background:
                      "rgba(0,0,0,0.18)",
                  }}
                >

                  <p
                    className="text-xs leading-5"
                    style={{
                      color: "#AEB0BF",
                    }}
                  >
                    Recommendation
                  </p>

                  <p
                    className="mt-1 text-xs leading-5"
                    style={{
                      color: "#E1E2EA",
                    }}
                  >
                    Experiment with more
                    educational posts this
                    week.
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                CONTENT LAB + CONNECT
            ================================================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              {/* CONTENT LAB */}

              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                <div className="flex items-center justify-between">

                  <div>

                    <p
                      className="text-[10px] uppercase tracking-widest"
                      style={{
                        color: "#55596B",
                      }}
                    >
                      Content Lab
                    </p>

                    <h2
                      className="mt-1 text-lg"
                      style={{
                        fontFamily:
                          "var(--font-fraunces), serif",
                      }}
                    >
                      Your content pipeline
                    </h2>

                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/content-lab"
                      )
                    }
                    className="text-xs"
                    style={{
                      color: "#00E5FF",
                    }}
                  >
                    Open →
                  </button>

                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">

                  {[
                    ["Ideas", "07"],
                    ["Drafts", "04"],
                    ["Ready", "03"],
                  ].map(
                    ([label, number]) => (

                      <div
                        key={label}
                        className="rounded-xl p-4"
                        style={{
                          background:
                            "rgba(255,255,255,0.025)",
                        }}
                      >

                        <p
                          className="text-[10px]"
                          style={{
                            color:
                              "#5C5F70",
                          }}
                        >
                          {label}
                        </p>

                        <p className="mt-3 text-2xl">
                          {number}
                        </p>

                      </div>

                    )
                  )}

                </div>

              </div>

              {/* CONNECT ACCOUNT */}

              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                <p
                  className="text-[10px] uppercase tracking-widest"
                  style={{
                    color: "#55596B",
                  }}
                >
                  Expand your network
                </p>

                <h2
                  className="mt-1 text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Connect another platform
                </h2>

                <form
                  onSubmit={handleConnect}
                  className="mt-5 flex flex-wrap gap-2"
                >

                  <select
                    value={platform}
                    onChange={(e) =>
                      setPlatform(
                        e.target.value
                      )
                    }
                    className="rounded-xl px-3 py-3 text-xs outline-none"
                    style={{
                      background:
                        "#0B0C12",
                      border:
                        "1px solid rgba(255,255,255,0.08)",
                      color:
                        "#B9BBC7",
                    }}
                  >

                    <option value="linkedin">
                      LinkedIn
                    </option>

                    <option value="instagram">
                      Instagram
                    </option>

                    <option value="facebook">
                      Facebook
                    </option>

                    <option value="twitter">
                      X
                    </option>

                    <option value="youtube">
                      YouTube
                    </option>

                    <option value="pinterest">
                      Pinterest
                    </option>

                  </select>

                  <input
                    value={accountName}
                    onChange={(e) =>
                      setAccountName(
                        e.target.value
                      )
                    }
                    placeholder="@account"
                    required
                    className="min-w-0 flex-1 rounded-xl px-3 py-3 text-xs outline-none"
                    style={{
                      background:
                        "#0B0C12",
                      border:
                        "1px solid rgba(255,255,255,0.08)",
                      color:
                        "#E8E9F5",
                    }}
                  />

                  <button
                    type="submit"
                    disabled={connecting}
                    className="rounded-xl px-4 py-3 text-xs font-semibold disabled:opacity-50"
                    style={{
                      background:
                        "rgba(0,229,255,0.1)",
                      color:
                        "#00E5FF",
                      border:
                        "1px solid rgba(0,229,255,0.15)",
                    }}
                  >
                    {connecting
                      ? "..."
                      : "Connect"}
                  </button>

                </form>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}