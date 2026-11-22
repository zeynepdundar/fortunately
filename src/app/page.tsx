import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
        Fortunately
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Turn every &ldquo;Unfortunately&rdquo; into a &ldquo;Fortunately&rdquo;.
      </h1>
      <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        Paste a job posting. See every requirement, matched to your CV with the
        exact line that proves it, and the gaps worth closing.
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/analyze"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Analyze a posting
        </Link>
        <span className="text-sm text-neutral-500">
          Work in progress — MVP coming soon.
        </span>
      </div>
    </main>
  );
}
