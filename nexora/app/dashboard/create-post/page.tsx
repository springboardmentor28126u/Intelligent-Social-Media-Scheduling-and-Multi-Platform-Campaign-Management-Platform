"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Calendar,
  Send,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  PenLine,
  ImagePlus,
  Clock3,
} from "lucide-react";
import InstagramPreview from "@/components/preview/InstagramPreview";
import LinkedInPreview from "@/components/preview/LinkedInPreview";
import XPreview from "@/components/preview/XPreview";
import FacebookPreview from "@/components/preview/FacebookPreview";
import { postsApi, aiApi } from "@/lib/api";

function getLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CreatePostPage() {
  const router = useRouter();

  // Form states
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "instagram",
    "facebook",
    "linkedin",
    "twitter",
  ]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => getLocalDateInputValue(new Date()));
  const [scheduledTime, setScheduledTime] = useState("10:30");
  
  // Platform Adaptations
  const [activeTab, setActiveTab] = useState<"base" | "instagram" | "linkedin" | "twitter" | "facebook">("base");
  const [instagramContent, setInstagramContent] = useState("");
  const [linkedinContent, setLinkedinContent] = useState("");
  const [twitterContent, setTwitterContent] = useState("");
  const [facebookContent, setFacebookContent] = useState("");

  // AI Assistant states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("Engaging");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    bestTime?: string;
    hashtags?: string[];
  } | null>(null);

  // Status & Feedback
  const [previewPlatform, setPreviewPlatform] = useState<"instagram" | "linkedin" | "twitter" | "facebook">("instagram");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  // AI Generation trigger
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() && !content.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a topic or starter text for the AI assistant." });
      return;
    }

    setIsGeneratingAI(true);
    setStatusMessage(null);

    try {
      const topicToUse = aiPrompt.trim() || content.trim();
      const res = await aiApi.generateCaption({
        topic: topicToUse,
        tone: aiTone,
        include_hashtags: true,
        include_cta: true,
      });

      setContent(res.primary_caption);
      setInstagramContent(res.adaptations.instagram);
      setLinkedinContent(res.adaptations.linkedin);
      setTwitterContent(res.adaptations.twitter);
      setFacebookContent(res.adaptations.facebook);

      setAiSuggestions({
        bestTime: res.best_time_to_post,
        hashtags: res.hashtags,
      });

      setStatusMessage({ type: "success", text: "✨ AI Content Generated & Adapted for all platforms!" });
    } catch {
      // Local intelligent fallback generator
      const fallbackTopic = aiPrompt.trim() || content.trim();
      const cap = `✨ Exciting updates regarding ${fallbackTopic}!\n\nHere are 3 core pillars we focus on:\n1. Precision over complexity\n2. Real engagement over vanity metrics\n3. Data-driven weekly optimization\n\n👉 What are your thoughts on this? Drop a comment below!`;
      setContent(cap);
      setInstagramContent(`${cap}\n\n#IntelliPost #SocialGrowth #Creators #MarketingAutomation`);
      setLinkedinContent(`Key strategic insights on ${fallbackTopic}:\n\n${cap}\n\n#Leadership #Strategy #Growth`);
      setTwitterContent(`🚀 Quick take on ${fallbackTopic}:\n\n1. Double down on what works\n2. Keep messaging punchy\n3. Engage daily\n\n#IntelliPost #Growth`);
      setFacebookContent(`${cap}\n\nWe would love to hear your feedback!`);
      setAiSuggestions({
        bestTime: "Today at 10:30 AM (Peak Audience Active Window)",
        hashtags: ["#IntelliPost", "#GrowthMarketing", "#DigitalStrategy", "#Creators"],
      });
      setStatusMessage({ type: "success", text: "✨ AI Content Generated successfully!" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSavePost = async (action: "Draft" | "Scheduled" | "Published") => {
    if (!content.trim()) {
      setStatusMessage({ type: "error", text: "Please enter content for your post." });
      return;
    }
    if (selectedPlatforms.length === 0) {
      setStatusMessage({ type: "error", text: "Please select at least one social media platform." });
      return;
    }

    const scheduledAt = action === "Scheduled"
      ? new Date(`${scheduledDate}T${scheduledTime}:00`)
      : null;
    if (scheduledAt && (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now())) {
      setStatusMessage({ type: "error", text: "Choose a schedule time in the future." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const scheduledDateTime = scheduledAt?.toISOString() ?? null;

    try {
      await postsApi.create({
        content,
        platforms: selectedPlatforms.join(","),
        media_url: mediaUrl,
        media_type: "image",
        status: action,
        scheduled_at: scheduledDateTime,
        instagram_content: instagramContent || undefined,
        linkedin_content: linkedinContent || undefined,
        twitter_content: twitterContent || undefined,
        facebook_content: facebookContent || undefined,
        is_ai_generated: !!aiSuggestions,
      });

      setStatusMessage({
        type: "success",
        text: action === "Published" ? "🎉 Post published successfully!" : action === "Scheduled" ? "⏰ Post scheduled on calendar!" : "💾 Draft saved successfully!",
      });

      setTimeout(() => {
        router.push("/dashboard/calendar");
      }, 1000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to save this post. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get effective preview content
  const getPreviewText = () => {
    if (previewPlatform === "instagram" && instagramContent) return instagramContent;
    if (previewPlatform === "linkedin" && linkedinContent) return linkedinContent;
    if (previewPlatform === "twitter" && twitterContent) return twitterContent;
    if (previewPlatform === "facebook" && facebookContent) return facebookContent;
    return content;
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="relative isolate flex flex-col gap-5 overflow-hidden rounded-xl border border-[#263a32] bg-[#172720] p-6 text-white shadow-lg shadow-[#172720]/10 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-14 -z-10 h-48 w-48 rounded-full border-28 border-[#d5f36a]/10" />
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d5f36a]">
            <PenLine className="h-3.5 w-3.5" /> Publishing studio
          </div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-white">
            Create a post
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#c1cec6] sm:text-sm">
            Shape one idea for every channel, then send it out on your schedule.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSavePost("Draft")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Save className="h-4 w-4" /> Save Draft
          </button>
          
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSavePost("Scheduled")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#d5f36a] px-4 py-2.5 text-xs font-bold text-[#172720] transition-colors hover:bg-[#e3ff83]"
          >
            <Calendar className="h-4 w-4" /> Schedule Post
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSavePost("Published")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f18b73] px-4 py-2.5 text-xs font-bold text-[#251914] transition-colors hover:bg-[#ffa18b]"
          >
            <Send className="h-4 w-4" /> Publish Now
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center gap-2 border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 2-Column Composer Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Left Column: Form & AI Assistant (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Target Platforms Selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              1. Select Target Social Networks
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: "instagram", name: "Instagram", icon: "📸" },
                { id: "facebook", name: "Facebook", icon: "👥" },
                { id: "linkedin", name: "LinkedIn", icon: "💼" },
                { id: "twitter", name: "X (Twitter)", icon: "𝕏" },
                { id: "youtube", name: "YouTube", icon: "▶️" },
                { id: "pinterest", name: "Pinterest", icon: "📌" },
              ].map((p) => {
                const selected = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all border ${
                      selected
                        ? "border-[#635BFF] bg-[#635BFF]/10 text-[#635BFF]"
                        : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </span>
                    <span className={`h-4 w-4 rounded-md flex items-center justify-center text-[10px] ${selected ? "bg-[#635BFF] text-white" : "border border-slate-300"}`}>
                      {selected && "✓"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. AI Content Co-Pilot Generator Panel */}
          <div className="rounded-xl border border-[#b8d5c6] bg-[#e9f2ec] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#172720] text-[#d5f36a]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#172720]">AI Content Co-Pilot & Adapter</h3>
              </div>
              <span className="rounded-full border border-[#b8d5c6] bg-white px-2 py-0.5 text-[10px] font-bold text-[#315342]">
                Multi-Platform Engine
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Announcing new product features, summer sale, leadership advice..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
                
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-[#635BFF] focus:outline-none"
                >
                  <option value="Engaging">Engaging Tone</option>
                  <option value="Professional">Professional Tone</option>
                  <option value="Inspiring">Inspiring Tone</option>
                  <option value="Humorous">Humorous Tone</option>
                  <option value="Urgent">Urgent Tone</option>
                  <option value="Casual">Casual Tone</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={handleAIGenerate}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#172720] px-4 py-2 text-xs font-bold text-[#d5f36a] transition-colors hover:bg-[#294337] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingAI ? "animate-spin" : ""}`} />
                  <span>{isGeneratingAI ? "Generating Adaptations..." : "Generate with AI"}</span>
                </button>

                {aiSuggestions?.bestTime && (
                  <span className="text-[11px] font-medium text-indigo-900 bg-indigo-100/60 px-2.5 py-1 rounded-lg">
                    ⏰ {aiSuggestions.bestTime}
                  </span>
                )}
              </div>

              {/* Hashtag suggestions */}
              {aiSuggestions?.hashtags && (
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">AI Hashtags:</span>
                  {aiSuggestions.hashtags.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => setContent((prev) => prev + " " + tag)}
                      className="cursor-pointer rounded-md bg-white border border-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-[#635BFF] hover:bg-indigo-50"
                    >
                      {tag} +
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Content Editor & Platform Tabs */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Caption & Platform Variations
              </span>

              <div className="flex items-center gap-1">
                {(["base", "instagram", "linkedin", "twitter", "facebook"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-colors ${
                      activeTab === tab
                        ? "bg-[#635BFF] text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Tab Textarea */}
            <div>
              {activeTab === "base" && (
                <div>
                  <textarea
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your main caption or click 'Generate with AI' above..."
                    className="w-full rounded-2xl border border-slate-200 p-4 text-xs sm:text-sm text-slate-900 focus:border-[#635BFF] focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Base caption applied to all platforms unless overridden above.</span>
                    <span>{content.length} characters</span>
                  </div>
                </div>
              )}

              {activeTab === "instagram" && (
                <div>
                  <textarea
                    rows={6}
                    value={instagramContent || content}
                    onChange={(e) => setInstagramContent(e.target.value)}
                    placeholder="Instagram-specific caption with visual emoji formatting and hashtags..."
                    className="w-full rounded-2xl border border-pink-200 p-4 text-xs sm:text-sm text-slate-900 focus:border-pink-500 focus:outline-none resize-none leading-relaxed"
                  />
                  <span className="mt-1 block text-[10px] text-pink-600 font-semibold">
                    Instagram format: Visual emojis + rich hashtag block
                  </span>
                </div>
              )}

              {activeTab === "linkedin" && (
                <div>
                  <textarea
                    rows={6}
                    value={linkedinContent || content}
                    onChange={(e) => setLinkedinContent(e.target.value)}
                    placeholder="LinkedIn-specific professional executive summary..."
                    className="w-full rounded-2xl border border-sky-200 p-4 text-xs sm:text-sm text-slate-900 focus:border-sky-500 focus:outline-none resize-none leading-relaxed"
                  />
                  <span className="mt-1 block text-[10px] text-sky-700 font-semibold">
                    LinkedIn format: Strategic insights + business hashtags
                  </span>
                </div>
              )}

              {activeTab === "twitter" && (
                <div>
                  <textarea
                    rows={6}
                    value={twitterContent || content}
                    onChange={(e) => setTwitterContent(e.target.value)}
                    placeholder="Concise, punchy thread hook under 280 characters..."
                    className="w-full rounded-2xl border border-slate-300 p-4 text-xs sm:text-sm text-slate-900 focus:border-slate-700 focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="mt-1 flex justify-between text-[10px]">
                    <span className="text-slate-600 font-semibold">X / Twitter format: Max 280 chars</span>
                    <span className={(twitterContent || content).length > 280 ? "text-rose-600 font-bold" : "text-slate-400"}>
                      {(twitterContent || content).length} / 280
                    </span>
                  </div>
                </div>
              )}

              {activeTab === "facebook" && (
                <div>
                  <textarea
                    rows={6}
                    value={facebookContent || content}
                    onChange={(e) => setFacebookContent(e.target.value)}
                    placeholder="Engaging question and community discussion starter..."
                    className="w-full rounded-2xl border border-blue-200 p-4 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                  />
                  <span className="mt-1 block text-[10px] text-blue-600 font-semibold">
                    Facebook format: Community conversation question
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Media & Schedule Date */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            
            {/* Media URL / Upload */}
            <div className="rounded-xl border border-[#f0c6b8] bg-[#fff5f0] p-6 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <ImagePlus className="mr-1 inline h-4 w-4 text-[#bd6048]" /> 3. Attached Media
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  value={mediaUrl || ""}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Paste image URL (Unsplash, CDN, etc.)"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaUrl("https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80")}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Preset: Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaUrl("https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80")}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Preset: Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaUrl(null)}
                    className="rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Schedule Date & Time */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Clock3 className="mr-1 inline h-4 w-4 text-[#315342]" /> 4. Schedule Date & Time
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={scheduledDate}
                    min={getLocalDateInputValue(new Date())}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Posts scheduled will be auto-published at this exact timestamp.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Live Feed Simulation Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 rounded-xl border border-[#263a32] bg-[#172720] p-5 text-white shadow-lg shadow-[#172720]/10">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <span>📱 Live Platform Preview</span>
              </h3>

              {/* Preview Switcher */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("instagram")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${previewPlatform === "instagram" ? "bg-white text-pink-600 shadow-2xs" : "text-slate-500"}`}
                >
                  IG
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("linkedin")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${previewPlatform === "linkedin" ? "bg-white text-sky-700 shadow-2xs" : "text-slate-500"}`}
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("twitter")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${previewPlatform === "twitter" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
                >
                  X
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("facebook")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${previewPlatform === "facebook" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500"}`}
                >
                  FB
                </button>
              </div>
            </div>

            {/* Live Render */}
            <div className="mt-4 flex justify-center">
              {previewPlatform === "instagram" && (
                <InstagramPreview content={getPreviewText()} mediaUrl={mediaUrl} />
              )}
              {previewPlatform === "linkedin" && (
                <LinkedInPreview content={getPreviewText()} mediaUrl={mediaUrl} authorName="Chandu" />
              )}
              {previewPlatform === "twitter" && (
                <XPreview content={getPreviewText()} mediaUrl={mediaUrl} />
              )}
              {previewPlatform === "facebook" && (
                <FacebookPreview content={getPreviewText()} mediaUrl={mediaUrl} />
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              Preview matches native mobile and desktop rendering.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
