"use client";

import { useState } from "react";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import Link from "next/link";
import { Check, HelpCircle, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Free",
      price: "₹0",
      description: "For individual creators and students testing the platform.",
      features: [
        "3 Connected Social Accounts",
        "10 Scheduled Posts in Queue",
        "Basic Analytics Overview",
        "1 Team Member",
        "Manual Post Publishing",
        "Standard Email Support"
      ],
      cta: "Launch App",
      highlight: false,
    },
    {
      name: "Pro",
      price: annual ? "₹649" : "₹799",
      description: "For serious creators, marketing teams, and growing brands.",
      features: [
        "10 Connected Social Accounts",
        "Unlimited Scheduled Posts",
        "AI Content Assistant & Hashtags",
        "AI Platform Content Adapter",
        "Advanced Campaign Management",
        "10 Team Members with RBAC",
        "PDF & Excel Report Exports",
        "Priority Customer Support"
      ],
      cta: "Launch App",
      highlight: true,
    },
    {
      name: "Business",
      price: annual ? "₹1,599" : "₹1,999",
      description: "For digital agencies and multi-brand corporate teams.",
      features: [
        "Unlimited Social Accounts",
        "Unlimited Scheduled Posts",
        "Advanced AI Co-Pilot with Custom Tones",
        "Unlimited Team Members & RBAC",
        "Automated Client PDF Reports",
        "Custom Webhooks & REST API Access",
        "24/7 Dedicated Account Manager",
        "Custom SLA & Security Compliance"
      ],
      cta: "Contact Sales",
      highlight: false,
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      {/* Header */}
      <section className="pt-16 pb-12 bg-white border-b border-slate-200 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Flexible Plans</span>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Predictable pricing for creators and marketing teams
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Choose the plan that fits your growth. No hidden setup fees or surprise charges.
          </p>

          {/* Billing Switch */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                !annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                annual ? "bg-[#635BFF] text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Annual Billing
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all ${
                  p.highlight
                    ? "border-2 border-[#635BFF] bg-white shadow-xl relative scale-105 z-10"
                    : "border border-slate-200 bg-white shadow-xs"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#635BFF] px-4 py-1 text-[11px] font-bold text-white uppercase tracking-wider shadow-sm">
                    Recommended
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{p.name} Tier</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">{p.price}</span>
                    <span className="text-slate-500 text-sm">/ month</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">{p.description}</p>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Included Features:</p>
                    <ul className="space-y-3 text-xs text-slate-700">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <Check className={`h-4 w-4 shrink-0 ${p.highlight ? "text-[#635BFF]" : "text-emerald-500"}`} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link
                  href="/login"
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                    p.highlight
                      ? "bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/30 hover:bg-[#5046E5]"
                      : "border border-slate-200 text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
