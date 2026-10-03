"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-indigo-500/25">
            S
          </div>
          <div>
            <span className="text-base font-extrabold text-white block leading-tight">
              SocialPilot
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">
              Password Recovery
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Reset Password
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Enter your registered email address to receive password reset instructions.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              ✓ Reset instructions have been dispatched to <strong>{email}</strong>.
            </div>
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold text-center transition shadow-md shadow-indigo-600/30"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
                ⚠ {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Account Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Instructions →"}
            </button>

            <p className="text-center text-xs text-slate-400 pt-3">
              Remember your password?{" "}
              <Link href="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
