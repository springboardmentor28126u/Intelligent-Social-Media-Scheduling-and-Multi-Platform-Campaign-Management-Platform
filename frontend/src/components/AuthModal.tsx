"use client";

import {
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  loginUser,
  registerUser,
} from "@/lib/api";

/* ============================================================
   TYPES
============================================================ */

type AuthMode =
  | "login"
  | "register";

type AuthModalProps = {
  isOpen?: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
};

/* ============================================================
   COMPONENT
============================================================ */

export default function AuthModal({
  isOpen = true,
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const router = useRouter();

  const [mode, setMode] =
    useState<AuthMode>(
      initialMode
    );

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* ==========================================================
     RESET FORM
  ========================================================== */

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }

  /* ==========================================================
     SWITCH MODE
  ========================================================== */

  function switchMode(
    nextMode: AuthMode
  ) {
    setMode(nextMode);
    resetForm();
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    /* --------------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------------- */

    if (!email.trim()) {
      setError(
        "Please enter your email."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    /* --------------------------------------------------------
       REGISTER VALIDATION
    -------------------------------------------------------- */

    if (mode === "register") {
      if (!name.trim()) {
        setError(
          "Please enter your name."
        );
        return;
      }

      if (password.length < 6) {
        setError(
          "Password must be at least 6 characters."
        );
        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );
        return;
      }
    }

    /* --------------------------------------------------------
       API REQUEST
    -------------------------------------------------------- */

    try {
      setLoading(true);

      /* ======================================================
         LOGIN
      ====================================================== */

      if (mode === "login") {
        /*
         * loginUser() handles:
         * access_token
         * user_id
         * user_name
         * user_role
         */

        await loginUser(
          email.trim(),
          password
        );

        setSuccess(
          "Login successful."
        );

        resetForm();

        onClose();

        router.push(
          "/dashboard"
        );

        return;
      }

      /* ======================================================
         REGISTER
      ====================================================== */

      await registerUser(
        name.trim(),
        email.trim(),
        password,
        "content_creator"
      );

      setSuccess(
        "Registration successful. Please log in."
      );

      setName("");
      setPassword("");
      setConfirmPassword("");

      setMode("login");
    } catch (err: unknown) {
      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );
      } else {
        setError(
          mode === "login"
            ? "Login failed."
            : "Registration failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     MODAL CLOSED
  ========================================================== */

  if (isOpen === false) {
    return null;
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
              SocialPilot
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {mode === "login"
                ? "Welcome back"
                : "Create your account"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to continue to SocialPilot."
                : "Start managing your social media campaigns."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-lg text-slate-500 hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* --------------------------------------------------
              NAME
          -------------------------------------------------- */}

          {mode === "register" && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Full Name
              </label>

              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Enter your name"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}

          {/* --------------------------------------------------
              EMAIL
          -------------------------------------------------- */}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              Email
            </label>

            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* --------------------------------------------------
              PASSWORD
          -------------------------------------------------- */}

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* --------------------------------------------------
              CONFIRM PASSWORD
          -------------------------------------------------- */}

          {mode === "register" && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Confirm Password
              </label>

              <input
                id="auth-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}

          {/* --------------------------------------------------
              SUBMIT BUTTON
          -------------------------------------------------- */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* ====================================================
            SWITCH LOGIN / REGISTER
        ==================================================== */}

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() =>
              switchMode(
                mode === "login"
                  ? "register"
                  : "login"
              )
            }
            className="ml-1 font-bold text-indigo-600 hover:text-sky-700"
          >
            {mode === "login"
              ? "Create one"
              : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
