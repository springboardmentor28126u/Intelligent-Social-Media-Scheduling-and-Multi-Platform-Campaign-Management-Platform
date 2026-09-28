import { MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Share } from "lucide-react";

interface PreviewProps {
  content: string;
  mediaUrl?: string | null;
  authorName?: string;
  accountHandle?: string;
}

export default function XPreview({
  content,
  mediaUrl,
  authorName = "IntelliPost",
  accountHandle = "@IntelliPost",
}: PreviewProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-md p-4 text-slate-900 font-sans text-xs">
      
      {/* Top Author Bar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
            alt="Avatar"
            className="h-9 w-9 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900">{authorName}</span>
              <span className="text-[10px] text-sky-500">☑</span>
            </div>
            <span className="text-[10px] text-slate-400">{accountHandle} · Just now</span>
          </div>
        </div>
        <span className="text-slate-400 font-bold">𝕏</span>
      </div>

      {/* Post Text */}
      <div className="mt-3 leading-relaxed text-slate-900 whitespace-pre-line text-xs">
        {content || "Craft your concise, high-impact post to preview on X..."}
      </div>

      {/* Media Attachment */}
      {mediaUrl && (
        <div className="mt-3 relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          <img src={mediaUrl} alt="X media" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="mt-3.5 flex items-center justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1 hover:text-sky-500 cursor-pointer">
          <MessageCircle className="h-3.5 w-3.5" /> 18
        </span>
        <span className="flex items-center gap-1 hover:text-emerald-500 cursor-pointer">
          <Repeat2 className="h-3.5 w-3.5" /> 34
        </span>
        <span className="flex items-center gap-1 hover:text-rose-500 cursor-pointer">
          <Heart className="h-3.5 w-3.5" /> 182
        </span>
        <span className="flex items-center gap-1 hover:text-indigo-500 cursor-pointer">
          <BarChart2 className="h-3.5 w-3.5" /> 6.8K
        </span>
        <span className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
          <Share className="h-3.5 w-3.5" />
        </span>
      </div>

    </div>
  );
}
