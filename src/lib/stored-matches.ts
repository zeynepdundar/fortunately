import type { CvLine } from "@/lib/cv";
import type { CheckedMatch } from "@/lib/schemas";

export type StoredMatchRow = {
  requirementId: string;
  verdict: CheckedMatch["verdict"];
  evidenceLines: number[];
  rationale: string;
  verified: boolean;
};

/**
 * Rebuild the checked matches for a saved analysis, in requirement order,
 * attaching the text of each cited line from the CV that was matched.
 */
export function rebuildMatches(
  requirementIds: string[],
  rows: StoredMatchRow[],
  cvLines: CvLine[],
): (CheckedMatch | undefined)[] {
  const byRequirement = new Map(rows.map((r) => [r.requirementId, r]));
  const textByLine = new Map(cvLines.map((l) => [l.n, l.text]));
  return requirementIds.map((id, requirementIndex) => {
    const row = byRequirement.get(id);
    if (!row) return undefined;
    return {
      requirementIndex,
      verdict: row.verdict,
      evidence: row.evidenceLines
        .filter((n) => textByLine.has(n))
        .map((n) => ({ n, text: textByLine.get(n) ?? "" })),
      rationale: row.rationale,
      verified: row.verified,
    };
  });
}

/** Met / partial / missing counts for a summary line. */
export function countVerdicts(
  matches: (Pick<CheckedMatch, "verdict"> | undefined)[],
) {
  const counts = { met: 0, partial: 0, missing: 0 };
  for (const m of matches) if (m) counts[m.verdict]++;
  return counts;
}
