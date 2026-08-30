// src/app/(auth)/register/page.tsx
//
// Register form — now connected to the real backend.
//
// What changed from the mocked version:
//   1. Instead of a fake setTimeout + alert(), we call register() from
//      our AuthContext, which sends a JSON body to POST /auth/register.
//   2. On success: registration does NOT log you in automatically
//      (matches your backend's design — register, then log in separately).
//      So we redirect to /login with a small "success" message instead.
//   3. On failure (e.g. duplicate email), we show the backend's real
//      error message instead of a generic alert.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("content_creator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // This calls our AuthContext's register(), which POSTs a JSON body
      // (full_name, email, password, role) to /auth/register.
      await register({ full_name: fullName, email, password, role });

      // Registration succeeded but doesn't log you in — send them to
      // /login with a query flag so we can show a "account created" hint.
      router.push("/login?registered=true");
    } catch (err) {
      // register() throws a plain Error using the backend's "detail"
      // message on failure (e.g. "Email already registered").
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Create your account</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base tracking-widest text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            I am a...
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="content_creator">Content Creator</option>
            <option value="marketing_team">Marketing Team</option>
            <option value="business_user">Business User</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5
                     hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}