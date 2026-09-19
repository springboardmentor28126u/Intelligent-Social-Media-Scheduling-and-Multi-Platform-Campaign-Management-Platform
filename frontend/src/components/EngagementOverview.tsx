import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChevronDown, BarChart3 } from "lucide-react";

interface EngagementOverviewProps {
  analytics?: any;
  initialRange?: "7d" | "30d" | "90d";
  onRangeChange?: (range: "7d" | "30d" | "90d") => void;
}

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#EC4899" },
  linkedin: { label: "LinkedIn", color: "#2563EB" },
  facebook: { label: "Facebook", color: "#0284C7" },
  x: { label: "X (Twitter)", color: "#1E293B" },
  twitter: { label: "X (Twitter)", color: "#1E293B" },
  pinterest: { label: "Pinterest", color: "#F43F5E" },
  youtube: { label: "YouTube", color: "#DC2626" },
};

export default function EngagementOverview({ analytics, initialRange = "7d", onRangeChange }: EngagementOverviewProps) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">(initialRange);
  const [showDropdown, setShowDropdown] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (analytics?.timeline && Array.isArray(analytics.timeline)) {
      const formatted = analytics.timeline.map((item: any) => {
        return {
          date: item.date || "",
          instagram: item.instagram_engagement ?? 0,
          linkedin: item.linkedin_engagement ?? 0,
          facebook: item.facebook_engagement ?? 0,
          x: item.x_engagement ?? item.twitter_engagement ?? 0,
          pinterest: item.pinterest_engagement ?? 0,
          youtube: item.youtube_engagement ?? 0,
          total: item.engagement ?? 0,
        };
      });
      setChartData(formatted);
    } else {
      setChartData([]);
    }
  }, [analytics, range]);

  const handleSelectRange = (newRange: "7d" | "30d" | "90d") => {
    setRange(newRange);
    setShowDropdown(false);
    if (onRangeChange) onRangeChange(newRange);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-xl min-w-44 space-y-1.5 z-30">
        <p className="text-xs font-bold text-slate-800 pb-1 border-b border-slate-100">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const config = PLATFORM_CONFIG[entry.dataKey] || { label: entry.name, color: entry.color };
            return (
              <div key={index} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600 font-medium">{config.label}</span>
                </div>
                <span className="font-bold text-slate-900 font-mono">
                  {entry.value?.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Chart Header Controls */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 font-display">
          Engagement Overview
        </h4>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
          >
            <span>{RANGE_OPTIONS.find((r) => r.value === range)?.label}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in-95 zoom-in-95 p-1">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectRange(option.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-medium transition cursor-pointer ${
                    range === option.value
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recharts Multi-line chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              tickMargin={8}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val)}
            />
            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="instagram"
              name="Instagram"
              stroke="#EC4899"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#EC4899", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="linkedin"
              name="LinkedIn"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="facebook"
              name="Facebook"
              stroke="#0284C7"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#0284C7", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="x"
              name="X (Twitter)"
              stroke="#1E293B"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#1E293B", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="pinterest"
              name="Pinterest"
              stroke="#F43F5E"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#F43F5E", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="youtube"
              name="YouTube"
              stroke="#DC2626"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#DC2626", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Legend Bar */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
          <span>Instagram</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
          <span>LinkedIn</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
          <span>Facebook</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1E293B]" />
          <span>X (Twitter)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
          <span>Pinterest</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
          <span>YouTube</span>
        </div>
      </div>
    </div>
  );
}