"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

type ContentStatus = "idea" | "draft" | "ready";

interface ContentItem {
  id: number;
  title: string;
  text: string;
  platform: string;
  status: ContentStatus;
  createdAt: string;
  category: string;
}

const AI_TEMPLATES = [
  {
    title: "Viral Contrarian Hook",
    description: "Challenge an industry myth to spark high comments & reposts",
    prompt: "Most people think [X] is the secret to scaling, but in reality [Y] is what actually moves the needle. Here is what 90% get wrong:",
  },
  {
    title: "Step-by-Step Educational Framework",
    description: "Break down complex systems into digestible bullet points",
    prompt: "How we increased our organic engagement by 40% in 30 days without spending on paid ads:\n\n1. Audit content cadence\n2. Optimize hook velocity\n3. Engage in the first 60 minutes",
  },
  {
    title: "Product Launch / Feature Drop",
    description: "High-impact announcement for new features or milestones",
    prompt: "Today is a massive milestone for our team 🚀\n\nWe are officially launching [Feature/Product Name] — built to solve [Pain Point] once and for all.",
  },
  {
    title: "Interactive Audience Poll / Question",
    description: "Drive immediate algorithmic reach through comments",
    prompt: "Quick poll for founders & marketers: What is your #1 social channel for high-intent customer acquisition right now? Drop your vote below 👇",
  },
];

const INITIAL_DRAFTS: ContentItem[] = [
  {
    id: 1,
    title: "AI & The Next Generation of Social Workflows",
    text: "Artificial intelligence is not simply replacing tasks. It is fundamentally changing how creators think, syndicate, and evaluate campaign velocity.",
    platform: "linkedin",
    status: "ready",
    createdAt: "Today, 11:20 AM",
    category: "Thought Leadership",
  },
  {
    id: 2,
    title: "Carousel: The 2026 Social Distribution Blueprint",
    text: "Slide 1: Why algorithm updates favor high dwell-time.\nSlide 2: The 3 pillars of omni-channel publishing.\nSlide 3: Real campaign metrics vs vanity numbers.",
    platform: "instagram",
    status: "draft",
    createdAt: "Yesterday",
    category: "Carousel Blueprint",
  },
  {
    id: 3,
    title: "Feature Teaser: Automated Failed Post Retries",
    text: "Zero downtime social publishing. How our microservice queue automatically reschedules and retries failed API calls with exponential backoff.",
    platform: "twitter",
    status: "idea",
    createdAt: "Sep 28",
    category: "Engineering Insights",
  },
];

export default function ContentLabPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ContentItem[]>(INITIAL_DRAFTS);
  const [selectedDraft, setSelectedDraft] = useState<ContentItem | null>(INITIAL_DRAFTS[0]);
  const [activeTab, setActiveTab] = useState<"drafts" | "templates">("drafts");
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [showNewModal, setShowNewModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [message, setMessage] = useState("");

  /* Auth Guard */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleUseTemplate = (prompt: string, title: string) => {
    setNewTitle(title);
    setNewText(prompt);
    setShowNewModal(true);
  };

  const handleCreateDraft = () => {
    if (!newTitle.trim() || !newText.trim()) return;
    const item: ContentItem = {
      id: Date.now(),
      title: newTitle.trim(),
      text: newText.trim(),
      platform: selectedPlatform,
      status: "draft",
      createdAt: "Just now",
      category: "Custom Idea",
    };
    setDrafts([item, ...drafts]);
    setSelectedDraft(item);
    setShowNewModal(false);
    setNewTitle("");
    setNewText("");
    setMessage("Draft saved to Content Lab repository!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSendToComposer = (text: string) => {
    router.push(`/create-post?idea=${encodeURIComponent(text)}`);
  };

  const handleAIEnhance = () => {
    if (!selectedDraft) return;
    setAiGenerating(true);
    setTimeout(() => {
      setSelectedDraft({
        ...selectedDraft,
        text: `${selectedDraft.text}\n\nKey Takeaway: The best social teams optimize for consistency, clarity, and genuine audience conversation rather than algorithmic vanity metrics. #Marketing2026`,
      });
      setAiGenerating(false);
      setMessage("AI expanded your post with viral hooks & takeaways!");
      setTimeout(() => setMessage(""), 3000);
    }, 600);
  };

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
              <span className="text-indigo-400 font-bold">Creative Workbench</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Content Lab & Idea Incubator
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <span>＋</span>
              <span>New Draft Idea</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {message && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg">
            <span>✓ {message}</span>
            <button onClick={() => setMessage("")} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* WORKBENCH CONTENT */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* TABS HEADER */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("drafts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "drafts"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            Drafts & Saved Ideas ({drafts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "templates"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            ✦ AI Prompt Templates ({AI_TEMPLATES.length})
          </button>
        </div>

        {/* TAB 1: DRAFTS STUDIO */}
        {activeTab === "drafts" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* DRAFT LIST (5 COLS) */}
            <div className="lg:col-span-5 space-y-3">
              {drafts.map((draft) => {
                const isSelected = selectedDraft?.id === draft.id;
                const statusColor =
                  draft.status === "ready"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/70"
                    : draft.status === "draft"
                    ? "bg-indigo-950/80 text-indigo-300 border-indigo-800/70"
                    : "bg-amber-950/80 text-amber-300 border-amber-800/70";

                return (
                  <div
                    key={draft.id}
                    onClick={() => setSelectedDraft(draft)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "bg-slate-850 border-indigo-500 shadow-lg ring-2 ring-indigo-500/20"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusColor}`}
                      >
                        {draft.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{draft.createdAt}</span>
                    </div>

                    <h3 className="text-xs font-bold text-white line-clamp-1">{draft.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {draft.text}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400">
                      <span>Network: <strong className="text-slate-300">{draft.platform.toUpperCase()}</strong></span>
                      <span className="text-indigo-400 font-semibold">{draft.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DRAFT EDITOR & ACTIONS (7 COLS) */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              {selectedDraft ? (
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80">
                        {selectedDraft.category}
                      </span>
                      <h2 className="text-base font-bold text-white mt-1.5">{selectedDraft.title}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAIEnhance}
                        disabled={aiGenerating}
                        className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>✦</span>
                        <span>{aiGenerating ? "Generating..." : "AI Expand"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendToComposer(selectedDraft.text)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
                      >
                        Open in Composer →
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap min-h-[220px]">
                    {selectedDraft.text}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Target Network: <strong className="text-slate-200">{selectedDraft.platform.toUpperCase()}</strong></span>
                    <span>Created: <strong className="text-slate-200">{selectedDraft.createdAt}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>Select a draft from the left to view or edit</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AI TEMPLATES */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AI_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.title}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-indigo-500/50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60 flex items-center justify-center text-sm font-bold">
                      ✦
                    </span>
                    <h3 className="text-sm font-bold text-white">{tmpl.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{tmpl.description}</p>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono leading-relaxed line-clamp-3">
                    {tmpl.prompt}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(tmpl.prompt, tmpl.title)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    Use this Template →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* NEW DRAFT MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">New Idea / Draft</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Concept Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 5 Algorithm Shifts for 2026"
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Target Network</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="linkedin" className="bg-slate-900 text-white">LinkedIn</option>
                  <option value="twitter" className="bg-slate-900 text-white">X (Twitter)</option>
                  <option value="instagram" className="bg-slate-900 text-white">Instagram</option>
                  <option value="facebook" className="bg-slate-900 text-white">Facebook</option>
                  <option value="youtube" className="bg-slate-900 text-white">YouTube</option>
                  <option value="pinterest" className="bg-slate-900 text-white">Pinterest</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Draft Content</label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={5}
                  placeholder="Draft your thoughts or copy template..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDraft}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}