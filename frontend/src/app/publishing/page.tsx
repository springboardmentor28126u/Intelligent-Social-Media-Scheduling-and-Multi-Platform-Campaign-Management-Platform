"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { INITIAL_QUEUE_ITEMS, INITIAL_PUBLISHING_LOGS } from "@/lib/mockData";
import { QueueItem, PublishingLog } from "@/lib/types";

export default function PublishingQueuePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"queue" | "logs">("queue");

  /* Queue state */
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE_ITEMS);
  const [queuePaused, setQueuePaused] = useState(false);

  /* Logs state */
  const [logs, setLogs] = useState<PublishingLog[]>(INITIAL_PUBLISHING_LOGS);
  const [searchTerm, setSearchTerm] = useState("");
  const [logPlatformFilter, setLogPlatformFilter] = useState("all");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<PublishingLog | null>(null);

  const [message, setMessage] = useState("");

  /* Auth Guard */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  /* Queue Actions */
  const handleRetryItem = (id: number) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "processing", retry_count: item.retry_count + 1 } : item
      )
    );
    setMessage(`Dispatched immediate retry for Queue item #${id}...`);
    setTimeout(() => {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "published" } : item))
      );
      setMessage(`Queue item #${id} published successfully!`);
      setTimeout(() => setMessage(""), 3500);
    }, 1200);
  };

  const handlePauseResumeItem = (id: number) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = item.status === "pending" ? "cancelled" : "pending";
          return { ...item, status: next };
        }
        return item;
      })
    );
  };

  const handleCancelItem = (id: number) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "cancelled" } : item))
    );
    setMessage(`Queue item #${id} removed from active dispatch queue.`);
    setTimeout(() => setMessage(""), 3500);
  };

  const toggleQueueWorker = () => {
    setQueuePaused(!queuePaused);
    setMessage(
      queuePaused
        ? "Publishing queue worker resumed. Dispatches active."
        : "Publishing queue worker paused. No dispatches will fire."
    );
    setTimeout(() => setMessage(""), 3500);
  };

  /* Filtered Logs */
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logPlatformFilter !== "all" && log.platform.toLowerCase() !== logPlatformFilter.toLowerCase()) {
        return false;
      }
      if (logStatusFilter !== "all" && log.status !== logStatusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          log.post_content.toLowerCase().includes(q) ||
          (log.campaign && log.campaign.toLowerCase().includes(q)) ||
          String(log.response_code).includes(q)
        );
      }
      return true;
    });
  }, [logs, logPlatformFilter, logStatusFilter, searchTerm]);

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
              <span className="text-indigo-400 font-bold">Publishing Engine</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Publishing Queue & Audit Logs
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleQueueWorker}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                queuePaused
                  ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80"
                  : "bg-amber-950/80 border-amber-500/40 text-amber-300 hover:bg-amber-900/80"
              }`}
            >
              <span>{queuePaused ? "▶ Resume Queue Worker" : "⏸ Pause Queue Worker"}</span>
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

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "queue"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            Live Publishing Queue ({queue.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "logs"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            Publishing Audit Logs ({logs.length})
          </button>
        </div>

        {/* =========================================================
            TAB 1: LIVE QUEUE
        ========================================================= */}
        {activeTab === "queue" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Scheduled Dispatch Queue</h2>
                <p className="text-xs text-slate-400">Items ordered by execution priority and scheduled time</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Worker Status: {queuePaused ? "Paused" : "Active Polling"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 text-center">Pos</th>
                    <th className="py-3.5 px-4">Post & Campaign</th>
                    <th className="py-3.5 px-4">Platform</th>
                    <th className="py-3.5 px-4">Scheduled For</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Retries</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {queue.map((item) => {
                    const statusClass =
                      item.status === "published"
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/70"
                        : item.status === "processing"
                        ? "bg-blue-950/80 text-blue-300 border-blue-800/70"
                        : item.status === "retry"
                        ? "bg-amber-950/80 text-amber-300 border-amber-800/70"
                        : item.status === "cancelled"
                        ? "bg-slate-800 text-slate-400 border-slate-700"
                        : "bg-indigo-950/80 text-indigo-300 border-indigo-800/70";

                    return (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition">
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          #{item.position}
                        </td>
                        <td className="py-4 px-4 max-w-sm">
                          <p className="font-semibold text-white truncate">{item.post_content}</p>
                          <span className="text-[10px] text-indigo-400 block mt-0.5">
                            {item.campaign || "General"} • Format: {item.content_type}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-white uppercase">{item.platform}</td>
                        <td className="py-4 px-4 text-slate-300 whitespace-nowrap">{item.scheduled_time}</td>
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusClass}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-300">{item.retry_count}</td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRetryItem(item.id)}
                              className="px-2 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 text-[11px] font-bold"
                            >
                              Retry
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePauseResumeItem(item.id)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold"
                            >
                              {item.status === "cancelled" ? "Resume" : "Pause"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelItem(item.id)}
                              className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-[11px] font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: PUBLISHING LOGS
        ========================================================= */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            {/* LOG FILTERS BAR */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter logs by message, campaign or HTTP code..."
                  className="w-full text-xs font-medium pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <select
                  value={logPlatformFilter}
                  onChange={(e) => setLogPlatformFilter(e.target.value)}
                  className="text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none cursor-pointer"
                >
                  <option value="all">All Platforms</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">X (Twitter)</option>
                  <option value="pinterest">Pinterest</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>

                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="text-xs font-semibold p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success (2xx)</option>
                  <option value="failed">Failed / Quota (4xx)</option>
                </select>
              </div>
            </div>

            {/* LOGS TABLE */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Post Excerpt</th>
                      <th className="py-3.5 px-4">Platform</th>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">HTTP Code</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-850/50 transition">
                        <td className="py-4 px-4 max-w-sm">
                          <p className="font-semibold text-white truncate">{log.post_content}</p>
                          <span className="text-[10px] text-indigo-400 block mt-0.5">{log.campaign}</span>
                        </td>
                        <td className="py-4 px-4 font-bold text-white uppercase">{log.platform}</td>
                        <td className="py-4 px-4 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                              log.status === "success"
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/70"
                                : "bg-rose-950/80 text-rose-300 border-rose-800/70"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-200">
                          {log.response_code}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-xs text-slate-200 font-semibold"
                          >
                            View Payload
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* LOG INSPECTION MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Publishing Log Payload #{selectedLog.id}</h3>
                <p className="text-xs text-slate-400">{selectedLog.platform.toUpperCase()} • HTTP {selectedLog.response_code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div>
                <span className="text-slate-400 block mb-1">Post Content</span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed">
                  {selectedLog.post_content}
                </p>
              </div>

              {selectedLog.error_details && (
                <div>
                  <span className="text-rose-400 block mb-1 font-semibold">Error Message / Reason</span>
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 font-mono text-[11px]">
                    {selectedLog.error_details}
                  </div>
                </div>
              )}

              {selectedLog.response_payload && (
                <div>
                  <span className="text-slate-400 block mb-1">API Response Payload</span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {selectedLog.response_payload}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
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
