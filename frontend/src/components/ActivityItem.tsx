import React, { ReactNode } from "react";

interface ActivityItemProps {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  time: string;
  onClick?: () => void;
}

export default function ActivityItem({
  icon,
  iconBg,
  title,
  time,
  onClick,
}: ActivityItemProps) {
  return (
    <div
      onClick={onClick}
      className={`py-2.5 flex items-center justify-between gap-3 text-xs ${
        onClick ? "cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <div className="shrink-0">
            {icon}
          </div>
        )}
        <p className="font-semibold text-slate-800 truncate">{title}</p>
      </div>
      <span className="text-[11px] text-slate-400 shrink-0 font-medium">{time}</span>
    </div>
  );
}