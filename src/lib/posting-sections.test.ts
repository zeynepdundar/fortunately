import { describe, expect, it } from "vitest";
import { niceSectionHint, niceSections } from "./posting-sections";

describe("niceSections", () => {
  it("counts bullets under markdown, bold and colon headings", () => {
    const posting = [
      "## Requirements",
      "- TypeScript",
      "",
      "## Nice to have",
      "",
      "- Vue.js.",
      "- Docker.",
      "",
      "**Bonus points**",
      "1. GraphQL",
      "Preferred:",
      "* Kotlin",
      "## What we offer",
      "- Equity",
    ].join("\n");
    expect(niceSections(posting)).toEqual([
      { heading: "Nice to have", lines: 2 },
      { heading: "Bonus points", lines: 1 },
      { heading: "Preferred", lines: 1 },
    ]);
  });

  it("ignores postings without such a section", () => {
    expect(niceSections("## Requirements\n- Go\n- Rust")).toEqual([]);
    expect(niceSectionHint("## Requirements\n- Go")).toBe("");
  });

  it("writes one hint sentence", () => {
    expect(niceSectionHint("## Bonus\n- Dutch\n- Legal domain")).toBe(
      'This posting has nice-to-have sections: "Bonus" (2 lines). Return every one of those lines as its own entry with kind "nice".',
    );
  });
});
