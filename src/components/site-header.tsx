import Link from "next/link";
import { LogoMark } from "./logo";

const LINKS = [
  { href: "/analyze", label: "Analyze" },
  { href: "/postings", label: "Postings" },
  { href: "/insights", label: "Insights" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3 text-sm">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <LogoMark size={22} />
          fortunately
        </Link>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
