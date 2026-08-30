// src/app/(auth)/login/page.tsx
//
// Login form — now connected to the real backend.
//
// What changed from the mocked version:
//   1. Instead of a fake setTimeout, we now call login() from our
//      AuthContext (the coat-check counter), which itself calls
//      POST /auth/login on the FastAPI backend.
//   2. On success, we redirect to /dashboard (a placeholder page we'll
//      build in the next step — don't worry if it 404s for now, that's
//      expected until we build it).
//   3. On failure (wrong password, etc), we show the real error message
//      instead of an alert().

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // This calls our AuthContext's login(), which sends email/password
      // to POST /auth/login and stores the returned token + user info.
      await login(email, password);

      // If login() didn't throw, we're in — go to the dashboard.
      router.push("/dashboard");
    } catch (err) {
      // login() throws a plain Error with a readable message on failure
      // (e.g. wrong password → backend's 401 gets turned into this).
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Log in</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base tracking-widest text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5
                     hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-indigo-600 font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}