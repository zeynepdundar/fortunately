import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { EXTRACTION_INSTRUCTIONS, streamExtraction } from "./extract";

const extraction = {
  requirements: [
    {
      text: "5+ years of frontend experience",
      kind: "must",
      category: "experience",
      skill: null,
      minYears: 5,
    },
    {
      text: "Strong React skills",
      kind: "must",
      category: "technology",
      skill: "react",
      minYears: null,
    },
    {
      text: "GraphQL",
      kind: "nice",
      category: "technology",
      skill: "graphql",
      minYears: null,
    },
  ],
};

/** A mock model that streams the JSON in small chunks, like a real provider. */
function mockModel(json: string) {
  const deltas = json.match(/[\s\S]{1,24}/g) ?? [];
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t1" },
          ...deltas.map((delta) => ({
            type: "text-delta" as const,
            id: "t1",
            delta,
          })),
          { type: "text-end", id: "t1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: {
                total: 120,
                noCache: 120,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: { total: 80, text: 80, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

describe("streamExtraction", () => {
  it("streams partial objects and resolves a schema-valid extraction", async () => {
    const model = mockModel(JSON.stringify(extraction));
    const result = streamExtraction({
      model,
      posting: "Senior Frontend Engineer ...",
    });

    const partialCounts: number[] = [];
    for await (const partial of result.partialOutputStream) {
      partialCounts.push(partial.requirements?.length ?? 0);
    }

    expect(partialCounts.length).toBeGreaterThan(1);
    expect(partialCounts.at(-1)).toBe(3);
    await expect(result.output).resolves.toEqual(extraction);
  });

  it("sends the instructions and wraps the posting", async () => {
    const model = mockModel(JSON.stringify({ requirements: [] }));
    const result = streamExtraction({ model, posting: "POSTING BODY" });
    await result.output;

    const call = model.doStreamCalls[0];
    const text = JSON.stringify(call.prompt);
    expect(text).toContain(
      JSON.stringify(EXTRACTION_INSTRUCTIONS).slice(1, 60),
    );
    expect(text).toContain("<posting>\\nPOSTING BODY\\n</posting>");
  });
});
