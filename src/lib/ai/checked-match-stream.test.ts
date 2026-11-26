import { describe, expect, it, vi } from "vitest";
import { toNumberedLines } from "@/lib/cv";
import { CheckedMatches, type Match } from "@/lib/schemas";
import {
  createCheckedMatchStream,
  type MatchSource,
} from "./checked-match-stream";

const lines = toNumberedLines(`Alex Rivera
Built a design system in React and TypeScript
Wrote Playwright end-to-end tests`);

const m = (
  requirementIndex: number,
  verdict: Match["verdict"],
  evidenceLines: number[],
): Match => ({
  requirementIndex,
  verdict,
  evidenceLines,
  rationale: "because",
});

/** Simulates the AI SDK: partial objects grow one item at a time, then the final output. */
function source(final: Match[]): MatchSource {
  return {
    partialOutputStream: (async function* () {
      for (let i = 1; i <= final.length; i++)
        yield { matches: final.slice(0, i) };
    })(),
    output: Promise.resolve({ matches: final }),
  };
}

async function readAll(stream: ReadableStream<string>) {
  const chunks: string[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return { chunks, json: CheckedMatches.parse(JSON.parse(chunks.join(""))) };
}

describe("createCheckedMatchStream", () => {
  it("emits verified matches with the cited lines' text", async () => {
    const { json } = await readAll(
      createCheckedMatchStream({
        source: source([m(0, "met", [2])]),
        requirementCount: 1,
        lines,
      }),
    );
    expect(json.matches[0]).toEqual({
      requirementIndex: 0,
      verdict: "met",
      evidence: [
        { n: 2, text: "Built a design system in React and TypeScript" },
      ],
      rationale: "because",
      verified: true,
    });
  });

  it("downgrades a match that cites a line that does not exist", async () => {
    const { json } = await readAll(
      createCheckedMatchStream({
        source: source([m(0, "met", [42])]),
        requirementCount: 1,
        lines,
      }),
    );
    expect(json.matches[0]).toMatchObject({
      verdict: "missing",
      evidence: [],
      verified: false,
    });
  });

  it("emits each match as soon as the next one starts", async () => {
    const { chunks } = await readAll(
      createCheckedMatchStream({
        source: source([
          m(0, "met", [2]),
          m(1, "partial", [3]),
          m(2, "missing", []),
        ]),
        requirementCount: 3,
        lines,
      }),
    );
    // opening + 3 matches + closing
    expect(chunks).toHaveLength(5);
  });

  it("adds skipped requirements as missing and ignores out-of-range or duplicate indexes", async () => {
    const onComplete = vi.fn();
    const { json } = await readAll(
      createCheckedMatchStream({
        source: source([
          m(1, "met", [2]),
          m(1, "missing", []),
          m(9, "met", [2]),
        ]),
        requirementCount: 2,
        lines,
        onComplete,
      }),
    );
    expect(json.matches.map((x) => [x.requirementIndex, x.verdict])).toEqual([
      [1, "met"],
      [0, "missing"],
    ]);
    expect(
      onComplete.mock.calls[0][0].map(
        (x: { requirementIndex: number }) => x.requirementIndex,
      ),
    ).toEqual([0, 1]);
  });

  it("calls onFailure and errors the stream when the model fails", async () => {
    const onFailure = vi.fn();
    const failing: MatchSource = {
      partialOutputStream: (async function* () {
        yield { matches: [] };
      })(),
      output: Promise.reject(new Error("model failed")),
    };
    await expect(
      readAll(
        createCheckedMatchStream({
          source: failing,
          requirementCount: 1,
          lines,
          onFailure,
        }),
      ),
    ).rejects.toThrow("model failed");
    expect(onFailure).toHaveBeenCalled();
  });
});
