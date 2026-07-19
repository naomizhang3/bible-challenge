"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

// Persistent challenge tabs. The active pill is derived from the current
// child segment, so switching tabs only swaps the content below.
export default function Tabs({ id }: { id: string }) {
  const seg = useSelectedLayoutSegment();
  const tabs: { seg: string | null; label: string; href: string }[] = [
    { seg: null, label: "Today", href: `/challenges/${id}` },
    {
      seg: "leaderboard",
      label: "Leaderboard",
      href: `/challenges/${id}/leaderboard`,
    },
    { seg: "teams", label: "Teams", href: `/challenges/${id}/teams` },
    { seg: "calendar", label: "Calendar", href: `/challenges/${id}/calendar` },
  ];

  return (
    <nav className="flex flex-wrap gap-1">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={
            "rounded-full px-3 py-1.5 text-sm font-medium " +
            (t.seg === seg
              ? "bg-brand text-white"
              : "text-muted hover:bg-surface-muted")
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
