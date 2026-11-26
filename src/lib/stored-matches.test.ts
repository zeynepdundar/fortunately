import { describe, expect, it } from "vitest";
import { countVerdicts, rebuildMatches } from "./stored-matches";

const lines = [
  { n: 1, text: "Alex Rivera" },
  { n: 2, text: "Built a design system in React" },
];

describe("rebuildMatches", () => {
  it("returns matches in requirement order with the cited lines' text", () => {
    const result = rebuildMatches(
      ["r0", "r1", "r2"],
      [
        {
          requirementId: "r1",
          verdict: "met",
          evidenceLines: [2],
          rationale: "React",
          verified: true,
        },
        {
          requirementId: "r0",
          verdict: "missing",
          evidenceLines: [],
          rationale: "None",
          verified: true,
        },
      ],
      lines,
    );
    expect(result[0]).toMatchObject({
      requirementIndex: 0,
      verdict: "missing",
      evidence: [],
    });
    expect(result[1]).toEqual({
      requirementIndex: 1,
      verdict: "met",
      evidence: [{ n: 2, text: "Built a design system in React" }],
      rationale: "React",
      verified: true,
    });
    expect(result[2]).toBeUndefined();
  });

  it("drops evidence lines missing from the CV", () => {
    const [m] = rebuildMatches(
      ["r0"],
      [
        {
          requirementId: "r0",
          verdict: "met",
          evidenceLines: [2, 9],
          rationale: "",
          verified: true,
        },
      ],
      lines,
    );
    expect(m?.evidence.map((e) => e.n)).toEqual([2]);
  });
});

describe("countVerdicts", () => {
  it("counts each verdict and ignores gaps", () => {
    expect(
      countVerdicts([
        { verdict: "met" },
        undefined,
        { verdict: "met" },
        { verdict: "missing" },
      ]),
    ).toEqual({
      met: 2,
      partial: 0,
      missing: 1,
    });
  });
});
