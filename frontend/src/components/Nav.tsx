"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavProps = {
  rightSlot?: React.ReactNode;
};

const navItems = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    name: "Create Post",
    href: "/create-post",
    icon: "✦",
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: "▣",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: "◒",
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: "◎",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "⚙",
  },
];

export default function Nav({ rightSlot }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="mb-10">

      {/* TOP BAR */}
      <div className="flex items-center justify-between">

        {/* BRAND */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
            style={{
              background:
                "linear-gradient(135deg,#00C6FF,#7C4DFF)",
              color: "#ffffff",
            }}
          >
            S
          </span>

          <div>
            <span
              className="block text-lg font-semibold"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
                color: "var(--sp-text)",
              }}
            >
              SocialPilot
            </span>

            <span
              className="hidden text-[9px] uppercase tracking-[0.2em] sm:block"
              style={{
                color: "var(--sp-muted)",
              }}
            >
              Social Intelligence
            </span>
          </div>
        </Link>

        {/* RIGHT */}
        {rightSlot}
      </div>

      {/* NAVIGATION */}
      <div
        className="mt-6 flex gap-1 overflow-x-auto rounded-2xl p-1.5"
        style={{
          background: "var(--sp-card)",
          border: "1px solid var(--sp-border)",
        }}
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all"
              style={{
                background: active
                  ? "var(--sp-active)"
                  : "transparent",

                color: active
                  ? "var(--sp-cyan)"
                  : "var(--sp-text-secondary)",

                border: active
                  ? "1px solid var(--sp-active-border)"
                  : "1px solid transparent",
              }}
            >
              <span className="text-sm">
                {item.icon}
              </span>

              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}