"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  Check
} from "lucide-react";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is SocialPilot?",
      a: "SocialPilot is an enterprise-grade social media management platform designed for marketing teams, creators, and agencies to create, AI-adapt, schedule, publish, and analyze content across all major social networks from one unified workspace."
    },
    {
      q: "Which social platforms are supported?",
      a: "SocialPilot natively supports Instagram, Facebook, LinkedIn, X (Twitter), YouTube, and Pinterest with platform-specific content adapters, optimal timing suggestions, and automated publishing."
    },
    {
      q: "How does the AI Content Co-Pilot work?",
      a: "Simply input a topic, campaign theme, or draft caption. The AI Co-Pilot generates platform-tailored variations (e.g. hashtags and visual style for Instagram, executive depth for LinkedIn, punchy brevity for X), suggests hashtags, and identifies your peak engagement posting windows."
    },
    {
      q: "Can I collaborate with my team and assign permissions?",
      a: "Yes! IntelliPost features Role-Based Access Control (RBAC) with preconfigured roles (Admin, Marketing Team, Content Creator, Business User) and granular permissions for creating, editing, deleting, publishing, and analytics."
    },
    {
      q: "Can I export reports for my clients or leadership?",
      a: "Absolutely. Generate beautiful PDF reports or export raw CSV/Excel spreadsheets covering audience growth, campaign milestones, platform comparisons, and post-level engagement rates in one click."
    }
  ];

  const platforms = [
    { name: "Instagram", icon: "📸", color: "from-pink-500 to-rose-500", handle: "@brand_hq" },
    { name: "Facebook", icon: "👥", color: "from-blue-600 to-indigo-600", handle: "Brand Page" },
    { name: "LinkedIn", icon: "💼", color: "from-sky-600 to-blue-700", handle: "Company HQ" },
    { name: "X / Twitter", icon: "𝕏", color: "from-slate-900 to-slate-700", handle: "@brand" },
    { name: "YouTube", icon: "▶️", color: "from-red-600 to-rose-600", handle: "Brand Studio" },
    { name: "Pinterest", icon: "📌", color: "from-rose-600 to-red-600", handle: "Pins & Ideas" }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 bg-hero-glow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#635BFF]/30 bg-[#635BFF]/10 px-4 py-1.5 text-xs font-semibold text-[#635BFF] mb-6 shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Intelligent Social Media Management SaaS</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl max-w-4xl mx-auto leading-[1.15]">
            Plan smarter. <br />
            <span className="text-gradient">Post better.</span> Grow faster.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            SocialPilot helps creators, businesses, and marketing teams create, schedule, publish, and analyze social media content across 6 major platforms from one intelligent workspace.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-linear-to-r from-[#635BFF] to-[#7C3AED] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#635BFF]/30 hover:from-[#5046E5] hover:to-[#6D28D9] transition-all hover:scale-[1.02]"
            >
              Launch App
              <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              href="/features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Explore Features
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Multi-Platform AI Co-Pilot
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Live Scheduling Engine
            </span>
          </div>

          {/* 2. LIVE DASHBOARD PREVIEW MOCKUP */}
          <div className="mt-14 relative mx-auto max-w-5xl rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xl shadow-indigo-500/10">
            <div className="rounded-xl bg-slate-900 p-4 sm:p-6 text-left text-white overflow-hidden">
              
              {/* Mock Window Controls */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs text-slate-400 font-mono">intellipost.app/dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800/60">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Workspace
                </div>
              </div>

              {/* Mock Top Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/50">
                  <span className="text-xs text-slate-400">Scheduled Posts</span>
                  <p className="text-2xl font-bold text-white mt-1">24</p>
                  <span className="text-[10px] text-indigo-400 font-semibold">+6 this week</span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/50">
                  <span className="text-xs text-slate-400">Published Posts</span>
                  <p className="text-2xl font-bold text-white mt-1">12</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">100% on time</span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/50">
                  <span className="text-xs text-slate-400">Active Campaigns</span>
                  <p className="text-2xl font-bold text-white mt-1">8</p>
                  <span className="text-[10px] text-cyan-400 font-semibold">78% avg progress</span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/50">
                  <span className="text-xs text-slate-400">Audience Growth</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">+18.4%</p>
                  <span className="text-[10px] text-slate-400">47,170 total fans</span>
                </div>
              </div>

              {/* Mock Channels Row */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-800/60 p-2 border border-slate-700/30">
                  <p className="font-semibold text-slate-200">Instagram</p>
                  <p className="text-pink-400 font-bold mt-0.5">8.3K (+15%)</p>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-2 border border-slate-700/30">
                  <p className="font-semibold text-slate-200">Facebook</p>
                  <p className="text-blue-400 font-bold mt-0.5">12.5K (+12%)</p>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-2 border border-slate-700/30">
                  <p className="font-semibold text-slate-200">LinkedIn</p>
                  <p className="text-sky-400 font-bold mt-0.5">4.2K (+6%)</p>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-2 border border-slate-700/30">
                  <p className="font-semibold text-slate-200">X (Twitter)</p>
                  <p className="text-slate-200 font-bold mt-0.5">6.8K (+10%)</p>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-2 border border-slate-700/30">
                  <p className="font-semibold text-slate-200">YouTube</p>
                  <p className="text-red-400 font-bold mt-0.5">15.3K (+14%)</p>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-2 border border-slate-700/30">
                  <p className="font-semibold text-slate-200">Pinterest</p>
                  <p className="text-rose-400 font-bold mt-0.5">3.5K (+8%)</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. SUPPORTED PLATFORMS BANNER */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Publish simultaneously across all your favorite channels
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {platforms.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 transition-all hover:bg-white hover:shadow-md hover:border-[#635BFF]/30"
              >
                <span className="text-lg">{p.icon}</span>
                <span className="text-sm font-bold text-slate-800">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. STATISTICS */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold text-[#635BFF]">150K+</p>
              <p className="mt-2 text-sm text-slate-400">Posts Scheduled & Published</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold text-[#06B6D4]">99.98%</p>
              <p className="mt-2 text-sm text-slate-400">Publishing Reliability Uptime</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold text-[#10B981]">4.9 / 5</p>
              <p className="mt-2 text-sm text-slate-400">Creator & Agency Satisfaction</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold text-amber-400">3.8x</p>
              <p className="mt-2 text-sm text-slate-400">Faster Content Output with AI</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE FEATURES GRID */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Powerful Capabilities</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Everything you need to dominate social media
            </h2>
            <p className="mt-4 text-base text-slate-600">
              From ideation and multi-network drafting to automated execution and executive analytics.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs card-hover-effect">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-[#635BFF] mb-5">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Visual Content Calendar</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Drag, drop, and reschedule your entire month’s content with Month, Week, and Day views and platform filtering.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs card-hover-effect">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-[#7C3AED] mb-5">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Content Co-Pilot & Adapter</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Generate tailored captions, trending hashtags, optimal posting windows, and auto-adapted versions for every network.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs card-hover-effect">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-[#06B6D4] mb-5">
                <Share2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Multi-Platform Publishing</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Create once, customize per network with live device previews, and push to Instagram, LinkedIn, FB, X, YT, and Pinterest.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs card-hover-effect">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#10B981] mb-5">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Campaign Management</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Organize posts into strategic campaigns, track budget allocation, progress milestones, and total reach vs target.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs card-hover-effect">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-[#EF4444] mb-5">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Deep Analytics & Reports</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Inspect engagement rates, reach trends, audience growth, and generate presentation-ready PDF & Excel exports.
              </p>
            </div>

            {/* Card 6 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs card-hover-effect">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-[#F59E0B] mb-5">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Team Collaboration & RBAC</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Seamless role-based permissions for Admins, Marketing Leads, Creators, and Viewers with workflow approval queues.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section className="py-20 bg-[#F8FAFC] border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Simple 4-Step Flow</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              How IntelliPost streamlines your workflow
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            
            <div className="rounded-2xl border border-slate-200 bg-white p-6 relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#635BFF] text-white font-bold text-sm mb-4">
                1
              </div>
              <h4 className="font-bold text-slate-900">Connect Social Accounts</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Link Instagram, Facebook, LinkedIn, X, YouTube, and Pinterest securely in seconds.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED] text-white font-bold text-sm mb-4">
                2
              </div>
              <h4 className="font-bold text-slate-900">Create with AI Co-Pilot</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Draft your idea and let the AI adapt captions, hashtags, and media formats for every network.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06B6D4] text-white font-bold text-sm mb-4">
                3
              </div>
              <h4 className="font-bold text-slate-900">Schedule on Calendar</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Pick optimal peak engagement time slots or use AI recommendations to queue posts.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981] text-white font-bold text-sm mb-4">
                4
              </div>
              <h4 className="font-bold text-slate-900">Analyze & Grow</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Track live impressions, engagement spikes, and download professional client reports.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 7. PRICING SECTION */}
      <section className="py-20 bg-white border-t border-slate-200" id="pricing">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Simple Transparent Pricing</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Plans built for every stage of growth
            </h2>
            <p className="mt-3 text-slate-600">Choose the plan that fits your workflow and scale when you need to.</p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
            
            {/* Free */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-sm font-bold text-slate-500 uppercase">Starter</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Free</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">₹0</span>
                  <span className="text-slate-500 text-sm">/ month</span>
                </div>
                <p className="mt-3 text-xs text-slate-600">Perfect for individual creators and testing the workspace.</p>

                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> 3 Social Accounts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> 10 Scheduled Posts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Basic Analytics Overview</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> 1 Team Member</li>
                </ul>
              </div>

              <Link
                href="/login"
                className="mt-8 block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Launch App
              </Link>
            </div>

            {/* Pro - Highlighted */}
            <div className="rounded-3xl border-2 border-[#635BFF] bg-linear-to-b from-indigo-50/50 via-white to-white p-8 shadow-xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#635BFF] px-4 py-1 text-[11px] font-bold text-white uppercase tracking-wider shadow-sm">
                Most Popular
              </div>

              <div>
                <span className="text-sm font-bold text-[#635BFF] uppercase">Professional</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Pro</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">₹799</span>
                  <span className="text-slate-500 text-sm">/ month</span>
                </div>
                <p className="mt-3 text-xs text-slate-600">For high-growth creators, marketing teams, and businesses.</p>

                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-[#635BFF]" /> 10 Social Accounts</li>
                  <li className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-[#635BFF]" /> Unlimited Scheduled Posts</li>
                  <li className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-[#635BFF]" /> AI Content Assistant & Hashtags</li>
                  <li className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-[#635BFF]" /> Advanced Campaign Management</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#635BFF]" /> 10 Team Members with RBAC</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#635BFF]" /> PDF & Excel Report Exports</li>
                </ul>
              </div>

              <Link
                href="/login"
                className="mt-8 block w-full rounded-xl bg-linear-to-r from-[#635BFF] to-[#7C3AED] py-3 text-center text-sm font-semibold text-white shadow-md shadow-[#635BFF]/30 hover:from-[#5046E5] hover:to-[#6D28D9] transition-all"
              >
                Launch App
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-sm font-bold text-slate-500 uppercase">Enterprise</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Business</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">₹1,999</span>
                  <span className="text-slate-500 text-sm">/ month</span>
                </div>
                <p className="mt-3 text-xs text-slate-600">For agencies managing multiple clients and high-volume campaigns.</p>

                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Unlimited Social Accounts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Unlimited Scheduled Posts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Advanced Multi-Platform AI Co-Pilot</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Unlimited Team Members</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Dedicated Priority 24/7 Support</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Custom Webhooks & API Access</li>
                </ul>
              </div>

              <Link
                href="/register"
                className="mt-8 block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Contact Sales
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section className="py-20 bg-[#F8FAFC] border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Frequently Asked Questions</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Got questions? We&apos;ve got answers.
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-900 hover:bg-slate-50"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. BOTTOM CTA BANNER */}
      <section className="py-20 bg-linear-to-r from-[#635BFF] via-[#7C3AED] to-[#06B6D4] text-white text-center">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-5xl tracking-tight">
            Ready to transform your social media presence?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-2xl mx-auto">
            Join thousands of teams planning, creating, and automating social content with IntelliPost.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-[#635BFF] shadow-lg hover:bg-slate-50 transition-transform hover:scale-[1.02]"
            >
              Launch App
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 backdrop-blur-xs px-8 py-3.5 text-base font-bold text-white hover:bg-white/20 transition-all"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
