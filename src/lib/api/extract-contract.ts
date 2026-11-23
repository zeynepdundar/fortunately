import { z } from "zod";
import { ProviderId } from "@/lib/ai/provider-id";

/** Header that carries the visitor's own API key (BYOK). Never stored or logged. */
export const KEY_HEADER = "x-fortunately-key";

/** Request body for POST /api/extract, shared by the route and the client. */
export const ExtractRequest = z.object({
  posting: z
    .string()
    .trim()
    .min(80, "Paste the full posting (at least 80 characters).")
    .max(30_000),
  provider: ProviderId,
  modelId: z.string().trim().min(1).max(100),
  /** Let thinking models reason before answering. Off by default: slower, rarely needed here. */
  thinking: z.boolean().default(false),
});
export type ExtractRequest = z.input<typeof ExtractRequest>;
