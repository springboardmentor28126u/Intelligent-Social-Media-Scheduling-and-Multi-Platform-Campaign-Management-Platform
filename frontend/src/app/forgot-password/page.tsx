"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please provide your registered work email.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");
      await forgotPassword(email.trim());
      setMessage("Password recovery instructions and reset token have been dispatched to your email address.");
    } catch {
      setMessage("Password recovery instructions have been sent to your email. Check your inbox to proceed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      {/* BRAND HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#fbbf24] text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <svg className="w-5 h-5 fill-slate-950" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
        <div>
          <span className="text-xl font-extrabold text-white tracking-tight block">SocialPilot</span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">Command Center</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password</h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Enter your registered account email and we will send you a secure verification link to reset your credentials.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError("")} className="hover:text-white">✕</button>
          </div>
        )}

        {message && (
          <div className="p-3.5 mb-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-start gap-2 shadow-lg">
            <span>✓</span>
            <div className="flex-1">
              <p>{message}</p>
              <Link href="/reset-password" className="text-indigo-400 underline font-bold mt-2 inline-block">
                Enter Reset Token →
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full text-xs font-medium px-4 py-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? "Sending link..." : "Send Reset Link"}</span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <Link href="/login" className="text-xs text-slate-400 hover:text-white transition font-semibold">
            ← Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
