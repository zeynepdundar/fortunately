import { describe, expect, it } from "vitest";
import { normalizeSkill } from "@/lib/skills";
import { loadCases } from "./cases";

const cases = loadCases();

describe("eval cases", () => {
  it("load and validate", () => {
    expect(cases.length).toBeGreaterThanOrEqual(5);
  });

  it.each(cases.map((c) => [c.id, c] as const))(
    "%s: gold follows the extraction rules",
    (_, c) => {
      expect(c.posting).toContain("(fictional)");
      for (const r of c.gold.requirements) {
        // Gold text is copied from the posting.
        expect(c.posting.toLowerCase()).toContain(r.text.toLowerCase());
        // Skills are canonical slugs.
        for (const s of r.skills) expect(normalizeSkill(s)).toBe(s);
        expect(r.anyOf && r.skills.length < 2).toBe(false);
        if (r.skills.length > 0) expect(r.category).toBe("technology");
        expect(r.minYears === null || r.minYears > 0).toBe(true);
      }
    },
  );
});
