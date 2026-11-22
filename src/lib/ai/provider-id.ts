import { z } from "zod";

/** Supported LLM providers. Kept free of SDK imports so client code can use it. */
export const ProviderId = z.enum(["anthropic", "openai"]);
export type ProviderId = z.infer<typeof ProviderId>;
