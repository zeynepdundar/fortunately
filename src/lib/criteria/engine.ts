import type { CheckedMatch, PostingFacts, Requirement } from "@/lib/schemas";
import type { CriteriaConfig } from "./config";

export type CriterionId = "technology" | "years" | "relocation" | "country";

export type Profile = {
  yearsOfExperience: number | null;
  targetCountries: string[];
  relocationNeeded: boolean;
};

export type PostingInput = {
  facts: Pick<PostingFacts, "country" | "relocation">;
  requirements: Pick<
    Requirement,
    "kind" | "category" | "skills" | "minYears"
  >[];
  /** Checked matches by requirement index; empty when the posting was never matched. */
  matches: (Pick<CheckedMatch, "verdict"> | undefined)[];
};

export type CriterionResult = {
  id: CriterionId;
  /** Importance 0–10 as configured. */
  weight: number;
  /** Share of the total score (0–1) among the criteria that could be scored. */
  share: number;
  /** 0–1, or null when unknown or not applicable (then it does not count). */
  points: number | null;
  detail: string;
};

export type FilterResult = {
  id: "relocation" | "country" | "yearsAbove";
  status: "pass" | "fail" | "unknown";
  reason: string;
};

export type Evaluation = {
  /** 0–100, or null when no criterion could be scored. */
  score: number | null;
  /** Share (0–1) of the configured weight that could be scored. */
  coverage: number;
  criteria: CriterionResult[];
  filters: FilterResult[];
  belowThreshold: string[];
  /** Has a filter whose value was not stated and is set to show-flagged. */
  flagged: boolean;
  bucket: "shown" | "below_threshold" | "filtered_out";
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The highest number of years any requirement asks for, or null. */
export function requiredYears(
  requirements: PostingInput["requirements"],
): number | null {
  const years = requirements
    .map((r) => r.minYears)
    .filter((y): y is number => typeof y === "number" && y > 0);
  return years.length > 0 ? Math.max(...years) : null;
}

function technologyPoints(posting: PostingInput, config: CriteriaConfig) {
  let total = 0;
  let earned = 0;
  let counted = 0;
  posting.requirements.forEach((r, i) => {
    const match = posting.matches[i];
    if (!match || (r.category !== "technology" && r.skills.length === 0))
      return;
    const weight = r.kind === "must" ? 1 : config.technology.niceFactor;
    const points =
      match.verdict === "met"
        ? 1
        : match.verdict === "partial"
          ? config.technology.partialValue
          : 0;
    total += weight;
    earned += weight * points;
    counted++;
  });
  if (total === 0) return { points: null, detail: "Not matched against a CV" };
  return {
    points: earned / total,
    detail: `${counted} technology requirements matched`,
  };
}

function yearsPoints(required: number | null, mine: number | null) {
  if (required === null) return { points: null, detail: "No years stated" };
  if (mine === null)
    return { points: null, detail: "Add your years in Profile" };
  if (mine >= required)
    return { points: 1, detail: `Asks ${required}+, you have ${mine}` };
  // Each missing year costs a quarter: 2 years short = 0.5, 4 or more = 0.
  return {
    points: Math.max(0, 1 - (required - mine) / 4),
    detail: `Asks ${required}+, you have ${mine}`,
  };
}

function relocationPoints(
  relocation: PostingFacts["relocation"],
  needed: boolean,
) {
  if (!needed) return { points: null, detail: "You do not need relocation" };
  if (relocation === "yes") return { points: 1, detail: "Relocation offered" };
  if (relocation === "no") return { points: 0, detail: "No relocation" };
  return { points: null, detail: "Relocation not stated" };
}

function countryPoints(country: string | null, targets: string[]) {
  if (targets.length === 0)
    return { points: null, detail: "No target countries in Profile" };
  if (!country) return { points: null, detail: "Country not stated" };
  return targets.includes(country)
    ? { points: 1, detail: `${country} is a target country` }
    : { points: 0, detail: `${country} is not a target country` };
}

function evaluateFilters(
  posting: PostingInput,
  profile: Profile,
  config: CriteriaConfig,
): FilterResult[] {
  const results: FilterResult[] = [];
  const { relocation, country, yearsAbove } = config.filters;

  if (relocation.enabled && profile.relocationNeeded) {
    const value = posting.facts.relocation;
    results.push(
      value === "yes"
        ? { id: "relocation", status: "pass", reason: "Relocation offered" }
        : value === "no"
          ? { id: "relocation", status: "fail", reason: "No relocation" }
          : {
              id: "relocation",
              status: "unknown",
              reason: "Relocation not stated",
            },
    );
  }

  if (country.enabled && profile.targetCountries.length > 0) {
    const value = posting.facts.country;
    results.push(
      !value
        ? { id: "country", status: "unknown", reason: "Country not stated" }
        : profile.targetCountries.includes(value)
          ? {
              id: "country",
              status: "pass",
              reason: `${value} is a target country`,
            }
          : {
              id: "country",
              status: "fail",
              reason: `${value} is not a target country`,
            },
    );
  }

  const required = requiredYears(posting.requirements);
  if (
    yearsAbove.enabled &&
    profile.yearsOfExperience !== null &&
    required !== null
  ) {
    const limit = profile.yearsOfExperience + yearsAbove.value;
    results.push(
      required > limit
        ? {
            id: "yearsAbove",
            status: "fail",
            reason: `Asks ${required}+ years, your limit is ${limit}`,
          }
        : {
            id: "yearsAbove",
            status: "pass",
            reason: `Asks ${required}+ years`,
          },
    );
  }
  return results;
}

/** Filter, score and bucket one posting. Pure and deterministic. */
export function evaluatePosting(
  posting: PostingInput,
  profile: Profile,
  config: CriteriaConfig,
): Evaluation {
  const raw: Omit<CriterionResult, "share">[] = [
    {
      id: "technology",
      weight: config.weights.technology,
      ...technologyPoints(posting, config),
    },
    {
      id: "years",
      weight: config.weights.years,
      ...yearsPoints(
        requiredYears(posting.requirements),
        profile.yearsOfExperience,
      ),
    },
    {
      id: "relocation",
      weight: config.weights.relocation,
      ...relocationPoints(posting.facts.relocation, profile.relocationNeeded),
    },
    {
      id: "country",
      weight: config.weights.country,
      ...countryPoints(posting.facts.country, profile.targetCountries),
    },
  ];

  const active = raw.filter((c) => c.weight > 0);
  const known = active.filter((c) => c.points !== null);
  const knownWeight = known.reduce((sum, c) => sum + c.weight, 0);
  const activeWeight = active.reduce((sum, c) => sum + c.weight, 0);

  const criteria: CriterionResult[] = raw.map((c) => ({
    ...c,
    share:
      c.weight > 0 && c.points !== null && knownWeight > 0
        ? c.weight / knownWeight
        : 0,
  }));
  const score =
    knownWeight > 0
      ? (known.reduce((sum, c) => sum + c.weight * (c.points ?? 0), 0) /
          knownWeight) *
        100
      : null;
  const coverage = activeWeight > 0 ? knownWeight / activeWeight : 0;

  const filters = evaluateFilters(posting, profile, config);
  const unknownMode = (id: FilterResult["id"]) =>
    id === "relocation"
      ? config.filters.relocation.unknown
      : id === "country"
        ? config.filters.country.unknown
        : "show-flagged";
  const filteredOut = filters.some(
    (f) =>
      f.status === "fail" ||
      (f.status === "unknown" && unknownMode(f.id) === "hide"),
  );
  const flagged = filters.some(
    (f) => f.status === "unknown" && unknownMode(f.id) === "show-flagged",
  );

  const belowThreshold: string[] = [];
  const tech = criteria.find((c) => c.id === "technology");
  if (
    config.thresholds.technology !== null &&
    tech?.points != null &&
    tech.points < config.thresholds.technology
  ) {
    belowThreshold.push(
      `Technology ${pct(tech.points)}, minimum ${pct(config.thresholds.technology)}`,
    );
  }
  if (
    config.thresholds.total !== null &&
    score !== null &&
    score / 100 < config.thresholds.total
  ) {
    belowThreshold.push(
      `Score ${pct(score / 100)}, minimum ${pct(config.thresholds.total)}`,
    );
  }

  return {
    score: score === null ? null : Math.round(score),
    coverage,
    criteria,
    filters,
    belowThreshold,
    flagged,
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

/** Shown first, then below threshold, then filtered out; within a bucket by score, unknown scores last. */
export function compareEvaluations(a: Evaluation, b: Evaluation): number {
  return (
    BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket] ||
    (b.score ?? -1) - (a.score ?? -1)
  );
}
