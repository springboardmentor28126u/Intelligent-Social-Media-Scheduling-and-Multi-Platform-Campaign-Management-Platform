"use client";

import Link from "next/link";

type NavProps = {
  rightSlot?: React.ReactNode;
};

export default function Nav({ rightSlot }: NavProps) {
  return (
    <nav className="mx-auto mb-10 flex max-w-4xl items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #00F0FF, #B026FF)", color: "#05060A" }}
        >
          S
        </span>
        <span style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600, color: "#E8E9F5" }} className="text-lg">
          SocialPilot
        </span>
      </Link>
      {rightSlot}
    </nav>
  );
}