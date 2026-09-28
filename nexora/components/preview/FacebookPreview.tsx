import { ThumbsUp, MessageCircle, Share2, Globe, MoreHorizontal } from "lucide-react";

interface PreviewProps {
  content: string;
  mediaUrl?: string | null;
  authorName?: string;
}

export default function FacebookPreview({
  content,
  mediaUrl,
  authorName = "IntelliPost Official",
}: PreviewProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden text-slate-900 font-sans text-xs">
      
      {/* Top Header */}
      <div className="p-3.5 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
            alt="Avatar"
            className="h-9 w-9 rounded-full object-cover border border-slate-200"
          />
          <div>
            <h4 className="font-bold text-slate-900 leading-tight">{authorName}</h4>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>Just now</span> • <Globe className="h-2.5 w-2.5" />
            </p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-slate-400" />
      </div>

      {/* Caption Content */}
      <div className="px-3.5 pb-3 text-slate-800 text-xs leading-relaxed whitespace-pre-line">
        {content || "Write your Facebook post here to preview formatting and audience view..."}
      </div>

      {/* Media Attachment */}
      {mediaUrl && (
        <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-y border-slate-100">
          <img src={mediaUrl} alt="Facebook media" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-2 py-2 flex items-center justify-around text-slate-600 font-semibold text-[11px] border-t border-slate-100">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100">
          <ThumbsUp className="h-4 w-4 text-blue-600" /> Like
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100">
          <MessageCircle className="h-4 w-4" /> Comment
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

    </div>
  );
}
