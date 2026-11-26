import { describe, expect, it } from "vitest";
import { parseCountries, ProfileInput } from "./schema";

const base = {
  yearsOfExperience: "7",
  targetCountries: "de, nl",
  relocationNeeded: true,
  cvText: "Alex",
};

describe("parseCountries", () => {
  it("upper-cases, splits on commas and spaces, and de-duplicates", () => {
    expect(parseCountries("de, NL  dk;de")).toEqual(["DE", "NL", "DK"]);
  });

  it("returns an empty list for empty input", () => {
    expect(parseCountries("  ")).toEqual([]);
  });
});

describe("ProfileInput", () => {
  it("parses a valid profile", () => {
    expect(ProfileInput.parse(base)).toEqual({
      yearsOfExperience: 7,
      targetCountries: ["DE", "NL"],
      relocationNeeded: true,
      cvText: "Alex",
    });
  });

  it("treats empty years as unknown", () => {
    expect(
      ProfileInput.parse({ ...base, yearsOfExperience: "" }).yearsOfExperience,
    ).toBeNull();
  });

  it("rejects country names instead of codes", () => {
    expect(
      ProfileInput.safeParse({ ...base, targetCountries: "Germany" }).success,
    ).toBe(false);
  });

  it("rejects negative years", () => {
    expect(
      ProfileInput.safeParse({ ...base, yearsOfExperience: "-1" }).success,
    ).toBe(false);
  });
});
