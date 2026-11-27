import Link from "next/link";
import { StatusSelect } from "./status-select";
import type { ListedPosting } from "@/lib/criteria/postings-list";
import {
  BelowThresholdReasons,
  matchDetail,
  PreferenceBadges,
} from "./match-summary";

const WORK_MODE = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const;

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
          {matchDetail(match)}
        </p>
        <PreferenceBadges
          preferences={evaluation.preferences}
          className="mt-2"
        />
        <BelowThresholdReasons
          reasons={evaluation.belowThreshold}
          className="mt-1.5"
        />
      </div>

      <div className="flex w-36 shrink-0 flex-col items-end">
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
        <StatusSelect
          postingId={analysis.postingId}
          status={analysis.status}
          className="mt-2"
        />
      </div>
    </li>
  );
}
