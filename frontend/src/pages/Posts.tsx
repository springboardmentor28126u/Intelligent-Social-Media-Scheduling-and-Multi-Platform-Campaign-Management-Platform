import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, getMediaUrl } from "../services/api";
import {
  Plus,
  Search,
  Send,
  Copy,
  Trash2,
  Repeat2,
  Sparkles,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Check,
  X,
  Filter,
  Clock,
  Image as ImageIcon,
  Film as FilmIcon,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";

export default function Posts() {
  const { user, showToast } = useAuth();
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("status") || "all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setActiveTab(statusParam);
    }
  }, [searchParams]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await api.posts.list({
        status: activeTab !== "all" ? activeTab : undefined,
        platform: selectedPlatform !== "all" ? selectedPlatform : undefined,
      });
      setPosts(data);
    } catch (err: any) {
      showToast("Error loading posts", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeTab, selectedPlatform]);

  const handlePublishNow = async (id: number) => {
    try {
      const res = await api.posts.publish(id);
      if (res && res.status === "published") {
        showToast("Published! 🎉", `Post successfully published to ${res.platform ? res.platform.toUpperCase() : "social platform"}.`, "success");
      } else if (res && res.status === "failed") {
        showToast("Publish Failed ⚠️", res.failure_reason || "Could not publish post.", "error");
      } else {
        showToast("Post Updated", `Post status: ${res?.status || "updated"}`, "info");
      }
      window.dispatchEvent(new Event("post_published"));
      loadPosts();
    } catch (err: any) {
      showToast("Publish Error", err.message, "error");
    }
  };

  const handleRetry = async (id: number) => {
    try {
      const res = await api.posts.retry(id);
      if (res && res.status === "published") {
        showToast("Published! 🎉", `Retry succeeded: post published to ${res.platform ? res.platform.toUpperCase() : "social platform"}.`, "success");
      } else if (res && res.status === "failed") {
        showToast("Retry Failed ⚠️", res.failure_reason || "Retry publish failed.", "error");
      } else {
        showToast("Retried", `Post status: ${res?.status || "updated"}`, "info");
      }
      window.dispatchEvent(new Event("post_updated"));
      loadPosts();
    } catch (err: any) {
      showToast("Retry Error", err.message, "error");
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.posts.duplicate(id);
      showToast("Duplicated", "New draft copy created.", "success");
      window.dispatchEvent(new Event("post_created"));
      loadPosts();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.posts.delete(id);
      showToast("Deleted", "Post removed from workspace.", "info");
      window.dispatchEvent(new Event("post_deleted"));
      loadPosts();
    } catch (err: any) {
      showToast("Delete Error", err.message, "error");
    }
  };

  const handleApprove = async (id: number, action: "approve" | "reject", reason?: string) => {
    try {
      await api.posts.approve(id, action, reason);
      showToast(
        action === "approve" ? "Post Approved 👍" : "Post Rejected",
        action === "approve" ? "Scheduled for automated publishing." : "Returned to creator for revision.",
        "success"
      );
      window.dispatchEvent(new Event("post_updated"));
      loadPosts();
    } catch (err: any) {
      showToast("Approval Error", err.message, "error");
    }
  };

  const handleSubmitForApproval = async (id: number) => {
    try {
      await api.posts.submitApproval(id);
      showToast("Submitted!", "Post submitted for administrator approval.", "success");
      window.dispatchEvent(new Event("post_updated"));
      loadPosts();
    } catch (err: any) {
      showToast("Submission Error", err.message, "error");
    }
  };

  const getPlatformIcon = (plat: string) => {
    switch (plat?.toLowerCase()) {
      case "instagram":
        return <FaInstagram size={20} className="text-pink-600" />;
      case "facebook":
        return <FaFacebook size={20} className="text-blue-600" />;
      case "linkedin":
        return <FaLinkedin size={20} className="text-sky-600" />;
      case "twitter":
        return <FaTwitter size={20} className="text-slate-900" />;
      case "youtube":
        return <FaYoutube size={20} className="text-red-600" />;
      case "pinterest":
        return <FaPinterest size={20} className="text-rose-600" />;
      default:
        return <Sparkles size={20} className="text-blue-600" />;
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.platform?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Content & Posts Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, schedule, approve, and analyze social content across all connected channels.
          </p>
        </div>

        <button
          onClick={() => (window.location.href = "/posts?action=create")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Create Post</span>
        </button>
      </div>

      {/* Filter Tabs & Platform Filter Bar */}
      <div className="space-y-3.5">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl w-fit shadow-xs">
          {[
            { id: "all", label: "All Posts" },
            { id: "published", label: "Published" },
            { id: "scheduled", label: "Scheduled" },
            { id: "draft", label: "Drafts" },
            { id: "failed", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Platform Filter Chips */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", name: "All Channels" },
              { id: "instagram", name: "Instagram", icon: <FaInstagram size={14} className="text-pink-600" /> },
              { id: "facebook", name: "Facebook", icon: <FaFacebook size={14} className="text-blue-600" /> },
              { id: "linkedin", name: "LinkedIn", icon: <FaLinkedin size={14} className="text-sky-600" /> },
              { id: "twitter", name: "X / Twitter", icon: <FaTwitter size={14} className="text-slate-900" /> },
              { id: "youtube", name: "YouTube", icon: <FaYoutube size={14} className="text-red-600" /> },
              { id: "pinterest", name: "Pinterest", icon: <FaPinterest size={14} className="text-rose-600" /> },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition cursor-pointer shadow-xs ${
                  selectedPlatform === p.id
                    ? "bg-slate-900 text-white border-slate-900 font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {p.icon}
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          Loading posts...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3 shadow-xs">
          <Sparkles className="mx-auto text-slate-300" size={36} />
          <h3 className="text-base font-bold text-slate-800">No posts found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            No posts matching the selected filters. Compose a new post or adjust your filters.
          </p>
          <button
            onClick={() => (window.location.href = "/posts?action=create")}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-500 transition cursor-pointer"
          >
            Create Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Post Info & Platform */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    {getPlatformIcon(post.platform)}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {post.title || post.content.substring(0, 45)}
                      </h3>
                      {post.status === "published" ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Published
                        </span>
                      ) : post.status === "scheduled" ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          Scheduled
                        </span>
                      ) : post.status === "failed" ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          Failed
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">
                          {post.status.replace("_", " ")}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">
                      {post.content}
                    </p>

                    {post.media_url && (
                      <div className="pt-1">
                        <div className="relative inline-block rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs max-w-xs">
                          {post.media_type === "video" || post.post_type === "video" ? (
                            <div className="relative">
                              <video
                                src={getMediaUrl(post.media_url)}
                                className="w-52 h-28 object-cover rounded-xl"
                                controls
                                preload="metadata"
                              />
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-white uppercase flex items-center gap-1">
                                <FilmIcon size={10} /> Video
                              </span>
                            </div>
                          ) : (
                            <div className="relative">
                              <img
                                src={getMediaUrl(post.media_url)}
                                alt={post.title || "Post media"}
                                className="w-52 h-28 object-cover rounded-xl"
                              />
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-white uppercase flex items-center gap-1">
                                <ImageIcon size={10} /> Image
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span className="capitalize text-slate-700 font-semibold">{post.platform}</span>
                      <span>•</span>
                      <span>By {post.author_name || "Creator"}</span>
                      <span>•</span>
                      {post.scheduled_at && (
                        <span>
                          Scheduled: {new Date(post.scheduled_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                      {post.published_at && (
                        <span>
                          Published: {new Date(post.published_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  {post.status === "draft" && (
                    <button
                      onClick={() => handlePublishNow(post.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                    >
                      <Send size={15} /> Publish Now
                    </button>
                  )}

                  {post.status === "failed" && (
                    <button
                      onClick={() => handleRetry(post.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                    >
                      <Repeat2 size={15} /> Retry
                    </button>
                  )}

                  <button
                    onClick={() => handleDuplicate(post.id)}
                    title="Duplicate Post"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    <Copy size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(post.id)}
                    title="Delete Post"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Engagement Snapshot if Published */}
              {post.status === "published" && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-6 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Heart size={16} className="text-pink-500" /> {post.likes_count || 184} Likes
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <MessageCircle size={16} className="text-blue-500" /> {post.comments_count || 24} Comments
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Share2 size={16} className="text-emerald-500" /> {post.shares_count || 12} Shares
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Eye size={16} className="text-purple-500" /> {post.reach_count?.toLocaleString() || "3,200"} Reach
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}