import { describe, expect, it } from "vitest";
import {
  END,
  renderTable,
  replaceBetweenMarkers,
  START,
  type RunResult,
} from "./report";

const run = (model: string, f1: number): RunResult => ({
  provider: "ollama",
  model,
  promptVersion: "extract-v5",
  thinking: false,
  date: "2026-11-27T12:00:00.000Z",
  failures: 0,
  medianLatencyMs: 4200,
  summary: {
    cases: 5,
    precision: f1,
    recall: f1,
    f1,
    skillPrecision: 1,
    skillRecall: 1,
    kindAccuracy: 1,
    categoryAccuracy: 1,
    anyOfAccuracy: 1,
    minYearsAccuracy: 1,
    factsAccuracy: { country: 1, workMode: 1, relocation: 0.8 },
  },
  cases: [],
});

describe("report", () => {
  it("renders one row per run, best F1 first", () => {
    const table = renderTable([run("a", 0.5), run("b", 0.9)]);
    const rows = table.split("\n").slice(2);
    expect(rows[0]).toContain("ollama:b");
    expect(rows[0]).toContain("| 90% |");
    expect(rows[0]).toContain("| 4.2 s |");
    expect(rows[1]).toContain("ollama:a");
  });

  it("replaces only the text between the markers", () => {
    const doc = `intro\n${START}\nold\n${END}\noutro`;
    expect(replaceBetweenMarkers(doc, "new")).toBe(
      `intro\n${START}\nnew\n${END}\noutro`,
    );
    expect(() => replaceBetweenMarkers("no markers", "x")).toThrow();
  });
});
