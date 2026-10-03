"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { getPosts, deletePost, updatePost } from "@/lib/api";
import { INITIAL_CONTENT_POSTS } from "@/lib/mockData";
import { Post, PostStatus } from "@/lib/types";

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "All Posts" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "pending_approval", label: "Pending Approval" },
];

export default function ContentManagementPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  /* Modal state */
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [reschedulePost, setReschedulePost] = useState<Post | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState("");
  const [message, setMessage] = useState("");

  /* Auth Guard & Load Posts */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const live = await getPosts();
        if (Array.isArray(live) && live.length > 0) {
          const mapped: Post[] = live.map((p, idx) => ({
            id: p.id || idx + 1,
            content: p.content || "Social update",
            platforms: Array.isArray(p.platforms) ? p.platforms : [p.platform || "linkedin"],
            content_type: p.content_type || "text",
            media_url: p.media_url || null,
            status: (p.status as PostStatus) || "scheduled",
            scheduled_at: p.scheduled_at || null,
            created_at: p.created_at || "2026-10-01",
            campaign: p.campaign || "General Campaign",
            author: p.author || "Marketing Director",
          }));
          setPosts([...mapped, ...INITIAL_CONTENT_POSTS]);
        } else {
          setPosts(INITIAL_CONTENT_POSTS);
        }
      } catch {
        setPosts(INITIAL_CONTENT_POSTS);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [router]);

  /* Filter & Sort */
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Status Tab filter
    if (activeTab !== "all") {
      result = result.filter((p) => p.status === activeTab);
    }

    // Platform filter
    if (platformFilter !== "all") {
      result = result.filter((p) =>
        p.platforms.some((pl) => String(pl).toLowerCase() === platformFilter.toLowerCase())
      );
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          (p.campaign && p.campaign.toLowerCase().includes(q)) ||
          (p.author && p.author.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.created_at || 0).getTime();
      const dateB = new Date(b.scheduled_at || b.created_at || 0).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [posts, activeTab, platformFilter, searchTerm, sortBy]);

  /* Pagination */
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage) || 1;
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* Actions */
  const handleDelete = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(postId);
    } catch {
      // local delete
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setMessage("Post deleted from publishing registry!");
    setTimeout(() => setMessage(""), 3500);
  };

  const handleDuplicate = (post: Post) => {
    const duplicated: Post = {
      ...post,
      id: Date.now(),
      status: "draft",
      content: `[Copy] ${post.content}`,
      scheduled_at: null,
    };
    setPosts([duplicated, ...posts]);
    setMessage("Post duplicated as draft!");
    setTimeout(() => setMessage(""), 3500);
  };

  const handlePublishNow = async (post: Post) => {
    try {
      await updatePost(post.id, { status: "published" });
    } catch {
      // local
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, status: "published" } : p))
    );
    setMessage(`Post #${post.id} successfully dispatched across networks!`);
    setTimeout(() => setMessage(""), 3500);
  };

  const handleCancelPost = (postId: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: "cancelled" } : p))
    );
    setMessage(`Post #${postId} moved to cancelled state.`);
    setTimeout(() => setMessage(""), 3500);
  };

  const handleRescheduleSubmit = async () => {
    if (!reschedulePost || !newScheduleDate) return;
    try {
      await updatePost(reschedulePost.id, {
        status: "scheduled",
        scheduled_at: newScheduleDate,
      });
    } catch {
      // local
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === reschedulePost.id
          ? { ...p, status: "scheduled", scheduled_at: newScheduleDate }
          : p
      )
    );
    setReschedulePost(null);
    setNewScheduleDate("");
    setMessage("Post schedule updated successfully!");
    setTimeout(() => setMessage(""), 3500);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
              <span className="text-indigo-400 font-bold">Content Manager</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Content & Post Repository
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/calender")}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              Calendar View
            </button>
            <button
              type="button"
              onClick={() => router.push("/create-post")}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <span>＋</span>
              <span>Create Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {message && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
            <span>✓ {message}</span>
            <button onClick={() => setMessage("")} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* TABS HEADER */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          {TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? posts.length
                : posts.filter((p) => p.status === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* SEARCH, FILTER & SORT BAR */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search posts, campaigns, authors..."
              className="w-full text-xs font-medium pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All Platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">X (Twitter)</option>
              <option value="youtube">YouTube</option>
              <option value="pinterest">Pinterest</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>

        {/* POSTS CARDS LIST */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
            Loading content repository...
          </div>
        ) : paginatedPosts.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-sm font-bold text-white">No posts match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing search terms or create a new post.</p>
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setPlatformFilter("all");
                setSearchTerm("");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedPosts.map((post) => {
              const statusColors: Record<PostStatus, string> = {
                published: "bg-emerald-950/80 text-emerald-300 border-emerald-800/70",
                scheduled: "bg-indigo-950/80 text-indigo-300 border-indigo-800/70",
                draft: "bg-slate-800 text-slate-300 border-slate-700",
                failed: "bg-rose-950/80 text-rose-300 border-rose-800/70",
                cancelled: "bg-slate-850 text-slate-400 border-slate-700",
                pending_approval: "bg-amber-950/80 text-amber-300 border-amber-800/70",
              };

              return (
                <div
                  key={post.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    {/* STATUS & CAMPAIGN HEADER */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          statusColors[post.status] || "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {post.status.replace("_", " ")}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-400 truncate max-w-[140px]">
                        {post.campaign || "General"}
                      </span>
                    </div>

                    {/* CONTENT PREVIEW */}
                    <p className="text-xs text-slate-200 leading-relaxed line-clamp-3 mb-3 min-h-[40px]">
                      {post.content}
                    </p>

                    {/* MEDIA ATTACHMENT PREVIEW */}
                    {post.media_url && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-36 flex items-center justify-center relative">
                        {post.content_type === "video" ? (
                          <video
                            src={post.media_url.startsWith("http") ? post.media_url : `http://localhost:8000${post.media_url}`}
                            controls
                            className="w-full max-h-36 object-cover"
                          />
                        ) : (
                          <img
                            src={post.media_url.startsWith("http") ? post.media_url : `http://localhost:8000${post.media_url}`}
                            alt="Post media preview"
                            className="w-full max-h-36 object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* META BADGES */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] mb-4">
                      <div className="flex justify-between text-slate-400">
                        <span>Platforms:</span>
                        <strong className="text-slate-200 uppercase truncate max-w-[150px]">
                          {post.platforms.join(", ")}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Format:</span>
                        <span className="text-slate-300 font-semibold uppercase">{post.content_type}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Schedule:</span>
                        <span className="text-slate-300 font-semibold truncate max-w-[150px]">
                          {post.scheduled_at ? post.scheduled_at.replace("T", " ") : "Unscheduled draft"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Author:</span>
                        <span className="text-slate-300 truncate">{post.author || "Marketing Team"}</span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200 font-semibold transition"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/create-post?edit=${post.id}`)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200 font-semibold transition"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(post)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200 font-semibold transition"
                    >
                      Copy
                    </button>

                    {post.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => handlePublishNow(post)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-sm"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredPosts.length)} of {filteredPosts.length} posts
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-50"
              >
                ‹ Previous
              </button>
              <span className="font-bold text-white px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-50"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </main>

      {/* VIEW DETAILS MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Post Inspection (Module 3)</h3>
                <p className="text-xs text-slate-400">ID #{selectedPost.id} • {selectedPost.campaign}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* POST MEDIA ATTACHMENT */}
            {selectedPost.media_url && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-800 bg-black max-h-64 flex items-center justify-center">
                {selectedPost.content_type === "video" ? (
                  <video
                    src={selectedPost.media_url.startsWith("http") ? selectedPost.media_url : `http://localhost:8000${selectedPost.media_url}`}
                    controls
                    className="w-full max-h-64 object-contain"
                  />
                ) : (
                  <img
                    src={selectedPost.media_url.startsWith("http") ? selectedPost.media_url : `http://localhost:8000${selectedPost.media_url}`}
                    alt="Post media preview"
                    className="w-full max-h-64 object-contain"
                  />
                )}
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap mb-4 max-h-60 overflow-y-auto">
              {selectedPost.content}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-5">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Status</span>
                <strong className="text-indigo-400 uppercase">{selectedPost.status}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Platforms</span>
                <strong className="text-white uppercase">{selectedPost.platforms.join(", ")}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setReschedulePost(selectedPost);
                  setSelectedPost(null);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                📅 Reschedule Post
              </button>

              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Reschedule Post #{reschedulePost.id}</h3>
              <button
                type="button"
                onClick={() => setReschedulePost(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  New Publishing Timestamp (ISO format)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReschedulePost(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleSubmit}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
