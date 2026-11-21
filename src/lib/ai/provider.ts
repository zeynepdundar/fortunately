import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { z } from "zod";

export const ProviderId = z.enum(["anthropic", "openai"]);
export type ProviderId = z.infer<typeof ProviderId>;

export type ModelConfig = {
  provider: ProviderId;
  modelId: string;
  /** The visitor's own key (BYOK) or the demo key. Never stored or logged. */
  apiKey: string;
};

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
  }
}
