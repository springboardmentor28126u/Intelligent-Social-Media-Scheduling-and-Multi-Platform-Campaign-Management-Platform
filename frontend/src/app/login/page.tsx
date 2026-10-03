"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser } from "@/lib/api";

/* ============================================================
   TYPES
============================================================ */

type LoginResponse = {
  access_token?: string;
  token?: string;
  token_type?: string;
  user?: {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
    system_role?: string;
  };
};

type RecordLike = Record<string, unknown>;

/* ============================================================
   HELPERS
============================================================ */

function isRecord(value: unknown): value is RecordLike {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (isRecord(error)) {
    const message = error.message;

    if (typeof message === "string") {
      return message;
    }

    const detail = error.detail;

    if (typeof detail === "string") {
      return detail;
    }
  }

  return "Login failed. Please check your email and password.";
}

function normalizeLoginResponse(
  value: unknown
): LoginResponse {
  if (!isRecord(value)) {
    return {};
  }

  const userValue = value.user;

  const user = isRecord(userValue)
    ? {
        id:
          typeof userValue.id === "number"
            ? userValue.id
            : undefined,

        name:
          typeof userValue.name === "string"
            ? userValue.name
            : undefined,

        email:
          typeof userValue.email === "string"
            ? userValue.email
            : undefined,

        role:
          typeof userValue.role === "string"
            ? userValue.role
            : undefined,

        system_role:
          typeof userValue.system_role ===
          "string"
            ? userValue.system_role
            : undefined,
      }
    : undefined;

  return {
    access_token:
      typeof value.access_token ===
      "string"
        ? value.access_token
        : undefined,

    token:
      typeof value.token === "string"
        ? value.token
        : undefined,

    token_type:
      typeof value.token_type ===
      "string"
        ? value.token_type
        : undefined,

    user,
  };
}

/* ============================================================
   PAGE
============================================================ */

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  /* ==========================================================
     LOGIN
  ========================================================== */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanPassword =
      password;

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!cleanPassword) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await loginUser(
          cleanEmail,
          cleanPassword
        );

      const loginData =
        normalizeLoginResponse(
          response
        );

      const accessToken =
        loginData.access_token ??
        loginData.token;

      if (!accessToken) {
        setError(
          "Login succeeded, but no access token was returned by the server."
        );
        return;
      }

      /*
        Store authentication information.
        The rest of the SocialPilot application
        reads access_token from localStorage.
      */
      localStorage.setItem(
        "access_token",
        accessToken
      );

      localStorage.setItem(
        "token_type",
        loginData.token_type ??
          "bearer"
      );

      if (loginData.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(
            loginData.user
          )
        );
      }

      /*
        Go to the main dashboard after login.
      */
      router.push(
        "/dashboard"
      );
    } catch (errorValue: unknown) {
      setError(
        getErrorMessage(
          errorValue
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10 w-full">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl lg:grid-cols-2">

          {/* ==================================================
             LEFT PANEL
          ================================================== */}

          <section className="hidden bg-slate-950/90 border-r border-slate-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-xl font-bold shadow-lg shadow-indigo-500/25">
                  S
                </div>

                <div>
                  <p className="text-lg font-bold text-white">
                    SocialPilot
                  </p>

                  <p className="text-xs text-indigo-400 font-semibold">
                    Campaign Engine
                  </p>
                </div>
              </div>

              <div className="mt-16 max-w-md">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-400">
                  Social Media Management
                </p>

                <h1 className="mt-4 text-4xl font-bold leading-tight text-white">
                  Manage campaigns.
                  <br />
                  Track performance.
                  <br />
                  Grow smarter.
                </h1>

                <p className="mt-6 text-sm leading-7 text-slate-400">
                  Create posts, manage campaigns,
                  monitor engagement and understand
                  your audience from one platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-lg font-bold text-white">
                  Campaigns
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Organise your work
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-lg font-bold text-white">
                  Analytics
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Measure performance
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-lg font-bold text-white">
                  Audience
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Understand growth
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
             RIGHT PANEL
          ================================================== */}

          <section className="flex items-center p-6 sm:p-10 bg-slate-900/70">
            <div className="mx-auto w-full max-w-md">

              {/* MOBILE BRAND */}

              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-xl font-bold text-white shadow-md shadow-indigo-500/20">
                  S
                </div>

                <div>
                  <p className="text-lg font-bold text-white">
                    SocialPilot
                  </p>

                  <p className="text-xs text-indigo-400 font-semibold">
                    Campaign Engine
                  </p>
                </div>
              </div>

              {/* HEADING */}

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
                  Welcome back
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                  Sign in to SocialPilot
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Access your campaigns, posts and
                  analytics dashboard.
                </p>
              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                  <p className="text-sm leading-5 text-rose-300 font-semibold">
                    ⚠ {error}
                  </p>
                </div>
              )}

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >

                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-900"
                  />
                </div>

                {/* PASSWORD */}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-300"
                    >
                      Password
                    </label>

                    <Link
                      href="/reset-password"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter your password"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 pr-20 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-900"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous
                        )
                      }
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed transition"
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              {/* REGISTER */}

              <div className="mt-8 border-t border-slate-800 pt-6 text-center">
                <p className="text-sm text-slate-400">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-bold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Create one
                  </Link>
                </p>
              </div>

              {/* FOOTER */}

              <p className="mt-8 text-center text-[11px] leading-5 text-slate-500">
                By signing in, you can access your
                SocialPilot workspace and connected
                social media management features.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
