"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("remembered_email") || "";
  });

  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(localStorage.getItem("remembered_email"));
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      localStorage.setItem("access_token", data.access_token);
      if (data.user_id !== undefined) localStorage.setItem("user_id", String(data.user_id));
      if (data.name) localStorage.setItem("user_name", data.name);
      if (data.role) localStorage.setItem("user_role", data.role);

      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{
        background: "var(--sp-bg)",
        color: "var(--sp-text)",
        fontFamily: "var(--font-plex-mono), monospace",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8"
        style={{
          background: "var(--sp-card)",
          border: "1px solid var(--sp-border)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* LOGO */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold"
            style={{
              background: "linear-gradient(135deg, var(--sp-cyan), var(--sp-purple))",
              color: "#05060A",
            }}
          >
            S
          </div>

          <h1
            className="text-3xl font-semibold"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--sp-text)" }}
          >
            Welcome back
          </h1>

          <p className="mt-2 text-sm" style={{ color: "var(--sp-muted)" }}>
            Continue managing your social presence.
          </p>
        </div>

        {error && (
          <div
            className="mb-5 rounded-xl p-3 text-sm"
            style={{ background: "rgba(255,61,110,0.1)", border: "1px solid rgba(255,61,110,0.3)", color: "var(--sp-danger)" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm" style={{ color: "var(--sp-text-secondary)" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ background: "var(--sp-input)", border: "1px solid var(--sp-border)", color: "var(--sp-input-text)" }}
            />
          </div>

          <div>
            <div className="mb-2 flex justify-between">
              <label htmlFor="password" className="text-sm" style={{ color: "var(--sp-text-secondary)" }}>
                Password
              </label>
              <Link href="/reset-password" className="text-xs" style={{ color: "var(--sp-cyan)" }}>
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ background: "var(--sp-input)", border: "1px solid var(--sp-border)", color: "var(--sp-input-text)" }}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4"
            />
            <span style={{ color: "var(--sp-muted)" }}>Remember this account</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--sp-cyan), var(--sp-purple))",
              color: "#05060A",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm" style={{ color: "var(--sp-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--sp-cyan)", fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}