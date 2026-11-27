import { describe, expect, it } from "vitest";
import type { MatchResult } from "@/lib/criteria/engine";
import { hiddenReason, matchDetail } from "./match-summary";

const result = (overrides: Partial<MatchResult> = {}): MatchResult => ({
  matched: true,
  hiddenScore: 1,
  must: { met: 3, partial: 0, missing: 0, total: 3 },
  nice: { met: 0, partial: 0, missing: 0, total: 0 },
  yearsFactor: 1,
  yearsDetail: null,
  ...overrides,
});

describe("matchDetail", () => {
  it("says when the posting was not matched", () => {
    expect(matchDetail(result({ matched: false }))).toBe(
      "Not matched against a CV",
    );
  });

  it("says when every must-have is proven", () => {
    expect(matchDetail(result())).toBe("Every must-have is proven by your CV");
  });

  it("lists partial, missing, nice-to-haves and years", () => {
    expect(
      matchDetail(
        result({
          must: { met: 1, partial: 1, missing: 2, total: 4 },
          nice: { met: 1, partial: 0, missing: 2, total: 3 },
          yearsDetail: "needs 5+ years, you have 3",
        }),
      ),
    ).toBe(
      "1 partial · 2 missing · nice-to-haves 1/3 · needs 5+ years, you have 3",
    );
  });
});

describe("hiddenReason", () => {
  const facts = { country: "DE", workMode: "onsite" } as const;

  it("explains relocation", () => {
    expect(hiddenReason({ id: "relocation", status: "mismatch" }, facts)).toBe(
      "relocation support is required",
    );
    expect(hiddenReason({ id: "relocation", status: "unknown" }, facts)).toBe(
      "relocation support is required and the posting does not mention it",
    );
  });

  it("names the country and the work mode", () => {
    expect(hiddenReason({ id: "country", status: "mismatch" }, facts)).toBe(
      "DE is not one of your target countries",
    );
    expect(hiddenReason({ id: "workMode", status: "mismatch" }, facts)).toBe(
      "on-site work is not one of your accepted work modes",
    );
    expect(
      hiddenReason(
        { id: "country", status: "unknown" },
        { country: null, workMode: null },
      ),
    ).toBe("the posting does not state a country");
  });
});
