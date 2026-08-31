"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("remembered_email") || "";
  });

  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return Boolean(localStorage.getItem("remembered_email"));
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      if (data.user_id !== undefined) {
        localStorage.setItem(
          "user_id",
          String(data.user_id)
        );
      }

      if (data.name) {
        localStorage.setItem(
          "user_name",
          data.name
        );
      }

      if (data.role) {
        localStorage.setItem(
          "user_role",
          data.role
        );
      }

      if (rememberMe) {
        localStorage.setItem(
          "remembered_email",
          email
        );
      } else {
        localStorage.removeItem(
          "remembered_email"
        );
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{
        background:
          "linear-gradient(135deg, #eaf4ff 0%, #ffffff 50%, #eef6ff 100%)",
        color: "var(--sp-text)",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8"
        style={{
          background: "#ffffff",
          border: "1px solid #dce7f3",
          boxShadow:
            "0 20px 60px rgba(37, 99, 235, 0.10)",
        }}
      >
        {/* LOGO */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold"
            style={{
              background:
                "linear-gradient(135deg, #2563eb, #60a5fa)",
              color: "#ffffff",
              boxShadow:
                "0 10px 25px rgba(37, 99, 235, 0.20)",
            }}
          >
            S
          </div>

          <h1
            className="text-3xl font-semibold"
            style={{
              fontFamily:
                "var(--font-fraunces), serif",
              color: "#172b4d",
            }}
          >
            Welcome back
          </h1>

          <p
            className="mt-2 text-sm"
            style={{
              color: "#64748b",
            }}
          >
            Continue managing your social presence.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            className="mb-5 rounded-xl p-3 text-sm"
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm"
              style={{
                color: "#334e68",
              }}
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{
                background: "#ffffff",
                border: "1px solid #dce7f3",
                color: "#172b4d",
              }}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <div className="mb-2 flex justify-between">
              <label
                htmlFor="password"
                className="text-sm"
                style={{
                  color: "#334e68",
                }}
              >
                Password
              </label>

              <Link
                href="/reset-password"
                className="text-xs"
                style={{
                  color: "#2563eb",
                }}
              >
                Forgot password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{
                background: "#ffffff",
                border: "1px solid #dce7f3",
                color: "#172b4d",
              }}
            />
          </div>

          {/* REMEMBER */}
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
              className="h-4 w-4"
            />

            <span
              style={{
                color: "#64748b",
              }}
            >
              Remember this account
            </span>
          </label>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "#ffffff",
              boxShadow:
                "0 8px 20px rgba(37, 99, 235, 0.20)",
            }}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        {/* REGISTER */}
        <p
          className="mt-7 text-center text-sm"
          style={{
            color: "#64748b",
          }}
        >
          Don&apos;t have an account?{" "}

          <Link
            href="/register"
            style={{
              color: "#2563eb",
              fontWeight: 500,
            }}
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}