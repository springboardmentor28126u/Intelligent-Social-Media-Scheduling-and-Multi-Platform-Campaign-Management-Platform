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
        background: "#F4F8FC",
        color: "#172033",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >
      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header
        className="border-b"
        style={{
          borderColor: "#DCE5EF",
          background: "#FFFFFF",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">

          {/* BRAND */}

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg,#00B8E6,#6D4AFF)",
                color: "#FFFFFF",
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
                  color: "#172033",
                }}
              >
                SocialPilot
              </p>

              <p
                className="text-[9px] uppercase tracking-[0.2em]"
                style={{
                  color: "#8A96A8",
                }}
              >
                Audience
              </p>
            </div>

          </div>

          {/* BACK BUTTON */}

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="rounded-xl px-4 py-2.5 text-xs transition-all hover:bg-[#F1F6FA]"
            style={{
              color: "#536174",
              border:
                "1px solid #D9E2EC",
              background: "#FFFFFF",
            }}
          >
            ← Dashboard
          </button>

        </div>
      </header>

      {/* =====================================================
          PAGE CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl p-6 md:p-10">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

          <div>

            <p
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{
                color: "#008FC4",
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
                color: "#172033",
              }}
            >
              Know who is listening.
            </h1>

            <p
              className="mt-3 max-w-xl text-sm leading-6"
              style={{
                color: "#667386",
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
              background: "#FFFFFF",
              border:
                "1px solid #D9E2EC",
              boxShadow:
                "0 2px 8px rgba(30,60,90,0.04)",
            }}
          >

            {[
              ["7d", "7D"],
              ["30d", "30D"],
              ["90d", "90D"],
            ].map(([value, label]) => (

              <button
                type="button"
                key={value}
                onClick={() =>
                  setPeriod(value)
                }
                className="rounded-lg px-4 py-2 text-[10px] transition-all"
                style={{
                  background:
                    period === value
                      ? "#E6F7FC"
                      : "transparent",

                  color:
                    period === value
                      ? "#008FC4"
                      : "#7A8798",
                }}
              >
                {label}
              </button>

            ))}

          </div>

        </div>

        {/* =====================================================
            METRICS
        ===================================================== */}

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

        {/* =====================================================
            INTERESTS + LOCATIONS
        ===================================================== */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* INTERESTS */}

          <section
            className="rounded-2xl p-6 shadow-sm"
            style={{
              background: "#FFFFFF",
              border:
                "1px solid #DCE5EF",
            }}
          >

            <p
              className="text-[10px] uppercase tracking-widest"
              style={{
                color: "#8794A5",
              }}
            >
              What they care about
            </p>

            <h2
              className="mt-2 text-xl"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
                color: "#172033",
              }}
            >
              Audience interests
            </h2>

            <div className="mt-7 space-y-5">

              {audience.interests.map(
                (interest) => (

                  <div key={interest.name}>

                    <div className="mb-2 flex justify-between">

                      <span
                        className="text-xs"
                        style={{
                          color: "#273449",
                        }}
                      >
                        {interest.name}
                      </span>

                      <span
                        className="text-[10px]"
                        style={{
                          color: "#758296",
                        }}
                      >
                        {interest.percentage}%
                      </span>

                    </div>

                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{
                        background:
                          "#E8EEF4",
                      }}
                    >

                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${interest.percentage}%`,
                          background:
                            "linear-gradient(90deg,#00B8E6,#6D4AFF)",
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
            className="rounded-2xl p-6 shadow-sm"
            style={{
              background: "#FFFFFF",
              border:
                "1px solid #DCE5EF",
            }}
          >

            <p
              className="text-[10px] uppercase tracking-widest"
              style={{
                color: "#8794A5",
              }}
            >
              Where they are
            </p>

            <h2
              className="mt-2 text-xl"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
                color: "#172033",
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
                          "#E8F7FC",
                        color: "#008FC4",
                      }}
                    >
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex justify-between">

                        <span
                          className="text-xs"
                          style={{
                            color: "#273449",
                          }}
                        >
                          {location.name}
                        </span>

                        <span
                          className="text-[10px]"
                          style={{
                            color: "#758296",
                          }}
                        >
                          {location.percentage}%
                        </span>

                      </div>

                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full"
                        style={{
                          background:
                            "#E8EEF4",
                        }}
                      >

                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${location.percentage}%`,
                            background:
                              "linear-gradient(90deg,#9C8CFF,#6D4AFF)",
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

        {/* =====================================================
            AGE DISTRIBUTION
        ===================================================== */}

        <section
          className="mt-6 rounded-2xl p-6 shadow-sm"
          style={{
            background: "#FFFFFF",
            border:
              "1px solid #DCE5EF",
          }}
        >

          <div className="flex items-center justify-between">

            <div>

              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color: "#8794A5",
                }}
              >
                Audience profile
              </p>

              <h2
                className="mt-2 text-xl"
                style={{
                  fontFamily:
                    "var(--font-fraunces), serif",
                  color: "#172033",
                }}
              >
                Age distribution
              </h2>

            </div>

            <span
              className="rounded-full px-3 py-1 text-[10px]"
              style={{
                background:
                  "#E8FAF3",
                color: "#159A6A",
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
                      "#F6F9FC",
                    border:
                      "1px solid #E3EAF1",
                  }}
                >

                  <div className="flex items-end justify-between">

                    <p
                      className="text-xs"
                      style={{
                        color: "#758296",
                      }}
                    >
                      {group.name}
                    </p>

                    <p
                      className="text-lg font-semibold"
                      style={{
                        color: "#172033",
                      }}
                    >
                      {group.percentage}%
                    </p>

                  </div>

                  <div
                    className="mt-4 h-16 overflow-hidden rounded-lg"
                    style={{
                      background:
                        "#E8EEF4",
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
                          "linear-gradient(to top,#00B8E6,#7C62E8)",
                      }}
                    />

                  </div>

                </div>

              )
            )}

          </div>

        </section>

        {/* =====================================================
            AUDIENCE SIGNAL
        ===================================================== */}

        <section
          className="mt-6 rounded-2xl p-6 shadow-sm"
          style={{
            background:
              "linear-gradient(135deg,#EFFBFE,#F5F1FF)",
            border:
              "1px solid #D9E4F0",
          }}
        >

          <div className="flex gap-4">

            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background:
                  "#E8E2FF",
                color: "#6D4AFF",
              }}
            >
              ✦
            </div>

            <div>

              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color: "#77859A",
                }}
              >
                Audience signal
              </p>

              <p
                className="mt-2 text-sm leading-6"
                style={{
                  color: "#273449",
                }}
              >
                Your strongest audience segment is
                interested in technology, education,
                and AI-related content.
              </p>

              <p
                className="mt-2 text-xs leading-5"
                style={{
                  color: "#718096",
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

/* =====================================================
   METRIC COMPONENT
===================================================== */

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
      className="rounded-2xl p-5 shadow-sm"
      style={{
        background: "#FFFFFF",
        border:
          "1px solid #DCE5EF",
      }}
    >

      <p
        className="text-[10px]"
        style={{
          color: "#758296",
        }}
      >
        {label}
      </p>

      <p
        className="mt-4 text-2xl font-semibold"
        style={{
          color: "#172033",
        }}
      >
        {value}
      </p>

      <p
        className="mt-2 text-[10px]"
        style={{
          color: "#159A6A",
        }}
      >
        {detail}
      </p>

    </div>
  );
}