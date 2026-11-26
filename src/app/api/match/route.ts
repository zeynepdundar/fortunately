import { createTextStreamResponse } from "ai";
import { z } from "zod";
import { isDbEnabled } from "@/db";
import { createCheckedMatchStream } from "@/lib/ai/checked-match-stream";
import { streamMatches } from "@/lib/ai/match";
import { MatchRequest } from "@/lib/api/match-contract";
import { modelFromRequest } from "@/lib/api/model-access";
import { saveMatches, waitForMatchContext } from "@/lib/persistence/matches";
import { readWorkspaceId } from "@/lib/persistence/workspace";

export const maxDuration = 60;

const fail = (status: number, error: string, message: string) =>
  Response.json({ error, message }, { status });

export async function POST(req: Request) {
  const parsed = MatchRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_input",
        issues: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }
  const { analysisId, provider, modelId, thinking } = parsed.data;

  if (!isDbEnabled()) {
    return fail(
      400,
      "db_required",
      "Matching needs a database (DATABASE_URL) for your profile CV.",
    );
  }

  const access = modelFromRequest(req, { provider, modelId, thinking });
  if (!access.ok) return access.response;

  const workspaceId = await readWorkspaceId();
  if (!workspaceId) return fail(404, "not_found", "Analysis not found.");

  const context = await waitForMatchContext(analysisId, workspaceId);
  switch (context.status) {
    case "not_found":
      return fail(404, "not_found", "Analysis not found.");
    case "running":
      return fail(
        409,
        "still_running",
        "The extraction is still being saved. Try again.",
      );
    case "no_requirements":
      return fail(
        409,
        "no_requirements",
        "This analysis has no requirements to match.",
      );
    case "no_cv":
      return fail(
        409,
        "no_cv",
        "Add your CV in Profile to match requirements.",
      );
  }

  const result = streamMatches({
    model: access.model,
    requirements: context.requirements,
    cvLines: context.cv.lines,
    today: new Date().toISOString().slice(0, 10),
    disableThinking: access.disableThinking,
    abortSignal: req.signal,
  });

  const stream = createCheckedMatchStream({
    source: result,
    requirementCount: context.requirements.length,
    lines: context.cv.lines,
    onComplete: async (checked) => {
      try {
        await saveMatches(
          analysisId,
          context.cv.id,
          context.requirementIds,
          checked,
        );
      } catch (error) {
        console.error(
          "[match] could not save:",
          error instanceof Error ? error.message : error,
        );
      }
    },
  });

  return createTextStreamResponse({ stream });
}
