import { ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal } from "lucide-react";

interface PreviewProps {
  content: string;
  mediaUrl?: string | null;
  authorName?: string;
}

export default function LinkedInPreview({
  content,
  mediaUrl,
  authorName = "Chandu",
}: PreviewProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden text-slate-900 font-sans text-xs">
      
      {/* LinkedIn Header */}
      <div className="p-3.5 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Avatar"
            className="h-9 w-9 rounded-full object-cover border border-slate-200"
          />
          <div>
            <h4 className="font-bold text-slate-900 leading-tight">{authorName}</h4>
            <p className="text-[10px] text-slate-500">Founder & CEO @ IntelliPost • 1st</p>
            <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span>Just now</span> • <Globe className="h-2.5 w-2.5" />
            </p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-slate-400" />
      </div>

      {/* Caption Content */}
      <div className="px-3.5 pb-2.5 text-slate-800 text-xs leading-relaxed whitespace-pre-line">
        {content || "Compose your professional insights to preview on LinkedIn..."}
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-y border-slate-100">
          <img src={mediaUrl} alt="LinkedIn media" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Stats bar */}
      <div className="px-3.5 py-2 flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-100">
        <span className="flex items-center gap-1">
          <span className="h-3.5 w-3.5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[8px]">👍</span>
          424 reactions
        </span>
        <span>38 comments • 12 reposts</span>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1.5 flex items-center justify-between text-slate-600 font-semibold text-[11px]">
        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </button>
        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100">
          <MessageSquare className="h-3.5 w-3.5" /> Comment
        </button>
        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100">
          <Repeat2 className="h-3.5 w-3.5" /> Repost
        </button>
        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100">
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </div>

    </div>
  );
}
