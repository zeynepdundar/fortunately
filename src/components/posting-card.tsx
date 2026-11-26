import Link from "next/link";
import { FactsBar } from "@/components/facts-bar";
import type { ListedPosting } from "@/lib/criteria/postings-list";

function Score({
  score,
  coverage,
}: {
  score: number | null;
  coverage: number;
}) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-end">
      <span
        className="text-2xl font-semibold tabular-nums"
        aria-label={score === null ? "Not scored" : `Score ${score}`}
      >
        {score === null ? "—" : score}
      </span>
      <span className="text-xs text-neutral-500 tabular-nums">
        {score === null
          ? "not scored"
          : coverage < 1
            ? `${Math.round(coverage * 100)}% known`
            : "fit score"}
      </span>
    </div>
  );
}

/** One posting in the list: facts, CV match summary, score and the reasons behind its section. */
export function PostingCard({ posting }: { posting: ListedPosting }) {
  const { analysis, evaluation, verdicts } = posting;
  const unknownFilters = evaluation.filters.filter(
    (f) => f.status === "unknown",
  );
  const failedFilters = evaluation.filters.filter((f) => f.status === "fail");

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
        <div className="mt-1">
          <FactsBar
            facts={{
              company: analysis.company,
              city: analysis.city,
              country: analysis.country,
              workMode: analysis.workMode,
              relocation: analysis.relocation,
            }}
          />
        </div>
        <p className="mt-1.5 text-xs text-neutral-500 tabular-nums">
          {verdicts.matched
            ? `CV match: ${verdicts.met} met · ${verdicts.partial} partial · ${verdicts.missing} missing`
            : "Not matched against a CV"}
        </p>
        {(unknownFilters.length > 0 ||
          evaluation.belowThreshold.length > 0 ||
          failedFilters.length > 0) && (
          <ul className="mt-1.5 flex flex-col gap-0.5 text-xs">
            {failedFilters.map((f) => (
              <li key={f.id} className="text-rose-700 dark:text-rose-400">
                Filtered: {f.reason}
              </li>
            ))}
            {evaluation.belowThreshold.map((reason) => (
              <li key={reason} className="text-amber-800 dark:text-amber-300">
                Below threshold: {reason}
              </li>
            ))}
            {unknownFilters.map((f) => (
              <li key={f.id} className="text-amber-800 dark:text-amber-300">
                <span aria-hidden>⚠ </span>
                {f.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Score score={evaluation.score} coverage={evaluation.coverage} />
    </li>
  );
}
