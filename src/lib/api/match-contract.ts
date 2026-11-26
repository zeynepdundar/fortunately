import { z } from "zod";
import { ProviderId } from "@/lib/ai/provider-id";

/** Request body for POST /api/match: match a saved analysis against the profile's CV. */
export const MatchRequest = z.object({
  analysisId: z.uuid(),
  provider: ProviderId,
  modelId: z.string().trim().min(1).max(100),
  thinking: z.boolean().default(false),
});
export type MatchRequest = z.input<typeof MatchRequest>;
