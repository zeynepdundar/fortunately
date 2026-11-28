import Link from "next/link";
import { DEFAULT_CRITERIA } from "@/lib/criteria/config";
import { evaluatePosting } from "@/lib/criteria/engine";
import { loadSampleResults, SAMPLE_PROFILE } from "@/lib/sample-results";

const REPO = "https://github.com/zeynepdundar/fortunately";

const STEPS = [
  {
    title: "Paste a posting",
    body: "Every requirement is pulled out as must-have or nice-to-have, with years, technologies, country and relocation support.",
  },
  {
    title: "Match it to your CV",
    body: "Each verdict cites the CV line that proves it. A citation to a line that does not exist is caught and marked missing.",
  },
  {
    title: "Decide and track",
    body: "Postings are ranked by must-haves met and filtered by your preferences. Mark them applied, skipped or in interview.",
  },
] as const;

const SECONDARY_BUTTON =
  "rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700";

export default async function Home() {
  const samples = await loadSampleResults();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-16 px-6 py-20">
      <section className="flex flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn every &ldquo;Unfortunately&rdquo; into a
          &ldquo;Fortunately&rdquo;.
        </h1>
        <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
          Paste a job posting. See every requirement, matched to your CV with
          the exact line that proves it, and the gaps worth closing.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/analyze"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Analyze a posting
          </Link>
          {samples.length > 0 && (
            <a href="#samples" className={SECONDARY_BUTTON}>
              Try a sample
            </a>
          )}
        </div>
      </section>

      {samples.length > 0 && (
        <section
          id="samples"
          aria-labelledby="samples-heading"
          className="flex scroll-mt-8 flex-col gap-3"
        >
          <div>
            <h2 id="samples-heading" className="text-lg font-semibold">
              Try a sample
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Fictional postings matched against a fictional CV, analysed ahead
              of time. No key, no sign-up.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {samples.map((s) => {
              const { match } = evaluatePosting(
                {
                  facts: s.extraction.facts,
                  requirements: s.extraction.requirements,
                  matches: s.matches,
                },
                SAMPLE_PROFILE,
                DEFAULT_CRITERIA,
              );
              const place = [
                s.extraction.facts.city,
                s.extraction.facts.country,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <li key={s.id}>
                  <Link
                    href={`/samples/${s.id}`}
                    className="flex h-full items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {s.extraction.facts.title ?? s.id}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        {[s.extraction.facts.company, place || "Remote"]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums">
                        {match.must.met}/{match.must.total}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        must-haves
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {samples.length === 0 && (
        <section aria-labelledby="demo-heading" className="flex flex-col gap-3">
          <h2 id="demo-heading" className="text-lg font-semibold">
            See it in action
          </h2>
          <video
            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
            src="/demo.mp4"
            poster="/demo-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Screen recording: a sample posting is analysed, its requirements stream in, they are matched to a CV and the result page shows 3 of 6 must-haves met with the cited CV lines."
          />
          <p className="text-xs text-neutral-500">
            A real run on a local model (qwen3:8b with Ollama), sped up. The
            posting and the CV are fictional.
          </p>
        </section>
      )}

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="text-lg font-semibold">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500 tabular-nums">
                {i + 1}
              </span>
              <span className="text-sm font-medium">{step.title}</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {step.body}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="open-heading"
        className="flex flex-col gap-3 border-t border-neutral-200 pt-8 dark:border-neutral-800"
      >
        <h2 id="open-heading" className="text-lg font-semibold">
          Open source, your keys
        </h2>
        <p className="max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
          MIT licensed. Bring your own Anthropic or OpenAI key, kept in this tab
          only, or run it locally with Ollama so your CV never leaves your
          machine.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={REPO} className={SECONDARY_BUTTON}>
            View on GitHub
          </a>
          <a href={`${REPO}#getting-started`} className={SECONDARY_BUTTON}>
            Run it yourself
          </a>
        </div>
      </section>
    </main>
  );
}
