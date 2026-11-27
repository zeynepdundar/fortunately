import { describe, expect, it } from "vitest";
import type { ListedAnalysis } from "@/lib/criteria/postings-list";
import { buildInsights } from "./insights";

type Req = ListedAnalysis["requirements"][number];
const must = (skills: string[], anyOf = false): Req => ({
  kind: "must",
  category: "technology",
  skills,
  anyOf,
  minYears: null,
});

const posting = (
  id: string,
  reqs: [Req, "met" | "partial" | "missing" | undefined][],
  overrides: Partial<ListedAnalysis> = {},
): ListedAnalysis => ({
  analysisId: id,
  postingId: `p-${id}`,
  status: "new",
  statusChangedAt: null,
  title: id,
  company: null,
  city: null,
  country: "DE",
  workMode: null,
  relocation: "not_stated",
  createdAt: new Date("2026-11-27T10:00:00Z"),
  requirements: reqs.map(([r]) => r),
  matches: reqs.map(([, v]) => (v ? { verdict: v } : undefined)),
  ...overrides,
});

describe("buildInsights", () => {
  it("ranks must-have skills by how often the CV misses them", () => {
    const insights = buildInsights(
      [
        posting("a", [
          [must(["Kubernetes"]), "missing"],
          [must(["React"]), "met"],
        ]),
        posting("b", [
          [must(["kubernetes"]), "missing"],
          [must(["GraphQL"]), "partial"],
        ]),
      ],
      { targetCountries: [] },
    );
    expect(insights.gaps).toEqual([
      { skill: "Kubernetes", asked: 2, missing: 2, partial: 0 },
      { skill: "GraphQL", asked: 1, missing: 0, partial: 1 },
    ]);
    expect(insights.matchedPostings).toBe(2);
  });

  it("keeps alternatives together and counts a skill once per posting", () => {
    const insights = buildInsights(
      [
        posting("a", [
          [must(["Vue", "Angular"], true), "missing"],
          [must(["Go"]), "partial"],
          [must(["Go"]), "missing"],
        ]),
      ],
      { targetCountries: [] },
    );
    expect(insights.gaps).toEqual([
      { skill: "Go", asked: 1, missing: 1, partial: 0 },
      { skill: "Vue / Angular", asked: 1, missing: 1, partial: 0 },
    ]);
  });

  it("leaves skipped and unmatched postings out of the gaps", () => {
    const insights = buildInsights(
      [
        posting("skipped", [[must(["Rust"]), "missing"]], {
          status: "skipped",
        }),
        posting("unmatched", [[must(["Rust"]), undefined]]),
      ],
      { targetCountries: [] },
    );
    expect(insights.gaps).toEqual([]);
    expect(insights.postings).toBe(1);
    expect(insights.matchedPostings).toBe(0);
    expect(insights.status.skipped).toBe(1);
    expect(insights.status.new).toBe(1);
  });

  it("counts countries and relocation, marking target countries", () => {
    const insights = buildInsights(
      [
        posting("a", [], { country: "NL", relocation: "yes" }),
        posting("b", [], { country: "NL", relocation: "no" }),
        posting("c", [], { country: null }),
      ],
      { targetCountries: ["NL"] },
    );
    expect(insights.countries).toEqual([
      { country: "NL", count: 2, target: true },
      { country: null, count: 1, target: false },
    ]);
    expect(insights.relocation).toEqual({ yes: 1, no: 1, not_stated: 1 });
  });
});
