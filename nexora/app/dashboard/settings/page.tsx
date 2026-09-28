"use client";

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Sparkles,
  Key,
  Shield,
  Save,
  Check,
  Globe,
  Bell,
  Layers
} from "lucide-react";
import { getStoredUser, setAuthSession, AuthUser } from "@/lib/auth";

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("Chandu");
  const [email, setEmail] = useState("admin@intellipost.com");
  const [role, setRole] = useState("Admin");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST - +05:30)");
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80");

  // AI Settings
  const [defaultTone, setDefaultTone] = useState("Engaging");
  const [customBrandInstructions, setCustomBrandInstructions] = useState(
    "Always maintain an optimistic, data-driven, and authoritative tone. Emphasize growth, clarity, and innovation."
  );
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setName(stored.name);
      setEmail(stored.email);
      setRole(stored.role || "Admin");
      if (stored.avatar_url) setAvatarUrl(stored.avatar_url);
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSession("mock_token", {
      id: user?.id || 1,
      name,
      email,
      role,
      avatar_url: avatarUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <SettingsIcon className="h-6 w-6 text-[#635BFF]" />
            Workspace & Profile Settings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Configure your user profile, timezone preferences, AI model parameters, and API credentials.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-700">
            <Check className="h-4 w-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* 1. Profile & Account */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="h-4 w-4 text-[#635BFF]" />
            <h3 className="text-sm font-bold text-slate-900">Personal Profile & Timezone</h3>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-2xl object-cover border border-slate-200"
            />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700">Avatar Image URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Role</label>
              <input
                type="text"
                disabled
                value={role}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Default Scheduling Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white"
              >
                <option value="Asia/Kolkata (IST - +05:30)">Asia/Kolkata (IST - +05:30)</option>
                <option value="America/New_York (EST - -05:00)">America/New_York (EST - -05:00)</option>
                <option value="Europe/London (GMT - +00:00)">Europe/London (GMT - +00:00)</option>
                <option value="Asia/Singapore (SGT - +08:00)">Asia/Singapore (SGT - +08:00)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. AI Content Co-Pilot Tuning */}
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-indigo-100">
            <Sparkles className="h-4 w-4 text-[#635BFF]" />
            <h3 className="text-sm font-bold text-slate-900">AI Co-Pilot Tuning & Brand Voice</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Default Generation Tone</label>
              <select
                value={defaultTone}
                onChange={(e) => setDefaultTone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white"
              >
                <option value="Engaging">Engaging & Conversational</option>
                <option value="Professional">Professional & Executive</option>
                <option value="Inspiring">Inspiring & Motivational</option>
                <option value="Humorous">Humorous & Relatable</option>
                <option value="Urgent">Urgent & Action-Driven</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">AI Engine Mode</label>
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white">
                <option value="built-in">IntelliPost Native Intelligent Engine (Fastest)</option>
                <option value="openai">OpenAI GPT-4o Integration</option>
                <option value="gemini">Google Gemini 1.5 Pro Integration</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Custom Brand Persona & Instructions</label>
            <textarea
              rows={3}
              value={customBrandInstructions}
              onChange={(e) => setCustomBrandInstructions(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none resize-none leading-relaxed"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              The AI Co-Pilot injects these instructions into all multi-platform caption generators and hashtags.
            </p>
          </div>
        </div>

        {/* 3. API Keys & Webhooks */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Key className="h-4 w-4 text-[#635BFF]" />
            <h3 className="text-sm font-bold text-slate-900">API Credentials & Custom LLM Keys (Optional)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">OpenAI API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-••••••••••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Google Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy••••••••••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
          >
            <Save className="h-4 w-4" />
            <span>Save Preferences</span>
          </button>
        </div>

      </form>

    </div>
  );
}
