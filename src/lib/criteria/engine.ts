import type { CheckedMatch, PostingFacts, Requirement } from "@/lib/schemas";
import type { CriteriaConfig } from "./config";

/**
 * Weighted match score, kept for calibration but NOT shown in the MVP:
 * its weights are a design choice until application outcomes can test them.
 * Bump the version when the formula changes.
 */
export const MATCH_FORMULA_VERSION = "score-v1";
const HIDDEN_SCORE = { partialValue: 0.5, yearPenalty: 0.15, mustShare: 0.85 };

export type Profile = {
  yearsOfExperience: number | null;
  targetCountries: string[];
  relocationNeeded: boolean;
};

export type PostingInput = {
  facts: Pick<PostingFacts, "country" | "relocation" | "workMode">;
  requirements: Pick<Requirement, "kind" | "minYears">[];
  /** Checked matches by requirement index; empty when the posting was never matched. */
  matches: (Pick<CheckedMatch, "verdict"> | undefined)[];
};

export type MatchResult = {
  /** Whether any requirement was matched against a CV. */
  matched: boolean;
  /** Weighted 0–100 score for calibration only; not shown in the MVP. */
  hiddenScore: number | null;
  must: { met: number; partial: number; missing: number; total: number };
  nice: { met: number; partial: number; missing: number; total: number };
  /** 1 when the years are met or unknown; lower when the CV has fewer years than asked. */
  yearsFactor: number;
  yearsDetail: string | null;
};

export type PreferenceResult = {
  id: "relocation" | "country" | "workMode";
  status: "match" | "mismatch" | "unknown";
  label: string;
  hidden: boolean;
};

export type Evaluation = {
  match: MatchResult;
  preferences: PreferenceResult[];
  belowThreshold: string[];
  /** A preference is not stated and the posting is shown with a flag. */
  flagged: boolean;
  bucket: "shown" | "below_threshold" | "filtered_out";
};

const WORK_MODE_LABEL = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
} as const;

/** The highest number of years any requirement asks for, or null. */
export function requiredYears(
  requirements: Pick<Requirement, "minYears">[],
): number | null {
  const years = requirements
    .map((r) => r.minYears)
    .filter((y): y is number => typeof y === "number" && y > 0);
  return years.length > 0 ? Math.max(...years) : null;
}

export function computeMatch(
  posting: PostingInput,
  profile: Profile,
): MatchResult {
  const settings = HIDDEN_SCORE;
  const must = { met: 0, partial: 0, missing: 0, total: 0 };
  const nice = { met: 0, partial: 0, missing: 0, total: 0 };
  posting.requirements.forEach((r, i) => {
    const verdict = posting.matches[i]?.verdict;
    if (!verdict) return;
    const bucket = r.kind === "must" ? must : nice;
    bucket[verdict]++;
    bucket.total++;
  });

  const coverage = (b: typeof must) =>
    b.total === 0
      ? null
      : (b.met + b.partial * settings.partialValue) / b.total;
  const mustCoverage = coverage(must);
  const niceCoverage = coverage(nice);
  const base =
    mustCoverage === null
      ? niceCoverage
      : niceCoverage === null
        ? mustCoverage
        : settings.mustShare * mustCoverage +
          (1 - settings.mustShare) * niceCoverage;

  const required = requiredYears(posting.requirements);
  const mine = profile.yearsOfExperience;
  let yearsFactor = 1;
  let yearsDetail: string | null = null;
  if (required !== null && mine !== null) {
    yearsDetail = `Asks ${required}+ years, you have ${mine}`;
    if (mine < required)
      yearsFactor = Math.max(0, 1 - (required - mine) * settings.yearPenalty);
  } else if (required !== null) {
    yearsDetail = `Asks ${required}+ years; add yours in Profile`;
  }

  return {
    matched: must.total + nice.total > 0,
    hiddenScore: base === null ? null : Math.round(100 * base * yearsFactor),
    must,
    nice,
    yearsFactor,
    yearsDetail,
  };
}

export function evaluatePreferences(
  facts: PostingInput["facts"],
  profile: Profile,
  preferences: CriteriaConfig["preferences"],
): PreferenceResult[] {
  const results: PreferenceResult[] = [];
  const result = (
    id: PreferenceResult["id"],
    status: PreferenceResult["status"],
    label: string,
    pref: { hideMismatches: boolean; hideUnknown: boolean },
  ): PreferenceResult => ({
    id,
    status,
    label,
    hidden:
      (status === "mismatch" && pref.hideMismatches) ||
      (status === "unknown" && pref.hideUnknown),
  });

  if (profile.relocationNeeded) {
    const pref = preferences.relocation;
    results.push(
      facts.relocation === "yes"
        ? result("relocation", "match", "Relocation offered", pref)
        : facts.relocation === "no"
          ? result("relocation", "mismatch", "No relocation", pref)
          : result("relocation", "unknown", "Relocation not stated", pref),
    );
  }

  if (profile.targetCountries.length > 0) {
    const pref = preferences.country;
    results.push(
      !facts.country
        ? result("country", "unknown", "Country not stated", pref)
        : profile.targetCountries.includes(facts.country)
          ? result(
              "country",
              "match",
              `${facts.country} is a target country`,
              pref,
            )
          : result(
              "country",
              "mismatch",
              `${facts.country} is not a target country`,
              pref,
            ),
    );
  }

  const accepted = preferences.workMode.accepted;
  if (accepted.length < 3) {
    const pref = preferences.workMode;
    results.push(
      !facts.workMode
        ? result("workMode", "unknown", "Work mode not stated", pref)
        : accepted.includes(facts.workMode)
          ? result("workMode", "match", WORK_MODE_LABEL[facts.workMode], pref)
          : result(
              "workMode",
              "mismatch",
              `${WORK_MODE_LABEL[facts.workMode]} is not accepted`,
              pref,
            ),
    );
  }
  return results;
}

/** Match counts, preferences and section for one posting. Pure and deterministic. */
export function evaluatePosting(
  posting: PostingInput,
  profile: Profile,
  config: CriteriaConfig,
): Evaluation {
  const match = computeMatch(posting, profile);
  const preferences = evaluatePreferences(
    posting.facts,
    profile,
    config.preferences,
  );

  const belowThreshold: string[] = [];
  if (match.must.missing > config.allowedMissingMust) {
    const n = match.must.missing;
    belowThreshold.push(
      `${n} must-have${n === 1 ? "" : "s"} missing (you allow ${config.allowedMissingMust})`,
    );
  }

  const filteredOut = preferences.some((p) => p.hidden);
  return {
    match,
    preferences,
    belowThreshold,
    flagged: preferences.some((p) => p.status === "unknown" && !p.hidden),
    bucket: filteredOut
      ? "filtered_out"
      : belowThreshold.length > 0
        ? "below_threshold"
        : "shown",
  };
}

const BUCKET_ORDER: Record<Evaluation["bucket"], number> = {
  shown: 0,
  below_threshold: 1,
  filtered_out: 2,
};

const ratio = (part: number, total: number) => (total === 0 ? 0 : part / total);

/**
 * Shown first, then below threshold, then filtered out. Within a section, by facts:
 * fewer missing must-haves, then a higher share of must-haves met, then of nice-to-haves met;
 * postings without a CV match last.
 */
export function compareEvaluations(a: Evaluation, b: Evaluation): number {
  const x = a.match;
  const y = b.match;
  return (
    BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket] ||
    Number(y.matched) - Number(x.matched) ||
    x.must.missing - y.must.missing ||
    ratio(y.must.met, y.must.total) - ratio(x.must.met, x.must.total) ||
    ratio(y.nice.met, y.nice.total) - ratio(x.nice.met, x.nice.total)
  );
}
