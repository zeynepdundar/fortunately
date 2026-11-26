import { describe, expect, it } from "vitest";
import {
  CriteriaConfig,
  DEFAULT_CRITERIA,
  parseStoredCriteria,
} from "./config";

describe("CriteriaConfig", () => {
  it("accepts the defaults", () => {
    expect(CriteriaConfig.safeParse(DEFAULT_CRITERIA).success).toBe(true);
  });

  it("needs at least one accepted work mode", () => {
    const none = {
      ...DEFAULT_CRITERIA,
      preferences: {
        ...DEFAULT_CRITERIA.preferences,
        workMode: { ...DEFAULT_CRITERIA.preferences.workMode, accepted: [] },
      },
    };
    expect(CriteriaConfig.safeParse(none).success).toBe(false);
  });
});

describe("parseStoredCriteria", () => {
  it("falls back to the defaults for null, old or invalid data", () => {
    expect(parseStoredCriteria(null)).toEqual({
      config: DEFAULT_CRITERIA,
      isDefault: true,
    });
    expect(parseStoredCriteria({ version: 2, matchProfile: "strict" })).toEqual(
      {
        config: DEFAULT_CRITERIA,
        isDefault: true,
      },
    );
  });

  it("returns a valid stored config", () => {
    const stored = { ...DEFAULT_CRITERIA, allowedMissingMust: 0 };
    expect(parseStoredCriteria(stored)).toEqual({
      config: stored,
      isDefault: false,
    });
  });
});
