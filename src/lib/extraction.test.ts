import { describe, expect, it } from "vitest";
import type { Requirement } from "@/lib/schemas";
import {
  cleanCountry,
  cleanExtraction,
  cleanFacts,
  cleanPartialRequirements,
  cleanRequirement,
  restoreCasing,
} from "./extraction";

const req = (overrides: Partial<Requirement>): Requirement => ({
  text: "React",
  kind: "must",
  category: "technology",
  skills: ["react"],
  anyOf: false,
  minYears: null,
  ...overrides,
});

const facts = {
  title: "Frontend Engineer",
  company: "Acme",
  country: "DE",
  city: "Berlin",
  workMode: "hybrid" as const,
  relocation: "not_stated" as const,
};

describe("cleanFacts", () => {
  it("normalises the country code", () => {
    expect(cleanCountry("de")).toBe("DE");
    expect(cleanCountry("UK")).toBe("GB");
    expect(cleanCountry("Germany")).toBeNull();
    expect(cleanCountry(null)).toBeNull();
  });

  it("turns blank text into null", () => {
    const cleaned = cleanFacts({ ...facts, city: "  ", company: " Acme " });
    expect(cleaned.city).toBeNull();
    expect(cleaned.company).toBe("Acme");
  });

  it("leaves missing (streaming) fields undefined", () => {
    expect(cleanFacts({ title: "Front" })).toEqual({
      title: "Front",
      company: undefined,
      city: undefined,
      country: undefined,
    });
  });
});

describe("cleanRequirement", () => {
  it("turns zero years into null and keeps positive years", () => {
    expect(cleanRequirement(req({ minYears: 0 })).minYears).toBeNull();
    expect(cleanRequirement(req({ minYears: 5 })).minYears).toBe(5);
  });

  it("normalises and de-duplicates skills", () => {
    expect(
      cleanRequirement(req({ skills: ["Next.js", "next-js", "React.js", " "] }))
        .skills,
    ).toEqual(["next-js", "react"]);
  });

  it("turns experience that names a technology into technology", () => {
    const r = cleanRequirement(
      req({
        text: "4+ years of React Native",
        category: "experience",
        skills: ["react-native"],
      }),
    );
    expect(r.category).toBe("technology");
  });

  it("keeps experience without technologies", () => {
    expect(
      cleanRequirement(req({ category: "experience", skills: [] })).category,
    ).toBe("experience");
  });

  it("only keeps anyOf with two or more skills", () => {
    expect(cleanRequirement(req({ skills: ["vite"], anyOf: true })).anyOf).toBe(
      false,
    );
    expect(
      cleanRequirement(req({ skills: ["vite", "webpack"], anyOf: true })).anyOf,
    ).toBe(true);
  });

  it("trims text", () => {
    expect(cleanRequirement(req({ text: "  React  " })).text).toBe("React");
  });
});

describe("alternatives, generic words and casing", () => {
  it("marks a list with 'or' as alternatives", () => {
    const r = cleanRequirement(
      req({
        text: "Build tools (Vite, webpack or Turbopack)",
        skills: ["vite", "webpack", "turbopack"],
        anyOf: false,
      }),
    );
    expect(r.anyOf).toBe(true);
  });

  it("ignores version phrases like 'or later'", () => {
    const r = cleanRequirement(
      req({
        text: "Angular (v17 or later) and TypeScript",
        skills: ["angular", "typescript"],
        anyOf: false,
      }),
    );
    expect(r.anyOf).toBe(false);
  });

  it("keeps 'and' lists as all required", () => {
    const r = cleanRequirement(
      req({ text: "React and TypeScript", skills: ["react", "typescript"] }),
    );
    expect(r.anyOf).toBe(false);
  });

  it("drops generic words from skills", () => {
    const r = cleanRequirement(req({ skills: ["nx", "pnpm", "workspaces"] }));
    expect(r.skills).toEqual(["nx", "pnpm"]);
  });

  it("restores the posting's casing", () => {
    const posting = "## Must have\n- Angular (v17 or later) and TypeScript.\n";
    expect(
      restoreCasing("angular (v17 or later) and typescript", posting),
    ).toBe("Angular (v17 or later) and TypeScript");
    expect(restoreCasing("not in the posting", posting)).toBe(
      "not in the posting",
    );
  });

  it("applies the posting's casing in cleanExtraction", () => {
    const posting = "- Experience with Storybook.";
    const { requirements } = cleanExtraction(
      {
        facts,
        requirements: [
          req({ text: "experience with storybook", skills: ["storybook"] }),
        ],
      },
      posting,
    );
    expect(requirements[0].text).toBe("Experience with Storybook");
  });
});

describe("cleanExtraction", () => {
  it("drops exact duplicates and keeps order", () => {
    const result = cleanExtraction({
      facts,
      requirements: [
        req({ text: "React", skills: ["react"] }),
        req({ text: "TypeScript", skills: ["typescript"] }),
        req({ text: "react", skills: ["React"] }),
      ],
    });
    expect(result.requirements.map((r) => r.text)).toEqual([
      "React",
      "TypeScript",
    ]);
  });
});

describe("cleanPartialRequirements", () => {
  it("keeps incomplete items and hides complete duplicates", () => {
    const items = cleanPartialRequirements([
      { text: "React", category: "technology", skills: ["react"] },
      { text: "React", category: "technology", skills: ["react"] },
      { text: "Type", skills: ["type"] },
      undefined,
    ]);
    expect(items).toHaveLength(3);
  });
});
