import React, { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  X,
  Send,
  Calendar,
  Sparkles,
  Image as ImageIcon,
  Film,
  UploadCloud,
  Trash2,
  RefreshCw,
  Check,
  Smartphone,
  Heart,
  MessageCircle,
  Share2,
  FileVideo,
  FileImage,
  FileText,
  Repeat2,
  ChevronDown,
  Play,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  editPost?: any; // When editing an existing post
  defaultCampaignId?: number | string;
}

const PLATFORM_LIST = [
  { id: "instagram", name: "Instagram", icon: <FaInstagram size={18} className="text-pink-600" /> },
  { id: "facebook", name: "Facebook", icon: <FaFacebook size={18} className="text-blue-600" /> },
  { id: "linkedin", name: "LinkedIn", icon: <FaLinkedin size={18} className="text-sky-600" /> },
  { id: "twitter", name: "X / Twitter", icon: <FaTwitter size={18} className="text-slate-900" /> },
  { id: "youtube", name: "YouTube", icon: <FaYoutube size={18} className="text-red-600" /> },
  { id: "pinterest", name: "Pinterest", icon: <FaPinterest size={18} className="text-rose-600" /> },
];

export default function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
  editPost,
  defaultCampaignId,
}: CreatePostModalProps) {
  const { user, showToast } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditing = Boolean(editPost);

  // Form State
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "image" | "video">("text");
  const [scheduleType, setScheduleType] = useState<"draft" | "now" | "schedule">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [campaignId, setCampaignId] = useState<string>(defaultCampaignId ? String(defaultCampaignId) : "");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync defaultCampaignId on open
  useEffect(() => {
    if (defaultCampaignId) {
      setCampaignId(String(defaultCampaignId));
    }
  }, [defaultCampaignId, isOpen]);

  // Prefill when editing
  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title || "");
      setContent(editPost.content || "");
      setSelectedPlatforms([editPost.platform || "instagram"]);
      setIsRecurring(editPost.is_recurring || false);
      setRecurrenceRule(editPost.recurrence_rule || "weekly");
      if (editPost.campaign_id) {
        setCampaignId(String(editPost.campaign_id));
      }
      if (editPost.scheduled_at) {
        const d = new Date(editPost.scheduled_at);
        setScheduledAt(d.toISOString().slice(0, 16));
        setScheduleType("schedule");
      }
    }
  }, [editPost]);

  // Load campaigns + social accounts
  useEffect(() => {
    if (isOpen) {
      api.campaigns.list().then(setCampaigns).catch(() => {});
      api.social.getAccounts().then(setSocialAccounts).catch(() => {});
    }
  }, [isOpen]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  if (!isOpen) return null;

  const togglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== id));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleAiAssist = (promptType: string) => {
    const presets: Record<string, string> = {
      launch:
        "🚀 Exciting news! We're thrilled to introduce our newest updates designed to scale your operations. Check out the link in bio! #Growth #Innovation #SaaS",
      engagement:
        "💡 Quick question for our community: What is your #1 productivity hack this year? Drop your thoughts below! 👇 #Discussion #TechTrends",
      promo:
        "✨ Limited-time spotlight: Unlock 30% off enterprise plans this week only. Elevate your brand today! 🔗",
    };
    setContent(presets[promptType] || "");
    if (!title) setTitle(`${promptType.toUpperCase()} Social Post`);
    showToast("AI Generated ✨", "Caption generated.", "info");
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);
    const isVideo = file.type.startsWith("video/") || ["mp4", "mov"].includes(ext);

    if (!isImage && !isVideo) {
      showToast("Invalid Format", "Please select PNG, JPG, WEBP, MP4, or MOV.", "error");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast("File Too Large", "Maximum 100MB allowed.", "error");
      return;
    }

    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);

    const previewUrl = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaPreviewUrl(previewUrl);
    const det = isVideo ? "video" : "image";
    setMediaType(det);
    setPostType(det);
    showToast("Media Attached", `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`, "info");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleRemoveMedia = () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setPostType("text");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedPlatforms(["instagram"]);
    handleRemoveMedia();
    setScheduleType("draft");
    setScheduledAt("");
    setCampaignId("");
    setSelectedAccountId("");
    setIsRecurring(false);
    setRecurrenceRule("weekly");
    setRecurrenceEndDate("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const buildFormData = (platform: string, statusVal: string): FormData => {
    const fd = new FormData();
    fd.append("caption", content);
    fd.append("content", content);
    fd.append("title", title || `${platform.toUpperCase()} Post`);
    fd.append("platform", platform);
    fd.append("post_type", mediaType || "text");
    fd.append("status", statusVal);

    if (scheduleType === "schedule" && scheduledAt) {
      fd.append("scheduled_at", new Date(scheduledAt).toISOString());
    }
    if (campaignId) fd.append("campaign_id", campaignId);
    if (selectedAccountId) fd.append("social_account_id", selectedAccountId);
    if (isRecurring) {
      fd.append("is_recurring", "true");
      fd.append("recurrence_rule", recurrenceRule);
      if (recurrenceEndDate) fd.append("recurrence_end_date", new Date(recurrenceEndDate).toISOString());
    }
    if (mediaFile) fd.append("media_file", mediaFile);

    return fd;
  };

  const handleSubmit = async (e: React.FormEvent, action: "draft" | "now" | "schedule") => {
    e.preventDefault();
    if (!content.trim()) {
      showToast("Required", "Please provide post content.", "error");
      return;
    }
    if (action === "schedule" && !scheduledAt) {
      showToast("Required", "Please select a scheduled date/time.", "error");
      return;
    }

    // Platform-specific media validations for publishing & scheduling
    if (action !== "draft") {
      if (selectedPlatforms.includes("youtube") && mediaType !== "video" && !editPost?.media_url) {
        showToast("Validation Error", "YouTube requires a video upload. Please attach a video or deselect YouTube.", "error");
        return;
      }
      if (selectedPlatforms.includes("pinterest") && !mediaFile && !editPost?.media_url) {
        showToast("Validation Error", "Pinterest requires an image or video pin. Please attach media.", "error");
        return;
      }
      if (selectedPlatforms.includes("instagram") && !mediaFile && !editPost?.media_url) {
        showToast("Validation Error", "Instagram requires an image or video. Please attach media.", "error");
        return;
      }

      // Check for unlinked accounts
      const connectedPlatforms = new Set(socialAccounts.map((a: any) => a.platform.toLowerCase()));
      const unconnected = selectedPlatforms.filter((p) => !connectedPlatforms.has(p.toLowerCase()));
      if (unconnected.length > 0) {
        showToast(
          "Unconnected Account",
          `Notice: ${unconnected.map((p) => p.toUpperCase()).join(", ")} will publish in fallback mode until real OAuth is connected.`,
          "info"
        );
      }
    }

    const statusVal =
      action === "draft" ? "draft" : action === "schedule" ? "scheduled" : "published";

    setSubmitting(true);
    try {
      if (isEditing && editPost) {
        // Update existing post
        await api.posts.update(editPost.id, {
          title: title || undefined,
          content,
          platform: selectedPlatforms[0],
          status: statusVal,
          scheduled_at: action === "schedule" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : undefined,
          social_account_id: selectedAccountId ? parseInt(selectedAccountId) : undefined,
        });
        showToast("Post Updated ✅", "Your post has been updated.", "success");
      } else {
        // Create new post for each selected platform
        for (const plat of selectedPlatforms) {
          const fd = buildFormData(plat, statusVal);
          await api.posts.create(fd);
        }
        const label =
          action === "draft" ? "Draft Saved 📝" :
          action === "schedule" ? "Post Scheduled 📅" :
          "Post Published 🎉";
        showToast(label, `Dispatched across ${selectedPlatforms.length} channel${selectedPlatforms.length > 1 ? "s" : ""}.`, "success");
      }

      window.dispatchEvent(new Event("post_created"));
      if (onPostCreated) onPostCreated();
      handleClose();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to save post", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-5xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 my-8 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-display">
                {isEditing ? "Edit Post" : "Multi-Channel Post Composer"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? "Update your post details below" : "Compose, upload media, and schedule across 6 platforms"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Left: Form ─────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-5">

            {/* Step 1: Target Channels */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Target Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_LIST.map((plat) => {
                  const isSelected = selectedPlatforms.includes(plat.id);
                  return (
                    <button
                      type="button"
                      key={plat.id}
                      onClick={() => togglePlatform(plat.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {plat.icon}
                      <span>{plat.name}</span>
                      {isSelected && <Check size={14} className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Media Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Media (Optional)
                </label>
                <span className="text-[11px] text-slate-500 font-medium">PNG, JPG, WEBP, MP4, MOV</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/quicktime,.png,.jpg,.jpeg,.webp,.mp4,.mov"
                onChange={handleFileSelect}
                className="hidden"
                id="post-media-file-input"
              />

              {!mediaFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/80"
                      : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-blue-400"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-xs border border-blue-100">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Click to browse or drag & drop</p>
                  <p className="text-xs text-slate-500 mt-1">Images & videos up to 100MB</p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase">
                        {mediaType === "video" ? <><FileVideo size={13} /> Video</> : <><FileImage size={13} /> Image</>}
                      </span>
                      <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                        {mediaFile.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({(mediaFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <RefreshCw size={13} /> Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="relative w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center max-h-64">
                    {mediaType === "video" ? (
                      <video src={mediaPreviewUrl || undefined} controls playsInline className="w-full max-h-64 object-contain" />
                    ) : (
                      <img src={mediaPreviewUrl || undefined} alt="Preview" className="w-full max-h-64 object-contain bg-slate-950" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Campaign Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                3. Campaign Title / Internal Reference
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q3 Growth Announcement Teaser"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {/* Step 4: Caption & AI */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Post Caption & Hashtags
                </label>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-blue-600">AI:</span>
                  {["launch", "engagement", "promo"].map((t) => (
                    <button key={t} type="button" onClick={() => handleAiAssist(t)} className="hover:text-blue-600 underline font-medium cursor-pointer capitalize">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your engaging caption with hashtags #SocialPilot #Marketing..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>Supports emojis & hashtags</span>
                <span>{content.length} characters</span>
              </div>
            </div>

            {/* Step 5: Campaign & Account Selectors */}
            <div className="grid grid-cols-2 gap-3">
              {campaigns.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Campaign (Optional)
                  </label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 transition"
                  >
                    <option value="">No Campaign</option>
                    {campaigns.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {socialAccounts.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Social Account (Optional)
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Auto-select</option>
                    {socialAccounts
                      .filter((a: any) => selectedPlatforms.includes(a.platform))
                      .map((a: any) => (
                        <option key={a.id} value={a.id}>{a.account_name} ({a.platform})</option>
                      ))
                    }
                  </select>
                </div>
              )}

              {campaigns.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Campaign Association {defaultCampaignId ? "(Pre-selected)" : "(Optional)"}
                  </label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 transition font-medium cursor-pointer"
                  >
                    <option value="">No Campaign</option>
                    {campaigns.map((c: any) => (
                      <option key={c.id} value={String(c.id)}>
                        🎯 {c.name} ({c.platform})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Step 6: Schedule Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                5. Publishing Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "draft", label: "Save Draft", sub: "Save for later editing", icon: <FileText size={15} /> },
                  { id: "now", label: "Publish Now", sub: "Immediate dispatch", icon: <Send size={15} /> },
                  { id: "schedule", label: "Schedule", sub: "Pick date & time", icon: <Calendar size={15} /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setScheduleType(opt.id as any)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      scheduleType === opt.id
                        ? "bg-blue-50 border-blue-300 text-blue-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">{opt.icon}<span className="text-xs font-bold">{opt.label}</span></div>
                    <p className="text-[11px] text-slate-500 font-normal">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {scheduleType === "schedule" && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Publishing Date & Time (UTC)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                {/* Recurring Toggle */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat2 size={16} className="text-purple-600" />
                      <span className="text-sm font-bold text-purple-900">Recurring Post</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${isRecurring ? "bg-purple-600" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? "translate-x-5" : ""}`}
                      />
                    </button>
                  </div>

                  {isRecurring && (
                    <div className="space-y-2 animate-in fade-in">
                      <div>
                        <label className="block text-xs font-bold text-purple-800 uppercase tracking-wide mb-1">Frequency</label>
                        <select
                          value={recurrenceRule}
                          onChange={(e) => setRecurrenceRule(e.target.value as any)}
                          className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-400"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-purple-800 uppercase tracking-wide mb-1">End Date (Optional)</label>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>

              {/* Save Draft (always available when not editing) */}
              {!isEditing && (
                <button
                  type="button"
                  disabled={submitting || !content.trim()}
                  onClick={(e) => handleSubmit(e as any, "draft")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold border border-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  <FileText size={16} />
                  <span>{submitting ? "Saving..." : "Save Draft"}</span>
                </button>
              )}

              {/* Main Action Button */}
              <button
                type="button"
                disabled={submitting || !content.trim()}
                onClick={(e) => handleSubmit(e as any, scheduleType === "draft" && isEditing ? "draft" : scheduleType)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {scheduleType === "schedule" ? <Calendar size={16} /> : scheduleType === "now" ? <Send size={16} /> : <FileText size={16} />}
                <span>
                  {submitting
                    ? "Processing..."
                    : isEditing
                    ? "Save Changes"
                    : scheduleType === "schedule"
                    ? "Schedule Post"
                    : scheduleType === "now"
                    ? "Publish Now"
                    : "Save Draft"}
                </span>
              </button>
            </div>
          </div>

          {/* ── Right: Live Preview ─────────────────────────── */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900 rounded-3xl border border-slate-800 text-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Preview ({selectedPlatforms[0]?.toUpperCase()})
              </span>
            </div>

            <div className="w-full max-w-xs bg-slate-950 rounded-3xl border-2 border-slate-800 p-4 space-y-3 shadow-2xl">
              {/* Account Header */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {user?.name?.slice(0, 2).toUpperCase() || "SP"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white leading-tight truncate">
                    {user?.name || "SocialPilot Brand"}
                  </p>
                  <p className="text-[10px] text-slate-400">Sponsored • Just now</p>
                </div>
              </div>

              {/* Media / Placeholder */}
              {mediaPreviewUrl ? (
                <div className="w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 min-h-44 max-h-56 relative">
                  {mediaType === "video" ? (
                    <video src={mediaPreviewUrl} controls playsInline className="w-full h-48 object-cover rounded-xl" />
                  ) : (
                    <img src={mediaPreviewUrl} alt="Live preview" className="w-full h-48 object-cover rounded-xl" />
                  )}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] font-bold text-white">
                    {mediaType?.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="w-full h-44 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                  <ImageIcon size={32} className="text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">Multi-Channel Visual Media</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Upload an image or video to preview</p>
                </div>
              )}

              {/* Caption */}
              <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                {content || "Start typing your caption to preview how it will appear on followers' feeds..."}
              </p>

              {/* Engagement */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center gap-1 hover:text-pink-400 transition cursor-pointer">
                  <Heart size={14} className="text-pink-500" /> 1.2K
                </span>
                <span className="flex items-center gap-1 hover:text-blue-400 transition cursor-pointer">
                  <MessageCircle size={14} className="text-blue-400" /> 84
                </span>
                <span className="flex items-center gap-1 hover:text-emerald-400 transition cursor-pointer">
                  <Share2 size={14} className="text-emerald-400" /> 28
                </span>
              </div>
            </div>

            {/* Recurring badge */}
            {isRecurring && scheduleType === "schedule" && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-900/40 border border-purple-700/40 text-purple-300 text-xs font-semibold">
                <Repeat2 size={14} /> Recurring: {recurrenceRule}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
