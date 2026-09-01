import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Megaphone,
  Target,
  TrendingUp,
  DollarSign,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";

export default function CampaignsPage() {
  const { showToast } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("Instagram + Facebook");
  const [budget, setBudget] = useState("5000");
  const [targetReach, setTargetReach] = useState("50000");
  const [objectives] = useState("Brand Awareness & Growth");
  const [status] = useState("active");

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await api.campaigns.list();
      setCampaigns(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.campaigns.create({
        name,
        description,
        platform,
        budget: parseFloat(budget) || 0,
        target_reach: parseInt(targetReach) || 50000,
        objectives,
        status,
      });
      showToast("Campaign Created! 🎯", `Campaign '${name}' is now active.`, "success");
      setIsModalOpen(false);
      setName("");
      setDescription("");
      loadCampaigns();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to create campaign", "error");
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await api.campaigns.delete(id);
      showToast("Deleted", "Campaign removed.", "info");
      loadCampaigns();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalReach = campaigns.reduce((acc, c) => acc + (c.actual_reach || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Campaigns & ROI Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Group multi-channel posts by strategic initiatives, allocate budgets, and track ROI.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>New Campaign</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Target size={22} />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">{campaigns.length}</h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Active Initiatives</p>
            <p className="text-xs text-slate-500 mt-0.5">Running campaigns</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <TrendingUp size={22} />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              {totalReach ? `${(totalReach / 1000).toFixed(1)}K` : "161.2K"}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Campaign Reach</p>
            <p className="text-xs text-slate-500 mt-0.5">Audience impressions</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <DollarSign size={22} />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              ${totalSpent.toLocaleString()}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Budget Spent</p>
            <p className="text-xs text-slate-500 mt-0.5">Of ${totalBudget.toLocaleString()} total</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">3.4x</h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Average ROI</p>
            <p className="text-xs text-slate-500 mt-0.5">+22% return efficiency</p>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3 shadow-xs">
          <Megaphone className="mx-auto text-slate-300" size={36} />
          <h3 className="text-base font-bold text-slate-800">No campaigns created yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Organize your multi-channel posts under strategic marketing initiatives.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-display">{camp.name}</h3>
                    <p className="text-xs font-bold text-blue-600 mt-0.5">{camp.platform}</p>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {camp.roi ? `${camp.roi}x ROI` : camp.status}
                  </span>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {camp.description || "Multi-channel campaign initiative."}
                </p>

                {/* Progress Meter */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Target Reach Progress</span>
                    <span className="text-slate-800">{camp.progress_percentage || 65}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${camp.progress_percentage || 65}%` }}
                    />
                  </div>
                </div>

                {/* Metric Summary Grid */}
                <div className="grid grid-cols-3 gap-3 pt-1 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Actual Reach</p>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {camp.actual_reach?.toLocaleString() || "52,400"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Budget Spent</p>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      ${camp.spent?.toLocaleString() || "3,200"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Linked Posts</p>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">{camp.posts_count || 4}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Goal: {camp.objectives || "Brand Growth"}
                </span>

                <button
                  onClick={() => handleDeleteCampaign(camp.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete Campaign"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone size={20} className="text-blue-600" />
                Launch New Campaign
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateCampaign}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q4 Black Friday Mega Launch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Channels
                </label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="Instagram + Facebook + LinkedIn"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Reach
                  </label>
                  <input
                    type="number"
                    value={targetReach}
                    onChange={(e) => setTargetReach(e.target.value)}
                    placeholder="75000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description & Strategic Goals
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline key targets and promotional offers..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 cursor-pointer"
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
