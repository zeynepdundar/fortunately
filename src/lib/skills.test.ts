import { describe, expect, it } from "vitest";
import { normalizeSkill } from "./skills";

describe("normalizeSkill", () => {
  it.each([
    ["React", "react"],
    ["React.js", "react"],
    ["Next.js", "next-js"],
    ["Node.js", "node-js"],
    ["TanStack Query", "tanstack-query"],
    ["react-query", "tanstack-query"],
    ["GitHub Actions", "github-actions"],
    ["Postgres", "postgresql"],
    ["C#", "c#"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeSkill(input)).toBe(expected);
  });

  it("returns null for empty input", () => {
    expect(normalizeSkill(null)).toBeNull();
    expect(normalizeSkill("  ")).toBeNull();
  });
});
