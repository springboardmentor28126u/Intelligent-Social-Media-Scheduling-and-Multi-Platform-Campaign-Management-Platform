import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FileText,
  Download,
  Plus,
  FileSpreadsheet,
  X,
  FileCheck,
  Target,
  Layers,
} from "lucide-react";

export default function ReportsPage() {
  const { showToast } = useAuth();
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("engagement");
  const [format, setFormat] = useState("pdf");
  const [platform, setPlatform] = useState("all");
  const [campaignId, setCampaignId] = useState<string>("all");

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
    api.campaigns.list().then((camps) => setCampaignsList(camps || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsModalOpen(true);
      const campParam = searchParams.get("campaign_id");
      if (campParam) {
        setCampaignId(campParam);
        setReportType("campaign");
        setTitle("Campaign Performance Report");
      }
    }
  }, [searchParams]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campIdNum = campaignId !== "all" && !isNaN(Number(campaignId)) ? Number(campaignId) : undefined;
      await api.reports.generate({
        title: title || `Social Performance ${format.toUpperCase()} Report`,
        report_type: reportType,
        format,
        platform,
        campaign_id: campIdNum,
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
    link.download = `${reportTitle.replace(/\s+/g, "_")}.${fmt === "pdf" ? "pdf" : "xlsx"}`;
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
            Generate and export styled PDF client summaries and formatted Excel analytics workbooks from real database records.
          </p>
        </div>

        <button
          onClick={() => {
            setCampaignId("all");
            setIsModalOpen(true);
          }}
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
              <p className="text-xs text-slate-500 mt-0.5">Includes KPI cards, campaign actuals & top posts</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormat("pdf");
              setReportType("engagement");
              setTitle("Social Executive PDF Summary");
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shrink-0"
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
              <h3 className="text-base font-bold text-slate-900">Full Excel Data Export</h3>
              <p className="text-xs text-slate-500 mt-0.5">Spreadsheet of all campaigns, post metrics & audit logs</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormat("excel");
              setReportType("campaign");
              setTitle("Campaigns & Posts Complete Data Export");
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shrink-0"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Generated Reports Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 font-display">Export History & Downloads</h2>
          <p className="text-xs text-slate-500 mt-0.5">Access previously compiled PDF and Excel documents</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
            Loading generated reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <FileCheck className="mx-auto text-slate-300" size={32} />
            <p className="font-semibold text-slate-600">No reports generated yet</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Click the Generate Report button above to compile your first export.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-4">Report Title</th>
                  <th className="p-4">Format</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Channel / Scope</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            rep.format === "pdf"
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          }`}
                        >
                          {rep.format.toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{rep.title}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="uppercase font-bold text-xs text-slate-700">
                        {rep.format}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-slate-700 font-semibold">
                        {rep.report_type || "Executive"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-slate-600 font-medium">
                        {rep.platform || "All Channels"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {new Date(rep.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDownload(rep.id, rep.format, rep.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Compile Executive Report
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
                  placeholder="e.g., Q3 Social Performance Summary"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campaign Scope
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="all">Workspace Wide (All Campaigns & Posts)</option>
                  {campaignsList.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      🎯 Campaign: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="pdf">Styled PDF Document</option>
                    <option value="excel">Excel Workbook (.xlsx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="engagement">Engagement & Reach</option>
                    <option value="campaign">Campaign Performance</option>
                    <option value="audience">Audience Analytics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Platform Filter
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="all">All Connected Channels</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="youtube">YouTube</option>
                  <option value="pinterest">Pinterest</option>
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
                  Generate {format.toUpperCase()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
