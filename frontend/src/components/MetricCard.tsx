import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  iconBg?: string;
  badge?: string;
  badgeColor?: "blue" | "amber" | "emerald" | "rose" | "purple" | "slate";
  trend?: {
    value: number | string;
    label: string;
    positive?: boolean;
  };
  onClick?: () => void;
}

const badgeStyles = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function MetricCard({
  title,
  value,
  subtext,
  icon,
  iconBg = "bg-slate-50 border-slate-200",
  badge,
  badgeColor = "slate",
  trend,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} border flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyles[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-600">{title}</p>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display leading-tight">
          {value}
        </h3>
        {subtext && <p className="text-[11px] text-slate-400 font-medium">{subtext}</p>}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100/80 text-[11px] font-semibold">
          <span className={`inline-flex items-center gap-0.5 ${trend.positive !== false ? "text-emerald-600" : "text-rose-600"}`}>
            {trend.positive !== false ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{typeof trend.value === "number" ? `${trend.value}%` : trend.value}</span>
          </span>
          <span className="text-slate-400 font-normal truncate">{trend.label}</span>
        </div>
      )}
    </div>
  );
}