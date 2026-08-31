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
                "linear-gradient(135deg,#00F0FF,#B026FF)",
              color: "#05060A",
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
                color: "#E8E9F5",
              }}
            >
              SocialPilot
            </span>

            <span
              className="hidden text-[9px] uppercase tracking-[0.2em] sm:block"
              style={{
                color: "#666878",
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
          background:
            "rgba(255,255,255,0.025)",
          border:
            "1px solid rgba(255,255,255,0.07)",
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
                  ? "rgba(0,240,255,0.1)"
                  : "transparent",

                color: active
                  ? "#00F0FF"
                  : "#77798A",

                border: active
                  ? "1px solid rgba(0,240,255,0.15)"
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