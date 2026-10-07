"use client";

import { useState } from "react";
import {
  Megaphone,
  Plus,
  Target,
  FileText,
  CheckCircle2,
  CalendarDays,
  Trash2,
  Pencil,
  X,
  Download,
} from "lucide-react";
import {
  useCampaigns,
  type ApiStatus,
  type Campaign,
} from "@/hooks/useCampaigns";

import { useAuth } from "@/context/AuthContext";
import {
  downloadCampaignReport,
  downloadAllCampaignsReport,
} from "@/lib/campaignReport";

/* ---------- Constants ---------- */

// "value" is what the backend expects (SocialPlatform enum)
const platformOptions = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
];

const objectives = [
  "Brand Awareness",
  "Increase Engagement",
  "Drive Website Traffic",
  "Lead Generation",
  "Product Promotion",
  "Audience Growth",
];

// UI shows Draft; backend stores it as "paused"
type UiStatus = "Draft" | "Active" | "Completed";
const toApiStatus: Record<UiStatus, ApiStatus> = {
  Draft: "paused",
  Active: "active",
  Completed: "completed",
};
const toUiStatus: Record<ApiStatus, UiStatus> = {
  paused: "Draft",
  active: "Active",
  completed: "Completed",
};

/* ---------- Helpers ---------- */

// Today's local date as YYYY-MM-DD (avoids UTC date shift)
function getCurrentLocalDate() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

const platformLabel = (value: string) =>
  platformOptions.find((p) => p.value === value)?.label ?? value;

// Backend has one "objectives" text field. We store: "<objective>\n\n<description>"
const joinObjectives = (objective: string, description: string) =>
  description.trim() ? `${objective}\n\n${description.trim()}` : objective;

const splitObjectives = (text: string | null) => {
  if (!text) return { objective: "", description: "" };
  const i = text.indexOf("\n\n");
  if (i === -1) return { objective: text, description: "" };
  return { objective: text.slice(0, i), description: text.slice(i + 2) };
};

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/* ---------- Page ---------- */

export default function CampaignsPage() {
  const {
    campaigns,
    stats,
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  } = useCampaigns();

    const { token } = useAuth();
  const [reportMsg, setReportMsg] = useState("");

  // One-campaign PDF
  const handleDownload = async (c: Campaign) => {
    setReportMsg("");
    try {
      await downloadCampaignReport(c, token ?? "");
    } catch {
      setReportMsg("Could not generate the campaign report. Please try again.");
    }
  };

  // All-campaigns summary PDF
  const handleExportAll = () => {
    setReportMsg("");
    try {
      downloadAllCampaignsReport(campaigns, stats);
    } catch {
      setReportMsg("Could not generate the summary report. Please try again.");
    }
  };

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Summary counts
  const countBy = (s: ApiStatus) =>
    campaigns.filter((c) => c.status === s).length;

  const togglePlatform = (value: string) =>
    setSelectedPlatforms((cur) =>
      cur.includes(value) ? cur.filter((p) => p !== value) : [...cur, value]
    );

  const resetForm = () => {
    setCampaignName("");
    setObjective("");
    setDescription("");
    setBudget("");
    setStartDate("");
    setEndDate("");
    setSelectedPlatforms([]);
    setEditingId(null);
    setMessage("");
  };

  // Load an existing campaign into the form for editing
  const startEdit = (c: Campaign) => {
    const { objective: obj, description: desc } = splitObjectives(c.objectives);
    setEditingId(c.id);
    setCampaignName(c.name);
    setObjective(obj);
    setDescription(desc);
    setBudget(String(c.budget));
    setStartDate(c.start_date.slice(0, 10));
    setEndDate(c.end_date.slice(0, 10));
    setSelectedPlatforms(c.platforms);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- Create / Save ---------- */
  const handleSubmit = async () => {
    setMessage("");
    const today = getCurrentLocalDate();

    if (!campaignName.trim()) return setMessage("Please enter a campaign name.");
    if (!objective) return setMessage("Please select a campaign objective.");
    if (budget === "" || Number(budget) < 0)
      return setMessage("Please enter a valid budget (0 or more).");
    if (!startDate) return setMessage("Please select a campaign start date.");
    if (!endDate) return setMessage("Please select a campaign end date.");
    // Past-date rule applies to new campaigns only
    if (!editingId && startDate < today)
      return setMessage("The campaign start date cannot be in the past.");
    if (endDate < startDate)
      return setMessage("The campaign end date cannot be earlier than the start date.");
    if (selectedPlatforms.length === 0)
      return setMessage("Please select at least one social media platform.");

    const payload = {
      name: campaignName.trim(),
      platforms: selectedPlatforms,
      start_date: `${startDate}T00:00:00`,
      end_date: `${endDate}T23:59:59`,
      budget: Number(budget),
      objectives: joinObjectives(objective, description),
    };

    setIsSaving(true);
    // New campaigns start as Draft (= "paused" in backend); edits keep their status
    const err = editingId
      ? await updateCampaign(editingId, payload)
      : await createCampaign({ ...payload, status: "paused" });
    setIsSaving(false);

    if (err) return setMessage(err);

    const wasEditing = !!editingId;
    resetForm();
    setMessage(
      wasEditing
        ? "Campaign updated successfully."
        : "Campaign created successfully."
    );
  };

  const handleStatusChange = async (id: string, ui: UiStatus) => {
    const err = await updateCampaign(id, { status: toApiStatus[ui] });
    if (err) setMessage(err);
  };

  const handleDelete = async (c: Campaign) => {
    if (!window.confirm(`Delete "${c.name}"? Its posts will be kept but unlinked.`))
      return;
    const err = await deleteCampaign(c.id);
    if (err) setMessage(err);
    if (editingId === c.id) resetForm();
  };

  /* ---------- UI ---------- */
  const summary = [
    { label: "Total Campaigns", value: campaigns.length, icon: Megaphone, color: "bg-indigo-50 text-indigo-600" },
    { label: "Active", value: countBy("active"), icon: CheckCircle2, color: "bg-green-50 text-green-600" },
    { label: "Draft", value: countBy("paused"), icon: FileText, color: "bg-amber-50 text-amber-600" },
    { label: "Completed", value: countBy("completed"), icon: Target, color: "bg-blue-50 text-blue-600" },
  ];

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-6">
      {/* ---------- Heading ---------- */}
      <div>
        <div className="flex items-center gap-2">
          <Megaphone className="text-indigo-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Plan and manage social media campaigns from one workspace.
        </p>
      </div>

      {/* ---------- Summary cards ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${s.color}`}>
                <s.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

            {/* Export all campaigns */}
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleExportAll}
          disabled={campaigns.length === 0}
          className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={17} />
          Export All Campaigns (PDF)
        </button>
        {reportMsg && <p className="text-sm text-red-600">{reportMsg}</p>}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ---------- Create / Edit form ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              {editingId ? <Pencil size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {editingId ? "Edit Campaign" : "Create New Campaign"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Define your campaign goal, budget, duration, and target platforms.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Name */}
          <div>
            <label htmlFor="campaignName" className="mb-2 block text-sm font-medium text-gray-700">
              Campaign Name
            </label>
            <input
              id="campaignName"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name"
              className={inputCls}
            />
          </div>

          {/* Objective + Budget */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="objective" className="mb-2 block text-sm font-medium text-gray-700">
                Campaign Objective
              </label>
              <select
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className={`${inputCls} bg-white`}
              >
                <option value="">Select campaign objective</option>
                {objectives.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="budget" className="mb-2 block text-sm font-medium text-gray-700">
                Budget (₹)
              </label>
              <input
                id="budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 2000"
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
              Campaign Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and strategy of this campaign..."
              rows={4}
              className={`${inputCls} resize-none leading-6`}
            />
          </div>

          {/* Dates */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <CalendarDays size={16} className="text-indigo-600" />
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                min={editingId ? undefined : getCurrentLocalDate()}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  // Clear end date if it is now earlier than the start date
                  if (endDate && v && endDate < v) setEndDate("");
                }}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="endDate" className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <CalendarDays size={16} className="text-indigo-600" />
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate || getCurrentLocalDate()}
                disabled={!startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputCls} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
              />
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Target Platforms
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {platformOptions.map((p) => {
                const on = selectedPlatforms.includes(p.value);
                return (
                  <label
                    key={p.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                      on
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => togglePlatform(p.value)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span className="font-medium">{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                message.includes("successfully")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <X size={17} />
              {editingId ? "Cancel" : "Clear"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus size={17} />
              {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Campaign"}
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Campaign list ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-semibold text-gray-900">Your Campaigns</h2>
          <p className="mt-1 text-sm text-gray-500">
            Performance and ROI for each campaign.
          </p>
        </div>

        {isLoading && campaigns.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-500">Loading...</p>
        ) : campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Megaphone size={34} className="mx-auto text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-700">No campaigns created yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create your first campaign using the form above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaigns.map((c) => {
              const ui = toUiStatus[c.status];
              const s = stats[c.id]; // may be undefined if no analytics yet
              const { objective: obj, description: desc } = splitObjectives(c.objectives);

              return (
                <div key={c.id} className="px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{c.name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            ui === "Active"
                              ? "bg-green-50 text-green-700"
                              : ui === "Completed"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {ui}
                        </span>
                      </div>

                      {obj && <p className="mt-2 text-sm font-medium text-indigo-600">{obj}</p>}
                      {desc && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-500">
                          {desc}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                        <span>
                          {c.start_date.slice(0, 10)} → {c.end_date.slice(0, 10)}
                        </span>
                        <span>{c.platforms.map(platformLabel).join(", ")}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={ui}
                        onChange={(e) => handleStatusChange(c.id, e.target.value as UiStatus)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-indigo-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDownload(c)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50"
                        aria-label={`Download report for ${c.name}`}
                        title="Download PDF report"
                      >
                        <Download size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Metrics + ROI */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      { label: "Budget", value: money(c.budget) },
                      { label: "Reach", value: s ? s.reach.toLocaleString("en-IN") : "—" },
                      { label: "Clicks", value: s ? s.clicks.toLocaleString("en-IN") : "—" },
                      { label: "Est. Revenue", value: s ? money(s.estimated_revenue) : "—" },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                        <p className="text-xs text-gray-500">{m.label}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{m.value}</p>
                      </div>
                    ))}

                    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                      <p className="text-xs text-gray-500">ROI</p>
                      <p
                        className={`mt-1 text-sm font-semibold ${
                          !s
                            ? "text-gray-900"
                            : s.roi_percent >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {s ? `${s.roi_percent}%` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}