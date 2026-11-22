import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { ProviderId } from "./provider-id";

export { ProviderId } from "./provider-id";

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";

export type ModelConfig = {
  provider: ProviderId;
  modelId: string;
  /** The visitor's own key (BYOK) or the demo key. Never stored or logged. Unused for Ollama. */
  apiKey?: string;
};

/**
 * Ollama is meant for local development: allowed outside production,
 * or in production only when OLLAMA_BASE_URL is set explicitly.
 */
export function isOllamaEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    Boolean(process.env.OLLAMA_BASE_URL)
  );
}

/** Build a provider-agnostic AI SDK model from a per-request config. */
export function getModel({
  provider,
  modelId,
  apiKey,
}: ModelConfig): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "ollama":
      // The base URL comes from server config only, never from the request.
      return createOpenAICompatible({
        name: "ollama",
        baseURL: process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
        supportsStructuredOutputs: true,
      })(modelId);
  }
}
