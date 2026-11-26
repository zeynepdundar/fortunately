import { describe, expect, it } from "vitest";
import type { Requirement } from "@/lib/schemas";
import { formatRequirements } from "./match";

const req = (o: Partial<Requirement>): Requirement => ({
  text: "React",
  kind: "must",
  category: "technology",
  skills: ["react"],
  anyOf: false,
  minYears: null,
  ...o,
});

describe("formatRequirements", () => {
  it("numbers requirements and marks alternatives and years", () => {
    expect(
      formatRequirements([
        req({
          text: "Strong React and TypeScript skills",
          skills: ["react", "typescript"],
        }),
        req({
          text: "Vite or webpack",
          skills: ["vite", "webpack"],
          anyOf: true,
          minYears: 3,
        }),
        req({
          text: "Fluent English",
          kind: "nice",
          category: "other",
          skills: [],
        }),
      ]),
    ).toBe(
      [
        "[0] must · technology · all of: react, typescript — Strong React and TypeScript skills",
        "[1] must · technology · one of: vite, webpack · 3+ years — Vite or webpack",
        "[2] nice · other — Fluent English",
      ].join("\n"),
    );
  });
});
