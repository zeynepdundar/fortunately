import { createTextStreamResponse, toTextStream } from "ai";
import { z } from "zod";
import { streamExtraction } from "@/lib/ai/extract";
import { supportsThinkingToggle } from "@/lib/ai/models";
import { getModel, isOllamaEnabled } from "@/lib/ai/provider";
import { needsApiKey } from "@/lib/ai/provider-id";
import { ExtractRequest, KEY_HEADER } from "@/lib/api/extract-contract";

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

  const result = streamExtraction({
    model: getModel({ provider, modelId, apiKey }),
    posting,
    disableThinking: supportsThinkingToggle(provider, modelId) && !thinking,
    abortSignal: req.signal,
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
