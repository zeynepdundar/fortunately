import { describe, expect, it } from "vitest";
import type { Extraction, Requirement } from "@/lib/schemas";
import { pairRequirements, scoreCase, similarity, summarize } from "./score";

const req = (
  text: string,
  overrides: Partial<Requirement> = {},
): Requirement => ({
  text,
  kind: "must",
  category: "technology",
  skills: [],
  anyOf: false,
  minYears: null,
  ...overrides,
});

const facts: Extraction["facts"] = {
  title: "Engineer",
  company: "Acme",
  country: "DE",
  city: "Berlin",
  workMode: "hybrid",
  relocation: "yes",
};

describe("similarity", () => {
  it("compares skill sets", () => {
    expect(
      similarity(
        req("React and TypeScript", { skills: ["react", "typescript"] }),
        req("TypeScript, React", { skills: ["TypeScript", "reactjs"] }),
      ),
    ).toBe(1);
    expect(
      similarity(
        req("React", { skills: ["react"] }),
        req("Vue", { skills: ["vue"] }),
      ),
    ).toBe(0);
  });

  it("pairs the same line even when the skills are missing", () => {
    expect(
      similarity(
        req("1+ years of experience with JavaScript", {
          category: "experience",
        }),
        req("1+ years of experience with JavaScript", {
          skills: ["javascript"],
        }),
      ),
    ).toBe(1);
  });

  it("compares words when neither item names technologies", () => {
    expect(
      similarity(
        req("Strong written communication", { category: "soft_skill" }),
        req("Written communication skills", { category: "soft_skill" }),
      ),
    ).toBeGreaterThanOrEqual(0.5);
  });
});

describe("pairRequirements", () => {
  it("pairs one to one, most similar first", () => {
    const pairs = pairRequirements(
      [req("Go", { skills: ["go"] }), req("React", { skills: ["react"] })],
      [req("React", { skills: ["react"] }), req("Rust", { skills: ["rust"] })],
    );
    expect(pairs).toEqual([{ predicted: 1, gold: 0, similarity: 1 }]);
  });
});

describe("scoreCase and summarize", () => {
  const gold: Extraction = {
    facts,
    requirements: [
      req("4+ years of React", { skills: ["react"], minYears: 4 }),
      req("PostgreSQL", { skills: ["postgresql"] }),
      req("Fluent German", { kind: "nice", category: "other" }),
    ],
  };

  it("scores a perfect prediction as 1", () => {
    const summary = summarize([scoreCase(gold, gold)]);
    expect(summary.f1).toBe(1);
    expect(summary.kindAccuracy).toBe(1);
    expect(summary.minYearsAccuracy).toBe(1);
    expect(summary.factsAccuracy.relocation).toBe(1);
  });

  it("counts misses, extras and wrong fields", () => {
    const predicted: Extraction = {
      facts: { ...facts, relocation: "not_stated" },
      requirements: [
        req("React", { skills: ["react"], minYears: null }),
        req("Docker", { skills: ["docker"] }),
      ],
    };
    const score = scoreCase(predicted, gold);
    expect(score.paired).toBe(1);
    expect(score.missed).toEqual(["PostgreSQL", "Fluent German"]);
    expect(score.extra).toEqual(["Docker"]);
    expect(score.minYears).toEqual({ correct: 0, total: 1 });
    expect(score.facts.relocation).toEqual({ correct: 0, total: 1 });

    const summary = summarize([score]);
    expect(summary.precision).toBe(0.5);
    expect(summary.recall).toBeCloseTo(1 / 3);
    expect(summary.skillPrecision).toBe(0.5);
    expect(summary.skillRecall).toBe(0.5);
  });
});
