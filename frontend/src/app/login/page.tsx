"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  // Read remembered email directly when component initializes.
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

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      // Save authentication token
      localStorage.setItem(
        "access_token",
        data.access_token
      );

      // Save user information
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

      // Remember email only
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

      // Go to dashboard
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
      className="flex min-h-screen items-center justify-center px-6"
      style={{
        background: "#08090D",
        color: "#E8E9F0",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border:
            "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
        }}
      >

        {/* LOGO */}
        <div className="mb-8 text-center">

          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold"
            style={{
              background:
                "linear-gradient(135deg,#00F0FF,#B026FF)",
              color: "#05060A",
            }}
          >
            S
          </div>

          <h1
            className="text-3xl font-semibold"
            style={{
              fontFamily:
                "var(--font-fraunces), serif",
            }}
          >
            Welcome back
          </h1>

          <p
            className="mt-2 text-sm"
            style={{ color: "#8A8B9A" }}
          >
            Continue managing your social presence.
          </p>

        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div
            className="mb-5 rounded-xl p-3 text-sm"
            style={{
              background:
                "rgba(255,61,110,0.1)",
              border:
                "1px solid rgba(255,61,110,0.3)",
              color: "#FF3D6E",
            }}
          >
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm"
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
                background: "#0B0C14",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                color: "#E8E9F5",
              }}
            />
          </div>

          {/* PASSWORD */}
          <div>

            <div className="mb-2 flex justify-between">

              <label
                htmlFor="password"
                className="text-sm"
              >
                Password
              </label>

              <Link
                href="/reset-password"
                className="text-xs"
                style={{
                  color: "#00F0FF",
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
                background: "#0B0C14",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                color: "#E8E9F5",
              }}
            />

          </div>

          {/* REMEMBER ACCOUNT */}
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
                color: "#A0A1B0",
              }}
            >
              Remember this account
            </span>

          </label>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg,#00F0FF,#B026FF)",
              color: "#05060A",
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
            color: "#8A8B9A",
          }}
        >
          Don&apos;t have an account?{" "}

          <Link
            href="/register"
            style={{
              color: "#00F0FF",
            }}
          >
            Create one
          </Link>
        </p>

      </div>
    </main>
  );
}