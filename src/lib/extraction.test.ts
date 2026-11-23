import { describe, expect, it } from "vitest";
import type { Requirement } from "@/lib/schemas";
import {
  cleanExtraction,
  cleanPartialRequirements,
  cleanRequirement,
} from "./extraction";

const req = (overrides: Partial<Requirement>): Requirement => ({
  text: "React",
  kind: "must",
  category: "technology",
  skill: "react",
  minYears: null,
  ...overrides,
});

describe("cleanRequirement", () => {
  it("turns zero years into null", () => {
    expect(cleanRequirement(req({ minYears: 0 })).minYears).toBeNull();
  });

  it("keeps positive years", () => {
    expect(cleanRequirement(req({ minYears: 5 })).minYears).toBe(5);
  });

  it("normalises the skill slug", () => {
    expect(cleanRequirement(req({ skill: "Next.js" })).skill).toBe("next-js");
  });

  it("drops the skill on non-technology items", () => {
    expect(
      cleanRequirement(req({ category: "experience", skill: "react" })).skill,
    ).toBeNull();
  });

  it("trims text", () => {
    expect(cleanRequirement(req({ text: "  React  " })).text).toBe("React");
  });
});

describe("cleanExtraction", () => {
  it("drops exact duplicates and keeps order", () => {
    const result = cleanExtraction({
      requirements: [
        req({ text: "React", skill: "react" }),
        req({ text: "TypeScript", skill: "typescript" }),
        req({ text: "react", skill: "React" }),
      ],
    });
    expect(result.requirements.map((r) => r.skill)).toEqual([
      "react",
      "typescript",
    ]);
  });

  it("keeps entries that share text but name different skills", () => {
    const result = cleanExtraction({
      requirements: [
        req({ text: "React and TypeScript", skill: "react" }),
        req({ text: "React and TypeScript", skill: "typescript" }),
      ],
    });
    expect(result.requirements).toHaveLength(2);
  });
});

describe("cleanPartialRequirements", () => {
  it("keeps incomplete items and hides complete duplicates", () => {
    const items = cleanPartialRequirements([
      { text: "React", category: "technology", skill: "react" },
      { text: "React", category: "technology", skill: "react" },
      { text: "Type" },
      undefined,
    ]);
    expect(items).toHaveLength(3);
  });
});
