import Link from "next/link";
import type { ListedPosting } from "@/lib/criteria/postings-list";

const WORK_MODE = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const;
const PREFERENCE_MARK = { match: "✓", mismatch: "✗", unknown: "?" } as const;

/** One posting in the list: facts, must-have count, preference badges and the reasons behind its section. */
export function PostingCard({ posting }: { posting: ListedPosting }) {
  const { analysis, evaluation } = posting;
  const { match } = evaluation;
  const location = [analysis.city, analysis.country].filter(Boolean).join(", ");
  const facts = [
    analysis.company,
    location || "Location not stated",
    analysis.workMode ? WORK_MODE[analysis.workMode] : null,
  ].filter(Boolean);

  return (
    <li
      className="flex gap-4 border-b border-neutral-100 py-4 last:border-0 dark:border-neutral-900"
      data-testid="posting"
    >
      <div className="min-w-0 flex-1">
        <Link
          href={`/analyses/${analysis.analysisId}`}
          className="font-medium hover:underline"
        >
          {analysis.title}
        </Link>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
          {facts.join(" · ")}
        </p>

        <p className="mt-1.5 text-xs text-neutral-500 tabular-nums">
          {match.matched
            ? [
                match.must.partial ? `${match.must.partial} partial` : null,
                match.must.missing ? `${match.must.missing} missing` : null,
                match.nice.total
                  ? `nice-to-haves ${match.nice.met}/${match.nice.total}`
                  : null,
                match.yearsDetail,
              ]
                .filter(Boolean)
                .join(" · ") || "Every must-have is proven by your CV"
            : "Not matched against a CV"}
        </p>

        {evaluation.preferences.length > 0 && (
          <ul
            className="mt-2 flex flex-wrap gap-1.5"
            aria-label="Your preferences"
          >
            {evaluation.preferences.map((p) => (
              <li
                key={p.id}
                className="rounded-md px-1.5 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-300 ring-inset dark:text-neutral-300 dark:ring-neutral-700"
              >
                <span aria-hidden>{PREFERENCE_MARK[p.status]} </span>
                {p.label}
              </li>
            ))}
          </ul>
        )}

        {evaluation.belowThreshold.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            {evaluation.belowThreshold.map((reason) => (
              <li key={reason}>Below threshold: {reason}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex w-24 shrink-0 flex-col items-end">
        {match.matched ? (
          <>
            <span className="text-2xl font-semibold tabular-nums">
              {match.must.met}/{match.must.total}
            </span>
            <span className="text-xs text-neutral-500">must-haves met</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold">—</span>
            <span className="text-xs text-neutral-500">not matched</span>
          </>
        )}
      </div>
    </li>
  );
}
