import React from "react";

interface UserAvatarProps {
  name?: string;
  email?: string;
  role?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.substring(0, 2).toUpperCase();
  }
  return "SP";
}

export function getRoleColor(role?: string): { bg: string; text: string; border: string } {
  switch (role?.toLowerCase()) {
    case "administrator":
      return { bg: "bg-purple-600", text: "text-white", border: "border-purple-300" };
    case "business_user":
      return { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-300" };
    case "marketing_team":
      return { bg: "bg-blue-600", text: "text-white", border: "border-blue-300" };
    case "content_creator":
      return { bg: "bg-pink-600", text: "text-white", border: "border-pink-300" };
    default:
      return { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-300" };
  }
}

export default function UserAvatar({
  name,
  email,
  role,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initials = getInitials(name, email);
  const colors = getRoleColor(role);

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-base",
  }[size];

  return (
    <div
      className={`${sizeClasses} ${colors.bg} ${colors.text} rounded-2xl flex items-center justify-center font-bold font-mono tracking-wider shadow-sm select-none shrink-0 ${className}`}
      title={name || email || "User"}
    >
      {initials}
    </div>
  );
}
