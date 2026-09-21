"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavProps = {
  rightSlot?: React.ReactNode;
};

const navItems = [
  { name: "Overview", href: "/dashboard", icon: "⌂" },
  { name: "Create Post", href: "/create-post", icon: "✦" },
  { name: "Calendar", href: "/calender", icon: "▣" },
  { name: "Content Lab", href: "/content-lab", icon: "◒" },
  { name: "Audience", href: "/audience", icon: "◎" },
  { name: "Settings", href: "/settings", icon: "⚙" },
];

export default function Nav({ rightSlot }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="sp-nav">
      {/* BRAND + RIGHT ACTION */}
      <div className="sp-nav-top">
        <Link href="/dashboard" className="sp-brand">
          <span className="sp-brand-mark">S</span>

          <div>
            <span className="sp-brand-name">SocialPilot</span>
            <span className="sp-brand-subtitle">
              Social Intelligence
            </span>
          </div>
        </Link>

        {rightSlot && (
          <div className="sp-nav-actions">
            {rightSlot}
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="sp-nav-links">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sp-nav-link ${
                active ? "sp-nav-link-active" : ""
              }`}
            >
              <span className="sp-nav-icon">
                {item.icon}
              </span>

              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}