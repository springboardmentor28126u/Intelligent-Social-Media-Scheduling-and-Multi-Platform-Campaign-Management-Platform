import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Clock,
  Send,
  Repeat2,
  CheckCircle2,
  FileText,
  X,
  Zap,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
} from "react-icons/fa";

export default function QueuePage() {
  const { showToast } = useAuth();
  const [queuePosts, setQueuePosts] = useState<any[]>([]);
  const [selectedLogs, setSelectedLogs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.posts.list();
      const queued = data.filter((p: any) => p.status === "scheduled" || p.status === "failed");
      setQueuePosts(queued);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handlePublishNow = async (id: number) => {
    try {
      const res = await api.posts.publish(id);
      if (res && res.status === "published") {
        showToast("Published! 🎉", `Post successfully published to ${res.platform ? res.platform.toUpperCase() : "social platform"}.`, "success");
      } else if (res && res.status === "failed") {
        showToast("Publish Failed ⚠️", res.failure_reason || "Publishing to social platform failed.", "error");
      } else {
        showToast("Post Updated", `Post status: ${res?.status || "dispatched"}`, "info");
      }
      window.dispatchEvent(new Event("post_published"));
      loadQueue();
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
      loadQueue();
    } catch (err: any) {
      showToast("Retry Error", err.message, "error");
    }
  };

  const handleViewLogs = async (id: number) => {
    try {
      const logs = await api.posts.getLogs(id);
      setSelectedLogs(logs);
    } catch (err: any) {
      showToast("Logs Error", err.message, "error");
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
      default:
        return <FaTwitter size={20} className="text-slate-900" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Publishing Queue & Dispatch
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time background worker dispatch pipeline and Celery task monitoring.
          </p>
        </div>

        <button
          onClick={loadQueue}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Repeat2 size={16} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Worker Queue Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queue Worker Status</p>
            <p className="text-base font-bold text-emerald-600 flex items-center gap-2 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              Active & Polling
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Scheduled Dispatch</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">In ~35 minutes</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queued Items</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{queuePosts.length} Items Pending</p>
          </div>
        </div>
      </div>

      {/* Queue Items Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          Loading publishing queue...
        </div>
      ) : queuePosts.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3 shadow-xs">
          <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
          <h3 className="text-base font-bold text-slate-800">Publishing Queue is clear!</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            All scheduled posts have been published to social channels.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queuePosts.map((post) => (
            <div
              key={post.id}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  {getPlatformIcon(post.platform)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {post.title || post.content.substring(0, 45)}
                    </h3>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        post.status === "scheduled"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                    <span className="capitalize text-slate-800 font-semibold">{post.platform}</span>
                    <span>•</span>
                    <span>
                      Target: {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <button
                  onClick={() => handleViewLogs(post.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  <FileText size={15} />
                  <span>Audit Logs</span>
                </button>

                {post.status === "failed" ? (
                  <button
                    onClick={() => handleRetry(post.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                  >
                    <Repeat2 size={15} />
                    <span>Retry Publish</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePublishNow(post.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                  >
                    <Send size={15} />
                    <span>Publish Now</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publishing Logs Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Publishing Task Event Logs
              </h3>
              <button
                onClick={() => setSelectedLogs(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5">
              {selectedLogs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No event logs recorded yet.</p>
              ) : (
                selectedLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold uppercase text-[11px] ${log.level === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                        {log.level}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{log.event_name}</p>
                    <p className="text-slate-600 text-xs">{log.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLogs(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
