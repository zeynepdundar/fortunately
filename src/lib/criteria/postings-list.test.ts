import { describe, expect, it } from "vitest";
import { DEFAULT_CRITERIA } from "./config";
import {
  buildPostingList,
  EMPTY_PROFILE,
  toEngineProfile,
  type ListedAnalysis,
} from "./postings-list";

const analysis = (
  id: string,
  overrides: Partial<ListedAnalysis> = {},
): ListedAnalysis => ({
  analysisId: id,
  postingId: `posting-${id}`,
  status: "new",
  statusChangedAt: null,
  title: `Job ${id}`,
  company: "Acme",
  city: "Berlin",
  country: "DE",
  workMode: "hybrid",
  relocation: "yes",
  createdAt: new Date("2026-11-26T10:00:00Z"),
  requirements: [
    {
      kind: "must",
      category: "technology",
      skills: ["react"],
      anyOf: false,
      minYears: null,
    },
  ],
  matches: [{ verdict: "met" }],
  ...overrides,
});

const profile = {
  yearsOfExperience: 7,
  targetCountries: ["DE"],
  relocationNeeded: true,
};

describe("buildPostingList", () => {
  it("sorts shown postings by score and counts verdicts", () => {
    const list = buildPostingList(
      [
        analysis("low", { matches: [{ verdict: "missing" }] }),
        analysis("high"),
      ],
      profile,
      DEFAULT_CRITERIA,
    );
    expect(list.shown.map((p) => p.analysis.analysisId)).toEqual([
      "high",
      "low",
    ]);
    expect(list.shown[0].verdicts).toEqual({
      met: 1,
      partial: 0,
      missing: 0,
      matched: true,
    });
  });

  it("puts postings that fail a filter in filteredOut", () => {
    const list = buildPostingList(
      [analysis("no-relo", { relocation: "no" })],
      profile,
      DEFAULT_CRITERIA,
    );
    expect(list.shown).toHaveLength(0);
    expect(list.filteredOut.map((p) => p.analysis.analysisId)).toEqual([
      "no-relo",
    ]);
  });

  it("puts postings under a threshold in belowThreshold", () => {
    const list = buildPostingList(
      [analysis("weak", { matches: [{ verdict: "missing" }] })],
      profile,
      { ...DEFAULT_CRITERIA, allowedMissingMust: 0 },
    );
    expect(list.belowThreshold.map((p) => p.analysis.analysisId)).toEqual([
      "weak",
    ]);
  });

  it("works without a profile and marks unmatched postings", () => {
    const list = buildPostingList(
      [analysis("a", { matches: [] })],
      EMPTY_PROFILE,
      DEFAULT_CRITERIA,
    );
    expect(list.shown[0].verdicts.matched).toBe(false);
    expect(list.shown[0].evaluation.match.matched).toBe(false);
  });
});

describe("buildPostingList with application status", () => {
  const changed = (iso: string) => new Date(iso);

  it("keeps only New postings in the ranked sections", () => {
    const list = buildPostingList(
      [
        analysis("new"),
        analysis("applied", { status: "applied" }),
        analysis("skipped", { status: "skipped" }),
      ],
      profile,
      DEFAULT_CRITERIA,
    );
    expect(list.shown.map((p) => p.analysis.analysisId)).toEqual(["new"]);
    expect(list.toDecide).toBe(1);
    expect(list.inProgress.map((p) => p.analysis.analysisId)).toEqual([
      "applied",
    ]);
    expect(list.closed.map((p) => p.analysis.analysisId)).toEqual(["skipped"]);
  });

  it("keeps a posting in progress even when it fails a preference", () => {
    const list = buildPostingList(
      [analysis("x", { status: "interview", relocation: "no" })],
      profile,
      DEFAULT_CRITERIA,
    );
    expect(list.filteredOut).toHaveLength(0);
    expect(list.inProgress).toHaveLength(1);
  });

  it("sorts in progress and closed by the latest status change", () => {
    const list = buildPostingList(
      [
        analysis("old", {
          status: "applied",
          statusChangedAt: changed("2026-11-20T10:00:00Z"),
        }),
        analysis("recent", {
          status: "offer",
          statusChangedAt: changed("2026-11-27T10:00:00Z"),
        }),
        analysis("r1", {
          status: "rejected",
          statusChangedAt: changed("2026-11-21T10:00:00Z"),
        }),
        analysis("r2", {
          status: "skipped",
          statusChangedAt: changed("2026-11-25T10:00:00Z"),
        }),
      ],
      profile,
      DEFAULT_CRITERIA,
    );
    expect(list.inProgress.map((p) => p.analysis.analysisId)).toEqual([
      "recent",
      "old",
    ]);
    expect(list.closed.map((p) => p.analysis.analysisId)).toEqual(["r2", "r1"]);
  });
});

describe("toEngineProfile", () => {
  it("falls back to the empty profile", () => {
    expect(toEngineProfile(null)).toEqual(EMPTY_PROFILE);
  });

  it("keeps only the fields the engine reads", () => {
    expect(
      toEngineProfile({
        yearsOfExperience: 6,
        targetCountries: ["NL"],
        relocationNeeded: true,
        cv: null,
      } as Parameters<typeof toEngineProfile>[0]),
    ).toEqual({
      yearsOfExperience: 6,
      targetCountries: ["NL"],
      relocationNeeded: true,
    });
  });
});
