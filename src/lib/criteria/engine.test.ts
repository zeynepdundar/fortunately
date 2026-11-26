import { describe, expect, it } from "vitest";
import { CriteriaConfig, DEFAULT_CRITERIA } from "./config";
import {
  compareEvaluations,
  evaluatePosting,
  requiredYears,
  type PostingInput,
  type Profile,
} from "./engine";

const profile: Profile = {
  yearsOfExperience: 7,
  targetCountries: ["DE", "NL"],
  relocationNeeded: true,
};

const tech = (kind: "must" | "nice", minYears: number | null = null) => ({
  kind,
  category: "technology" as const,
  skills: ["react"],
  minYears,
});

/** 10 must-have technology requirements, 9 met and 1 missing, asking 8 years: technology 0.9. */
const posting = (overrides: Partial<PostingInput> = {}): PostingInput => ({
  facts: { country: "DE", relocation: "no" },
  requirements: [
    tech("must", 8),
    ...Array.from({ length: 9 }, () => tech("must")),
  ],
  matches: [
    ...Array.from({ length: 9 }, () => ({ verdict: "met" as const })),
    { verdict: "missing" as const },
  ],
  ...overrides,
});

const config = (overrides: Partial<CriteriaConfig> = {}): CriteriaConfig => ({
  ...DEFAULT_CRITERIA,
  ...overrides,
});
const noFilters = config({
  filters: {
    relocation: { enabled: false, unknown: "show-flagged" },
    country: { enabled: false, unknown: "show-flagged" },
    yearsAbove: { enabled: false, value: 3 },
  },
});

describe("score", () => {
  it("matches the worked example: 10/4/3/3 gives 75", () => {
    // (10 × 0.9 + 4 × 0.75 + 3 × 0 + 3 × 1) / 20 = 0.75
    const result = evaluatePosting(posting(), profile, noFilters);
    expect(result.score).toBe(75);
    expect(result.coverage).toBe(1);
  });

  it("rises when technology matters more: 10/2/1/1 gives 82", () => {
    const result = evaluatePosting(
      posting(),
      profile,
      config({
        ...noFilters,
        weights: { technology: 10, years: 2, relocation: 1, country: 1 },
      }),
    );
    expect(result.score).toBe(82);
  });

  it("leaves unknown criteria out and reports coverage", () => {
    const result = evaluatePosting(
      posting({ facts: { country: null, relocation: "not_stated" } }),
      profile,
      noFilters,
    );
    // only technology (10) and years (4) are known: (9 + 3) / 14
    expect(result.score).toBe(86);
    expect(result.coverage).toBe(14 / 20);
  });

  it("skips relocation when the profile does not need it", () => {
    const result = evaluatePosting(
      posting(),
      { ...profile, relocationNeeded: false },
      noFilters,
    );
    expect(
      result.criteria.find((c) => c.id === "relocation")?.points,
    ).toBeNull();
  });

  it("counts partial matches and weights nice-to-haves lower", () => {
    const result = evaluatePosting(
      posting({
        requirements: [tech("must"), tech("nice")],
        matches: [{ verdict: "partial" }, { verdict: "met" }],
      }),
      profile,
      config({
        ...noFilters,
        weights: { technology: 10, years: 0, relocation: 0, country: 0 },
      }),
    );
    // (1 × 0.5 + 0.3 × 1) / 1.3
    expect(result.score).toBe(62);
  });

  it("has no score when nothing is known", () => {
    const result = evaluatePosting(
      posting({
        requirements: [],
        matches: [],
        facts: { country: null, relocation: "not_stated" },
      }),
      profile,
      noFilters,
    );
    expect(result.score).toBeNull();
    expect(result.coverage).toBe(0);
  });

  it("ignores criteria with importance 0", () => {
    const result = evaluatePosting(
      posting(),
      profile,
      config({
        ...noFilters,
        weights: { technology: 10, years: 0, relocation: 0, country: 0 },
      }),
    );
    expect(result.score).toBe(90);
  });
});

describe("filters", () => {
  it("filters out a posting that rules relocation out", () => {
    expect(evaluatePosting(posting(), profile, DEFAULT_CRITERIA).bucket).toBe(
      "filtered_out",
    );
  });

  it("flags but shows a posting with relocation not stated", () => {
    const result = evaluatePosting(
      posting({ facts: { country: "DE", relocation: "not_stated" } }),
      profile,
      DEFAULT_CRITERIA,
    );
    expect(result.bucket).toBe("shown");
    expect(result.flagged).toBe(true);
  });

  it("hides unknowns when set to hide", () => {
    const result = evaluatePosting(
      posting({ facts: { country: "DE", relocation: "not_stated" } }),
      profile,
      config({
        filters: {
          ...DEFAULT_CRITERIA.filters,
          relocation: { enabled: true, unknown: "hide" },
        },
      }),
    );
    expect(result.bucket).toBe("filtered_out");
  });

  it("filters out countries outside the targets", () => {
    const result = evaluatePosting(
      posting({ facts: { country: "US", relocation: "yes" } }),
      profile,
      DEFAULT_CRITERIA,
    );
    expect(result.filters.find((f) => f.id === "country")?.status).toBe("fail");
    expect(result.bucket).toBe("filtered_out");
  });

  it("filters out postings asking far more years when enabled", () => {
    const result = evaluatePosting(
      posting({
        facts: { country: "DE", relocation: "yes" },
        requirements: [tech("must", 12)],
        matches: [{ verdict: "met" }],
      }),
      profile,
      config({
        filters: {
          ...DEFAULT_CRITERIA.filters,
          yearsAbove: { enabled: true, value: 3 },
        },
      }),
    );
    expect(result.filters.find((f) => f.id === "yearsAbove")).toMatchObject({
      status: "fail",
    });
  });

  it("does not apply the relocation filter when the profile does not need relocation", () => {
    const result = evaluatePosting(
      posting(),
      { ...profile, relocationNeeded: false },
      DEFAULT_CRITERIA,
    );
    expect(result.bucket).toBe("shown");
  });
});

describe("thresholds", () => {
  it("moves a posting below the technology minimum to below_threshold", () => {
    const result = evaluatePosting(
      posting({ facts: { country: "DE", relocation: "yes" } }),
      profile,
      config({ thresholds: { technology: 0.95, total: null } }),
    );
    expect(result.bucket).toBe("below_threshold");
    expect(result.belowThreshold).toEqual(["Technology 90%, minimum 95%"]);
  });
});

describe("ordering", () => {
  it("sorts shown before below threshold before filtered out, then by score", () => {
    const shownHigh = evaluatePosting(
      posting({ facts: { country: "DE", relocation: "yes" } }),
      profile,
      DEFAULT_CRITERIA,
    );
    const filtered = evaluatePosting(posting(), profile, DEFAULT_CRITERIA);
    const shownLow = evaluatePosting(
      posting({
        facts: { country: "DE", relocation: "yes" },
        matches: Array.from({ length: 10 }, () => ({
          verdict: "missing" as const,
        })),
      }),
      profile,
      DEFAULT_CRITERIA,
    );
    const sorted = [filtered, shownLow, shownHigh].sort(compareEvaluations);
    expect(sorted).toEqual([shownHigh, shownLow, filtered]);
  });
});

describe("requiredYears", () => {
  it("takes the highest stated minimum", () => {
    expect(
      requiredYears([tech("must", 3), tech("must", 5), tech("must")]),
    ).toBe(5);
    expect(requiredYears([tech("must")])).toBeNull();
  });
});

describe("CriteriaConfig", () => {
  it("accepts the defaults and rejects an out-of-range weight", () => {
    expect(CriteriaConfig.safeParse(DEFAULT_CRITERIA).success).toBe(true);
    expect(
      CriteriaConfig.safeParse({
        ...DEFAULT_CRITERIA,
        weights: { ...DEFAULT_CRITERIA.weights, technology: 11 },
      }).success,
    ).toBe(false);
  });
});
