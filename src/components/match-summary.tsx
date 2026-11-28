import type {
  Evaluation,
  MatchResult,
  PreferenceResult,
} from "@/lib/criteria/engine";
import type { PostingFacts } from "@/lib/schemas";

const PREFERENCE_MARK = { match: "✓", mismatch: "✗", unknown: "?" } as const;

/** "1 partial · 2 missing · nice-to-haves 1/3 · years" — the facts behind the must-have count. */
export function matchDetail(match: MatchResult): string {
  if (!match.matched) return "Not matched against a CV";
  return (
    [
      match.must.partial ? `${match.must.partial} partial` : null,
      match.must.missing ? `${match.must.missing} missing` : null,
      match.nice.total
        ? `nice-to-haves ${match.nice.met}/${match.nice.total}`
        : null,
      match.yearsDetail,
    ]
      .filter(Boolean)
      .join(" · ") || "Every must-have is proven by your CV"
  );
}

/** ✓ / ✗ / ? badges for the preferences that apply to this posting. */
export function PreferenceBadges({
  preferences,
  className = "",
}: {
  preferences: Evaluation["preferences"];
  className?: string;
}) {
  if (preferences.length === 0) return null;
  return (
    <ul
      className={`flex flex-wrap gap-1.5 ${className}`}
      aria-label="Your preferences"
    >
      {preferences.map((p) => (
        <li
          key={p.id}
          className="rounded-md px-1.5 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-300 ring-inset dark:text-neutral-300 dark:ring-neutral-700"
        >
          <span aria-hidden>{PREFERENCE_MARK[p.status]} </span>
          {p.label}
        </li>
      ))}
    </ul>
  );
}

/** Why a posting landed below the threshold. */
export function BelowThresholdReasons({
  reasons,
  className = "",
}: {
  reasons: string[];
  className?: string;
}) {
  if (reasons.length === 0) return null;
  return (
    <ul
      className={`flex flex-col gap-0.5 text-xs text-neutral-600 dark:text-neutral-400 ${className}`}
    >
      {reasons.map((reason) => (
        <li key={reason}>Below threshold: {reason}</li>
      ))}
    </ul>
  );
}

const WORK_MODE_WORD = {
  remote: "remote",
  hybrid: "hybrid",
  onsite: "on-site",
} as const;

/** Why one preference hides a posting, phrased to follow "Hidden from Postings because …". */
export function hiddenReason(
  preference: Pick<PreferenceResult, "id" | "status">,
  facts: Pick<PostingFacts, "country" | "workMode">,
): string {
  const unknown = preference.status === "unknown";
  switch (preference.id) {
    case "relocation":
      return unknown
        ? "relocation support is required and the posting does not mention it"
        : "relocation support is required";
    case "country":
      return unknown || !facts.country
        ? "the posting does not state a country"
        : `${facts.country} is not one of your target countries`;
    case "workMode":
      return unknown || !facts.workMode
        ? "the posting does not state a work mode"
        : `${WORK_MODE_WORD[facts.workMode]} work is not one of your accepted work modes`;
  }
}

/** Texts of the must-haves with the given verdict, in posting order. */
export function mustTexts(
  requirements: { kind: "must" | "nice"; text: string }[],
  matches: ({ verdict: "met" | "partial" | "missing" } | undefined)[],
  verdict: "missing" | "partial",
): string[] {
  return requirements
    .filter((r, i) => r.kind === "must" && matches[i]?.verdict === verdict)
    .map((r) => r.text);
}
