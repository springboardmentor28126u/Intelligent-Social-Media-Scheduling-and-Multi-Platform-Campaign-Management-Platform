"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AudienceData = {
  totalFollowers: number;
  growth: number;
  activePercentage: number;
  topLocation: string;
  topAge: string;
  interests: {
    name: string;
    percentage: number;
  }[];
  locations: {
    name: string;
    percentage: number;
  }[];
  ageGroups: {
    name: string;
    percentage: number;
  }[];
};

const DEFAULT_AUDIENCE: AudienceData = {
  totalFollowers: 24800,
  growth: 18.4,
  activePercentage: 72,
  topLocation: "India",
  topAge: "18–24",

  interests: [
    {
      name: "Technology",
      percentage: 68,
    },
    {
      name: "Education",
      percentage: 54,
    },
    {
      name: "AI & Data",
      percentage: 47,
    },
    {
      name: "Career",
      percentage: 39,
    },
  ],

  locations: [
    {
      name: "India",
      percentage: 62,
    },
    {
      name: "United States",
      percentage: 14,
    },
    {
      name: "United Kingdom",
      percentage: 8,
    },
    {
      name: "Other",
      percentage: 16,
    },
  ],

  ageGroups: [
    {
      name: "18–24",
      percentage: 38,
    },
    {
      name: "25–34",
      percentage: 34,
    },
    {
      name: "35–44",
      percentage: 18,
    },
    {
      name: "45+",
      percentage: 10,
    },
  ],
};

export default function AudiencePage() {
  const router = useRouter();

  const audience = DEFAULT_AUDIENCE;

  const [period, setPeriod] = useState("30d");

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
      {/* =========================================
          TOP BAR
      ========================================= */}

      <header
        className="border-b"
        style={{
          borderColor:
            "rgba(255,255,255,0.07)",
          background:
            "rgba(10,11,17,0.88)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">

          {/* BRAND */}

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                color: "#05060A",
              }}
            >
              S
            </button>

            <div>
              <p
                className="font-semibold"
                style={{
                  fontFamily:
                    "var(--font-fraunces), serif",
                }}
              >
                SocialPilot
              </p>

              <p
                className="text-[9px] uppercase tracking-[0.2em]"
                style={{
                  color: "#55596B",
                }}
              >
                Audience
              </p>
            </div>

          </div>

          {/* BACK BUTTON */}

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="rounded-xl px-4 py-2.5 text-xs transition-colors hover:bg-white/5"
            style={{
              color: "#85889A",
              border:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            ← Dashboard
          </button>

        </div>
      </header>

      {/* =========================================
          PAGE CONTENT
      ========================================= */}

      <div className="mx-auto max-w-7xl p-6 md:p-10">

        {/* PAGE HEADER */}

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

          <div>

            <p
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{
                color: "#00E5FF",
              }}
            >
              Audience intelligence
            </p>

            <h1
              className="mt-3 text-3xl md:text-4xl"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
                fontWeight: 600,
              }}
            >
              Know who is listening.
            </h1>

            <p
              className="mt-3 max-w-xl text-sm leading-6"
              style={{
                color: "#686B7D",
              }}
            >
              Understand the people interacting
              with your social presence and discover
              what matters to them.
            </p>

          </div>

          {/* PERIOD SELECTOR */}

          <div
            className="flex w-fit rounded-xl p-1"
            style={{
              background:
                "rgba(255,255,255,0.03)",
              border:
                "1px solid rgba(255,255,255,0.07)",
            }}
          >

            {[
              ["7d", "7D"],
              ["30d", "30D"],
              ["90d", "90D"],
            ].map(([value, label]) => (

              <button
                key={value}
                onClick={() =>
                  setPeriod(value)
                }
                className="rounded-lg px-4 py-2 text-[10px]"
                style={{
                  background:
                    period === value
                      ? "rgba(0,229,255,0.1)"
                      : "transparent",

                  color:
                    period === value
                      ? "#00E5FF"
                      : "#666979",
                }}
              >
                {label}
              </button>

            ))}

          </div>

        </div>

        {/* =========================================
            METRICS
        ========================================= */}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <Metric
            label="Total audience"
            value={audience.totalFollowers.toLocaleString()}
            detail={`+${audience.growth}% growth`}
          />

          <Metric
            label="Active audience"
            value={`${audience.activePercentage}%`}
            detail="Regular interaction"
          />

          <Metric
            label="Top location"
            value={audience.topLocation}
            detail="Largest audience group"
          />

          <Metric
            label="Top age group"
            value={audience.topAge}
            detail="Largest age segment"
          />

        </div>

        {/* =========================================
            INTERESTS + LOCATIONS
        ========================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* INTERESTS */}

          <section
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
              What they care about
            </p>

            <h2
              className="mt-2 text-xl"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
              }}
            >
              Audience interests
            </h2>

            <div className="mt-7 space-y-5">

              {audience.interests.map(
                (interest) => (

                  <div key={interest.name}>

                    <div className="mb-2 flex justify-between">

                      <span className="text-xs">
                        {interest.name}
                      </span>

                      <span
                        className="text-[10px]"
                        style={{
                          color: "#777A8D",
                        }}
                      >
                        {interest.percentage}%
                      </span>

                    </div>

                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{
                        background:
                          "rgba(255,255,255,0.05)",
                      }}
                    >

                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${interest.percentage}%`,
                          background:
                            "linear-gradient(90deg,#00E5FF,#9B5CFF)",
                        }}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

          {/* LOCATIONS */}

          <section
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
              Where they are
            </p>

            <h2
              className="mt-2 text-xl"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
              }}
            >
              Audience locations
            </h2>

            <div className="mt-7 space-y-4">

              {audience.locations.map(
                (location, index) => (

                  <div
                    key={location.name}
                    className="flex items-center gap-4"
                  >

                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px]"
                      style={{
                        background:
                          "rgba(0,229,255,0.06)",
                        color: "#00E5FF",
                      }}
                    >
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex justify-between">

                        <span className="text-xs">
                          {location.name}
                        </span>

                        <span
                          className="text-[10px]"
                          style={{
                            color: "#777A8D",
                          }}
                        >
                          {location.percentage}%
                        </span>

                      </div>

                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full"
                        style={{
                          background:
                            "rgba(255,255,255,0.05)",
                        }}
                      >

                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${location.percentage}%`,
                            background:
                              "rgba(155,92,255,0.65)",
                          }}
                        />

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

        </div>

        {/* =========================================
            AGE DISTRIBUTION
        ========================================= */}

        <section
          className="mt-6 rounded-2xl p-6"
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
                Audience profile
              </p>

              <h2
                className="mt-2 text-xl"
                style={{
                  fontFamily:
                    "var(--font-fraunces), serif",
                }}
              >
                Age distribution
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
              {period.toUpperCase()}
            </span>

          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {audience.ageGroups.map(
              (group) => (

                <div
                  key={group.name}
                  className="rounded-xl p-4"
                  style={{
                    background:
                      "rgba(255,255,255,0.02)",
                  }}
                >

                  <div className="flex items-end justify-between">

                    <p
                      className="text-xs"
                      style={{
                        color: "#777A8D",
                      }}
                    >
                      {group.name}
                    </p>

                    <p className="text-lg font-semibold">
                      {group.percentage}%
                    </p>

                  </div>

                  <div
                    className="mt-4 h-16 overflow-hidden rounded-lg"
                    style={{
                      background:
                        "rgba(255,255,255,0.035)",
                    }}
                  >

                    <div
                      className="h-full rounded-t-lg"
                      style={{
                        height: `${Math.min(
                          group.percentage * 2,
                          100
                        )}%`,
                        marginTop: `${
                          100 -
                          Math.min(
                            group.percentage * 2,
                            100
                          )
                        }%`,
                        background:
                          "linear-gradient(to top,rgba(0,229,255,0.12),rgba(155,92,255,0.55))",
                      }}
                    />

                  </div>

                </div>

              )
            )}

          </div>

        </section>

        {/* =========================================
            AUDIENCE SIGNAL
        ========================================= */}

        <section
          className="mt-6 rounded-2xl p-6"
          style={{
            background:
              "linear-gradient(135deg,rgba(0,229,255,0.05),rgba(155,92,255,0.07))",
            border:
              "1px solid rgba(155,92,255,0.14)",
          }}
        >

          <div className="flex gap-4">

            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background:
                  "rgba(155,92,255,0.12)",
                color: "#B58CFF",
              }}
            >
              ✦
            </div>

            <div>

              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color: "#777A8D",
                }}
              >
                Audience signal
              </p>

              <p className="mt-2 text-sm leading-6">
                Your strongest audience segment is
                interested in technology, education,
                and AI-related content.
              </p>

              <p
                className="mt-2 text-xs leading-5"
                style={{
                  color: "#686B7D",
                }}
              >
                Use this information to understand
                which topics resonate with your
                existing audience.
              </p>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}

/* ================================================
   METRIC COMPONENT
================================================ */

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background:
          "rgba(255,255,255,0.025)",
        border:
          "1px solid rgba(255,255,255,0.07)",
      }}
    >

      <p
        className="text-[10px]"
        style={{
          color: "#646879",
        }}
      >
        {label}
      </p>

      <p className="mt-4 text-2xl font-semibold">
        {value}
      </p>

      <p
        className="mt-2 text-[10px]"
        style={{
          color: "#35E6A1",
        }}
      >
        {detail}
      </p>

    </div>
  );
}