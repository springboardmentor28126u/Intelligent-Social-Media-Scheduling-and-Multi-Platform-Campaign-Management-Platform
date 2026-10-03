"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

export default function PreferencesPage() {
  const router = useRouter();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [publishingPush, setPublishingPush] = useState(true);
  const [autoRetryFailed, setAutoRetryFailed] = useState(true);
  const [compactCalendar, setCompactCalendar] = useState(false);
  const [saved, setSaved] = useState(false);

  /* Auth Guard */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* HEADER BREADCRUMB */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Preferences</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Workspace & Experience Preferences
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-850 text-slate-200 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {saved && (
        <div className="max-w-4xl mx-auto w-full px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg">
            ✓ Preferences saved successfully!
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white pb-2 border-b border-slate-800">
            Publishing & Automation Controls
          </h2>

          <div className="space-y-3">
            {[
              { title: "Auto-Retry Failed Social Posts", desc: "Automatically reschedule posts that encountered rate-limits or temporary API token timeouts", state: autoRetryFailed, set: setAutoRetryFailed },
              { title: "Real-time Publishing Push Notifications", desc: "Receive immediate browser confirmation when multi-platform posts go live", state: publishingPush, set: setPublishingPush },
              { title: "Email Summary & Campaign Milestone Digest", desc: "Weekly performance digest of reach growth, conversions, and ROI metrics", state: emailAlerts, set: setEmailAlerts },
              { title: "Compact Publishing Calendar Grid", desc: "Show higher density day cells in the monthly content scheduling calendar", state: compactCalendar, set: setCompactCalendar },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => item.set(!item.state)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${item.state ? "bg-indigo-600" : "bg-slate-700"}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${item.state ? "left-6" : "left-1"}`} />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}