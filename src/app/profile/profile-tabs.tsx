"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/profile", label: "About you" },
  { href: "/profile/preferences", label: "Preferences" },
] as const;

export function ProfileTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Profile sections"
      className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active
                ? "border-neutral-900 font-medium text-neutral-900 dark:border-white dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
