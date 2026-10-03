"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

const GEOGRAPHIES = [
  { country: "United States", pct: 42.4, followers: "133.4K", flag: "🇺🇸" },
  { country: "India", pct: 26.1, followers: "82.1K", flag: "🇮🇳" },
  { country: "United Kingdom", pct: 14.8, followers: "46.5K", flag: "🇬🇧" },
  { country: "Germany", pct: 8.7, followers: "27.3K", flag: "🇩🇪" },
  { country: "Canada", pct: 5.2, followers: "16.3K", flag: "🇨🇦" },
  { country: "Australia", pct: 2.8, followers: "8.8K", flag: "🇦🇺" },
];

const AGE_DISTRIBUTION = [
  { bracket: "25–34 years", pct: 48, barColor: "bg-indigo-500" },
  { bracket: "18–24 years", pct: 24, barColor: "bg-blue-500" },
  { bracket: "35–44 years", pct: 18, barColor: "bg-purple-500" },
  { bracket: "45–54 years", pct: 7, barColor: "bg-amber-500" },
  { bracket: "55+ years", pct: 3, barColor: "bg-slate-500" },
];

export default function AudiencePage() {
  const router = useRouter();
  const [period, setPeriod] = useState<"30d" | "90d" | "1y">("30d");

  /* Auth Guard */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* HEADER BREADCRUMB */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Audience Growth</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Audience Demographics & Community Intelligence
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(["30d", "90d", "1y"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition ${
                    period === p
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p === "30d" ? "30 Days" : p === "90d" ? "90 Days" : "1 Year"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => router.push("/create-post")}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
            >
              + Target Campaign
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* KPI OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Total Global Community</span>
            <p className="text-2xl font-black text-white mt-1">314.6K</p>
            <span className="text-xs font-bold text-emerald-400 mt-0.5 block">↑ +14.2% net growth</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Weekly Active Engagers</span>
            <p className="text-2xl font-black text-white mt-1">42.8K</p>
            <span className="text-xs font-bold text-indigo-400 mt-0.5 block">13.6% active ratio</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Gender Distribution</span>
            <p className="text-2xl font-black text-white mt-1">54% / 46%</p>
            <span className="text-xs text-slate-400 mt-0.5 block">Male / Female ratio</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Primary Device Type</span>
            <p className="text-2xl font-black text-white mt-1">78.2%</p>
            <span className="text-xs text-slate-400 mt-0.5 block">Mobile App sessions</span>
          </div>
        </div>

        {/* DEMOGRAPHICS & GEOGRAPHY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AGE BRACKETS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Age Distribution (Module 6)</h2>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/60">
                Core: 25–34
              </span>
            </div>

            <div className="space-y-4">
              {AGE_DISTRIBUTION.map((item) => (
                <div key={item.bracket} className="text-xs">
                  <div className="flex justify-between font-semibold text-slate-300 mb-1">
                    <span>{item.bracket}</span>
                    <span className="text-white font-extrabold">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div className={`h-full rounded-full ${item.barColor}`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOP GEOGRAPHIES */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Geographic Density</h2>
              <span className="text-xs font-semibold text-slate-400">Top 6 Markets</span>
            </div>

            <div className="divide-y divide-slate-800">
              {GEOGRAPHIES.map((geo) => (
                <div key={geo.country} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{geo.flag}</span>
                    <span className="font-bold text-slate-200">{geo.country}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-medium">{geo.followers}</span>
                    <span className="font-extrabold text-indigo-400 min-w-[45px] text-right">{geo.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}