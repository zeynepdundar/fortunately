import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { EXTRACTION_INSTRUCTIONS, streamExtraction } from "./extract";

const extraction = {
  facts: {
    title: "Senior Frontend Engineer",
    company: "Lumora Pay",
    country: null,
    city: null,
    workMode: "remote",
    relocation: "not_stated",
  },
  requirements: [
    {
      text: "5+ years of frontend experience",
      kind: "must",
      category: "experience",
      skills: [],
      anyOf: false,
      minYears: 5,
    },
    {
      text: "Strong React skills",
      kind: "must",
      category: "technology",
      skills: ["react"],
      anyOf: false,
      minYears: null,
    },
    {
      text: "GraphQL",
      kind: "nice",
      category: "technology",
      skills: ["graphql"],
      anyOf: false,
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
    const model = mockModel(
      JSON.stringify({ facts: extraction.facts, requirements: [] }),
    );
    const result = streamExtraction({ model, posting: "POSTING BODY" });
    await result.output;

    const call = model.doStreamCalls[0];
    const text = JSON.stringify(call.prompt);
    expect(text).toContain(
      JSON.stringify(EXTRACTION_INSTRUCTIONS).slice(1, 60),
    );
    expect(text).toContain("<posting>\\nPOSTING BODY\\n</posting>");
  });

  it("turns thinking off only when asked", async () => {
    const off = mockModel(
      JSON.stringify({ facts: extraction.facts, requirements: [] }),
    );
    await streamExtraction({
      model: off,
      posting: "BODY",
      disableThinking: true,
    }).output;
    expect(JSON.stringify(off.doStreamCalls[0].prompt)).toContain(
      "/no_think\\nJob posting",
    );
    expect(off.doStreamCalls[0].providerOptions).toEqual({
      ollama: { reasoningEffort: "none" },
    });

    const on = mockModel(
      JSON.stringify({ facts: extraction.facts, requirements: [] }),
    );
    await streamExtraction({ model: on, posting: "BODY" }).output;
    expect(JSON.stringify(on.doStreamCalls[0].prompt)).not.toContain(
      "/no_think",
    );
    expect(on.doStreamCalls[0].providerOptions?.ollama).toBeUndefined();
  });
});
