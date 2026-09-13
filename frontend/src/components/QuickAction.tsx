import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface QuickActionProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconBg?: string;
  onClick: () => void;
  href?: string;
}

export default function QuickAction({
  title,
  subtitle,
  icon,
  iconBg = "bg-blue-50 text-blue-600 border-blue-100",
  onClick,
  href,
}: QuickActionProps) {
  const handleClick = () => {
    if (href) {
      window.location.href = href;
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all duration-200 text-left group cursor-pointer flex items-center justify-between gap-3 shadow-xs"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-10 h-10 rounded-xl ${iconBg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
            {title}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 truncate leading-tight">
            {subtitle}
          </p>
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}