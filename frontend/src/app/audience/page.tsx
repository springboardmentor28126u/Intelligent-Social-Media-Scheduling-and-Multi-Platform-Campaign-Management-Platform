"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AudienceData = {
  total: string;
  growth: string;
  engagement: string;
  returning: string;
};

const platforms = [
  {
    name: "LinkedIn",
    icon: "in",
    audience: "8.4K",
    growth: "+21%",
    percentage: 74,
  },
  {
    name: "Instagram",
    icon: "◎",
    audience: "6.7K",
    growth: "+16%",
    percentage: 61,
  },
  {
    name: "Facebook",
    icon: "f",
    audience: "5.2K",
    growth: "+11%",
    percentage: 48,
  },
  {
    name: "X",
    icon: "𝕏",
    audience: "4.5K",
    growth: "+8%",
    percentage: 39,
  },
];

const locations = [
  { name: "India", percentage: 42 },
  { name: "United States", percentage: 21 },
  { name: "United Kingdom", percentage: 13 },
  { name: "Other", percentage: 24 },
];

const interests = [
  { name: "Technology", value: 86 },
  { name: "Artificial Intelligence", value: 78 },
  { name: "Business", value: 69 },
  { name: "Education", value: 61 },
  { name: "Startups", value: 54 },
];

export default function AudiencePage() {
  const router = useRouter();

  const [audience, setAudience] = useState<AudienceData>({
    total: "24.8K",
    growth: "+18.4%",
    engagement: "8.4%",
    returning: "64%",
  });

  const [activePeriod, setActivePeriod] = useState("30D");
  const [selectedPlatform, setSelectedPlatform] = useState("All");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.push("/login");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");

    router.push("/");
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: "#07080C",
        color: "#E8E9F5",
        fontFamily: "var(--font-plex-mono), monospace",
      }}
    >
      <div className="flex min-h-screen">

        {/* ===================================================== */}
        {/* SIDEBAR */}
        {/* ===================================================== */}

        <aside
          className="hidden w-64 shrink-0 border-r p-5 md:flex md:flex-col"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "rgba(10,11,17,0.9)",
          }}
        >
          {/* BRAND */}

          <button
            onClick={() => router.push("/dashboard")}
            className="mb-10 flex items-center gap-3 text-left"
          >
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
                Audience Intelligence
              </div>
            </div>
          </button>

          {/* WORKSPACE */}

          <p
            className="mb-3 px-2 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: "#505365" }}
          >
            Workspace
          </p>

          <div className="space-y-1">

            <button
              onClick={() => router.push("/dashboard")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              <span>◉</span>
              Command Center
            </button>

            <button
              onClick={() => router.push("/create-post")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              <span>✦</span>
              Create
            </button>

            <button
              onClick={() => router.push("/content-lab")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              <span>◇</span>
              Content Lab
            </button>

            <button
              onClick={() => router.push("/insights")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              <span>◌</span>
              Insights
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
              <span>◎</span>
              Audience
            </button>

          </div>

          {/* INTELLIGENCE */}

          <p
            className="mb-3 mt-10 px-2 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: "#505365" }}
          >
            Intelligence
          </p>

          <div className="space-y-1">

            <button
              onClick={() => router.push("/insights")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              <span>✧</span>
              AI Insights
            </button>

            <button
              onClick={() => router.push("/settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "#777A8D" }}
            >
              <span>⚙</span>
              Preferences
            </button>

          </div>

          {/* BOTTOM */}

          <div className="mt-auto">

            <div
              className="mb-4 rounded-xl p-4"
              style={{
                background:
                  "linear-gradient(145deg,rgba(0,229,255,0.05),rgba(155,92,255,0.08))",
                border:
                  "1px solid rgba(155,92,255,0.12)",
              }}
            >
              <p
                className="text-[9px] uppercase tracking-widest"
                style={{ color: "#626576" }}
              >
                Audience signal
              </p>

              <p className="mt-2 text-xs leading-5">
                Your audience is becoming more
                technology-focused.
              </p>

              <p
                className="mt-2 text-[10px]"
                style={{ color: "#00E5FF" }}
              >
                +12% signal strength
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm"
              style={{ color: "#777A8D" }}
            >
              ↪ Sign out
            </button>

          </div>
        </aside>

        {/* ===================================================== */}
        {/* MAIN */}
        {/* ===================================================== */}

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
                style={{ color: "#00E5FF" }}
              >
                Audience Intelligence
              </p>

              <p
                className="mt-1 text-xs"
                style={{ color: "#55596B" }}
              >
                Understand who is listening
              </p>

            </div>

            <div className="flex items-center gap-3">

              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl px-4 py-2 text-xs"
                style={{
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                  color: "#85889A",
                }}
              >
                ← Dashboard
              </button>

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
                U
              </div>

            </div>

          </header>

          {/* ================================================= */}
          {/* CONTENT */}
          {/* ================================================= */}

          <div className="mx-auto max-w-7xl p-6 md:p-10">

            {/* HEADER */}

            <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

              <div>

                <p
                  className="mb-2 text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: "#55596B" }}
                >
                  Audience map
                </p>

                <h1
                  className="text-3xl md:text-4xl"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                    fontWeight: 600,
                  }}
                >
                  Know your people.
                </h1>

                <p
                  className="mt-2 max-w-xl text-sm"
                  style={{ color: "#686B7D" }}
                >
                  A living view of the people interacting
                  with your content across connected
                  platforms.
                </p>

              </div>

              {/* PERIOD */}

              <div
                className="flex rounded-xl p-1"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >

                {["7D", "30D", "90D"].map(
                  (period) => (

                    <button
                      key={period}
                      onClick={() =>
                        setActivePeriod(period)
                      }
                      className="rounded-lg px-4 py-2 text-[10px] font-medium"
                      style={{
                        background:
                          activePeriod === period
                            ? "rgba(0,229,255,0.1)"
                            : "transparent",
                        color:
                          activePeriod === period
                            ? "#00E5FF"
                            : "#666978",
                      }}
                    >
                      {period}
                    </button>

                  )
                )}

              </div>

            </div>

            {/* ================================================= */}
            {/* METRICS */}
            {/* ================================================= */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {[
                {
                  label: "Total audience",
                  value: audience.total,
                  change: "+2.8K",
                  icon: "◎",
                },
                {
                  label: "Audience growth",
                  value: audience.growth,
                  change: "vs previous period",
                  icon: "↗",
                },
                {
                  label: "Engagement rate",
                  value: audience.engagement,
                  change: "+2.1%",
                  icon: "◌",
                },
                {
                  label: "Returning audience",
                  value: audience.returning,
                  change: "high loyalty",
                  icon: "↺",
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

                  <p className="mt-5 text-2xl font-semibold">
                    {item.value}
                  </p>

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

            {/* ================================================= */}
            {/* AUDIENCE MOMENTUM */}
            {/* ================================================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">

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
                      style={{ color: "#55596B" }}
                    >
                      Audience momentum
                    </p>

                    <h2
                      className="mt-2 text-xl"
                      style={{
                        fontFamily:
                          "var(--font-fraunces), serif",
                      }}
                    >
                      People are paying more attention.
                    </h2>

                  </div>

                  <span
                    className="rounded-full px-3 py-1 text-[9px]"
                    style={{
                      background:
                        "rgba(53,230,161,0.08)",
                      color: "#35E6A1",
                    }}
                  >
                    HEALTHY
                  </span>

                </div>

                {/* GRAPH */}

                <div className="relative mt-10 h-48">

                  <div
                    className="absolute inset-x-0 top-0 border-t"
                    style={{
                      borderColor:
                        "rgba(255,255,255,0.05)",
                    }}
                  />

                  <div
                    className="absolute inset-x-0 top-1/2 border-t"
                    style={{
                      borderColor:
                        "rgba(255,255,255,0.05)",
                    }}
                  />

                  <div
                    className="absolute inset-x-0 bottom-0 border-t"
                    style={{
                      borderColor:
                        "rgba(255,255,255,0.05)",
                    }}
                  />

                  <div className="absolute inset-0 flex items-end gap-2 px-1">

                    {[
                      35,
                      42,
                      39,
                      51,
                      48,
                      58,
                      55,
                      67,
                      62,
                      76,
                      73,
                      88,
                      82,
                      96,
                    ].map(
                      (height, index) => (

                        <div
                          key={index}
                          className="group relative flex-1"
                          style={{
                            height: "100%",
                          }}
                        >

                          <div
                            className="absolute bottom-0 w-full rounded-t-md transition-all duration-300 group-hover:opacity-70"
                            style={{
                              height: `${height}%`,
                              background:
                                "linear-gradient(to top,rgba(0,229,255,0.08),rgba(0,229,255,0.5))",
                            }}
                          />

                        </div>

                      )
                    )}

                  </div>

                </div>

                <div
                  className="mt-3 flex justify-between text-[9px]"
                  style={{ color: "#4F5262" }}
                >
                  <span>Earlier</span>
                  <span>Now</span>
                </div>

              </div>

              {/* AI CARD */}

              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    "linear-gradient(145deg,rgba(0,229,255,0.06),rgba(155,92,255,0.09))",
                  border:
                    "1px solid rgba(155,92,255,0.15)",
                }}
              >

                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "rgba(155,92,255,0.13)",
                    color: "#B58CFF",
                  }}
                >
                  ✦
                </div>

                <p
                  className="mt-6 text-[10px] uppercase tracking-widest"
                  style={{ color: "#777A8D" }}
                >
                  AI audience read
                </p>

                <h2
                  className="mt-2 text-xl"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Your audience is evolving.
                </h2>

                <p
                  className="mt-4 text-sm leading-6"
                  style={{ color: "#85889A" }}
                >
                  Technology and AI topics are
                  attracting a stronger share of your
                  audience than before.
                </p>

                <div
                  className="mt-6 rounded-xl p-4"
                  style={{
                    background:
                      "rgba(0,0,0,0.18)",
                  }}
                >

                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: "#666978" }}
                  >
                    Signal
                  </p>

                  <p
                    className="mt-2 text-xs leading-5"
                    style={{ color: "#D7D8E2" }}
                  >
                    Increase practical AI and
                    technology content to deepen
                    engagement.
                  </p>

                </div>

              </div>

            </div>

            {/* ================================================= */}
            {/* PLATFORM BREAKDOWN */}
            {/* ================================================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

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
                      style={{ color: "#55596B" }}
                    >
                      Network distribution
                    </p>

                    <h2
                      className="mt-1 text-lg"
                      style={{
                        fontFamily:
                          "var(--font-fraunces), serif",
                      }}
                    >
                      Where your audience lives
                    </h2>

                  </div>

                  <select
                    value={selectedPlatform}
                    onChange={(e) =>
                      setSelectedPlatform(e.target.value)
                    }
                    className="rounded-lg px-3 py-2 text-[10px] outline-none"
                    style={{
                      background: "#0B0C12",
                      border:
                        "1px solid rgba(255,255,255,0.08)",
                      color: "#8B8E9E",
                    }}
                  >
                    <option>All</option>
                    <option>LinkedIn</option>
                    <option>Instagram</option>
                    <option>Facebook</option>
                    <option>X</option>
                  </select>

                </div>

                <div className="mt-7 space-y-5">

                  {platforms.map((platform) => (

                    <div key={platform.name}>

                      <div className="mb-2 flex items-center justify-between">

                        <div className="flex items-center gap-3">

                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold"
                            style={{
                              background:
                                "rgba(255,255,255,0.06)",
                              color: "#B5B7C3",
                            }}
                          >
                            {platform.icon}
                          </span>

                          <span className="text-xs">
                            {platform.name}
                          </span>

                        </div>

                        <div className="text-right">

                          <span className="text-xs">
                            {platform.audience}
                          </span>

                          <span
                            className="ml-2 text-[9px]"
                            style={{
                              color: "#35E6A1",
                            }}
                          >
                            {platform.growth}
                          </span>

                        </div>

                      </div>

                      <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{
                          background:
                            "rgba(255,255,255,0.05)",
                        }}
                      >

                        <div
                          className="h-full rounded-full"
                          style={{
                            width:
                              `${platform.percentage}%`,
                            background:
                              "linear-gradient(90deg,#00E5FF,#9B5CFF)",
                          }}
                        />

                      </div>

                    </div>

                  ))}

                </div>

              </div>

              {/* ================================================= */}
              {/* LOCATIONS */}
              {/* ================================================= */}

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
                  style={{ color: "#55596B" }}
                >
                  Geographic reach
                </p>

                <h2
                  className="mt-1 text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Where people are from
                </h2>

                <div className="mt-7 space-y-6">

                  {locations.map((location) => (

                    <div key={location.name}>

                      <div className="mb-2 flex justify-between">

                        <span
                          className="text-xs"
                          style={{ color: "#B4B6C2" }}
                        >
                          {location.name}
                        </span>

                        <span
                          className="text-xs"
                          style={{ color: "#777A8D" }}
                        >
                          {location.percentage}%
                        </span>

                      </div>

                      <div
                        className="h-2 rounded-full"
                        style={{
                          background:
                            "rgba(255,255,255,0.05)",
                        }}
                      >

                        <div
                          className="h-full rounded-full"
                          style={{
                            width:
                              `${location.percentage}%`,
                            background:
                              "linear-gradient(90deg,#9B5CFF,#00E5FF)",
                          }}
                        />

                      </div>

                    </div>

                  ))}

                </div>

                <div
                  className="mt-7 rounded-xl p-4"
                  style={{
                    background:
                      "rgba(255,255,255,0.025)",
                  }}
                >

                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: "#55596B" }}
                  >
                    Observation
                  </p>

                  <p
                    className="mt-2 text-xs leading-5"
                    style={{ color: "#8A8D9D" }}
                  >
                    India currently represents your
                    largest audience segment.
                  </p>

                </div>

              </div>

            </div>

            {/* ================================================= */}
            {/* INTERESTS */}
            {/* ================================================= */}

            <div
              className="mt-6 rounded-2xl p-6"
              style={{
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.07)",
              }}
            >

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

                <div>

                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: "#55596B" }}
                  >
                    Audience interests
                  </p>

                  <h2
                    className="mt-1 text-lg"
                    style={{
                      fontFamily:
                        "var(--font-fraunces), serif",
                    }}
                  >
                    What captures attention
                  </h2>

                </div>

                <p
                  className="text-[10px]"
                  style={{ color: "#55596B" }}
                >
                  Based on recent engagement signals
                </p>

              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                {interests.map((interest) => (

                  <div
                    key={interest.name}
                    className="rounded-xl p-4"
                    style={{
                      background:
                        "rgba(255,255,255,0.025)",
                    }}
                  >

                    <p
                      className="min-h-[32px] text-xs"
                      style={{ color: "#AEB0BC" }}
                    >
                      {interest.name}
                    </p>

                    <p className="mt-5 text-xl font-semibold">
                      {interest.value}
                    </p>

                    <p
                      className="mt-1 text-[9px]"
                      style={{ color: "#55596B" }}
                    >
                      relevance score
                    </p>

                    <div
                      className="mt-4 h-1 overflow-hidden rounded-full"
                      style={{
                        background:
                          "rgba(255,255,255,0.05)",
                      }}
                    >

                      <div
                        className="h-full rounded-full"
                        style={{
                          width:
                            `${interest.value}%`,
                          background:
                            "linear-gradient(90deg,#00E5FF,#9B5CFF)",
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>

            </div>

            {/* ================================================= */}
            {/* FOOTER ACTION */}
            {/* ================================================= */}

            <div
              className="mt-6 flex flex-col justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center"
              style={{
                background:
                  "linear-gradient(100deg,rgba(0,229,255,0.04),rgba(155,92,255,0.07))",
                border:
                  "1px solid rgba(155,92,255,0.12)",
              }}
            >

              <div>

                <p
                  className="text-xs font-medium"
                  style={{ color: "#D8D9E3" }}
                >
                  Turn audience signals into content.
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{ color: "#666978" }}
                >
                  Use what your audience likes to guide
                  your next post.
                </p>

              </div>

              <button
                onClick={() => router.push("/create-post")}
                className="rounded-xl px-5 py-3 text-xs font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                  color: "#05060A",
                }}
              >
                Create a post →
              </button>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}