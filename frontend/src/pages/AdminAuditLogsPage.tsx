import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  ClipboardList,
  Search,
  Shield,
  Filter,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.admin.auditLogs();
      setLogs(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesModule = selectedModule === "all" || log.module === selectedModule;
    if (!matchesModule) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.description?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.user_email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            SOC2 Audit & Governance Stream
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable system logs documenting authentication, role changes, publications, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
          <Shield size={16} />
          <span>Immutable Audit Trail</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-2">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-white border border-slate-200/80 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-800 outline-none focus:border-blue-500 transition cursor-pointer shadow-xs font-semibold"
          >
            <option value="all">All Modules</option>
            <option value="auth">Auth & Security</option>
            <option value="users">User Governance</option>
            <option value="posts">Publishing & Content</option>
            <option value="campaigns">Campaigns</option>
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, user emails..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-xs"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recorded Audit Events</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological system events sorted by timestamp</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
            {filteredLogs.length} Events
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
            Loading audit records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center p-8 space-y-3">
            <ClipboardList className="mx-auto text-slate-300" size={36} />
            <h3 className="text-base font-bold text-slate-800">No matching events</h3>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 mt-0.5">
                    <Shield size={18} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 leading-snug">{log.description}</p>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {log.action}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{log.user_email || "System"}</span>
                      <span>•</span>
                      <span>Module: {log.module}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">IP: {log.ip_address || "127.0.0.1"}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-xs font-mono text-slate-500 self-end md:self-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  {new Date(log.created_at).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
