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
  EXTRACTION_PROMPT_VERSION: "test-v",
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

vi.mock("@/lib/persistence/workspace", () => ({
  getOrCreateWorkspaceId: vi.fn(async () => null),
}));
vi.mock("@/lib/persistence/analyses", () => ({
  startAnalysis: vi.fn(async () => "analysis-1"),
  finishAnalysis: vi.fn(async () => {}),
  failAnalysis: vi.fn(async () => {}),
}));

const { POST } = await import("./route");
const { getOrCreateWorkspaceId } = await import("@/lib/persistence/workspace");
const { startAnalysis } = await import("@/lib/persistence/analyses");
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

  it("does not save or send an analysis id without a database", async () => {
    const res = await POST(
      request({ posting, provider: "openai", modelId: "m" }, "sk-test"),
    );
    expect(res.headers.get("x-analysis-id")).toBeNull();
    expect(startAnalysis).not.toHaveBeenCalled();
  });

  it("opens an analysis and returns its id when a workspace exists", async () => {
    vi.mocked(getOrCreateWorkspaceId).mockResolvedValueOnce("ws-1");
    const res = await POST(
      request({ posting, provider: "openai", modelId: "m" }, "sk-test"),
    );
    expect(res.headers.get("x-analysis-id")).toBe("analysis-1");
    expect(startAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        provider: "openai",
        modelId: "m",
      }),
    );
  });

  it("still streams when saving fails", async () => {
    vi.mocked(getOrCreateWorkspaceId).mockRejectedValueOnce(
      new Error("db down"),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(
      request({ posting, provider: "openai", modelId: "m" }, "sk-test"),
    );
    spy.mockRestore();
    expect(res.status).toBe(200);
    expect(res.headers.get("x-analysis-id")).toBeNull();
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
