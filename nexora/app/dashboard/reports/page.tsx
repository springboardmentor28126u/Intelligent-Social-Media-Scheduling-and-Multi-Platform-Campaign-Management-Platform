"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Plus,
  FileSpreadsheet,
  Printer,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Trash2,
  Eye,
  X
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface ReportItem {
  id: number;
  title: string;
  type: string;
  dateRange: string;
  platforms: string;
  format: "PDF" | "Excel" | "CSV";
  createdAt: string;
  summary: {
    postsAnalyzed: number;
    totalReach: number;
    totalEngagement: number;
    avgRate: string;
    topPlatform: string;
  };
}

export default function ReportsPage() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportItem | null>(null);

  const [reports, setReports] = useState<ReportItem[]>([
    {
      id: 1,
      title: "Monthly Audience Growth & Engagement Report",
      type: "Audience Growth",
      dateRange: "Aug 1 - Aug 31, 2026",
      platforms: "Instagram, Facebook, LinkedIn, X, YouTube",
      format: "PDF",
      createdAt: "Sep 1, 2026",
      summary: {
        postsAnalyzed: 36,
        totalReach: 148500,
        totalEngagement: 38420,
        avgRate: "4.85%",
        topPlatform: "Instagram",
      }
    },
    {
      id: 2,
      title: "Product Launch 2.0 Campaign Executive Summary",
      type: "Campaign Performance",
      dateRange: "Aug 20 - Sep 1, 2026",
      platforms: "Instagram, Facebook, LinkedIn",
      format: "Excel",
      createdAt: "Aug 31, 2026",
      summary: {
        postsAnalyzed: 24,
        totalReach: 125000,
        totalEngagement: 32000,
        avgRate: "5.2%",
        topPlatform: "LinkedIn",
      }
    },
    {
      id: 3,
      title: "Cross-Platform Publishing Activity Benchmark",
      type: "Publishing Activity",
      dateRange: "Last 90 Days",
      platforms: "All Connected Networks",
      format: "CSV",
      createdAt: "Aug 25, 2026",
      summary: {
        postsAnalyzed: 72,
        totalReach: 320000,
        totalEngagement: 89400,
        avgRate: "4.6%",
        topPlatform: "YouTube",
      }
    }
  ]);

  // Modal form states
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState("Audience Growth");
  const [reportRange, setReportRange] = useState("Last 30 Days");
  const [reportFormat, setReportFormat] = useState<"PDF" | "Excel" | "CSV">("PDF");

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle) return;

    const newReport: ReportItem = {
      id: Date.now(),
      title: reportTitle,
      type: reportType,
      dateRange: reportRange,
      platforms: "All 6 Platforms",
      format: reportFormat,
      createdAt: "Today",
      summary: {
        postsAnalyzed: 28,
        totalReach: 165000,
        totalEngagement: 42100,
        avgRate: "5.1%",
        topPlatform: "Instagram",
      }
    };

    setReports([newReport, ...reports]);
    setShowGenerateModal(false);
    setReportTitle("");
  };

  const handleDownloadCSV = (r: ReportItem) => {
    const csvRows = [
      ["Metric", "Value", "Notes"],
      ["Report Title", `"${r.title}"`, ""],
      ["Report Type", r.type, ""],
      ["Date Range", r.dateRange, ""],
      ["Platforms Analyzed", `"${r.platforms}"`, ""],
      ["Total Posts Analyzed", r.summary.postsAnalyzed.toString(), "Across all channels"],
      ["Total Organic Reach", r.summary.totalReach.toString(), "Unique impressions"],
      ["Total Engagements", r.summary.totalEngagement.toString(), "Likes, comments, shares"],
      ["Average Engagement Rate", r.summary.avgRate, "Industry benchmark 2.1%"],
      ["Top Performing Channel", r.summary.topPlatform, "Highest conversion"],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${r.title.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = (r: ReportItem) => {
    setPreviewReport(r);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-[#635BFF]" />
            Reports & Export Center
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Generate presentation-ready performance decks and export raw analytics in PDF & Excel formats.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Generate New Report</span>
        </button>
      </div>

      {/* Preset Report Types Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Engagement Report", desc: "Likes, comments, shares, and virality ratios.", icon: "⚡" },
          { title: "Campaign ROI Report", desc: "Goal progression, budget spend, and reach targets.", icon: "🎯" },
          { title: "Audience Growth Report", desc: "Follower acquisition trajectory across channels.", icon: "📈" },
          { title: "Platform Comparison", desc: "Channel-by-channel conversion benchmarks.", icon: "📊" },
        ].map((preset) => (
          <div
            key={preset.title}
            onClick={() => {
              setReportTitle(preset.title);
              setReportType(preset.title);
              setShowGenerateModal(true);
            }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs card-hover-effect cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-2xl">{preset.icon}</span>
              <h3 className="text-sm font-bold text-slate-900 mt-2">{preset.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{preset.desc}</p>
            </div>
            <span className="mt-4 text-[11px] font-bold text-[#635BFF]">
              Generate Now →
            </span>
          </div>
        ))}
      </div>

      {/* Reports Table List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">Generated Reports Archive</h3>
          <p className="text-xs text-slate-500">Download previously generated stakeholder summaries</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3">Report Document</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Date Range</th>
                <th className="pb-3">Format</th>
                <th className="pb-3 text-right">Reach</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#635BFF] shrink-0 font-bold">
                        {r.format === "PDF" ? "PDF" : "XLS"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{r.title}</p>
                        <p className="text-[10px] text-slate-400">{r.platforms}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 pr-4">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {r.type}
                    </span>
                  </td>

                  <td className="py-3.5 pr-4 text-slate-500 whitespace-nowrap">{r.dateRange}</td>

                  <td className="py-3.5 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        r.format === "PDF"
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {r.format}
                    </span>
                  </td>

                  <td className="py-3.5 text-right font-bold text-slate-900">{formatNumber(r.summary.totalReach)}</td>

                  <td className="py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setPreviewReport(r)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Preview Summary"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadCSV(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                        title="Download CSV"
                      >
                        <Download className="h-3 w-3" /> CSV
                      </button>
                      <button
                        onClick={() => handlePrintPDF(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#635BFF] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#5046E5]"
                        title="Print / Save PDF"
                      >
                        <Printer className="h-3 w-3" /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#635BFF]" />
                Generate Analytics Report
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Report Title</label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Q3 Executive Growth Summary"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Report Category</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white"
                >
                  <option value="Audience Growth">Audience Growth Report</option>
                  <option value="Campaign Performance">Campaign Performance Report</option>
                  <option value="Engagement Benchmark">Engagement Benchmark Report</option>
                  <option value="Platform Comparison">Platform Comparison Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Date Range</label>
                <select
                  value={reportRange}
                  onChange={(e) => setReportRange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white"
                >
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Last 90 Days">Last 90 Days</option>
                  <option value="Year to Date">Year to Date (2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Export Format</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(["PDF", "Excel", "CSV"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setReportFormat(fmt)}
                      className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                        reportFormat === fmt
                          ? "bg-[#635BFF] text-white border-[#635BFF]"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#635BFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5046E5]"
                >
                  Generate Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#635BFF]">
                  IntelliPost Performance Report
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{previewReport.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{previewReport.dateRange} • {previewReport.platforms}</p>
              </div>
              <button
                onClick={() => setPreviewReport(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Posts</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{previewReport.summary.postsAnalyzed}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Reach</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{formatNumber(previewReport.summary.totalReach)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Engagements</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{formatNumber(previewReport.summary.totalEngagement)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Rate</span>
                <p className="text-lg font-extrabold text-emerald-600 mt-0.5">{previewReport.summary.avgRate}</p>
              </div>
            </div>

            {/* Qualitative summary */}
            <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 text-xs text-slate-700 space-y-2 leading-relaxed">
              <p>
                <strong>Executive Summary:</strong> During this reporting window, audience impressions expanded by <strong>+18.4%</strong> with peak activity occurring on Instagram and LinkedIn.
              </p>
              <p>
                Top performing platform: <strong>{previewReport.summary.topPlatform}</strong>. Cross-platform AI content adaptations drove a <strong>24.1%</strong> lift in comment discussion depth.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleDownloadCSV(previewReport)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> Export Raw CSV
              </button>

              <button
                onClick={() => handlePrintPDF(previewReport)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#635BFF] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#5046E5]"
              >
                <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
