"use client";

import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import Link from "next/link";
import {
  Calendar,
  Sparkles,
  Share2,
  TrendingUp,
  BarChart3,
  Users,
  Bell,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  LayoutGrid
} from "lucide-react";

export default function FeaturesPage() {
  const featureList = [
    {
      icon: Calendar,
      title: "Content Scheduling & Visual Calendar",
      desc: "Drag-and-drop calendar view with Month, Week, and Day modes. Queue posts for optimal time windows or custom dates with automatic timezone handling.",
      color: "bg-indigo-50 text-[#635BFF]",
    },
    {
      icon: Share2,
      title: "Multi-Platform Publishing",
      desc: "Connect Instagram, Facebook, LinkedIn, X (Twitter), YouTube, and Pinterest. Compose once and deploy simultaneously across all channels.",
      color: "bg-purple-50 text-[#7C3AED]",
    },
    {
      icon: Sparkles,
      title: "AI Content Assistant & Adapter",
      desc: "Instant intelligent caption generation, hashtag discovery, optimal posting window recommendations, and tailored network adaptations.",
      color: "bg-cyan-50 text-[#06B6D4]",
    },
    {
      icon: TrendingUp,
      title: "Campaign Management",
      desc: "Set campaign goals, budgets, and target objectives. Group scheduled content and track overall reach, engagement, and conversion milestones.",
      color: "bg-emerald-50 text-[#10B981]",
    },
    {
      icon: BarChart3,
      title: "Interactive Analytics Dashboard",
      desc: "Measure total reach, impressions, link clicks, follower growth trends, and individual post-performance engagement rates in real time.",
      color: "bg-rose-50 text-[#EF4444]",
    },
    {
      icon: Users,
      title: "Team Collaboration & RBAC",
      desc: "Granular permissions for Admins, Marketing Leads, Content Creators, and Business Viewers with streamlined review and approval queues.",
      color: "bg-amber-50 text-[#F59E0B]",
    },
    {
      icon: FileText,
      title: "Reports & PDF/Excel Export",
      desc: "Generate professional stakeholder reports. Export clean PDF documents or raw CSV/Excel spreadsheets with one click.",
      color: "bg-blue-50 text-[#2563EB]",
    },
    {
      icon: Bell,
      title: "Real-Time Notifications",
      desc: "Stay notified on published posts, campaign achievements, failed publishing attempts, approval requests, and token health updates.",
      color: "bg-teal-50 text-[#0D9488]",
    },
    {
      icon: ShieldCheck,
      title: "Social Account Hub & Security",
      desc: "OAuth token health monitoring, sandbox mock testing modes, profile handle sync, and secure token storage.",
      color: "bg-slate-100 text-slate-800",
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      {/* Hero Header */}
      <section className="pt-16 pb-16 bg-white border-b border-slate-200 text-center">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Product Overview</span>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Features engineered for modern social teams
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Discover all the intelligent tools inside IntelliPost that help you scale audience reach and optimize your publishing workflows.
          </p>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featureList.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs card-hover-effect flex flex-col justify-between"
                >
                  <div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.color} mb-6`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#635BFF] hover:text-[#5046E5]"
                    >
                      Try in Dashboard <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
