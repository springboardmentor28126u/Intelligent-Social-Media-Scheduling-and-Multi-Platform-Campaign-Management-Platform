"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { createPost, publishLinkedInPost, uploadMedia, publishMultiPlatform, getSocialAccounts } from "@/lib/api";
import { getCampaigns, Campaign } from "@/lib/campaigns";
import { SocialAccount } from "@/lib/types";

/* =========================================================
   TYPES & CONFIG
========================================================= */

type ContentType = "text" | "image" | "video" | "carousel" | "stories" | "reels";

interface PlatformConfig {
  name: string;
  key: string;
  icon: string;
  brandColor: string;
  charLimit: number;
}

const PLATFORMS: PlatformConfig[] = [
  { name: "LinkedIn", key: "linkedin", icon: "in", brandColor: "#0A66C2", charLimit: 3000 },
  { name: "Instagram", key: "instagram", icon: "◎", brandColor: "#E1306C", charLimit: 2200 },
  { name: "Facebook", key: "facebook", icon: "f", brandColor: "#1877F2", charLimit: 63206 },
  { name: "X (Twitter)", key: "twitter", icon: "𝕏", brandColor: "#1DA1F2", charLimit: 280 },
  { name: "YouTube", key: "youtube", icon: "▶", brandColor: "#FF0000", charLimit: 5000 },
  { name: "Pinterest", key: "pinterest", icon: "P", brandColor: "#E60023", charLimit: 500 },
];

const CONTENT_TYPES: { key: ContentType; label: string; icon: string; description: string }[] = [
  { key: "text", label: "Text Post", icon: "📝", description: "Standard update & articles" },
  { key: "image", label: "Image Post", icon: "🖼️", description: "Single high-res graphic" },
  { key: "video", label: "Video Clip", icon: "🎬", description: "HD MP4 / MOV clip" },
  { key: "carousel", label: "Carousel", icon: "📑", description: "Multi-slide PDF / cards" },
  { key: "stories", label: "Stories", icon: "⏱️", description: "24h vertical format" },
  { key: "reels", label: "Reels / Shorts", icon: "⚡", description: "Short-form vertical video" },
];

const SUGGESTED_HASHTAGS = [
  "#SaaSGrowth",
  "#DigitalMarketing",
  "#ContentStrategy",
  "#SocialMedia2026",
  "#Automation",
  "#ProductLaunch",
  "#B2BMarketing",
];

export default function CreatePostPage() {
  const router = useRouter();

  /* Form State */
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin", "twitter"]);
  const [contentType, setContentType] = useState<ContentType>("image");
  const [purpose, setPurpose] = useState("Educate");
  const [tone, setTone] = useState("Professional");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("14:30");
  const [recurringCadence, setRecurringCadence] = useState("None");
  const [selectedCampaign, setSelectedCampaign] = useState("Q4 Omni-Channel Boost");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  /* Media Attachment State */
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* UI & Preview State */
  const [previewPlatform, setPreviewPlatform] = useState("linkedin");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* Cleanup preview object URLs */
  useEffect(() => {
    return () => {
      if (mediaPreview && mediaPreview.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  /* Auth Guard & Initializer */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const yyyy = tmrw.getFullYear();
    const mm = String(tmrw.getMonth() + 1).padStart(2, "0");
    const dd = String(tmrw.getDate()).padStart(2, "0");
    setScheduledDate(`${yyyy}-${mm}-${dd}`);

    // Fetch campaigns
    async function loadCampaigns() {
      try {
        const list = await getCampaigns();
        if (Array.isArray(list) && list.length > 0) {
          setCampaigns(list);
          setSelectedCampaign(list[0].name);
        }
      } catch {
        // Fallback default
      }
    }
    void loadCampaigns();

    // Fetch user's social accounts to inspect live vs sandbox modes
    async function loadAccounts() {
      try {
        const accs = await getSocialAccounts();
        if (Array.isArray(accs)) {
          setSocialAccounts(accs);
        }
      } catch {
        // Fallback
      }
    }
    void loadAccounts();
  }, [router]);

  /* Platform Toggle */
  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((p) => p !== key);
      }
      return [...prev, key];
    });
  };

  /* Add hashtag */
  const addHashtag = (tag: string) => {
    if (!content.includes(tag)) {
      setContent((prev) => (prev ? `${prev} ${tag}` : tag));
    }
  };

  /* File Selection & Removal Handlers */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Please select a supported image (PNG, JPG, GIF, WebP) or video (MP4, MOV, WebM).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds 50MB limit. Please upload a smaller asset.");
      return;
    }

    setError("");
    setMediaFile(file);
    if (mediaPreview && mediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaPreview(URL.createObjectURL(file));
    setMediaUrl(null);

    if (isVideo) {
      setContentType("video");
    } else {
      setContentType("image");
    }
  };

  const handleRemoveMedia = () => {
    if (mediaPreview && mediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setMediaUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (contentType === "image" || contentType === "video") {
      setContentType("text");
    }
  };

  /* Ensure media file is uploaded before submitting post */
  const ensureMediaUploaded = async (): Promise<string | null> => {
    if (mediaUrl) return mediaUrl;
    if (!mediaFile) return null;

    setUploadingMedia(true);
    try {
      const res = await uploadMedia(mediaFile);
      setMediaUrl(res.url);
      return res.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Media upload failed";
      throw new Error(`Media upload error: ${msg}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  /* Character count analysis */
  const activeLimit = PLATFORMS.find((p) => p.key === previewPlatform)?.charLimit || 280;
  const charsRemaining = activeLimit - content.length;

  /* Handle Publish Now */
  const handlePublishNow = async () => {
    if (!content.trim() && !mediaFile) {
      setError("Please write post content or attach media before publishing.");
      return;
    }

    try {
      setPublishing(true);
      setError("");
      setMessage("");

      let uploadedUrl: string | null = null;
      if (mediaFile) {
        setMessage("Uploading media asset to server...");
        uploadedUrl = await ensureMediaUploaded();
      }

      setMessage("Dispatching post across target platforms...");
      const pubRes = await publishMultiPlatform(
        content.trim(),
        selectedPlatforms,
        uploadedUrl
      );

      setMessage(
        pubRes.message ||
        `Post successfully dispatched across ${selectedPlatforms.map((p) => p.toUpperCase()).join(", ")}!`
      );
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Post publishing failed";
      setError(msg);
    } finally {
      setPublishing(false);
      setUploadingMedia(false);
    }
  };

  /* Handle Schedule */
  const handleSchedulePost = async () => {
    if (!content.trim() && !mediaFile) {
      setError("Please write content or attach media before scheduling.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      let uploadedUrl: string | null = null;
      if (mediaFile) {
        setMessage("Uploading media asset to server...");
        uploadedUrl = await ensureMediaUploaded();
      }

      const isoTime = `${scheduledDate}T${scheduledTime}:00`;
      await createPost({
        content: content.trim(),
        platforms: selectedPlatforms,
        content_type: contentType,
        media_url: uploadedUrl,
        status: "scheduled",
        scheduled_at: isoTime,
      });

      setMessage("Post successfully scheduled in the publishing calendar!");
      setTimeout(() => router.push("/calender"), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scheduling failed";
      setError(msg);
    } finally {
      setSaving(false);
      setUploadingMedia(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* SUB-HEADER BREADCRUMB */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Content Studio</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Multi-Platform Post Composer
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/calender")}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              View Calendar
            </button>
            <button
              type="button"
              onClick={() => router.push("/content-lab")}
              className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/50 text-xs font-semibold text-indigo-300 transition"
            >
              ✦ AI Content Lab
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {message && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg">
            <span>✓ {message}</span>
            <button onClick={() => setMessage("")} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span>⚠ {error}</span>
              {error.toLowerCase().includes("log in") && (
                <Link href="/login" className="underline ml-2 text-indigo-400 hover:text-indigo-300 font-extrabold">
                  Go to Login →
                </Link>
              )}
            </div>
            <button onClick={() => setError("")} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* TWO-COLUMN STUDIO LAYOUT */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =========================================================
              LEFT COLUMN: COMPOSER CONTROLS (7 COLS)
          ========================================================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* STEP 1: CONTENT DRAFT & EDITOR */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80">
                  Step 1: Content Draft
                </span>
                <span
                  className={`text-xs font-bold ${
                    charsRemaining < 0 ? "text-rose-400" : "text-slate-400"
                  }`}
                >
                  {charsRemaining} chars left ({previewPlatform.toUpperCase()})
                </span>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What would you like to share? Write your post or drop campaign insights here..."
                rows={6}
                style={{ color: "#ffffff", backgroundColor: "#0b0f19" }}
                className="w-full text-sm leading-relaxed p-4 rounded-xl border border-slate-700 bg-[#0b0f19] text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition resize-none font-normal"
              />

              {/* TONE & PURPOSE SELECTORS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Goal / Purpose
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Educate", "Promote", "Engage", "Announce"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPurpose(p)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                          purpose === p
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Voice / Tone
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Professional", "Friendly", "Bold", "Creative"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                          tone === t
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RECOMMENDED HASHTAGS */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Tags:</span>
                {SUGGESTED_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addHashtag(tag)}
                    className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/50 px-2.5 py-0.5 rounded-md transition shrink-0"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              {/* MEDIA ATTACHMENT ZONE (IMAGES & VIDEOS) */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!mediaFile ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Media Attachment (Images & Videos)
                      </label>
                      <span className="text-[10px] text-slate-500">JPG, PNG, GIF, WebP, MP4, MOV up to 50MB</span>
                    </div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 hover:bg-slate-950 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition text-lg">
                          📸
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                            Click to upload photo or video
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Attach visuals to auto-publish across LinkedIn, Instagram, X & YouTube
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold text-indigo-300 transition shrink-0"
                      >
                        Browse Media
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Media Attached ({mediaFile.type.startsWith("video/") ? "Video Clip" : "Image Graphic"})
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
                      >
                        ✕ Remove Media
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {mediaPreview && mediaFile.type.startsWith("image/") ? (
                          <img
                            src={mediaPreview}
                            alt="Upload thumbnail"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
                          />
                        ) : mediaFile.type.startsWith("video/") ? (
                          <div className="w-14 h-14 rounded-lg bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-2xl shrink-0">
                            🎬
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                            📁
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-100 truncate">{mediaFile.name}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 uppercase">
                              {mediaFile.type.split("/")[1] || "MEDIA"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold">
                              ✓ Ready for upload
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition shrink-0"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2: TARGET PLATFORMS (6 NETWORKS) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80">
                  Step 2: Target Networks ({selectedPlatforms.length} selected)
                </span>
                <span className="text-xs text-slate-400 font-medium">Multi-platform sync</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PLATFORMS.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.key);
                  const matchedAcc = socialAccounts.find(
                    (a) => a.platform.toLowerCase() === platform.key.toLowerCase()
                  );
                  const isLive = matchedAcc?.is_live || matchedAcc?.mode === "live";

                  return (
                    <button
                      key={platform.key}
                      type="button"
                      onClick={() => togglePlatform(platform.key)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition gap-2 ${
                        isSelected
                          ? "bg-slate-800 text-white border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30"
                          : "bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: platform.brandColor }}
                          >
                            {platform.icon}
                          </span>
                          <span className="text-xs font-bold truncate text-white">{platform.name}</span>
                        </div>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-500 text-white font-bold"
                              : "border-slate-700 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-800/60 text-[10px]">
                        <span className="text-slate-400 truncate max-w-[90px]">
                          {matchedAcc ? matchedAcc.account_name : "Not Connected"}
                        </span>
                        {isLive ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-bold shrink-0">
                            Live API
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold shrink-0">
                            Sandbox
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* SANDBOX / SIMULATION TRANSPARENCY NOTICE */}
              <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <span className="text-amber-400 text-sm mt-0.5">ℹ️</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">
                    Publishing Mode Overview
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Platforms marked <strong className="text-amber-300 font-bold">Sandbox</strong> record, preview, and schedule posts within your SocialPilot dashboard & calendar. To dispatch live posts directly to your external mobile app / public feed (e.g. real Instagram or X account), connect your live API tokens in{" "}
                    <Link href="/social-accounts" className="text-indigo-400 underline hover:text-indigo-300 font-semibold">
                      Social Accounts
                    </Link>.
                  </p>
                </div>
              </div>
            </div>

            {/* STEP 3: CONTENT TYPE (6 FORMATS) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80">
                  Step 3: Content Format (Module 3 Specification)
                </span>
                <span className="text-xs text-slate-400 font-medium">Native render</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CONTENT_TYPES.map((ct) => {
                  const isSelected = contentType === ct.key;
                  return (
                    <button
                      key={ct.key}
                      type="button"
                      onClick={() => setContentType(ct.key)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? "bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/30 text-white"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{ct.icon}</span>
                        <span className="text-xs font-bold text-white">{ct.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{ct.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 4: SCHEDULING, CADENCE & CAMPAIGN */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80">
                  Step 4: Publishing Engine & Cadence
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Schedule Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    style={{ colorScheme: "dark", color: "#f8fafc", backgroundColor: "#090d16" }}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-[#090d16] text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Publish Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    style={{ colorScheme: "dark", color: "#f8fafc", backgroundColor: "#090d16" }}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-[#090d16] text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Recurring Cadence</label>
                  <select
                    value={recurringCadence}
                    onChange={(e) => setRecurringCadence(e.target.value)}
                    style={{ colorScheme: "dark", color: "#f8fafc", backgroundColor: "#090d16" }}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-[#090d16] text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="None" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>One-time post</option>
                    <option value="Daily" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Daily drop</option>
                    <option value="Weekly" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Weekly cadence</option>
                    <option value="Bi-weekly" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Bi-weekly roundup</option>
                    <option value="Monthly" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Monthly bulletin</option>
                  </select>
                </div>
              </div>

              {/* CAMPAIGN ASSOCIATION (MODULE 4) */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Associate with Campaign (Module 4)
                </label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  style={{ colorScheme: "dark", color: "#f8fafc", backgroundColor: "#090d16" }}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-[#090d16] text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="Q4 Omni-Channel Boost" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Q4 Omni-Channel Boost (+280% ROI)</option>
                  <option value="Product Release V2 Showcase" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Product Release V2 Showcase</option>
                  <option value="Holiday Visual Discovery" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Holiday Visual Discovery</option>
                  <option value="Employer Branding 2026" style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>Employer Branding 2026</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.name} style={{ backgroundColor: "#090d16", color: "#f8fafc" }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ACTION DISPATCH BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={publishing || saving || uploadingMedia}
                  onClick={handleSchedulePost}
                  className="w-full sm:flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>📅</span>
                  <span>{uploadingMedia ? "Uploading Media..." : saving ? "Scheduling..." : "Schedule for Calendar"}</span>
                </button>

                <button
                  type="button"
                  disabled={publishing || saving || uploadingMedia}
                  onClick={handlePublishNow}
                  className="w-full sm:flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>🚀</span>
                  <span>{uploadingMedia ? "Uploading Media..." : publishing ? "Publishing..." : "Publish Right Now"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================
              RIGHT COLUMN: LIVE POST PREVIEW (5 COLS)
          ========================================================= */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Live Device Preview</h3>
                  <p className="text-[11px] text-slate-400">Authentic multi-network simulation</p>
                </div>

                {/* PREVIEW PLATFORM TABS */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {["linkedin", "twitter", "instagram"].map((key) => {
                    const conf = PLATFORMS.find((p) => p.key === key);
                    const isActive = previewPlatform === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPreviewPlatform(key)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title={conf?.name}
                      >
                        {conf?.icon}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PREVIEW CARD CONTAINER */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                {/* AUTHOR ROW */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    S
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">SocialPilot Global</span>
                      <span className="text-indigo-400 text-xs">✓</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {previewPlatform === "linkedin"
                        ? "74,320 followers • 1m • Edited"
                        : previewPlatform === "twitter"
                        ? "@socialpilot_io"
                        : "socialpilot_app • Sponsored"}
                    </span>
                  </div>
                </div>

                {/* POST TEXT */}
                <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap min-h-[90px] mb-3">
                  {content || (
                    <span className="text-slate-500 italic">
                      Your post content will render here in real time with hashtags, links, and media formatting...
                    </span>
                  )}
                </div>

                {/* MEDIA PREVIEW CONTAINER */}
                {mediaPreview ? (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black mb-3 max-h-80 flex items-center justify-center relative group">
                    {mediaFile?.type.startsWith("video/") ? (
                      <video
                        src={mediaPreview}
                        controls
                        className="w-full max-h-80 object-contain rounded-xl"
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Live Preview Media"
                        className="w-full max-h-80 object-contain rounded-xl"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/75 backdrop-blur text-[10px] font-bold text-slate-300 border border-slate-700/60">
                      {mediaFile?.type.startsWith("video/") ? "🎬 VIDEO" : "🖼️ IMAGE"} • {previewPlatform.toUpperCase()}
                    </div>
                  </div>
                ) : contentType !== "text" ? (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/80 text-white h-44 flex flex-col items-center justify-center text-center p-4 relative mb-3">
                    <span className="text-3xl mb-1">
                      {CONTENT_TYPES.find((c) => c.key === contentType)?.icon}
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {CONTENT_TYPES.find((c) => c.key === contentType)?.label} Simulation
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 max-w-xs">
                      1080x1080 optimized for {previewPlatform.toUpperCase()} feeds
                    </span>
                  </div>
                ) : null}

                {/* SOCIAL ENGAGEMENT ACTION FOOTER */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer">
                    👍 128
                  </span>
                  <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer">
                    💬 24 comments
                  </span>
                  <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer">
                    🔁 19 reposts
                  </span>
                </div>
              </div>

              {/* POST METADATA CHIPS */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Campaign: <strong className="text-slate-200">{selectedCampaign}</strong></span>
                <span>Tone: <strong className="text-slate-200">{tone}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}