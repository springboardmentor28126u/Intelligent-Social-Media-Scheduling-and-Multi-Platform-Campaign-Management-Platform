import React from "react";
import { MoreVertical } from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";
import { getMediaUrl } from "../services/api";

interface UpcomingPostProps {
  id: number | string;
  title?: string;
  content?: string;
  platform: string;
  scheduled_at?: string | null;
  media_urls?: string[];
  thumbnail_url?: string | null;
  onMenuClick?: (postId: number | string) => void;
  onClick?: () => void;
}

const getPlatformDetails = (plat: string) => {
  switch (plat?.toLowerCase()) {
    case "instagram":
      return {
        name: "Instagram",
        icon: <FaInstagram className="text-pink-600" size={13} />,
      };
    case "facebook":
      return {
        name: "Facebook",
        icon: <FaFacebook className="text-blue-600" size={13} />,
      };
    case "linkedin":
      return {
        name: "LinkedIn",
        icon: <FaLinkedin className="text-sky-600" size={13} />,
      };
    case "twitter":
    case "x":
      return {
        name: "X (Twitter)",
        icon: <FaTwitter className="text-slate-900" size={13} />,
      };
    case "youtube":
      return {
        name: "YouTube",
        icon: <FaYoutube className="text-red-600" size={13} />,
      };
    case "pinterest":
      return {
        name: "Pinterest",
        icon: <FaPinterest className="text-rose-600" size={13} />,
      };
    default:
      return {
        name: plat || "Social",
        icon: <FaInstagram className="text-blue-600" size={13} />,
      };
  }
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "Today, 10:00 AM";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      new Date(now.getTime() + 86400000).toDateString() === date.toDateString();

    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      `, ${timeStr}`
    );
  } catch {
    return String(dateStr);
  }
};

// Fallback decorative stock thumbnail images
const getFallbackThumbnail = (platform: string, index: number) => {
  const images = [
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=150&auto=format&fit=crop&q=80",
  ];
  return images[Math.abs(Number(index)) % images.length];
};

export default function UpcomingPost({
  id,
  title,
  content,
  platform,
  scheduled_at,
  media_urls,
  thumbnail_url,
  onMenuClick,
  onClick,
}: UpcomingPostProps) {
  const platformInfo = getPlatformDetails(platform);
  const displayTitle = title || content || "New post update";

  const thumbnail =
    (thumbnail_url && getMediaUrl(thumbnail_url)) ||
    (media_urls && media_urls.length > 0 && getMediaUrl(media_urls[0])) ||
    getFallbackThumbnail(platform, Number(id) || 0);

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all duration-150 flex items-start gap-3 group cursor-pointer"
    >
      {/* Post Thumbnail Image */}
      <div className="w-12 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 shadow-xs relative">
        <img
          src={thumbnail}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      </div>

      {/* Post Content & Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {platformInfo.icon}
          <span className="text-xs font-bold text-slate-800">
            {platformInfo.name}
          </span>
        </div>

        <p className="text-[12.5px] font-medium text-slate-600 line-clamp-2 leading-snug">
          {displayTitle}
        </p>

        <p className="text-[11px] text-slate-400 font-medium mt-1">
          {formatDate(scheduled_at)}
        </p>
      </div>

      {/* Options Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenuClick?.(id);
        }}
        className="p-1 rounded-lg text-slate-300 group-hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0 mt-0.5"
        aria-label="Post options"
      >
        <MoreVertical size={16} />
      </button>
    </div>
  );
}