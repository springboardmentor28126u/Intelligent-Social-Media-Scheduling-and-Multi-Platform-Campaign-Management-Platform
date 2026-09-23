import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import CreatePostModal from "../components/CreatePostModal";
import {
  Plus,
  Megaphone,
  Target,
  TrendingUp,
  DollarSign,
  Trash2,
  X,
  Sparkles,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  BarChart3,
  ArrowRight,
  ExternalLink,
  Edit3,
  SlidersHorizontal,
  ChevronRight,
  Download,
  Scale,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

export default function CampaignsPage() {
  const { showToast } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data states
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"created" | "budget" | "reach" | "posts">("created");

  // Create / Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPlatform, setFormPlatform] = useState("All Platforms");
  const [formStatus, setFormStatus] = useState("active");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formBudget, setFormBudget] = useState("5000");
  const [formSpent, setFormSpent] = useState("0");
  const [formTargetReach, setFormTargetReach] = useState("50000");
  const [formTargetEngagement, setFormTargetEngagement] = useState("5.0");
  const [formTargetClicks, setFormTargetClicks] = useState("2000");
  const [formObjectives, setFormObjectives] = useState("Brand Awareness & Growth");
  const [formColor, setFormColor] = useState("#2563eb");
  const [saving, setSaving] = useState(false);

  // Campaign Details view modal states
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [campaignPosts, setCampaignPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  // Add Posts modal states
  const [isAddPostsModalOpen, setIsAddPostsModalOpen] = useState(false);
  const [availablePosts, setAvailablePosts] = useState<any[]>([]);
  const [selectedPostIdsToAdd, setSelectedPostIdsToAdd] = useState<number[]>([]);
  const [loadingAvailablePosts, setLoadingAvailablePosts] = useState(false);

  // Campaign Comparison modal states
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<number[]>([]);
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await api.campaigns.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setCampaigns(data);
      
      // If currently viewing a campaign detail, refresh it too
      if (selectedCampaign) {
        const refreshed = data.find((c: any) => c.id === selectedCampaign.id);
        if (refreshed) {
          setSelectedCampaign(refreshed);
        }
      }
    } catch (err: any) {
      showToast("Error", err.message || "Failed to load campaigns", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      openCreateModal();
    }
    const campIdParam = searchParams.get("id");
    if (campIdParam && !isNaN(Number(campIdParam))) {
      openDetailsById(Number(campIdParam));
    }
  }, [searchParams]);

  const openDetailsById = async (id: number) => {
    try {
      const camp = await api.campaigns.get(id);
      openDetails(camp);
    } catch {
      // Ignore
    }
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormName("");
    setFormDescription("");
    setFormPlatform("All Platforms");
    setFormStatus("active");
    setFormStartDate("");
    setFormEndDate("");
    setFormBudget("5000");
    setFormSpent("0");
    setFormTargetReach("50000");
    setFormTargetEngagement("5.0");
    setFormTargetClicks("2000");
    setFormObjectives("Brand Awareness & Growth");
    setFormColor("#2563eb");
    setIsModalOpen(true);
  };

  const openEditModal = (camp: any) => {
    setEditingCampaign(camp);
    setFormName(camp.name || "");
    setFormDescription(camp.description || "");
    setFormPlatform(camp.platform || "All Platforms");
    setFormStatus(camp.status || "active");
    setFormStartDate(camp.start_date ? camp.start_date.substring(0, 10) : "");
    setFormEndDate(camp.end_date ? camp.end_date.substring(0, 10) : "");
    setFormBudget(camp.budget !== undefined ? String(camp.budget) : "0");
    setFormSpent(camp.spent !== undefined ? String(camp.spent) : "0");
    setFormTargetReach(camp.target_reach !== undefined ? String(camp.target_reach) : "50000");
    setFormTargetEngagement(camp.target_engagement !== undefined ? String(camp.target_engagement) : "5.0");
    setFormTargetClicks(camp.target_clicks !== undefined ? String(camp.target_clicks) : "2000");
    setFormObjectives(camp.objectives || "Brand Awareness & Growth");
    setFormColor(camp.color || "#2563eb");
    setIsModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: formName,
        description: formDescription,
        platform: formPlatform,
        status: formStatus,
        start_date: formStartDate ? new Date(formStartDate).toISOString() : null,
        end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
        budget: parseFloat(formBudget) || 0,
        spent: parseFloat(formSpent) || 0,
        target_reach: parseInt(formTargetReach) || 50000,
        target_engagement: parseFloat(formTargetEngagement) || 5.0,
        target_clicks: parseInt(formTargetClicks) || 2000,
        objectives: formObjectives,
        color: formColor,
      };

      if (editingCampaign) {
        await api.campaigns.update(editingCampaign.id, payload);
        showToast("Campaign Updated", `Campaign '${formName}' has been updated.`, "success");
      } else {
        await api.campaigns.create(payload);
        showToast("Campaign Created! 🎯", `Campaign '${formName}' is now active.`, "success");
      }
      setIsModalOpen(false);
      loadCampaigns();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to save campaign", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (campaignId: number, newStatus: string) => {
    try {
      await api.campaigns.updateStatus(campaignId, newStatus);
      showToast("Status Updated", `Campaign status changed to ${newStatus}.`, "success");
      loadCampaigns();
      if (selectedCampaign && selectedCampaign.id === campaignId) {
        setSelectedCampaign({ ...selectedCampaign, status: newStatus });
      }
    } catch (err: any) {
      showToast("Error", err.message || "Failed to update status", "error");
    }
  };

  const handleDeleteCampaign = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign '${name}'? Linked posts will remain preserved.`)) return;
    try {
      await api.campaigns.delete(id);
      showToast("Campaign Deleted", "Campaign removed.", "info");
      if (selectedCampaign && selectedCampaign.id === id) {
        setSelectedCampaign(null);
      }
      loadCampaigns();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to delete campaign", "error");
    }
  };

  const refreshCampaignDetails = async (campId: number) => {
    try {
      const camp = await api.campaigns.get(campId);
      setSelectedCampaign(camp);
      const posts = await api.campaigns.getPosts(campId);
      setCampaignPosts(posts);
    } catch {
      // Ignore
    }
  };

  const openDetails = async (camp: any) => {
    setSelectedCampaign(camp);
    setLoadingPosts(true);
    try {
      const posts = await api.campaigns.getPosts(camp.id);
      setCampaignPosts(posts);
    } catch (err: any) {
      showToast("Error", err.message || "Failed to load campaign posts", "error");
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleRemovePostFromCampaign = async (postId: number) => {
    if (!selectedCampaign) return;
    try {
      await api.campaigns.removePost(selectedCampaign.id, postId);
      showToast("Post Removed", "Post disassociated from campaign.", "success");
      const updatedPosts = campaignPosts.filter((p) => p.id !== postId);
      setCampaignPosts(updatedPosts);
      loadCampaigns();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to remove post", "error");
    }
  };

  const openAddPostsModal = async () => {
    if (!selectedCampaign) return;
    setIsAddPostsModalOpen(true);
    setLoadingAvailablePosts(true);
    setSelectedPostIdsToAdd([]);
    try {
      const allPosts = await api.posts.list({ limit: 100 });
      // Exclude posts already in this campaign
      const currentIds = new Set(campaignPosts.map((p) => p.id));
      const unlinked = allPosts.filter((p: any) => !currentIds.has(p.id));
      setAvailablePosts(unlinked);
    } catch (err: any) {
      showToast("Error", err.message || "Failed to load posts", "error");
    } finally {
      setLoadingAvailablePosts(false);
    }
  };

  const handleAddSelectedPosts = async () => {
    if (!selectedCampaign || selectedPostIdsToAdd.length === 0) return;
    try {
      await api.campaigns.addPosts(selectedCampaign.id, selectedPostIdsToAdd);
      showToast("Posts Added 🚀", `${selectedPostIdsToAdd.length} post(s) linked to campaign.`, "success");
      setIsAddPostsModalOpen(false);
      openDetails(selectedCampaign);
      loadCampaigns();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to link posts", "error");
    }
  };

  const toggleComparisonSelection = (id: number) => {
    setSelectedForComparison((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenComparison = async () => {
    if (selectedForComparison.length < 2) {
      showToast("Selection Needed", "Please select at least 2 campaigns to compare.", "info");
      return;
    }
    setIsCompareModalOpen(true);
    setLoadingComparison(true);
    try {
      const comp = await api.campaigns.compare(selectedForComparison);
      setComparisonData(comp);
    } catch (err: any) {
      showToast("Error", err.message || "Failed to compare campaigns", "error");
    } finally {
      setLoadingComparison(false);
    }
  };

  // Real KPI sums
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const totalActualReach = campaigns.reduce((acc, c) => acc + (c.actual_reach || 0), 0);
  const totalActualInteractions = campaigns.reduce((acc, c) => acc + ((c.actual_likes || 0) + (c.actual_comments || 0) + (c.actual_shares || 0)), 0);
  const activeCampaignsCount = campaigns.filter((c) => c.status === "active").length;

  // Sorting
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    if (sortBy === "budget") return (b.budget || 0) - (a.budget || 0);
    if (sortBy === "reach") return (b.actual_reach || 0) - (a.actual_reach || 0);
    if (sortBy === "posts") return (b.posts_count || 0) - (a.posts_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "paused":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Campaign Management & Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Group multi-channel posts by strategic initiatives, allocate budgets, and measure real performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedForComparison.length > 0 && (
            <button
              onClick={handleOpenComparison}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <Scale size={18} />
              <span>Compare Selected ({selectedForComparison.length})</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <Plus size={18} />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Real KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Target size={22} />
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
              {activeCampaignsCount} Active
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">{campaigns.length}</h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Total Campaigns</p>
            <p className="text-xs text-slate-500 mt-0.5">Workspace marketing initiatives</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp size={22} />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Real DB Data
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              {totalActualReach >= 1000 ? `${(totalActualReach / 1000).toFixed(1)}K` : totalActualReach.toLocaleString()}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Audience Reach</p>
            <p className="text-xs text-slate-500 mt-0.5">From published campaign posts</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <DollarSign size={22} />
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              ${totalBudget.toLocaleString()} Budget
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              ${totalSpent.toLocaleString()}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Budget Spent</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% utilized` : "No budget set"}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
              <Sparkles size={22} />
            </div>
            <span className="text-xs font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200">
              Interactions
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display">
              {totalActualInteractions.toLocaleString()}
            </h3>
            <p className="text-sm font-bold text-slate-800 mt-1">Campaign Engagement</p>
            <p className="text-xs text-slate-500 mt-0.5">Likes, comments & shares</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "scheduled", label: "Scheduled" },
            { id: "draft", label: "Draft" },
            { id: "paused", label: "Paused" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 shrink-0">
            <SlidersHorizontal size={15} className="text-slate-400" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none cursor-pointer"
            >
              <option value="created">Recent</option>
              <option value="budget">Budget</option>
              <option value="reach">Reach</option>
              <option value="posts">Posts Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          Loading campaigns...
        </div>
      ) : sortedCampaigns.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-4 shadow-xs">
          <Megaphone className="mx-auto text-slate-300" size={40} />
          <h3 className="text-base font-bold text-slate-800">No campaigns found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "No campaigns match the current filter selection."
              : "Launch your first multi-channel campaign initiative to group posts and track ROI."}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition shadow-xs"
          >
            <Plus size={16} />
            <span>Create Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCampaigns.map((camp) => {
            const isSelectedForComp = selectedForComparison.includes(camp.id);
            return (
              <div
                key={camp.id}
                className={`p-6 rounded-2xl bg-white border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
                  isSelectedForComp ? "border-purple-500 ring-2 ring-purple-100" : "border-slate-200/80"
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: camp.color || "#2563eb" }}
                        />
                        <h3 className="text-base font-bold text-slate-900 truncate font-display" title={camp.name}>
                          {camp.name}
                        </h3>
                      </div>
                      <p className="text-xs font-semibold text-blue-600 mt-1 truncate">
                        {camp.platform || "All Platforms"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Status Dropdown */}
                      <select
                        value={camp.status}
                        onChange={(e) => handleStatusChange(camp.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border outline-none cursor-pointer ${getStatusBadgeClass(
                          camp.status
                        )}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[32px]">
                    {camp.description || "Multi-channel marketing initiative."}
                  </p>

                  {/* Dates & Timeline */}
                  {(camp.start_date || camp.end_date) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Calendar size={13} className="text-slate-400" />
                      <span>
                        {camp.start_date ? new Date(camp.start_date).toLocaleDateString() : "Immediate"}
                        {" → "}
                        {camp.end_date ? new Date(camp.end_date).toLocaleDateString() : "Ongoing"}
                      </span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-slate-800">{camp.progress_percentage || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{
                          width: `${camp.progress_percentage || 0}%`,
                          backgroundColor: camp.color || "#2563eb",
                        }}
                      />
                    </div>
                  </div>

                  {/* Metric Summary Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] font-semibold text-slate-500">Reach</p>
                      <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                        {camp.actual_reach >= 1000
                          ? `${(camp.actual_reach / 1000).toFixed(1)}K`
                          : (camp.actual_reach || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] font-semibold text-slate-500">Spent</p>
                      <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                        ${(camp.spent || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] font-semibold text-slate-500">Posts</p>
                      <p className="text-xs font-extrabold text-slate-900 mt-0.5">{camp.posts_count || 0}</p>
                    </div>
                  </div>

                  {/* Post Status Pill Breakdown */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-slate-600 pt-0.5">
                    {camp.published_posts_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {camp.published_posts_count} Published
                      </span>
                    )}
                    {camp.scheduled_posts_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {camp.scheduled_posts_count} Scheduled
                      </span>
                    )}
                    {camp.draft_posts_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {camp.draft_posts_count} Draft
                      </span>
                    )}
                    {camp.failed_posts_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        {camp.failed_posts_count} Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleComparisonSelection(camp.id)}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                      isSelectedForComp
                        ? "bg-purple-50 text-purple-700 border-purple-300"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
                    }`}
                    title="Select to compare with other campaigns"
                  >
                    <Scale size={14} />
                    <span>{isSelectedForComp ? "Selected" : "Compare"}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDetails(camp)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight size={13} />
                    </button>

                    <button
                      onClick={() => openEditModal(camp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Edit Campaign"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* CAMPAIGN DETAILS MODAL / DRAWER                               */}
      {/* ============================================================ */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: selectedCampaign.color || "#2563eb" }}
                  />
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    {selectedCampaign.name}
                  </h2>
                  <span
                    className={`text-xs font-bold px-3 py-0.5 rounded-full uppercase border ${getStatusBadgeClass(
                      selectedCampaign.status
                    )}`}
                  >
                    {selectedCampaign.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Target Channels: <span className="font-semibold text-slate-700">{selectedCampaign.platform}</span> • Goal: <span className="font-semibold text-slate-700">{selectedCampaign.objectives || "Brand Awareness"}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Campaign Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Total Reach</p>
                <h4 className="text-xl font-extrabold text-slate-900">
                  {(selectedCampaign.actual_reach || 0).toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-400">Target: {(selectedCampaign.target_reach || 50000).toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Impressions</p>
                <h4 className="text-xl font-extrabold text-slate-900">
                  {(selectedCampaign.actual_impressions || 0).toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-400">Total views recorded</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Total Engagement</p>
                <h4 className="text-xl font-extrabold text-slate-900">
                  {((selectedCampaign.actual_likes || 0) + (selectedCampaign.actual_comments || 0) + (selectedCampaign.actual_shares || 0)).toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-400">Likes, comments, shares</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Budget Spent</p>
                <h4 className="text-xl font-extrabold text-slate-900">
                  ${(selectedCampaign.spent || 0).toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-400">Of ${(selectedCampaign.budget || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* ROI Status Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
              <Sparkles className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-blue-900">Campaign ROI & Performance Tracking</p>
                <p className="text-blue-700">
                  {selectedCampaign.roi_formula || "Real engagement and cost tracking computed from connected platform posts."}
                </p>
              </div>
            </div>

            {/* Linked Posts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                    <FileText size={16} className="text-blue-600" />
                    Campaign Posts ({campaignPosts.length})
                  </h3>
                  <p className="text-xs text-slate-500">Manage all posts associated with this campaign</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setIsCreatePostModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <Plus size={15} />
                    <span>Create Post</span>
                  </button>

                  <button
                    onClick={openAddPostsModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200"
                  >
                    <PlusCircle size={14} />
                    <span>Link Existing</span>
                  </button>

                  <button
                    onClick={() => {
                      window.location.href = `/reports?action=create&campaign_id=${selectedCampaign.id}`;
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {loadingPosts ? (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Loading linked posts...
                </div>
              ) : campaignPosts.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
                  <FileText className="mx-auto text-slate-300" size={32} />
                  <p className="text-xs font-bold text-slate-700">No posts linked to this campaign yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Create a new media post with image or video directly inside this campaign, or link existing posts.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => setIsCreatePostModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      <Plus size={15} />
                      <span>Create Media Post</span>
                    </button>
                    <button
                      onClick={openAddPostsModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                    >
                      <PlusCircle size={15} />
                      <span>Link Existing Posts</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {campaignPosts.map((post) => (
                    <div key={post.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold uppercase">
                          {post.platform ? post.platform.substring(0, 2) : "IG"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {post.title || post.content}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {post.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full uppercase font-bold text-[10px] border ${
                          post.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : post.status === "scheduled"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {post.status}
                        </span>

                        <div className="text-right hidden sm:block">
                          <p className="font-bold text-slate-800">{post.reach_count || 0} reach</p>
                          <p className="text-[10px] text-slate-400">{(post.likes_count || 0) + (post.comments_count || 0)} interactions</p>
                        </div>

                        <button
                          onClick={() => handleRemovePostFromCampaign(post.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove post from campaign"
                        >
                          <MinusCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const c = selectedCampaign;
                  setSelectedCampaign(null);
                  openEditModal(c);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 cursor-pointer"
              >
                Edit Campaign Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD POSTS TO CAMPAIGN SELECTOR DIALOG                         */}
      {/* ============================================================ */}
      {isAddPostsModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Link Existing Posts to Campaign</h3>
                <p className="text-xs text-slate-500">Select posts to associate with '{selectedCampaign?.name}'</p>
              </div>
              <button
                onClick={() => setIsAddPostsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {loadingAvailablePosts ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading available posts...
              </div>
            ) : availablePosts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                All workspace posts are already attached to this campaign.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {availablePosts.map((p) => {
                  const isChecked = selectedPostIdsToAdd.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                        isChecked ? "bg-blue-50/70 border-blue-300" : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPostIdsToAdd([...selectedPostIdsToAdd, p.id]);
                          } else {
                            setSelectedPostIdsToAdd(selectedPostIdsToAdd.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.title || p.content}</p>
                        <p className="text-[11px] text-slate-500 truncate">{p.content}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {p.platform} • {p.status}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddPostsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedPostIdsToAdd.length === 0}
                onClick={handleAddSelectedPosts}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer"
              >
                Add {selectedPostIdsToAdd.length} Post(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CAMPAIGN COMPARISON MODAL                                     */}
      {/* ============================================================ */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <Scale size={22} className="text-purple-600" />
                  Side-by-Side Campaign Comparison
                </h3>
                <p className="text-xs text-slate-500">Compare real metrics across selected marketing campaigns</p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {loadingComparison ? (
              <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
                Computing real campaign comparisons...
              </div>
            ) : !comparisonData ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Comparison data unavailable.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparisonData.campaigns.map((camp: any) => (
                    <div
                      key={camp.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: camp.color || "#2563eb" }}
                        />
                        <h4 className="text-sm font-bold text-slate-900 truncate font-display">
                          {camp.name}
                        </h4>
                      </div>
                      <p className="text-xs font-semibold text-blue-600">{camp.platform}</p>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${getStatusBadgeClass(
                        camp.status
                      )}`}>
                        {camp.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Metrics Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3.5 font-bold text-slate-700">Metric</th>
                        {comparisonData.campaigns.map((camp: any) => (
                          <th key={camp.id} className="p-3.5 font-bold text-slate-900">
                            {camp.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonData.metrics.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition">
                          <td className="p-3.5 font-semibold text-slate-700">{m.label}</td>
                          {comparisonData.campaigns.map((camp: any) => {
                            const val = m.values[String(camp.id)];
                            return (
                              <td key={camp.id} className="p-3.5 font-extrabold text-slate-900">
                                {m.unit === "$" ? `$${(val || 0).toLocaleString()}` : `${(val || 0).toLocaleString()}${m.unit}`}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE / EDIT CAMPAIGN MODAL                                 */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone size={20} className="text-blue-600" />
                {editingCampaign ? "Edit Campaign Details" : "Launch New Campaign"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSaveCampaign}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Q4 Black Friday Mega Launch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Channels
                  </label>
                  <input
                    type="text"
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value)}
                    placeholder="Instagram, LinkedIn, All"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 cursor-pointer font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Spent ($ USD)
                  </label>
                  <input
                    type="number"
                    value={formSpent}
                    onChange={(e) => setFormSpent(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Reach
                  </label>
                  <input
                    type="number"
                    value={formTargetReach}
                    onChange={(e) => setFormTargetReach(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Eng. %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formTargetEngagement}
                    onChange={(e) => setFormTargetEngagement(e.target.value)}
                    placeholder="5.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Clicks
                  </label>
                  <input
                    type="number"
                    value={formTargetClicks}
                    onChange={(e) => setFormTargetClicks(e.target.value)}
                    placeholder="2000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Objectives & Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Outline key strategic goals and promotional offers..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {["#2563eb", "#7c3aed", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full transition cursor-pointer ${
                        formColor === c ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                >
                  {saving ? "Saving..." : editingCampaign ? "Update Campaign" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DIRECT POST COMPOSER FOR CAMPAIGN                             */}
      {/* ============================================================ */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        defaultCampaignId={selectedCampaign?.id}
        onPostCreated={() => {
          loadCampaigns();
          if (selectedCampaign) {
            refreshCampaignDetails(selectedCampaign.id);
          }
        }}
      />
    </div>
  );
}
