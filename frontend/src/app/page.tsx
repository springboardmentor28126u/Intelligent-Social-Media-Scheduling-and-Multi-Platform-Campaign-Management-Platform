"use client";

import { useEffect, useState } from "react";
import AuthModal from "@/components/AuthModal";
import Link from "next/link";

type BackendStatus = "checking" | "connected" | "error";

export default function Home() {
  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>("checking");

  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/test"
        );

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        setBackendStatus("connected");
      } catch {
        setBackendStatus("error");
      }
    }

    checkBackend();
  }, []);

  return (
    <main
      className="min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 80% 10%, rgba(0,240,255,0.08), transparent 30%), radial-gradient(circle at 20% 80%, rgba(176,38,255,0.08), transparent 30%), var(--sp-bg)",
        color: "var(--sp-text)",
      }}
    >
      {/* TOP NAV */}
      <header style={{ borderBottom: "1px solid var(--sp-border)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))",
                color: "#05060A",
              }}
            >
              S
            </div>

            <div>
              <div className="text-lg font-semibold">
                SocialPilot
              </div>
              <div
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "var(--sp-muted)" }}
              >
                Social command center
              </div>
            </div>
          </Link>

          <button
            onClick={() => setShowAuthModal(true)}
            className="rounded-xl border px-5 py-2.5 text-sm font-medium transition"
            style={{
              borderColor: "var(--sp-border-strong)",
              color: "var(--sp-text)",
            }}
          >
            Sign in
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-20">
        <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_.85fr]">
          
          <div>
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs"
              style={{
                borderColor: "rgba(0,240,255,0.2)",
                background: "rgba(0,240,255,0.05)",
                color: "var(--sp-cyan)",
              }}
            >
              <span>●</span>
              Your social workspace, redesigned
            </div>

            <h1
              className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
              style={{
                fontFamily: "var(--font-fraunces), serif",
              }}
            >
              Create.
              <br />
              Schedule.
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg,var(--sp-cyan),var(--sp-purple))",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                Grow.
              </span>
            </h1>

            <p
              className="mt-7 max-w-xl text-base leading-7"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              SocialPilot brings your content, publishing workflow,
              connected accounts and performance insights into one
              intelligent workspace.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <button
                onClick={() => setShowAuthModal(true)}
                className="rounded-xl px-6 py-3 text-sm font-semibold transition hover:scale-[1.02]"
                style={{
                  background:
                    "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))",
                  color: "#05060A",
                  boxShadow:
                    "0 10px 35px rgba(0,240,255,0.15)",
                }}
              >
                Enter SocialPilot →
              </button>

              <Link
                href="#features"
                className="rounded-xl border px-6 py-3 text-sm font-medium"
                style={{
                  borderColor: "var(--sp-border-strong)",
                  color: "var(--sp-text-secondary)",
                }}
              >
                Explore workspace
              </Link>
            </div>

            {/* STATUS */}
            <div className="mt-8 flex items-center gap-3 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    backendStatus === "connected"
                      ? "var(--sp-green)"
                      : backendStatus === "error"
                        ? "var(--sp-danger)"
                        : "#FFCA5C",
                }}
              />

              <span style={{ color: "var(--sp-muted)" }}>
                {backendStatus === "connected"
                  ? "Backend connected"
                  : backendStatus === "error"
                    ? "Backend offline"
                    : "Checking backend..."}
              </span>
            </div>
          </div>

          {/* VISUAL DASHBOARD CARD */}
          <div className="relative">
            <div
              className="absolute -inset-10 rounded-full opacity-20 blur-3xl"
              style={{
                background:
                  "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))",
              }}
            />

            <div
              className="relative rounded-3xl border p-5 shadow-2xl"
              style={{
                background: "var(--sp-card)",
                borderColor: "var(--sp-border)",
              }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: "var(--sp-muted)" }}>
                    TODAY
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    Content pulse
                  </h3>
                </div>

                <span
                  className="rounded-full px-3 py-1 text-[10px]"
                  style={{
                    background: "rgba(53,227,155,0.1)",
                    color: "var(--sp-green)",
                  }}
                >
                  LIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["18", "Scheduled"],
                  ["82.4K", "Reach"],
                  ["7.8%", "Engagement"],
                  ["4", "Platforms"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl border p-5"
                    style={{
                      background: "var(--sp-hover)",
                      borderColor: "var(--sp-border)",
                    }}
                  >
                    <div className="text-2xl font-semibold">
                      {value}
                    </div>
                    <div
                      className="mt-2 text-xs"
                      style={{ color: "var(--sp-muted)" }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-3 rounded-2xl border p-5"
                style={{
                  background: "var(--sp-hover)",
                  borderColor: "var(--sp-border)",
                }}
              >
                <div className="mb-4 flex justify-between text-xs">
                  <span style={{ color: "var(--sp-text-secondary)" }}>
                    Weekly engagement
                  </span>
                  <span style={{ color: "var(--sp-green)" }}>
                    +18.4%
                  </span>
                </div>

                <div className="flex h-24 items-end gap-2">
                  {[30, 42, 36, 60, 48, 75, 92].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md"
                        style={{
                          height: `${height}%`,
                          background:
                            index === 6
                              ? "var(--sp-cyan)"
                              : "rgba(0,240,255,0.18)",
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-6 pb-24"
      >
        <div className="mb-10">
          <p
            className="text-xs uppercase tracking-[0.25em]"
            style={{ color: "var(--sp-cyan)" }}
          >
            One workspace
          </p>

          <h2
            className="mt-3 text-3xl font-semibold"
            style={{
              fontFamily: "var(--font-fraunces), serif",
            }}
          >
            Everything around your content.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["✦", "Create", "Turn ideas into polished social posts."],
            ["◷", "Planner", "See your entire publishing flow."],
            ["↗", "Analytics", "Understand what is actually working."],
            ["◎", "Accounts", "Manage your social presence centrally."],
          ].map(([icon, title, description]) => (
            <div
              key={title}
              className="rounded-2xl border p-6 transition hover:-translate-y-1"
              style={{
                background: "var(--sp-hover)",
                borderColor: "var(--sp-border)",
              }}
            >
              <div className="mb-5 text-2xl">{icon}</div>
              <h3 className="font-semibold">{title}</h3>
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: "var(--sp-text-secondary)" }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: "var(--sp-border)" }}
      >
        <div className="mx-auto flex max-w-7xl justify-between text-xs">
          <span style={{ color: "var(--sp-subtle)" }}>
            © 2026 SocialPilot
          </span>

          <span style={{ color: "var(--sp-subtle)" }}>
            Next.js · FastAPI · PostgreSQL
          </span>
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </main>
  );
}