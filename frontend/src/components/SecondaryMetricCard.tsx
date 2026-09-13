import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SecondaryMetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  trend?: {
    value: number | string;
    label?: string;
    positive?: boolean;
  };
  onClick?: () => void;
}

export default function SecondaryMetricCard({
  title,
  value,
  icon,
  iconBg = "bg-blue-50/70 border-blue-100",
  trend,
  onClick,
}: SecondaryMetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl bg-white border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm hover:border-slate-300 transition-all duration-200 flex flex-col justify-between ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-medium">
        <div className={`w-7 h-7 rounded-lg ${iconBg} border flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <span className="truncate text-slate-600">{title}</span>
      </div>

      <div className="space-y-1">
        <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display leading-tight">
          {value}
        </h4>

        {trend && (
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <span
              className={`inline-flex items-center gap-0.5 ${
                trend.positive !== false ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {trend.positive !== false ? "↑" : "↓"}{" "}
              {typeof trend.value === "number" ? `${trend.value}%` : trend.value}
            </span>
            {trend.label && <span className="text-slate-400 font-normal">{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}