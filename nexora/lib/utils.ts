export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num.toString();
}

export function formatDate(dateString?: string | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatTime(dateString?: string | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getPlatformBadgeColor(platform: string): { bg: string; text: string; border: string } {
  switch (platform.toLowerCase()) {
    case "instagram":
      return { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-200" };
    case "facebook":
      return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" };
    case "linkedin":
      return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" };
    case "twitter":
    case "x":
      return { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300" };
    case "youtube":
      return { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" };
    case "pinterest":
      return { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" };
    default:
      return { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" };
  }
}

export function getStatusBadgeColor(status: string): { bg: string; text: string; dot: string } {
  switch (status.toLowerCase()) {
    case "published":
      return { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" };
    case "scheduled":
      return { bg: "bg-indigo-50 text-indigo-700 border border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" };
    case "draft":
      return { bg: "bg-slate-100 text-slate-700 border border-slate-200", text: "text-slate-700", dot: "bg-slate-400" };
    case "failed":
      return { bg: "bg-rose-50 text-rose-700 border border-rose-200", text: "text-rose-700", dot: "bg-rose-500" };
    case "pending approval":
      return { bg: "bg-amber-50 text-amber-700 border border-amber-200", text: "text-amber-700", dot: "bg-amber-500" };
    default:
      return { bg: "bg-slate-50 text-slate-600 border border-slate-200", text: "text-slate-600", dot: "bg-slate-400" };
  }
}
