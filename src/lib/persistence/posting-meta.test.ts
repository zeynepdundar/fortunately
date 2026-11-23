import { describe, expect, it } from "vitest";
import { postingHash, postingTitle } from "./posting-meta";

describe("postingHash", () => {
  it("ignores whitespace and case differences", () => {
    expect(postingHash("Senior  Engineer\n\nReact")).toBe(
      postingHash("senior engineer react"),
    );
  });

  it("differs for different postings", () => {
    expect(postingHash("React")).not.toBe(postingHash("Vue"));
  });
});

describe("postingTitle", () => {
  it("uses the first heading without #", () => {
    expect(
      postingTitle("\n# Senior Frontend Engineer — Lumora Pay\n\nBody"),
    ).toBe("Senior Frontend Engineer — Lumora Pay");
  });

  it("truncates long first lines", () => {
    expect(postingTitle("x".repeat(200))).toHaveLength(118);
  });
});
