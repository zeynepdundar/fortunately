import { z } from "zod";

/** Supported LLM providers. Kept free of SDK imports so client code can use it. */
export const ProviderId = z.enum(["anthropic", "openai", "ollama"]);
export type ProviderId = z.infer<typeof ProviderId>;

/** Ollama runs on the developer's machine and needs no API key. */
export function needsApiKey(provider: ProviderId): boolean {
  return provider !== "ollama";
}
