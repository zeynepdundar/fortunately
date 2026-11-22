import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          Fortunately
        </Link>
        <Link
          href="/analyze"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Analyze
        </Link>
        <Link
          href="/settings"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Settings
        </Link>
      </nav>
    </header>
  );
}
