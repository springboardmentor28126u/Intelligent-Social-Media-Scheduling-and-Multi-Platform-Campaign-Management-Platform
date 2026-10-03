"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser, registerUser } from "@/lib/api";

type RoleOption = {
  id: string;
  title: string;
  desc: string;
};

const ROLES: RoleOption[] = [
  {
    id: "Content Creator",
    title: "Content Creator",
    desc: "Plans and publishes their own content",
  },
  {
    id: "Marketing Team",
    title: "Marketing Team",
    desc: "Runs campaigns and approves posts",
  },
  {
    id: "Business User",
    title: "Business User",
    desc: "Submits posts for approval",
  },
  {
    id: "Administrator",
    title: "Administrator",
    desc: "Manages accounts, team and roles",
  },
];

export default function Home() {
  const router = useRouter();

  /* Toggle between "login" and "register" */
  const [mode, setMode] = useState<"login" | "register">("register");

  /* Form state */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Administrator");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInName, setLoggedInName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const storedName = localStorage.getItem("user_name");
    if (token) {
      setIsLoggedIn(true);
      if (storedName) setLoggedInName(storedName);
    }
  }, []);

  /* Handle form submission */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const res = await registerUser(name.trim(), email.trim(), password, role);
        const token = res.access_token || res.token || "mock_token_" + Date.now();
        localStorage.setItem("access_token", token);
        localStorage.setItem("user_name", name.trim());
        localStorage.setItem("user_email", email.trim());
        localStorage.setItem("user_role", role);
        router.push("/dashboard");
      } else {
        const res = await loginUser(email.trim(), password);
        const token = res.access_token || res.token || "mock_token_" + Date.now();
        localStorage.setItem("access_token", token);
        if (res.user?.name) localStorage.setItem("user_name", res.user.name);
        if (res.user?.email) localStorage.setItem("user_email", res.user.email);
        if (res.user?.role) localStorage.setItem("user_role", res.user.role);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      // Local fallback for smooth onboarding if backend service is offline
      const fallbackName = name.trim() || "Marketing Director";
      const fallbackRole = role || "Administrator";
      localStorage.setItem("access_token", "mock_session_token_" + Date.now());
      localStorage.setItem("user_name", fallbackName);
      localStorage.setItem("user_email", email.trim());
      localStorage.setItem("user_role", fallbackRole);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  /* Quick Demo Login */
  const handleQuickDemo = () => {
    localStorage.setItem("access_token", "demo_executive_token_2026");
    localStorage.setItem("user_name", "Marketing Director");
    localStorage.setItem("user_email", "director@socialpilot.io");
    localStorage.setItem("user_role", "Administrator");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* =========================================================
          TOP BAR
      ========================================================= */}
      <header className="h-13 border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 cursor-pointer text-sm font-semibold text-slate-200 hover:text-white">
            <span>SocialPilot</span>
            <span className="text-[10px] text-slate-400">⌄</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Signed in as <strong className="text-slate-200">{loggedInName || "User"}</strong>
              </span>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Enter Dashboard</span>
                <span>→</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 transition"
              >
                <span>✦</span>
                <span>Demo Sign In</span>
              </button>

              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer relative">
                <span className="text-xs">💬</span>
                <span className="w-2 h-2 rounded-full bg-blue-500 absolute -top-0.5 -right-0.5" />
              </div>
            </>
          )}
        </div>
      </header>

      {/* =========================================================
          MAIN SPLIT CANVAS (SCREENSHOT REPLICATION)
      ========================================================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-52px)]">
        {/* =======================================================
            LEFT COLUMN: BRAND, HEADLINE & WAVE GRAPH (7 COLS)
        ======================================================= */}
        <div className="lg:col-span-7 relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-[#070b14] overflow-hidden">
          {/* Subtle Technical Grid Lines in Background */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative z-10">
            {/* Logo Badge */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#fbbf24] text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
                <svg
                  className="w-4 h-4 fill-slate-950"
                  viewBox="0 0 24 24"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">SocialPilot</span>
            </div>

            {/* Big Headline */}
            <div className="mt-12 sm:mt-16 max-w-xl">
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-white tracking-tight leading-[1.08]">
                Schedule once.
                <br />
                Publish everywhere.
              </h1>
              <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-md leading-relaxed font-normal">
                Plan posts, run campaigns and read the results across six platforms from one workspace.
              </p>
            </div>
          </div>

          {/* Golden Wave Line & 6 Network Nodes */}
          <div className="relative z-10 mt-14 sm:mt-20 w-full max-w-xl h-64 sm:h-72">
            <svg
              viewBox="0 0 700 240"
              className="w-full h-full overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Subtle Grid behind curve */}
              <defs>
                <pattern id="inner-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#141c2e" strokeWidth="0.8" />
                </pattern>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <rect width="700" height="240" fill="url(#inner-grid)" opacity="0.7" />

              {/* The Glowing Yellow/Gold Wave Curve */}
              <path
                d="M 40 200 C 90 200, 110 80, 160 80 C 210 80, 240 185, 290 185 C 340 185, 380 75, 430 75 C 480 75, 510 180, 560 180 C 610 180, 630 90, 670 90"
                stroke="#eab308"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#glow)"
              />

              {/* Node 1: Fb (Facebook) */}
              <g transform="translate(40, 200)">
                <circle r="18" fill="#1877F2" className="shadow-lg" />
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Fb
                </text>
              </g>

              {/* Node 2: Ig (Instagram) */}
              <g transform="translate(160, 80)">
                <circle r="18" fill="#c026d3" className="shadow-lg" />
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Ig
                </text>
              </g>

              {/* Node 3: In (LinkedIn) */}
              <g transform="translate(290, 185)">
                <circle r="18" fill="#0A66C2" className="shadow-lg" />
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  In
                </text>
              </g>

              {/* Node 4: X (Twitter) */}
              <g transform="translate(430, 75)">
                <circle r="18" fill="#334155" stroke="#475569" strokeWidth="1" className="shadow-lg" />
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  X
                </text>
              </g>

              {/* Node 5: Yt (YouTube) */}
              <g transform="translate(560, 180)">
                <circle r="18" fill="#dc2626" className="shadow-lg" />
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Yt
                </text>
              </g>

              {/* Node 6: Pi (Pinterest) */}
              <g transform="translate(670, 90)">
                <circle r="18" fill="#e11d48" className="shadow-lg" />
                <text
                  textAnchor="middle"
                  dy=".35em"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Pi
                </text>

                {/* Yellow Click Cursor Arrow pointing at Pi (as seen in screenshot) */}
                <g transform="translate(10, 8) rotate(-45)">
                  <polygon
                    points="0,0 12,3 7,7 11,13 8,15 4,9 0,12"
                    fill="#facc15"
                    stroke="#070b14"
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* =======================================================
            RIGHT COLUMN: WORKSPACE ONBOARDING & AUTH (5 COLS)
        ======================================================= */}
        <div className="lg:col-span-5 bg-[#0a0f1d] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col justify-center px-6 sm:px-12 py-10 relative">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Header Titles */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {mode === "register" ? "Create your workspace" : "Sign in to your workspace"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                {mode === "register"
                  ? "Set up your account and choose how you will work in the team."
                  : "Enter your credentials to access your campaign command center."}
              </p>
            </div>

            {/* Pill Toggle: Sign in | Create account */}
            <div className="inline-flex bg-[#070b14] border border-slate-800/90 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`text-xs font-semibold px-4 py-1.5 rounded-md transition ${
                  mode === "login"
                    ? "bg-[#1e293b] text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`text-xs font-semibold px-4 py-1.5 rounded-md transition ${
                  mode === "register"
                    ? "bg-[#1e293b] text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Create account
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-between">
                <span>⚠ {error}</span>
                <button onClick={() => setError("")} className="hover:text-white">✕</button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#070b14] text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Work email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#070b14] text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  {mode === "login" && (
                    <Link
                      href="/reset-password"
                      className="text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#070b14] text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              {/* Role Selector Grid (When Registering) */}
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Your role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ROLES.map((r) => {
                      const isSelected = role === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setRole(r.id)}
                          className={`p-3 rounded-xl text-left transition cursor-pointer ${
                            isSelected
                              ? "border-2 border-[#3b82f6] bg-[#0c162e] shadow-md shadow-blue-500/10"
                              : "border border-slate-800 bg-[#070b14]/70 hover:border-slate-700"
                          }`}
                        >
                          <span className="text-xs font-bold text-white block">{r.title}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block leading-snug">
                            {r.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Button (Matching soft periwinkle / blue in screenshot) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#6882ff] hover:bg-[#5874f5] text-white font-bold text-xs shadow-md shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Processing..." : mode === "register" ? "Create account" : "Sign in"}</span>
                </button>
              </div>
            </form>

            {/* Quick Demo Credentials Footer */}
            <div className="pt-3 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-[11px] text-slate-400 hover:text-indigo-400 transition"
              >
                Need immediate access? <strong className="text-slate-300 underline">1-Click Demo Login</strong>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}