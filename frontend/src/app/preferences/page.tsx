"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Theme = "light" | "dark";

const THEME_KEY = "socialpilot_theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored =
    localStorage.getItem(THEME_KEY);

  if (stored === "dark") {
    return "dark";
  }

  return "light";
}

export default function PreferencesPage() {
  const router = useRouter();

  const [theme, setTheme] =
    useState<Theme>(getInitialTheme);

  const [saved, setSaved] =
    useState(false);

  /* =====================================================
     CHANGE THEME
  ===================================================== */

  function handleThemeChange(
    newTheme: Theme
  ) {
    setTheme(newTheme);

    localStorage.setItem(
      THEME_KEY,
      newTheme
    );

    document.documentElement.setAttribute(
      "data-theme",
      newTheme
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  }

  /* =====================================================
     RESET
  ===================================================== */

  function handleReset() {
    handleThemeChange("light");
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: "var(--sp-bg)",
        color: "var(--sp-text)",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="border-b px-6 py-5 md:px-10"
        style={{
          background: "var(--sp-surface)",
          borderColor: "var(--sp-border)",
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{
                color: "var(--sp-cyan)",
              }}
            >
              SocialPilot
            </p>

            <h1
              className="mt-1 text-2xl"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
                fontWeight: 600,
              }}
            >
              Preferences
            </h1>

            <p
              className="mt-1 text-xs"
              style={{
                color: "var(--sp-muted)",
              }}
            >
              Customize your SocialPilot workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="cursor-pointer rounded-xl px-4 py-2.5 text-xs"
            style={{
              background: "var(--sp-card)",
              border:
                "1px solid var(--sp-border)",
              color:
                "var(--sp-text-secondary)",
            }}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-5xl p-6 md:p-10">

        {/* =================================================
            APPEARANCE
        ================================================= */}

        <section
          className="rounded-2xl p-6"
          style={{
            background: "var(--sp-card)",
            border:
              "1px solid var(--sp-border)",
            boxShadow: "var(--sp-shadow)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{
              color: "var(--sp-subtle)",
            }}
          >
            Appearance
          </p>

          <h2
            className="mt-2 text-xl"
            style={{
              fontFamily:
                "var(--font-fraunces), serif",
            }}
          >
            Workspace theme
          </h2>

          <p
            className="mt-2 max-w-xl text-xs leading-5"
            style={{
              color: "var(--sp-muted)",
            }}
          >
            Choose how SocialPilot should look
            while you work.
          </p>

          {/* THEME OPTIONS */}

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            {/* LIGHT */}

            <button
              type="button"
              onClick={() =>
                handleThemeChange("light")
              }
              className="w-full cursor-pointer rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5"
              style={{
                background:
                  theme === "light"
                    ? "#edf8ff"
                    : "var(--sp-card)",
                border:
                  theme === "light"
                    ? "2px solid #009ee8"
                    : "1px solid var(--sp-border)",
              }}
            >
              <div className="flex items-center gap-4">

                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                  style={{
                    background: "#ffffff",
                    border:
                      "1px solid #cfe5f5",
                  }}
                >
                  ☀️
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Light Mode
                  </p>

                  <p
                    className="mt-1 text-[10px]"
                    style={{
                      color: "var(--sp-muted)",
                    }}
                  >
                    Bright blue and white workspace
                  </p>
                </div>
              </div>

              {theme === "light" && (
                <p
                  className="mt-4 text-[10px] font-medium"
                  style={{
                    color: "var(--sp-cyan)",
                  }}
                >
                  ✓ Currently Active
                </p>
              )}
            </button>

            {/* DARK */}

            <button
              type="button"
              onClick={() =>
                handleThemeChange("dark")
              }
              className="w-full cursor-pointer rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5"
              style={{
                background:
                  theme === "dark"
                    ? "#10131c"
                    : "var(--sp-card)",
                border:
                  theme === "dark"
                    ? "2px solid #9b5cff"
                    : "1px solid var(--sp-border)",
              }}
            >
              <div className="flex items-center gap-4">

                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                  style={{
                    background: "#07080c",
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  🌙
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Dark Mode
                  </p>

                  <p
                    className="mt-1 text-[10px]"
                    style={{
                      color: "var(--sp-muted)",
                    }}
                  >
                    Dark command-center interface
                  </p>
                </div>
              </div>

              {theme === "dark" && (
                <p
                  className="mt-4 text-[10px] font-medium"
                  style={{
                    color: "#b58cff",
                  }}
                >
                  ✓ Currently Active
                </p>
              )}
            </button>

          </div>
        </section>

        {/* =================================================
            WORKSPACE
        ================================================= */}

        <section
          className="mt-6 rounded-2xl p-6"
          style={{
            background: "var(--sp-card)",
            border:
              "1px solid var(--sp-border)",
            boxShadow: "var(--sp-shadow)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{
              color: "var(--sp-subtle)",
            }}
          >
            Workspace
          </p>

          <h2
            className="mt-2 text-xl"
            style={{
              fontFamily:
                "var(--font-fraunces), serif",
            }}
          >
            Workspace preferences
          </h2>

          <div className="mt-6 space-y-4">

            <div
              className="flex items-center justify-between rounded-xl p-4"
              style={{
                background:
                  "var(--sp-hover)",
                border:
                  "1px solid var(--sp-border)",
              }}
            >
              <div>
                <p className="text-xs">
                  Default content view
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color: "var(--sp-muted)",
                  }}
                >
                  Open Content Lab when managing
                  your content pipeline.
                </p>
              </div>

              <span
                className="rounded-full px-3 py-1 text-[9px]"
                style={{
                  background:
                    "rgba(22,166,106,0.10)",
                  color:
                    "var(--sp-green)",
                }}
              >
                Enabled
              </span>
            </div>

            <div
              className="flex items-center justify-between rounded-xl p-4"
              style={{
                background:
                  "var(--sp-hover)",
                border:
                  "1px solid var(--sp-border)",
              }}
            >
              <div>
                <p className="text-xs">
                  AI recommendations
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color: "var(--sp-muted)",
                  }}
                >
                  Show AI-generated insights on
                  your dashboard.
                </p>
              </div>

              <span
                className="rounded-full px-3 py-1 text-[9px]"
                style={{
                  background:
                    "rgba(22,166,106,0.10)",
                  color:
                    "var(--sp-green)",
                }}
              >
                Enabled
              </span>
            </div>

          </div>
        </section>

        {/* =================================================
            RESET
        ================================================= */}

        <section
          className="mt-6 flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{
            background: "var(--sp-card)",
            border:
              "1px solid var(--sp-border)",
            boxShadow: "var(--sp-shadow)",
          }}
        >
          <div>
            <p className="text-xs">
              Reset appearance
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color: "var(--sp-muted)",
              }}
            >
              Restore SocialPilot to bright light
              mode.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer rounded-xl px-4 py-2.5 text-xs"
            style={{
              background:
                "rgba(232,61,98,0.08)",
              border:
                "1px solid rgba(232,61,98,0.18)",
              color:
                "var(--sp-danger)",
            }}
          >
            Reset
          </button>
        </section>

        {/* =================================================
            SAVED
        ================================================= */}

        {saved && (
          <div
            className="mt-6 rounded-xl p-4 text-center text-xs"
            style={{
              background:
                "rgba(22,166,106,0.08)",
              border:
                "1px solid rgba(22,166,106,0.18)",
              color:
                "var(--sp-green)",
            }}
          >
            ✓ Theme preference saved
          </div>
        )}

        {/* =================================================
            BACK
        ================================================= */}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="cursor-pointer text-xs"
            style={{
              color: "var(--sp-cyan)",
            }}
          >
            ← Return to Command Center
          </button>
        </div>

      </div>
    </main>
  );
}