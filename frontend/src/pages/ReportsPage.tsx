import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FileText,
  Download,
  Plus,
  FileSpreadsheet,
  X,
  FileCheck,
} from "lucide-react";

export default function ReportsPage() {
  const { showToast } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("engagement");
  const [format, setFormat] = useState("pdf");
  const [platform, setPlatform] = useState("all");

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.reports.list();
      setReports(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.reports.generate({
        title: title || `Social Performance ${format.toUpperCase()} Report`,
        report_type: reportType,
        format,
        platform,
      });
      showToast("Report Generated! 📄", `Your ${format.toUpperCase()} report is ready for download.`, "success");
      setIsModalOpen(false);
      setTitle("");
      loadReports();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to generate report", "error");
    }
  };

  const handleDownload = (id: number, fmt: string, reportTitle: string) => {
    const url = fmt === "pdf" ? api.reports.getPdfUrl(id) : api.reports.getExcelUrl(id);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportTitle.replace(" ", "_")}.${fmt === "pdf" ? "pdf" : "xlsx"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloading", `Downloading ${reportTitle}...`, "info");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Executive Reports & Exports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and export styled PDF client summaries and formatted Excel analytics workbooks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Generate Report</span>
        </button>
      </div>

      {/* Quick Action Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Instant PDF Executive Summary</h3>
              <p className="text-xs text-slate-500 mt-0.5">Includes KPI cards, platform comparison & top posts</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormat("pdf");
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            Create PDF
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Full Excel Multi-Sheet Workbook</h3>
              <p className="text-xs text-slate-500 mt-0.5">Posts log, campaign metrics & audience demographics</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormat("excel");
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            Create Excel
          </button>
        </div>
      </div>

      {/* Reports History Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Generated Reports Archive</h3>
            <p className="text-xs text-slate-500 mt-0.5">Past generated PDF & Excel documents ready for download</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
            {reports.length} Reports
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center p-8 space-y-3">
            <FileCheck className="mx-auto text-slate-300" size={36} />
            <h3 className="text-base font-bold text-slate-800">No reports generated yet</h3>
            <p className="text-sm text-slate-500">Click "Generate Report" above to create your first executive export.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      report.format === "pdf"
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}
                  >
                    {report.format === "pdf" ? <FileText size={22} /> : <FileSpreadsheet size={22} />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{report.title}</p>
                    <div className="flex items-center gap-2.5 text-xs text-slate-500">
                      <span className="capitalize">{report.report_type.replace("_", " ")}</span>
                      <span>•</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="uppercase font-mono text-xs font-bold text-slate-700">{report.format}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleDownload(report.id, report.format, report.title)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Download {report.format.toUpperCase()}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Generate Executive Report
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleGenerateReport}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Monthly Executive Performance Summary"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  >
                    <option value="engagement">Engagement Overview</option>
                    <option value="campaign">Campaign & ROI Breakdown</option>
                    <option value="audience">Audience Demographics</option>
                    <option value="platform_comparison">Platform Comparison</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Output Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-semibold"
                  >
                    <option value="pdf">PDF Document (Formatted)</option>
                    <option value="excel">Excel Workbook (.xlsx)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Channel Scope
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="all">All Connected Channels</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">X / Twitter</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                >
                  Generate & Download
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
