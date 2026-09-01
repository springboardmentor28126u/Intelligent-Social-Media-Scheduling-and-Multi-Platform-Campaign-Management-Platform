import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Sparkles,
  ArrowRight,
  Check,
  Smartphone,
  BarChart3,
  Calendar,
  Layers,
  Send,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Play,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";

export default function LandingPage() {
  const navigate = useNavigate();
  const [activePlatform, setActivePlatform] = useState<string>("instagram");

  const platforms = [
    { id: "instagram", name: "Instagram", icon: <FaInstagram className="text-pink-500" size={16} /> },
    { id: "facebook", name: "Facebook", icon: <FaFacebook className="text-blue-500" size={16} /> },
    { id: "linkedin", name: "LinkedIn", icon: <FaLinkedin className="text-sky-400" size={16} /> },
    { id: "twitter", name: "X / Twitter", icon: <FaTwitter className="text-slate-200" size={16} /> },
    { id: "youtube", name: "YouTube", icon: <FaYoutube className="text-red-500" size={16} /> },
    { id: "pinterest", name: "Pinterest", icon: <FaPinterest className="text-rose-500" size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 selection:bg-blue-500 selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Ambient Glow & Dot Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      
      {/* Top Center Main Ambient Gradient Light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] sm:w-[1100px] h-[500px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-72 left-10 w-[350px] h-[350px] bg-purple-600/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-80 right-10 w-[400px] h-[400px] bg-cyan-500/10 blur-[140px] pointer-events-none -z-10" />

      {/* Modern Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#070A12]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-22 flex items-center justify-between">
          {/* Enhanced Logo Area (Left) */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            {/* Logo Mark */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition duration-300">
              <div className="w-full h-full bg-[#0B0F1D] rounded-2xl flex items-center justify-center">
                <Zap size={24} className="text-blue-400 fill-blue-400 group-hover:scale-110 transition duration-300" />
              </div>
            </div>

            {/* Brand Text Layout */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black tracking-tight text-white font-display">
                  Social<span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Pilot</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 ml-1">
                  AI
                </span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 -mt-0.5">
                Social Operations OS
              </span>
            </div>
          </div>

          {/* Minimal Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-md">
            <a
              href="#features"
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              Features
            </a>
            <a
              href="#preview"
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              Product Preview
            </a>
            <a
              href="#pricing"
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              Pricing
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/register")}
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition duration-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative pt-12 pb-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-16">
        {/* Top Hero Typography & Call-To-Action */}
        <div className="text-center space-y-8 max-w-4xl mx-auto pt-6">
          {/* Subtle Glow Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs font-semibold text-blue-300 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <Sparkles size={13} className="text-cyan-400" />
            <span>Autonomous Multi-Platform Publishing & AI Scheduling</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white font-display leading-[1.08]">
            Publish Everywhere. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Manage with Precision.
            </span>
          </h1>

          {/* Subtitle Description */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            The unified social operations operating system for modern brands, marketing leads, creators, and agencies.
            Compose once, automate multi-channel dispatch, and scale audience engagement with real-time analytics.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigate("/register")}
              className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 border border-blue-400/30 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition duration-200" />
            </button>

            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-semibold text-base backdrop-blur-md transition-all duration-200 cursor-pointer"
            >
              <span>Sign In to Workspace</span>
            </button>
          </div>

          {/* Supported Channels Minimalist Pill Strip */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] mr-1">
              Connected Channels:
            </span>
            {platforms.map((plat) => (
              <span
                key={plat.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-slate-300 font-medium text-xs"
              >
                {plat.icon}
                <span>{plat.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Visual Product Showcase (Interactive SaaS Dashboard Mockup) */}
        <div id="preview" className="relative max-w-6xl mx-auto">
          {/* Subtle Outer Glow Frame */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-indigo-500/20 to-cyan-500/30 rounded-3xl blur-xl opacity-75 -z-10" />

          {/* Main SaaS Window Card */}
          <div className="bg-[#0B0F1D]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl">
            {/* Window Title Bar */}
            <div className="bg-[#080B16] px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-3 hidden sm:inline-block">
                  https://app.socialpilot.io/dashboard/composer
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
            </div>

            {/* Dashboard Mockup Interior */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
              {/* Left Mini Sidebar Bar */}
              <div className="lg:col-span-2 bg-[#080C18] border-b lg:border-b-0 lg:border-r border-white/5 p-4 flex lg:flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                    <Layers size={14} className="text-blue-400" />
                    <span>Workspace</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
                      <Zap size={15} />
                      <span>Composer</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer">
                      <Calendar size={15} />
                      <span>Calendar</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer">
                      <BarChart3 size={15} />
                      <span>Analytics</span>
                    </div>
                  </div>
                </div>

                {/* User Snapshot */}
                <div className="hidden lg:flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    AU
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">Admin User</p>
                    <p className="text-[9px] text-slate-400 truncate">Acme Global Inc.</p>
                  </div>
                </div>
              </div>

              {/* Center Composer Workspace */}
              <div className="lg:col-span-6 p-6 sm:p-7 space-y-5 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#0B0F1E]">
                {/* Platform Selector Chips */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    1. Select Target Channels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((p) => {
                      const isSelected = activePlatform === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivePlatform(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-600/20 border-blue-400 text-white font-bold shadow-xs"
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                          }`}
                        >
                          {p.icon}
                          <span>{p.name}</span>
                          {isSelected && <Check size={12} className="text-blue-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Assistant Banner */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    <span className="text-xs font-bold text-white">AI Prompt Caption Assistant</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Optimized ✨
                  </span>
                </div>

                {/* Caption Input Box */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    2. Post Content & Smart Hashtags
                  </label>
                  <div className="w-full bg-[#080C18] border border-white/10 rounded-2xl p-3.5 text-xs text-slate-200 leading-relaxed space-y-2">
                    <p>
                      🚀 We are thrilled to launch SocialPilot 2.0! One dashboard to manage multi-channel content,
                      schedule automated publishing queues, and measure live ROI. Check the link in bio!
                    </p>
                    <p className="text-blue-400 font-semibold">
                      #SocialPilot #MarketingAutomation #SaaS #Growth #MultiChannel
                    </p>
                  </div>
                </div>

                {/* Visual Media Attachment Simulator */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <ImageIcon size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">campaign_product_teaser.webp</p>
                      <p className="text-[10px] text-slate-400">2.4 MB • Auto-formatted for Instagram & LinkedIn</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ready
                  </span>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock size={14} className="text-blue-400" />
                    <span>Auto-Queue: Tomorrow 10:00 AM</span>
                  </div>
                  <button
                    onClick={() => navigate("/register")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Schedule Content</span>
                  </button>
                </div>
              </div>

              {/* Right Live Feed & Analytics Widget Panel */}
              <div className="lg:col-span-4 p-6 bg-[#070A15] space-y-5 flex flex-col justify-between">
                {/* Live Social Feed Card */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      <Smartphone size={15} className="text-blue-400" />
                      <span>Live Feed Preview ({activePlatform.toUpperCase()})</span>
                    </div>
                  </div>

                  {/* Phone Mockup Frame */}
                  <div className="bg-[#0B0F1F] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
                    {/* User Header */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        SP
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">SocialPilot Official</p>
                        <p className="text-[10px] text-slate-400">Sponsored • Just now</p>
                      </div>
                    </div>

                    {/* Media Mockup */}
                    <div className="w-full h-32 rounded-xl bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/20 flex flex-col items-center justify-center text-center p-3">
                      <Sparkles size={24} className="text-blue-400 mb-1" />
                      <p className="text-xs font-bold text-white">SocialPilot 2.0 Launch</p>
                      <p className="text-[10px] text-slate-400">High-Performance Campaign Dispatch</p>
                    </div>

                    {/* Content Snippet */}
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      🚀 We are thrilled to launch SocialPilot 2.0! One dashboard to manage multi-channel content...
                    </p>

                    {/* Interactions */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-pink-400">
                        <Heart size={13} /> 1.8K
                      </span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <MessageCircle size={13} /> 142
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Share2 size={13} /> 48
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Metric Snapshot Cards */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Audience Reach</span>
                      <TrendingUp size={14} className="text-emerald-400" />
                    </div>
                    <p className="text-lg font-black text-white font-display">148.2K</p>
                    <span className="text-[10px] font-bold text-emerald-400">+28.4% this month</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Campaign ROI</span>
                      <Zap size={14} className="text-blue-400" />
                    </div>
                    <p className="text-lg font-black text-white font-display">3.8x</p>
                    <span className="text-[10px] font-bold text-blue-400">Target surpassed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sleek Minimal Footer */}
      <footer className="border-t border-white/5 bg-[#05070D] py-10 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Zap size={14} className="text-blue-400 fill-blue-400" />
            </div>
            <span className="font-bold text-slate-300 font-display">SocialPilot</span>
            <span>– Enterprise Social Media Operations Platform</span>
          </div>

          <p>© 2026 SocialPilot Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
