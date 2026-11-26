import { describe, expect, it } from "vitest";
import { DEFAULT_CRITERIA, type CriteriaConfig } from "./config";
import {
  compareEvaluations,
  computeMatch,
  evaluatePosting,
  evaluatePreferences,
  requiredYears,
  type PostingInput,
  type Profile,
} from "./engine";

type Verdict = "met" | "partial" | "missing";
const profile: Profile = {
  yearsOfExperience: 7,
  targetCountries: ["DE", "NL"],
  relocationNeeded: true,
};

/** Build a posting from must and nice verdict lists. */
function posting(
  must: Verdict[],
  nice: Verdict[] = [],
  options: { minYears?: number; facts?: Partial<PostingInput["facts"]> } = {},
): PostingInput {
  return {
    facts: {
      country: "DE",
      relocation: "yes",
      workMode: "hybrid",
      ...options.facts,
    },
    requirements: [
      ...must.map((_, i) => ({
        kind: "must" as const,
        minYears: i === 0 ? (options.minYears ?? null) : null,
      })),
      ...nice.map(() => ({ kind: "nice" as const, minYears: null })),
    ],
    matches: [...must, ...nice].map((verdict) => ({ verdict })),
  };
}

const config = (overrides: Partial<CriteriaConfig> = {}): CriteriaConfig => ({
  ...DEFAULT_CRITERIA,
  ...overrides,
});

describe("computeMatch", () => {
  it("counts verdicts for must-haves and nice-to-haves", () => {
    const m = computeMatch(
      posting(["met", "partial", "missing"], ["met"]),
      profile,
    );
    expect(m.must).toEqual({ met: 1, partial: 1, missing: 1, total: 3 });
    expect(m.nice).toEqual({ met: 1, partial: 0, missing: 0, total: 1 });
    expect(m.matched).toBe(true);
  });

  it("keeps a hidden calibration score: must-haves 85%, nice-to-haves 15%", () => {
    // must: (1 + 0.5) / 2 = 0.75, nice: 1 -> 0.85 × 0.75 + 0.15 × 1 = 0.7875
    expect(
      computeMatch(posting(["met", "partial"], ["met"]), profile).hiddenScore,
    ).toBe(79);
  });

  it("describes the years and lowers the hidden score when short", () => {
    const m = computeMatch(posting(["met"], [], { minYears: 9 }), profile);
    expect(m.yearsDetail).toBe("Asks 9+ years, you have 7");
    expect(m.hiddenScore).toBe(70);
  });

  it("is unmatched without CV matches", () => {
    const m = computeMatch({ ...posting(["met"]), matches: [] }, profile);
    expect(m.matched).toBe(false);
    expect(m.hiddenScore).toBeNull();
  });
});

describe("evaluatePreferences", () => {
  const prefs = DEFAULT_CRITERIA.preferences;

  it("hides a posting that rules relocation out, flags one that does not say", () => {
    expect(
      evaluatePreferences(
        { country: "DE", relocation: "no", workMode: null },
        profile,
        prefs,
      )[0],
    ).toMatchObject({
      id: "relocation",
      status: "mismatch",
      hidden: true,
    });
    expect(
      evaluatePreferences(
        { country: "DE", relocation: "not_stated", workMode: null },
        profile,
        prefs,
      )[0],
    ).toMatchObject({ status: "unknown", hidden: false });
  });

  it("skips relocation and country when the profile does not ask for them", () => {
    const none: Profile = {
      yearsOfExperience: null,
      targetCountries: [],
      relocationNeeded: false,
    };
    expect(
      evaluatePreferences(
        { country: "US", relocation: "no", workMode: "onsite" },
        none,
        prefs,
      ),
    ).toEqual([]);
  });

  it("checks accepted work modes when not all are accepted", () => {
    const remoteOnly = {
      ...prefs,
      workMode: { ...prefs.workMode, accepted: ["remote" as const] },
    };
    expect(
      evaluatePreferences(
        { country: "DE", relocation: "yes", workMode: "onsite" },
        profile,
        remoteOnly,
      ).find((p) => p.id === "workMode"),
    ).toMatchObject({
      status: "mismatch",
      label: "On-site is not accepted",
      hidden: true,
    });
  });
});

describe("evaluatePosting", () => {
  it("shows a good fit", () => {
    expect(
      evaluatePosting(posting(["met", "met"]), profile, config()).bucket,
    ).toBe("shown");
  });

  it("moves postings with too many missing must-haves below the threshold", () => {
    const result = evaluatePosting(
      posting(["met", "missing", "missing"]),
      profile,
      config(),
    );
    expect(result.bucket).toBe("below_threshold");
    expect(result.belowThreshold).toEqual([
      "2 must-haves missing (you allow 1)",
    ]);
    expect(
      evaluatePosting(
        posting(["met", "missing", "missing"]),
        profile,
        config({ allowedMissingMust: 2 }),
      ).bucket,
    ).toBe("shown");
  });

  it("filters out a posting that misses a hidden preference", () => {
    expect(
      evaluatePosting(
        posting(["met"], [], { facts: { country: "US" } }),
        profile,
        config(),
      ).bucket,
    ).toBe("filtered_out");
  });

  it("orders by section, then fewer missing must-haves, then share of must-haves met, then nice-to-haves", () => {
    const allMet = evaluatePosting(posting(["met", "met"]), profile, config());
    const allMetMoreNice = evaluatePosting(
      posting(["met", "met"], ["met"]),
      profile,
      config(),
    );
    const onePartial = evaluatePosting(
      posting(["met", "partial"]),
      profile,
      config(),
    );
    const oneMissing = evaluatePosting(
      posting(["met", "met", "missing"]),
      profile,
      config(),
    );
    const below = evaluatePosting(
      posting(["missing", "missing"]),
      profile,
      config(),
    );
    const out = evaluatePosting(
      posting(["met"], [], { facts: { relocation: "no" } }),
      profile,
      config(),
    );
    const unmatched = evaluatePosting(
      { ...posting(["met"]), matches: [] },
      profile,
      config(),
    );
    expect(
      [
        out,
        below,
        unmatched,
        oneMissing,
        onePartial,
        allMet,
        allMetMoreNice,
      ].sort(compareEvaluations),
    ).toEqual([
      allMetMoreNice,
      allMet,
      onePartial,
      oneMissing,
      unmatched,
      below,
      out,
    ]);
  });
});

describe("requiredYears", () => {
  it("takes the highest stated minimum", () => {
    expect(
      requiredYears([{ minYears: 3 }, { minYears: 5 }, { minYears: null }]),
    ).toBe(5);
    expect(requiredYears([{ minYears: null }])).toBeNull();
  });
});
