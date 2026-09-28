import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";

interface PreviewProps {
  content: string;
  mediaUrl?: string | null;
  authorName?: string;
  accountHandle?: string;
}

export default function InstagramPreview({
  content,
  mediaUrl,
  authorName = "IntelliPost",
  accountHandle = "intellipost_app",
}: PreviewProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden text-slate-900 font-sans text-xs">
      
      {/* IG Top bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
            <div className="h-full w-full rounded-full bg-white p-[1px]">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                alt="Avatar"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-tight">{accountHandle}</p>
            <p className="text-[10px] text-slate-400">Sponsored / Scheduled</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-slate-400" />
      </div>

      {/* Media or Placeholder */}
      <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center overflow-hidden">
        {mediaUrl ? (
          <img src={mediaUrl} alt="Post preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-slate-200/80 flex items-center justify-center mb-2">
              📸
            </div>
            <span className="text-xs font-medium">Add media to preview feed visual</span>
          </div>
        )}
      </div>

      {/* IG Action Icons */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5 text-slate-800">
            <Heart className="h-5 w-5 hover:text-rose-500 cursor-pointer transition-colors" />
            <MessageCircle className="h-5 w-5 hover:text-indigo-500 cursor-pointer transition-colors" />
            <Send className="h-5 w-5 hover:text-sky-500 cursor-pointer transition-colors" />
          </div>
          <Bookmark className="h-5 w-5 text-slate-800 hover:text-amber-500 cursor-pointer" />
        </div>

        {/* Likes Count */}
        <p className="mt-2.5 font-bold text-slate-900">1,248 likes</p>

        {/* Caption */}
        <div className="mt-1 leading-relaxed text-slate-800 whitespace-pre-line">
          <span className="font-bold mr-1.5">{accountHandle}</span>
          {content || "Write your caption to preview how it will appear in Instagram feed..."}
        </div>

        <p className="mt-2 text-[10px] text-slate-400 uppercase">2 minutes ago</p>
      </div>

    </div>
  );
}
