"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Layers, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#7C3AED] text-white shadow-lg shadow-[#635BFF]/30">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              IntelliPost
            </span>
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">Reset your password</h2>
          <p className="mt-1 text-xs text-slate-500">We'll send you instructions to reset your account password</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Check your inbox</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account exists for <span className="font-semibold text-slate-900">{email}</span>, we have sent a secure password reset link.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#635BFF] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Registered Email Address</label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@intellipost.com"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#635BFF] py-3 text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
              >
                Send Reset Link
              </button>

              <div className="pt-4 text-center border-t border-slate-100">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
                  <ArrowLeft className="h-3.5 w-3.5" /> Return to login
                </Link>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
