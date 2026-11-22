import type { ProviderId } from "./provider-id";

/** Suggestions for the model field. Any model id the provider accepts still works. */
export const MODEL_SUGGESTIONS: Record<ProviderId, string[]> = {
  anthropic: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"],
  openai: [],
};

export const DEFAULT_MODEL: Record<ProviderId, string> = {
  anthropic: "claude-haiku-5-5",
  openai: "",
};
