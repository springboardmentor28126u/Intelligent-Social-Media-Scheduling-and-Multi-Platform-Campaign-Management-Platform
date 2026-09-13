import React from "react";
import { Heart, MessageCircle, Repeat2, ChevronDown } from "lucide-react";
import { FaInstagram, FaFacebook, FaLinkedin, FaTwitter, FaYoutube, FaPinterest } from "react-icons/fa";
import { getMediaUrl } from "../services/api";

interface TopPerformingPostProps {
  id?: number | string;
  title?: string;
  content?: string;
  platform?: string;
  media_urls?: string[];
  thumbnail_url?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  onClick?: () => void;
  onViewAll?: () => void;
}

const getPlatformDetails = (plat?: string) => {
  switch (plat?.toLowerCase()) {
    case "instagram":
      return { name: "Instagram", icon: <FaInstagram className="text-pink-600" size={13} /> };
    case "facebook":
      return { name: "Facebook", icon: <FaFacebook className="text-blue-600" size={13} /> };
    case "linkedin":
      return { name: "LinkedIn", icon: <FaLinkedin className="text-sky-600" size={13} /> };
    case "twitter":
    case "x":
      return { name: "X (Twitter)", icon: <FaTwitter className="text-slate-900" size={13} /> };
    case "youtube":
      return { name: "YouTube", icon: <FaYoutube className="text-red-600" size={13} /> };
    case "pinterest":
      return { name: "Pinterest", icon: <FaPinterest className="text-rose-600" size={13} /> };
    default:
      return { name: "Instagram", icon: <FaInstagram className="text-pink-600" size={13} /> };
  }
};

const formatNumber = (num?: number) => {
  if (!num && num !== 0) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export default function TopPerformingPost({
  id,
  title = "5 Tips to Boost Your Social Media Engagement",
  content,
  platform = "Instagram",
  media_urls,
  thumbnail_url,
  likes = 1200,
  comments = 48,
  shares = 32,
  onClick,
  onViewAll,
}: TopPerformingPostProps) {
  const plat = getPlatformDetails(platform);
  const displayTitle = title || content || "5 Tips to Boost Your Social Media Engagement";

  const thumbnail =
    (thumbnail_url && getMediaUrl(thumbnail_url)) ||
    (media_urls && media_urls.length > 0 && getMediaUrl(media_urls[0])) ||
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=80";

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
      {/* Header with View All */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
          <span>Top Performing Post</span>
        </h4>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
          >
            View All
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      <div
        onClick={onClick}
        className={`flex items-start gap-4 ${onClick ? "cursor-pointer group" : ""}`}
      >
        {/* Left Thumbnail */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/70 shrink-0 shadow-xs">
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        </div>

        {/* Right Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-20 sm:h-24 py-0.5">
          <div>
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                {displayTitle}
              </p>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </div>

            <div className="flex items-center gap-1.5 mt-1.5">
              {plat.icon}
              <span className="text-xs font-semibold text-slate-600">{plat.name}</span>
            </div>
          </div>

          {/* Social Stats Row */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Heart size={14} className="text-slate-400" />
              <span>{formatNumber(likes)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} className="text-slate-400" />
              <span>{formatNumber(comments)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Repeat2 size={14} className="text-slate-400" />
              <span>{formatNumber(shares)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}