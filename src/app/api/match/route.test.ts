import { afterEach, describe, expect, it, vi } from "vitest";
import { KEY_HEADER } from "@/lib/api/extract-contract";

const dbEnabled = vi.fn(() => true);
vi.mock("@/db", () => ({ isDbEnabled: () => dbEnabled() }));
vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/provider")>()),
  getModel: vi.fn(() => "mock-model"),
}));
vi.mock("@/lib/persistence/workspace", () => ({
  readWorkspaceId: vi.fn(async () => "ws-1"),
}));

const ready = {
  status: "ready" as const,
  requirementIds: ["r0", "r1"],
  requirements: [
    {
      text: "React",
      kind: "must",
      category: "technology",
      skills: ["react"],
      anyOf: false,
      minYears: null,
    },
    {
      text: "Go",
      kind: "must",
      category: "technology",
      skills: ["go"],
      anyOf: false,
      minYears: null,
    },
  ],
  cv: { id: "cv-1", lines: [{ n: 1, text: "Built apps in React" }] },
};
vi.mock("@/lib/persistence/matches", () => ({
  waitForMatchContext: vi.fn(async () => ready),
  saveMatches: vi.fn(async () => {}),
}));

const modelMatches = [
  {
    requirementIndex: 0,
    verdict: "met",
    evidenceLines: [1],
    rationale: "Used React.",
  },
  {
    requirementIndex: 1,
    verdict: "met",
    evidenceLines: [7],
    rationale: "Invented line.",
  },
];
vi.mock("@/lib/ai/match", () => ({
  streamMatches: vi.fn(() => ({
    partialOutputStream: (async function* () {
      yield { matches: modelMatches };
    })(),
    output: Promise.resolve({ matches: modelMatches }),
  })),
}));

const { POST } = await import("./route");
const { waitForMatchContext, saveMatches } =
  await import("@/lib/persistence/matches");

const body = {
  analysisId: "0b6c6a4e-1f7e-4a39-9a43-2f1d5f1c9e10",
  provider: "openai",
  modelId: "m",
};
const request = (b: unknown, key = "sk-test") =>
  new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "content-type": "application/json", [KEY_HEADER]: key },
    body: JSON.stringify(b),
  });

afterEach(() => {
  vi.clearAllMocks();
  dbEnabled.mockReturnValue(true);
});

describe("POST /api/match", () => {
  it("rejects an invalid analysis id", async () => {
    const res = await POST(request({ ...body, analysisId: "nope" }));
    expect(res.status).toBe(400);
  });

  it("needs a database", async () => {
    dbEnabled.mockReturnValue(false);
    const res = await POST(request(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "db_required" });
  });

  it("needs an API key for cloud providers", async () => {
    const res = await POST(request(body, ""));
    expect(res.status).toBe(401);
  });

  it("asks for a CV when the profile has none", async () => {
    vi.mocked(waitForMatchContext).mockResolvedValueOnce({ status: "no_cv" });
    const res = await POST(request(body));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "no_cv" });
  });

  it("streams checked matches and saves them", async () => {
    const res = await POST(request(body));
    const json = JSON.parse(await res.text());
    expect(json.matches).toEqual([
      {
        requirementIndex: 0,
        verdict: "met",
        evidence: [{ n: 1, text: "Built apps in React" }],
        rationale: "Used React.",
        verified: true,
      },
      {
        requirementIndex: 1,
        verdict: "missing",
        evidence: [],
        rationale: "Invented line.",
        verified: false,
      },
    ]);
    expect(saveMatches).toHaveBeenCalledWith(
      body.analysisId,
      "cv-1",
      ["r0", "r1"],
      expect.arrayContaining([
        expect.objectContaining({ requirementIndex: 1, verified: false }),
      ]),
    );
  });
});
