import { createTextStreamResponse, toTextStream } from "ai";
import { z } from "zod";
import { EXTRACTION_PROMPT_VERSION, streamExtraction } from "@/lib/ai/extract";
import { supportsThinkingToggle } from "@/lib/ai/models";
import { getModel, isOllamaEnabled } from "@/lib/ai/provider";
import { needsApiKey } from "@/lib/ai/provider-id";
import {
  ANALYSIS_ID_HEADER,
  ExtractRequest,
  KEY_HEADER,
} from "@/lib/api/extract-contract";
import { cleanExtraction } from "@/lib/extraction";
import {
  failAnalysis,
  finishAnalysis,
  startAnalysis,
} from "@/lib/persistence/analyses";
import { getOrCreateWorkspaceId } from "@/lib/persistence/workspace";

export const maxDuration = 60;

export async function POST(req: Request) {
  const parsed = ExtractRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_input",
        issues: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }
  const { posting, provider, modelId, thinking } = parsed.data;

  if (provider === "ollama" && !isOllamaEnabled()) {
    return Response.json(
      {
        error: "provider_disabled",
        message: "Ollama is only available when running locally.",
      },
      { status: 400 },
    );
  }

  const apiKey = req.headers.get(KEY_HEADER)?.trim();
  if (needsApiKey(provider) && !apiKey) {
    return Response.json(
      { error: "missing_key", message: "Add your API key in Settings." },
      { status: 401 },
    );
  }

  const startedAt = performance.now();
  const analysisId = await openAnalysis({ posting, provider, modelId });
  const elapsed = () => performance.now() - startedAt;
  // onError, onAbort and onEnd can all fire for one run: save only the first outcome.
  let settled = false;
  const settleOnce = () => {
    if (!analysisId || settled) return false;
    settled = true;
    return true;
  };

  const result = streamExtraction({
    model: getModel({ provider, modelId, apiKey }),
    posting,
    disableThinking: supportsThinkingToggle(provider, modelId) && !thinking,
    abortSignal: req.signal,
    onComplete: async ({ output, inputTokens, outputTokens }) => {
      if (!analysisId || !settleOnce()) return;
      await saveSafely(() =>
        finishAnalysis(analysisId, {
          requirements: cleanExtraction(output, posting).requirements,
          latencyMs: elapsed(),
          tokensIn: inputTokens,
          tokensOut: outputTokens,
        }),
      );
    },
    onFailure: async () => {
      if (!analysisId || !settleOnce()) return;
      await saveSafely(() => failAnalysis(analysisId, elapsed()));
    },
  });

  return createTextStreamResponse({
    headers: analysisId ? { [ANALYSIS_ID_HEADER]: analysisId } : undefined,
    stream: toTextStream({ stream: result.stream }),
  });
}

/**
 * Open a saved analysis for this visitor. Saving is best effort:
 * without a database, or if it fails, extraction still streams.
 */
async function openAnalysis(input: {
  posting: string;
  provider: string;
  modelId: string;
}) {
  try {
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId) return null;
    return await startAnalysis({
      ...input,
      workspaceId,
      promptVersion: EXTRACTION_PROMPT_VERSION,
    });
  } catch (error) {
    console.error(
      "[extract] could not save analysis:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function saveSafely(save: () => Promise<void>) {
  try {
    await save();
  } catch (error) {
    console.error(
      "[extract] could not update analysis:",
      error instanceof Error ? error.message : error,
    );
  }
}
