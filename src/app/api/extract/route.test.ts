import { afterEach, describe, expect, it, vi } from "vitest";

const posting =
  "Senior Frontend Engineer. Requirements: 5+ years of React and TypeScript. ".repeat(
    2,
  );

vi.mock("@/lib/ai/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/provider")>();
  return { ...actual, getModel: vi.fn(() => "mock-model") };
});
vi.mock("@/lib/ai/extract", () => ({
  streamExtraction: vi.fn(() => ({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: "text-delta",
          id: "t1",
          text: '{"requirements":[]}',
        });
        controller.close();
      },
    }),
  })),
}));

const { POST } = await import("./route");
const { KEY_HEADER } = await import("@/lib/api/extract-contract");
const { getModel } = await import("@/lib/ai/provider");
const { streamExtraction } = await import("@/lib/ai/extract");

function request(body: unknown, key?: string) {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { [KEY_HEADER]: key } : {}),
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("POST /api/extract", () => {
  it("returns 401 without an API key", async () => {
    const res = await POST(
      request({ posting, provider: "anthropic", modelId: "m" }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "missing_key" });
  });

  it("returns 400 for a posting that is too short", async () => {
    const res = await POST(
      request(
        { posting: "too short", provider: "anthropic", modelId: "m" },
        "sk-test",
      ),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "invalid_input",
      issues: { posting: expect.any(Array) },
    });
  });

  it("returns 400 for an unknown provider", async () => {
    const res = await POST(
      request({ posting, provider: "acme", modelId: "m" }, "sk-test"),
    );
    expect(res.status).toBe(400);
  });

  it("streams the extraction with the key from the header", async () => {
    const res = await POST(
      request({ posting, provider: "openai", modelId: "m" }, " sk-test "),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"requirements":[]}');
    expect(getModel).toHaveBeenCalledWith({
      provider: "openai",
      modelId: "m",
      apiKey: "sk-test",
    });
  });

  it("allows Ollama without a key", async () => {
    const res = await POST(
      request({ posting, provider: "ollama", modelId: "qwen3:8b" }),
    );
    expect(res.status).toBe(200);
    expect(getModel).toHaveBeenCalledWith({
      provider: "ollama",
      modelId: "qwen3:8b",
      apiKey: undefined,
    });
  });

  it("rejects Ollama in production unless OLLAMA_BASE_URL is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OLLAMA_BASE_URL", "");
    const res = await POST(
      request({ posting, provider: "ollama", modelId: "qwen3:8b" }),
    );
    vi.unstubAllEnvs();
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "provider_disabled" });
  });

  it("disables thinking for qwen3 on Ollama unless asked", async () => {
    await POST(request({ posting, provider: "ollama", modelId: "qwen3:8b" }));
    expect(streamExtraction).toHaveBeenLastCalledWith(
      expect.objectContaining({ disableThinking: true }),
    );

    await POST(
      request({
        posting,
        provider: "ollama",
        modelId: "qwen3:8b",
        thinking: true,
      }),
    );
    expect(streamExtraction).toHaveBeenLastCalledWith(
      expect.objectContaining({ disableThinking: false }),
    );

    await POST(
      request({ posting, provider: "ollama", modelId: "llama3.1:8b" }),
    );
    expect(streamExtraction).toHaveBeenLastCalledWith(
      expect.objectContaining({ disableThinking: false }),
    );
  });

  it("does not echo the key in error responses", async () => {
    const res = await POST(
      request(
        { posting: "x", provider: "anthropic", modelId: "m" },
        "sk-secret-123",
      ),
    );
    expect(await res.text()).not.toContain("sk-secret-123");
  });
});
