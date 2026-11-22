import { createTextStreamResponse, toTextStream } from "ai";
import { z } from "zod";
import { streamExtraction } from "@/lib/ai/extract";
import { getModel } from "@/lib/ai/provider";
import { ExtractRequest, KEY_HEADER } from "@/lib/api/extract-contract";

export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = req.headers.get(KEY_HEADER)?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "missing_key", message: "Add your API key in Settings." },
      { status: 401 },
    );
  }

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

  const { posting, provider, modelId } = parsed.data;
  const result = streamExtraction({
    model: getModel({ provider, modelId, apiKey }),
    posting,
    abortSignal: req.signal,
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
