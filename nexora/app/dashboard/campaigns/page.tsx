"use client";

import { useState } from "react";
import {
  TrendingUp,
  Plus,
  Calendar,
  DollarSign,
  Target,
  Users,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  X,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { formatNumber, getPlatformBadgeColor } from "@/lib/utils";

interface CampaignItem {
  id: number;
  name: string;
  description: string;
  platforms: string[];
  status: "Active" | "Scheduled" | "Completed";
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  objective: string;
  actualReach: number;
  targetReach: number;
  actualEngagement: number;
  targetEngagement: number;
  postsCount: number;
}

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "Active" | "Scheduled" | "Completed">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: 1,
      name: "Product Launch 2.0",
      description: "Cross-platform launch campaign for IntelliPost AI Co-Pilot features and multi-network calendar.",
      platforms: ["instagram", "facebook", "linkedin"],
      status: "Active",
      progress: 78,
      startDate: "Sep 1, 2026",
      endDate: "Sep 15, 2026",
      budget: 12500,
      objective: "Increase Product Awareness & Signups",
      actualReach: 125000,
      targetReach: 150000,
      actualEngagement: 32000,
      targetEngagement: 40000,
      postsCount: 24,
    },
    {
      id: 2,
      name: "Q3 Thought Leadership",
      description: "Weekly executive insights and AI industry frameworks on LinkedIn and Twitter.",
      platforms: ["linkedin", "twitter"],
      status: "Active",
      progress: 62,
      startDate: "Aug 20, 2026",
      endDate: "Sep 20, 2026",
      budget: 8000,
      objective: "Drive B2B Inbound Leads",
      actualReach: 84000,
      targetReach: 100000,
      actualEngagement: 19400,
      targetEngagement: 25000,
      postsCount: 16,
    },
    {
      id: 3,
      name: "Summer Community Spotlight",
      description: "User generated stories, agency spotlight interviews, and video masterclasses.",
      platforms: ["instagram", "youtube", "pinterest"],
      status: "Completed",
      progress: 100,
      startDate: "Aug 1, 2026",
      endDate: "Aug 28, 2026",
      budget: 15000,
      objective: "Boost Brand Engagement",
      actualReach: 210000,
      targetReach: 200000,
      actualEngagement: 64500,
      targetEngagement: 60000,
      postsCount: 38,
    },
    {
      id: 4,
      name: "Black Friday Warm-up",
      description: "Teaser previews, early bird discounts, and creator giveaways.",
      platforms: ["instagram", "facebook", "twitter"],
      status: "Scheduled",
      progress: 15,
      startDate: "Oct 15, 2026",
      endDate: "Nov 30, 2026",
      budget: 20000,
      objective: "Direct Conversions & Revenue",
      actualReach: 12000,
      targetReach: 300000,
      actualEngagement: 2400,
      targetEngagement: 75000,
      postsCount: 8,
    }
  ]);

  // Create Campaign state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPlatforms, setNewPlatforms] = useState<string[]>(["instagram", "linkedin"]);
  const [newBudget, setNewBudget] = useState(5000);
  const [newObjective, setNewObjective] = useState("Increase Brand Awareness");
  const [newStart, setNewStart] = useState("2026-09-05");
  const [newEnd, setNewEnd] = useState("2026-09-25");

  const toggleNewPlatform = (p: string) => {
    setNewPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const newCampaign: CampaignItem = {
      id: Date.now(),
      name: newName,
      description: newDesc || "Strategic marketing campaign",
      platforms: newPlatforms,
      status: "Active",
      progress: 5,
      startDate: newStart,
      endDate: newEnd,
      budget: newBudget,
      objective: newObjective,
      actualReach: 4500,
      targetReach: 50000,
      actualEngagement: 820,
      targetEngagement: 10000,
      postsCount: 4,
    };

    setCampaigns([newCampaign, ...campaigns]);
    setShowCreateModal(false);
    setNewName("");
    setNewDesc("");
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab !== "all" && c.status !== activeTab) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-[#635BFF]" />
            Campaign Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Track multi-network campaigns, milestones, reach targets, and budget performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {(["all", "Active", "Scheduled", "Completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition-colors ${
              activeTab === tab
                ? "bg-[#635BFF] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab} ({tab === "all" ? campaigns.length : campaigns.filter((c) => c.status === tab).length})
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredCampaigns.map((c) => (
          <div
            key={c.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs card-hover-effect flex flex-col justify-between"
          >
            <div>
              {/* Top status & date */}
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                    c.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : c.status === "Completed"
                      ? "bg-slate-100 text-slate-700 border border-slate-200"
                      : "bg-indigo-50 text-[#635BFF] border border-indigo-200"
                  }`}
                >
                  {c.status}
                </span>

                <span className="text-xs text-slate-400 font-medium">
                  {c.startDate} — {c.endDate}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-slate-900 mt-3">{c.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>

              {/* Platforms */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.platforms.map((p) => {
                  const style = getPlatformBadgeColor(p);
                  return (
                    <span
                      key={p}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border capitalize ${style.bg} ${style.text} ${style.border}`}
                    >
                      {p}
                    </span>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mt-5">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Campaign Progress</span>
                  <span className="text-[#635BFF]">{c.progress}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${c.progress}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-[#635BFF] to-[#06B6D4] transition-all"
                  />
                </div>
              </div>

              {/* Metric stats 3 cols */}
              <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50/70 p-3.5 border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Posts</span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{c.postsCount}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Reach</span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{formatNumber(c.actualReach)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Engagement</span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{formatNumber(c.actualEngagement)}</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Budget: <strong className="text-slate-900">₹{c.budget.toLocaleString()}</strong>
              </span>

              <button
                onClick={() => {}}
                className="text-xs font-bold text-[#635BFF] hover:underline flex items-center gap-1"
              >
                View Analytics →
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#635BFF]" />
                Launch New Campaign
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Diwali Mega Sale 2026"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Objective</label>
                <select
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white"
                >
                  <option value="Increase Brand Awareness">Increase Brand Awareness</option>
                  <option value="Drive Inbound Leads">Drive Inbound Leads</option>
                  <option value="Community Engagement">Community Engagement</option>
                  <option value="Direct Sales & Conversions">Direct Sales & Conversions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Platforms</label>
                <div className="grid grid-cols-3 gap-2">
                  {["instagram", "facebook", "linkedin", "twitter", "youtube", "pinterest"].map((p) => {
                    const sel = newPlatforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleNewPlatform(p)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold capitalize border transition-all ${
                          sel ? "bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Budget (₹)</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#635BFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5046E5]"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
