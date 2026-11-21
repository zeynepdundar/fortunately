import { describe, expect, it } from "vitest";
import { formatForPrompt, toNumberedLines, verifyMatch } from "./cv";

const cv = toNumberedLines(`Alex Rivera
Frontend Engineer

Built a design system in React and TypeScript
Led migration from Webpack to Vite`);

describe("toNumberedLines", () => {
  it("drops blank lines and numbers from 1", () => {
    expect(cv).toHaveLength(4);
    expect(cv[2]).toEqual({
      n: 3,
      text: "Built a design system in React and TypeScript",
    });
  });

  it("formats lines for the prompt", () => {
    expect(formatForPrompt(cv.slice(0, 1))).toBe("1| Alex Rivera");
  });
});

describe("verifyMatch", () => {
  const base = { requirementIndex: 0, rationale: "" };

  it("keeps a met verdict whose lines exist", () => {
    const r = verifyMatch(
      { ...base, verdict: "met", evidenceLines: [3, 3] },
      cv,
    );
    expect(r).toMatchObject({
      verdict: "met",
      evidenceLines: [3],
      verified: true,
    });
  });

  it("downgrades a verdict that cites a line that does not exist", () => {
    const r = verifyMatch(
      { ...base, verdict: "met", evidenceLines: [3, 99] },
      cv,
    );
    expect(r).toMatchObject({
      verdict: "missing",
      evidenceLines: [],
      verified: false,
    });
  });

  it("downgrades a partial verdict with no evidence", () => {
    const r = verifyMatch(
      { ...base, verdict: "partial", evidenceLines: [] },
      cv,
    );
    expect(r.verdict).toBe("missing");
    expect(r.verified).toBe(false);
  });

  it("accepts a missing verdict as is", () => {
    const r = verifyMatch(
      { ...base, verdict: "missing", evidenceLines: [2] },
      cv,
    );
    expect(r).toMatchObject({
      verdict: "missing",
      evidenceLines: [],
      verified: true,
    });
  });
});
