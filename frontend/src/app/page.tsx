"use client";

import { useEffect, useState } from "react";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "error">("checking");
  const [backendMessage, setBackendMessage] = useState("Connecting to backend...");
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const connectBackend = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/test");
        if (!response.ok) throw new Error(`Backend returned status ${response.status}`);
        const data = await response.json();
        setBackendStatus("connected");
        setBackendMessage(data.message || "Backend connected successfully");
      } catch (error) {
        console.error("Backend connection failed:", error);
        setBackendStatus("error");
        setBackendMessage("Backend connection failed");
      }
    };
    connectBackend();
  }, []);

  const statusColor =
    backendStatus === "connected" ? "#00D9FF" : backendStatus === "error" ? "#FF5C5C" : "#6C7DFF";

  return (
    <main
      style={{ background: "#08090D", color: "#E8E9F0", fontFamily: "var(--font-plex-mono), monospace" }}
      className="min-h-screen p-8"
    >
      <div className="mx-auto max-w-6xl">

        {/* NAV */}
        <nav className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: "#00D9FF", color: "#08090D" }}
            >
              S
            </span>
            <span style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600 }} className="text-lg">
              SocialPilot
            </span>
          </div>

          <button
            onClick={() => setShowAuthModal(true)}
            className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Login / Register
          </button>
        </nav>

        {/* HERO */}
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.25em] uppercase" style={{ color: "#00D9FF" }}>
            <span className="glow-dot h-1.5 w-1.5 rounded-full" style={{ background: "#00D9FF" }} />
            Scenario Simulation Engine
          </p>
          <h1
            style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600, letterSpacing: "-0.02em" }}
            className="text-5xl leading-[1.08] sm:text-6xl"
          >
            Change one variable.
            <br />
            <span className="gradient-text">See the shift</span>
            <span className="blink-cursor" style={{ color: "#00D9FF" }}>_</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "#8A8B9A" }}>
            SocialPilot models what happens before it happens — every scenario
            shows where you started and where the model thinks you&apos;ll land.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowAuthModal(true)}
              className="rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "#00D9FF", color: "#08090D" }}
            >
              Get started
            </button>
          </div>
        </div>

        {/* SIGNATURE: baseline → predicted delta bar */}
        <div className="glass-panel mb-8 rounded-2xl p-6">
          <div className="mb-5 flex items-baseline justify-between text-xs uppercase tracking-wider" style={{ color: "#54566A" }}>
            <span>baseline</span>
            <span>predicted</span>
          </div>

          <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: "#1A1B22" }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: "62%", background: "#00D9FF" }}
            />
            <div
              className="absolute top-0 h-full rounded-full transition-all duration-1000 ease-out delay-300"
              style={{ left: "62%", width: "16%", background: "#6C7DFF" }}
            />
          </div>

          <div className="mt-4 flex justify-between text-2xl font-medium">
            <span style={{ color: "#00D9FF" }}>100,000</span>
            <span style={{ color: "#6C7DFF" }}>+10.0%</span>
            <span style={{ color: "#6C7DFF" }}>110,000</span>
          </div>
        </div>

        {/* BACKEND STATUS */}
        <div className="glass-panel mb-8 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <div className="glow-dot absolute h-3 w-3 rounded-full" style={{ background: statusColor }} />
              <div className="h-3 w-3 rounded-full" style={{ background: statusColor }} />
            </div>
            <div>
              <h2 className="font-semibold">
                {backendStatus === "connected"
                  ? "Backend Connected ✅"
                  : backendStatus === "error"
                    ? "Backend Connection Failed ❌"
                    : "Connecting to Backend... ⏳"}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#8A8B9A" }}>{backendMessage}</p>
            </div>
          </div>
        </div>

        {/* DASHBOARD */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="glass-panel rounded-2xl p-6 transition-colors hover:border-white/20">
            <div className="mb-4 text-3xl">🏠</div>
            <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="text-xl">Home</h2>
            <p className="mt-2 text-sm" style={{ color: "#8A8B9A" }}>Manage your SocialPilot workspace from one place.</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 transition-colors hover:border-white/20">
            <div className="mb-4 text-3xl">❤️</div>
            <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="text-xl">Health</h2>
            <p className="mt-2 text-sm" style={{ color: "#8A8B9A" }}>Monitor the status of your backend services.</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 transition-colors hover:border-white/20">
            <div className="mb-4 text-3xl">🤖</div>
            <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="text-xl">AI Pilot</h2>
            <p className="mt-2 text-sm" style={{ color: "#8A8B9A" }}>Get AI-powered insights and recommendations.</p>
          </div>
        </div>

        {/* SYSTEM INFORMATION */}
        <div className="glass-panel mt-8 rounded-2xl p-6">
          <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="text-xl">System Information</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#8A8B9A" }}>Frontend</span>
              <span className="font-medium">Next.js</span>
            </div>
            <div className="flex justify-between border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#8A8B9A" }}>Backend</span>
              <span className="font-medium">FastAPI</span>
            </div>
            <div className="flex justify-between border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span style={{ color: "#8A8B9A" }}>Backend URL</span>
              <span className="font-medium">127.0.0.1:8000</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8A8B9A" }}>Connection</span>
              <span className="font-semibold" style={{ color: statusColor }}>
                {backendStatus === "connected" ? "Connected" : backendStatus === "error" ? "Failed" : "Checking"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </main>
  );
}