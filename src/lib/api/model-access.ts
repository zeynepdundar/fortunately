import type { LanguageModel } from "ai";
import { supportsThinkingToggle } from "@/lib/ai/models";
import { getModel, isOllamaEnabled } from "@/lib/ai/provider";
import { needsApiKey, type ProviderId } from "@/lib/ai/provider-id";
import { KEY_HEADER } from "./extract-contract";

type Access =
  | { ok: true; model: LanguageModel; disableThinking: boolean }
  | { ok: false; response: Response };

/** Shared by the AI routes: provider checks, BYOK key from the header, thinking switch. */
export function modelFromRequest(
  req: Request,
  {
    provider,
    modelId,
    thinking,
  }: { provider: ProviderId; modelId: string; thinking: boolean },
): Access {
  if (provider === "ollama" && !isOllamaEnabled()) {
    return {
      ok: false,
      response: Response.json(
        {
          error: "provider_disabled",
          message: "Ollama is only available when running locally.",
        },
        { status: 400 },
      ),
    };
  }
  const apiKey = req.headers.get(KEY_HEADER)?.trim();
  if (needsApiKey(provider) && !apiKey) {
    return {
      ok: false,
      response: Response.json(
        { error: "missing_key", message: "Add your API key in Settings." },
        { status: 401 },
      ),
    };
  }
  return {
    ok: true,
    model: getModel({ provider, modelId, apiKey }),
    disableThinking: supportsThinkingToggle(provider, modelId) && !thinking,
  };
}
